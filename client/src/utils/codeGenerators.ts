import type { ApiRequest } from '../types';

function buildUrl(request: ApiRequest, interpolate: (s: string) => string): string {
  let url = interpolate(request.url);
  const enabledParams = request.queryParams.filter(p => p.enabled && p.key);
  if (enabledParams.length > 0) {
    const searchParams = new URLSearchParams();
    enabledParams.forEach(p => {
      searchParams.append(interpolate(p.key), interpolate(p.value));
    });
    const separator = url.includes('?') ? '&' : '?';
    url += separator + searchParams.toString();
  }
  if (request.auth.type === 'api-key' && request.auth.apiKey?.addTo === 'query') {
    const separator = url.includes('?') ? '&' : '?';
    url += `${separator}${interpolate(request.auth.apiKey.key)}=${interpolate(request.auth.apiKey.value)}`;
  }
  return url;
}

function buildHeaders(request: ApiRequest, interpolate: (s: string) => string): Record<string, string> {
  const headers: Record<string, string> = {};
  request.headers.filter(h => h.enabled && h.key).forEach(h => {
    headers[interpolate(h.key)] = interpolate(h.value);
  });
  switch (request.auth.type) {
    case 'basic':
      if (request.auth.basic) {
        headers['Authorization'] = `Basic ${btoa(`${interpolate(request.auth.basic.username)}:${interpolate(request.auth.basic.password)}`)}`;
      }
      break;
    case 'bearer':
      if (request.auth.bearer) {
        headers['Authorization'] = `Bearer ${interpolate(request.auth.bearer.token)}`;
      }
      break;
    case 'api-key':
      if (request.auth.apiKey && request.auth.apiKey.addTo === 'header') {
        headers[interpolate(request.auth.apiKey.key)] = interpolate(request.auth.apiKey.value);
      }
      break;
    case 'oauth2':
      if (request.auth.oauth2?.accessToken) {
        headers['Authorization'] = `Bearer ${request.auth.oauth2.accessToken}`;
      }
      break;
  }
  if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method) && request.bodyType !== 'none') {
    if (request.bodyType === 'json' && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    } else if (request.bodyType === 'graphql' && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    } else if (request.bodyType === 'x-www-form-urlencoded' && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
    } else if (request.bodyType === 'raw' && !headers['Content-Type']) {
      headers['Content-Type'] = 'text/plain';
    }
  }
  return headers;
}

function hasBody(request: ApiRequest): boolean {
  return !['GET', 'HEAD', 'OPTIONS'].includes(request.method) && request.bodyType !== 'none';
}

export function generateCurl(request: ApiRequest, interpolate: (s: string) => string): string {
  const url = buildUrl(request, interpolate);
  const headers = buildHeaders(request, interpolate);
  const parts: string[] = [`curl -X ${request.method} '${url}'`];

  Object.entries(headers).forEach(([key, value]) => {
    parts.push(`  -H '${key}: ${value}'`);
  });

  if (hasBody(request)) {
    const body = interpolate(request.body);
    parts.push(`  -d '${body.replace(/'/g, "'\\''")}'`);
  }

  return parts.join(' \\\n');
}

export function generateJavaScriptFetch(request: ApiRequest, interpolate: (s: string) => string): string {
  const url = buildUrl(request, interpolate);
  const headers = buildHeaders(request, interpolate);
  const headerEntries = Object.entries(headers);
  const includeBody = hasBody(request);
  const body = includeBody ? interpolate(request.body) : '';

  let code = `fetch('${url}', {\n`;
  code += `  method: '${request.method}',\n`;

  if (headerEntries.length > 0) {
    code += `  headers: {\n`;
    headerEntries.forEach(([key, value], i) => {
      const comma = i < headerEntries.length - 1 ? ',' : '';
      code += `    '${key}': '${value}'${comma}\n`;
    });
    code += `  },\n`;
  }

  if (includeBody) {
    if (request.bodyType === 'json') {
      code += `  body: JSON.stringify(${body})\n`;
    } else {
      code += `  body: '${body.replace(/'/g, "\\'")}'\n`;
    }
  }

  code += `})\n`;
  code += `  .then(response => response.json())\n`;
  code += `  .then(data => console.log(data))\n`;
  code += `  .catch(error => console.error('Error:', error));`;

  return code;
}

export function generatePythonRequests(request: ApiRequest, interpolate: (s: string) => string): string {
  const url = buildUrl(request, interpolate);
  const headers = buildHeaders(request, interpolate);
  const headerEntries = Object.entries(headers);
  const includeBody = hasBody(request);
  const body = includeBody ? interpolate(request.body) : '';

  let code = `import requests\n\n`;
  code += `url = '${url}'\n`;

  if (headerEntries.length > 0) {
    code += `headers = {\n`;
    headerEntries.forEach(([key, value]) => {
      code += `    '${key}': '${value}',\n`;
    });
    code += `}\n`;
  }

  if (includeBody) {
    if (request.bodyType === 'json') {
      code += `payload = ${body}\n`;
    } else {
      code += `payload = '${body.replace(/'/g, "\\'")}'\n`;
    }
  }

  code += `\nresponse = requests.${request.method.toLowerCase()}(\n`;
  code += `    url`;
  if (headerEntries.length > 0) {
    code += `,\n    headers=headers`;
  }
  if (includeBody) {
    if (request.bodyType === 'json') {
      code += `,\n    json=payload`;
    } else {
      code += `,\n    data=payload`;
    }
  }
  code += `\n)\n\n`;
  code += `print(response.status_code)\n`;
  code += `print(response.json())`;

  return code;
}

export function generateNodeFetch(request: ApiRequest, interpolate: (s: string) => string): string {
  const url = buildUrl(request, interpolate);
  const headers = buildHeaders(request, interpolate);
  const headerEntries = Object.entries(headers);
  const includeBody = hasBody(request);
  const body = includeBody ? interpolate(request.body) : '';

  let code = `const fetch = require('node-fetch');\n\n`;
  code += `const options = {\n`;
  code += `  method: '${request.method}',\n`;

  if (headerEntries.length > 0) {
    code += `  headers: {\n`;
    headerEntries.forEach(([key, value], i) => {
      const comma = i < headerEntries.length - 1 ? ',' : '';
      code += `    '${key}': '${value}'${comma}\n`;
    });
    code += `  },\n`;
  }

  if (includeBody) {
    if (request.bodyType === 'json') {
      code += `  body: JSON.stringify(${body})\n`;
    } else {
      code += `  body: '${body.replace(/'/g, "\\'")}'\n`;
    }
  }

  code += `};\n\n`;
  code += `fetch('${url}', options)\n`;
  code += `  .then(res => res.json())\n`;
  code += `  .then(json => console.log(json))\n`;
  code += `  .catch(err => console.error('Error:', err));`;

  return code;
}
