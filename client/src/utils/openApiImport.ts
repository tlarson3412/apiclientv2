import { v4 as uuidv4 } from 'uuid';
import yaml from 'js-yaml';
import type { Collection, CollectionFolder, ApiRequest, KeyValuePair, AuthConfig, HttpMethod, BodyType } from '../types';

interface OpenApiSpec {
  openapi?: string;
  swagger?: string;
  info?: { title?: string; description?: string; version?: string };
  host?: string;
  basePath?: string;
  schemes?: string[];
  servers?: { url?: string }[];
  paths?: Record<string, Record<string, any>>;
  securityDefinitions?: Record<string, any>;
  components?: { securitySchemes?: Record<string, any>; schemas?: Record<string, any> };
}

const HTTP_METHODS = ['get', 'post', 'put', 'delete', 'patch', 'head', 'options'];

function parseContent(content: string): OpenApiSpec {
  const trimmed = content.trim();
  if (trimmed.startsWith('{')) {
    return JSON.parse(trimmed);
  }
  return yaml.load(trimmed) as OpenApiSpec;
}

function getBaseUrl(spec: OpenApiSpec): string {
  if (spec.servers && spec.servers.length > 0 && spec.servers[0].url) {
    return spec.servers[0].url.replace(/\/$/, '');
  }
  if (spec.host) {
    const scheme = spec.schemes?.[0] || 'https';
    const basePath = spec.basePath || '';
    return `${scheme}://${spec.host}${basePath}`.replace(/\/$/, '');
  }
  return '{{baseUrl}}';
}

function resolveRef(spec: OpenApiSpec, ref: string): any {
  if (!ref.startsWith('#/')) return {};
  const parts = ref.substring(2).split('/');
  let current: any = spec;
  for (const part of parts) {
    current = current?.[part];
    if (!current) return {};
  }
  return current;
}

function generateExampleFromSchema(spec: OpenApiSpec, schema: any, depth = 0): any {
  if (depth > 5) return {};
  if (!schema) return {};

  if (schema.$ref) {
    schema = resolveRef(spec, schema.$ref);
  }

  if (schema.example !== undefined) return schema.example;

  switch (schema.type) {
    case 'string':
      if (schema.enum) return schema.enum[0];
      if (schema.format === 'date') return '2025-01-01';
      if (schema.format === 'date-time') return '2025-01-01T00:00:00Z';
      if (schema.format === 'email') return 'user@example.com';
      if (schema.format === 'uri') return 'https://example.com';
      if (schema.format === 'uuid') return '00000000-0000-0000-0000-000000000000';
      return 'string';
    case 'number':
    case 'integer':
      return schema.minimum !== undefined ? schema.minimum : 0;
    case 'boolean':
      return false;
    case 'array':
      return [generateExampleFromSchema(spec, schema.items, depth + 1)];
    case 'object': {
      const obj: Record<string, any> = {};
      if (schema.properties) {
        for (const [key, prop] of Object.entries(schema.properties as Record<string, any>)) {
          obj[key] = generateExampleFromSchema(spec, prop, depth + 1);
        }
      }
      return obj;
    }
    default:
      if (schema.properties) {
        const obj: Record<string, any> = {};
        for (const [key, prop] of Object.entries(schema.properties as Record<string, any>)) {
          obj[key] = generateExampleFromSchema(spec, prop, depth + 1);
        }
        return obj;
      }
      if (schema.allOf) {
        let merged: any = {};
        for (const sub of schema.allOf) {
          const resolved = sub.$ref ? resolveRef(spec, sub.$ref) : sub;
          merged = { ...merged, ...generateExampleFromSchema(spec, resolved, depth + 1) };
        }
        return merged;
      }
      if (schema.oneOf || schema.anyOf) {
        const variants = schema.oneOf || schema.anyOf;
        return generateExampleFromSchema(spec, variants[0], depth + 1);
      }
      return {};
  }
}

function mapSecurityToAuth(spec: OpenApiSpec, security?: any[]): AuthConfig {
  if (!security || security.length === 0) return { type: 'none' };

  const securityItem = security[0];
  const schemeName = Object.keys(securityItem)[0];
  if (!schemeName) return { type: 'none' };

  const schemes = spec.components?.securitySchemes || spec.securityDefinitions || {};
  const scheme = schemes[schemeName];
  if (!scheme) return { type: 'none' };

  const schemeType = scheme.type?.toLowerCase();

  if (schemeType === 'http') {
    if (scheme.scheme === 'basic') {
      return { type: 'basic', basic: { username: '', password: '' } };
    }
    if (scheme.scheme === 'bearer') {
      return { type: 'bearer', bearer: { token: '' } };
    }
    if (scheme.scheme === 'digest') {
      return { type: 'digest', digest: { username: '', password: '' } };
    }
  }

  if (schemeType === 'apikey') {
    const addTo = scheme.in === 'query' ? 'query' : 'header';
    return { type: 'api-key', apiKey: { key: scheme.name || '', value: '', addTo } };
  }

  if (schemeType === 'oauth2') {
    let tokenUrl = '';
    if (scheme.flows?.clientCredentials) tokenUrl = scheme.flows.clientCredentials.tokenUrl || '';
    else if (scheme.flows?.password) tokenUrl = scheme.flows.password.tokenUrl || '';
    else if (scheme.tokenUrl) tokenUrl = scheme.tokenUrl;

    return {
      type: 'oauth2',
      oauth2: {
        grantType: 'client_credentials',
        tokenUrl,
        clientId: '',
        clientSecret: '',
        scope: (securityItem[schemeName] || []).join(' '),
      },
    };
  }

  if (schemeType === 'basic') {
    return { type: 'basic', basic: { username: '', password: '' } };
  }

  return { type: 'none' };
}

export function parseOpenApiSpec(content: string): {
  collection: Collection;
  requests: ApiRequest[];
} {
  const spec = parseContent(content);

  if (!spec.paths) {
    throw new Error('No paths found in the spec. Is this a valid OpenAPI/Swagger file?');
  }

  const isOas3 = !!spec.openapi;
  const title = spec.info?.title || 'Imported API';
  const collectionId = uuidv4();
  const baseUrl = getBaseUrl(spec);

  const tagFolders = new Map<string, CollectionFolder>();
  const folders: CollectionFolder[] = [];
  const requests: ApiRequest[] = [];

  for (const [path, pathItem] of Object.entries(spec.paths)) {
    if (!pathItem) continue;

    for (const method of HTTP_METHODS) {
      const operation = pathItem[method];
      if (!operation) continue;

      const tags = operation.tags || ['Default'];
      const tag = tags[0] || 'Default';

      if (!tagFolders.has(tag)) {
        const folder: CollectionFolder = { id: uuidv4(), name: tag };
        tagFolders.set(tag, folder);
        folders.push(folder);
      }

      const folder = tagFolders.get(tag)!;

      const headers: KeyValuePair[] = [];
      const queryParams: KeyValuePair[] = [];
      let bodyType: BodyType = 'none';
      let body = '';

      const parameters = [...(pathItem.parameters || []), ...(operation.parameters || [])];
      for (const param of parameters) {
        const resolved = param.$ref ? resolveRef(spec, param.$ref) : param;
        const kv: KeyValuePair = {
          id: uuidv4(),
          key: resolved.name || '',
          value: resolved.example !== undefined ? String(resolved.example) : '',
          enabled: !!resolved.required,
        };

        if (resolved.in === 'header') {
          headers.push(kv);
        } else if (resolved.in === 'query') {
          queryParams.push(kv);
        }
      }

      if (isOas3 && operation.requestBody) {
        const reqBody = operation.requestBody.$ref
          ? resolveRef(spec, operation.requestBody.$ref)
          : operation.requestBody;
        const content = reqBody.content || {};

        if (content['application/json']) {
          bodyType = 'json';
          const schema = content['application/json'].schema;
          if (schema) {
            const example = content['application/json'].example || generateExampleFromSchema(spec, schema);
            body = JSON.stringify(example, null, 2);
          }
          if (!headers.find(h => h.key.toLowerCase() === 'content-type')) {
            headers.push({ id: uuidv4(), key: 'Content-Type', value: 'application/json', enabled: true });
          }
        } else if (content['application/x-www-form-urlencoded']) {
          bodyType = 'x-www-form-urlencoded';
        } else if (content['multipart/form-data']) {
          bodyType = 'form-data';
        } else if (content['text/plain'] || content['text/xml'] || content['application/xml']) {
          bodyType = 'raw';
        }
      } else if (!isOas3) {
        const bodyParam = parameters.find((p: any) => {
          const resolved = p.$ref ? resolveRef(spec, p.$ref) : p;
          return resolved.in === 'body';
        });
        if (bodyParam) {
          const resolved = bodyParam.$ref ? resolveRef(spec, bodyParam.$ref) : bodyParam;
          bodyType = 'json';
          if (resolved.schema) {
            const example = generateExampleFromSchema(spec, resolved.schema);
            body = JSON.stringify(example, null, 2);
          }
          if (!headers.find(h => h.key.toLowerCase() === 'content-type')) {
            headers.push({ id: uuidv4(), key: 'Content-Type', value: 'application/json', enabled: true });
          }
        }

        const formParams = parameters.filter((p: any) => {
          const resolved = p.$ref ? resolveRef(spec, p.$ref) : p;
          return resolved.in === 'formData';
        });
        if (formParams.length > 0) {
          bodyType = 'x-www-form-urlencoded';
        }
      }

      const auth = mapSecurityToAuth(spec, operation.security || (spec as any).security);

      const urlPath = path.replace(/\{(\w+)\}/g, '{{$1}}');
      const name = operation.summary || operation.operationId || `${method.toUpperCase()} ${path}`;

      requests.push({
        id: uuidv4(),
        name,
        method: method.toUpperCase() as HttpMethod,
        url: `${baseUrl}${urlPath}`,
        headers,
        queryParams,
        body,
        bodyType,
        auth,
        description: operation.description || '',
        collectionId,
        folderId: folder.id,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
  }

  const collection: Collection = {
    id: collectionId,
    name: title,
    description: spec.info?.description || '',
    folders,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  return { collection, requests };
}
