import { v4 as uuidv4 } from 'uuid';
import type { Collection, ApiRequest, KeyValuePair, AuthConfig, CollectionFolder, EnvironmentVariable, RequestExample, FormDataEntry } from '../types';

interface PostmanHeader {
  key: string;
  value: string;
  disabled?: boolean;
  description?: string;
}

interface PostmanQueryParam {
  key: string;
  value: string;
  disabled?: boolean;
  description?: string;
}

interface PostmanUrlVariable {
  key: string;
  value: string;
  description?: string;
}

interface PostmanAuth {
  type: string;
  basic?: { key: string; value: string }[];
  bearer?: { key: string; value: string }[];
  apikey?: { key: string; value: string }[];
}

interface PostmanRequest {
  method: string;
  header?: PostmanHeader[];
  url: {
    raw: string;
    query?: PostmanQueryParam[];
    variable?: PostmanUrlVariable[];
    host?: string[];
    path?: string[];
  } | string;
  body?: {
    mode: string;
    raw?: string;
    urlencoded?: { key: string; value: string; disabled?: boolean; description?: string; type?: string }[];
    formdata?: { key: string; value: string; disabled?: boolean; description?: string; type?: string; src?: string }[];
    options?: { raw?: { language?: string } };
  };
  auth?: PostmanAuth;
  description?: string | { content: string; type: string };
}

interface PostmanResponse {
  name: string;
  status: string;
  code: number;
  header?: { key: string; value: string }[];
  body?: string;
  _postman_previewlanguage?: string;
}

interface PostmanEvent {
  listen: 'prerequest' | 'test';
  script: {
    exec: string[];
    type?: string;
  };
}

interface PostmanVariable {
  key: string;
  value: string;
  type?: string;
  description?: string | { content: string; type: string };
}

interface PostmanItem {
  name: string;
  request?: PostmanRequest;
  response?: PostmanResponse[];
  event?: PostmanEvent[];
  item?: PostmanItem[];
  auth?: PostmanAuth;
  description?: string | { content: string; type: string };
}

interface PostmanCollection {
  info: {
    name: string;
    description?: string | { content: string; type: string };
  };
  item: PostmanItem[];
  auth?: PostmanAuth;
  event?: PostmanEvent[];
  variable?: PostmanVariable[];
}

function extractDescription(desc?: string | { content: string; type: string }): string {
  if (!desc) return '';
  if (typeof desc === 'string') return desc;
  return desc.content || '';
}

function parsePostmanAuth(auth?: PostmanAuth, isCollection?: boolean): AuthConfig {
  if (!auth) return { type: isCollection ? 'none' : 'inherit' };
  if (auth.type === 'noauth') return { type: 'none' };

  if (auth.type === 'basic') {
    const username = auth.basic?.find(b => b.key === 'username')?.value || '';
    const password = auth.basic?.find(b => b.key === 'password')?.value || '';
    return { type: 'basic', basic: { username, password } };
  }

  if (auth.type === 'bearer') {
    const token = auth.bearer?.find(b => b.key === 'token')?.value || '';
    return { type: 'bearer', bearer: { token } };
  }

  if (auth.type === 'apikey') {
    const key = auth.apikey?.find(b => b.key === 'key')?.value || '';
    const value = auth.apikey?.find(b => b.key === 'value')?.value || '';
    const addTo = (auth.apikey?.find(b => b.key === 'in')?.value || 'header') as 'header' | 'query';
    return { type: 'api-key', apiKey: { key, value, addTo } };
  }

  return { type: 'none' };
}

function parsePostmanVariables(variables?: PostmanVariable[]): EnvironmentVariable[] {
  if (!variables || !Array.isArray(variables)) return [];
  return variables.map(v => ({
    id: uuidv4(),
    key: v.key,
    value: v.value || '',
    enabled: true,
    type: (v.type === 'secret' ? 'secret' : 'string') as 'string' | 'secret',
  }));
}

function parsePostmanExamples(responses?: PostmanResponse[]): RequestExample[] {
  if (!responses || !Array.isArray(responses)) return [];
  return responses.map(r => ({
    id: uuidv4(),
    name: r.name || `${r.code} ${r.status}`,
    status: r.code || 200,
    statusText: r.status || 'OK',
    headers: (r.header || []).reduce((acc, h) => {
      acc[h.key] = h.value;
      return acc;
    }, {} as Record<string, string>),
    body: r.body || '',
    createdAt: Date.now(),
  }));
}

function extractScripts(events?: PostmanEvent[]): { preRequestScript?: string; testScript?: string } {
  if (!events || !Array.isArray(events)) return {};
  const result: { preRequestScript?: string; testScript?: string } = {};

  for (const event of events) {
    if (event.listen === 'prerequest' && event.script?.exec) {
      const code = event.script.exec.join('\n').trim();
      if (code) result.preRequestScript = code;
    }
    if (event.listen === 'test' && event.script?.exec) {
      const code = event.script.exec.join('\n').trim();
      if (code) result.testScript = code;
    }
  }

  return result;
}

interface ParseResult {
  folders: CollectionFolder[];
  requests: ApiRequest[];
}

function parsePostmanItems(
  items: PostmanItem[],
  collectionId: string,
  parentFolderId?: string,
): ParseResult {
  const folders: CollectionFolder[] = [];
  const requests: ApiRequest[] = [];

  for (const item of items) {
    if (item.item) {
      const folderId = uuidv4();
      const folderScripts = extractScripts(item.event);
      const folder: CollectionFolder = {
        id: folderId,
        name: item.name,
        parentId: parentFolderId,
        auth: item.auth ? parsePostmanAuth(item.auth) : undefined,
        preRequestScript: folderScripts.preRequestScript,
        testScript: folderScripts.testScript,
      };
      folders.push(folder);

      const subResult = parsePostmanItems(item.item, collectionId, folderId);
      folders.push(...subResult.folders);
      requests.push(...subResult.requests);
    } else if (item.request) {
      const req = item.request;
      const urlStr = typeof req.url === 'string' ? req.url : req.url.raw;
      const queryParams: KeyValuePair[] = [];
      const pathVariables: KeyValuePair[] = [];

      if (typeof req.url === 'object' && req.url.query) {
        req.url.query.forEach(q => {
          queryParams.push({
            id: uuidv4(),
            key: q.key,
            value: q.value,
            enabled: !q.disabled,
          });
        });
      }

      if (typeof req.url === 'object' && req.url.variable) {
        req.url.variable.forEach(v => {
          pathVariables.push({
            id: uuidv4(),
            key: v.key,
            value: v.value || '',
            enabled: true,
          });
        });
      } else {
        const pathMatches = urlStr.match(/:([a-zA-Z_][a-zA-Z0-9_]*)/g);
        if (pathMatches) {
          const seen = new Set<string>();
          pathMatches.forEach(m => {
            const key = m.slice(1);
            if (!seen.has(key)) {
              seen.add(key);
              pathVariables.push({
                id: uuidv4(),
                key,
                value: '',
                enabled: true,
              });
            }
          });
        }
      }

      const headers: KeyValuePair[] = (req.header || []).map(h => ({
        id: uuidv4(),
        key: h.key,
        value: h.value,
        enabled: !h.disabled,
      }));

      let body = '';
      let bodyType: ApiRequest['bodyType'] = 'none';
      let bodyFormData: FormDataEntry[] | undefined;
      let bodyUrlEncoded: KeyValuePair[] | undefined;

      if (req.body) {
        if (req.body.mode === 'raw') {
          body = req.body.raw || '';
          const lang = req.body.options?.raw?.language;
          if (lang === 'json' || (!lang && body.trim().startsWith('{'))) {
            try {
              JSON.parse(body);
              bodyType = 'json';
            } catch {
              bodyType = 'raw';
            }
          } else {
            bodyType = 'raw';
          }
        } else if (req.body.mode === 'urlencoded') {
          bodyType = 'x-www-form-urlencoded';
          bodyUrlEncoded = (req.body.urlencoded || []).map(u => ({
            id: uuidv4(),
            key: u.key,
            value: u.value,
            enabled: !u.disabled,
          }));
          const params = new URLSearchParams();
          req.body.urlencoded?.forEach(u => {
            if (!u.disabled) params.append(u.key, u.value);
          });
          body = params.toString();
        } else if (req.body.mode === 'formdata') {
          bodyType = 'form-data';
          bodyFormData = (req.body.formdata || []).map(f => ({
            id: uuidv4(),
            key: f.key,
            value: f.value || '',
            type: f.type === 'file' ? 'file' as const : 'text' as const,
            enabled: !f.disabled,
          }));
        } else if (req.body.mode === 'graphql') {
          bodyType = 'graphql';
          body = req.body.raw || '';
        }
      }

      const scripts = extractScripts(item.event);
      const examples = parsePostmanExamples(item.response);

      const description = extractDescription(req.description);

      const apiRequest: ApiRequest = {
        id: uuidv4(),
        name: item.name,
        method: (req.method || 'GET') as ApiRequest['method'],
        url: urlStr,
        headers,
        queryParams,
        pathVariables: pathVariables.length > 0 ? pathVariables : undefined,
        body,
        bodyType,
        bodyFormData,
        bodyUrlEncoded,
        auth: parsePostmanAuth(req.auth),
        collectionId,
        folderId: parentFolderId,
        description: description || undefined,
        preRequestScript: scripts.preRequestScript,
        testScript: scripts.testScript,
        examples: examples.length > 0 ? examples : undefined,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      requests.push(apiRequest);
    }
  }

  return { folders, requests };
}

export function importPostmanCollection(json: string): {
  collection: Collection;
  requests: ApiRequest[];
} {
  const data: PostmanCollection = JSON.parse(json);

  const collectionId = uuidv4();

  const variables = parsePostmanVariables(data.variable);
  const collectionAuth = data.auth ? parsePostmanAuth(data.auth, true) : undefined;
  const collectionDescription = extractDescription(data.info.description);
  const collectionScripts = extractScripts(data.event);

  const { folders, requests } = parsePostmanItems(data.item, collectionId);

  const collection: Collection = {
    id: collectionId,
    name: data.info.name,
    description: collectionDescription,
    folders,
    variables: variables.length > 0 ? variables : undefined,
    auth: collectionAuth,
    preRequestScript: collectionScripts.preRequestScript,
    testScript: collectionScripts.testScript,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  return { collection, requests };
}

export function exportCollection(
  collection: Collection,
  requests: ApiRequest[]
): string {
  const collectionRequests = requests.filter(r => r.collectionId === collection.id);

  const exportData = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    collection: {
      name: collection.name,
      description: collection.description,
    },
    requests: collectionRequests.map(r => ({
      name: r.name,
      method: r.method,
      url: r.url,
      headers: r.headers,
      queryParams: r.queryParams,
      body: r.body,
      bodyType: r.bodyType,
      auth: r.auth,
    })),
  };

  return JSON.stringify(exportData, null, 2);
}

export function importUSBCollection(json: string): {
  collection: Collection;
  requests: ApiRequest[];
} {
  const data = JSON.parse(json);
  const collectionId = uuidv4();

  const collection: Collection = {
    id: collectionId,
    name: data.collection.name,
    description: data.collection.description || '',
    folders: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const requests: ApiRequest[] = data.requests.map((r: any) => ({
    id: uuidv4(),
    name: r.name,
    method: r.method,
    url: r.url,
    headers: (r.headers || []).map((h: any) => ({ ...h, id: h.id || uuidv4() })),
    queryParams: (r.queryParams || []).map((p: any) => ({ ...p, id: p.id || uuidv4() })),
    body: r.body || '',
    bodyType: r.bodyType || 'none',
    auth: r.auth || { type: 'none' },
    collectionId,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }));

  return { collection, requests };
}

export function downloadFile(content: string, filename: string) {
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
