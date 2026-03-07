import type { HttpMethod, KeyValuePair, AuthConfig, BodyType } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface ParsedCurl {
  method: HttpMethod;
  url: string;
  headers: KeyValuePair[];
  body: string;
  bodyType: BodyType;
  auth: AuthConfig;
}

export function parseCurl(input: string): ParsedCurl {
  const cleaned = input
    .replace(/\\\n/g, ' ')
    .replace(/\\\r\n/g, ' ')
    .trim();

  const tokens = tokenize(cleaned);

  let method: HttpMethod = 'GET';
  let url = '';
  const headers: KeyValuePair[] = [];
  let body = '';
  let bodyType: BodyType = 'none';
  let auth: AuthConfig = { type: 'none' };
  let hasData = false;

  let i = 0;
  if (tokens[0]?.toLowerCase() === 'curl') {
    i = 1;
  }

  while (i < tokens.length) {
    const token = tokens[i];

    if (token === '-X' || token === '--request') {
      i++;
      if (i < tokens.length) {
        const m = tokens[i].toUpperCase();
        if (['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'].includes(m)) {
          method = m as HttpMethod;
        }
      }
    } else if (token === '-H' || token === '--header') {
      i++;
      if (i < tokens.length) {
        const headerStr = tokens[i];
        const colonIdx = headerStr.indexOf(':');
        if (colonIdx > 0) {
          const key = headerStr.substring(0, colonIdx).trim();
          const value = headerStr.substring(colonIdx + 1).trim();
          if (key.toLowerCase() !== 'authorization') {
            headers.push({ id: uuidv4(), key, value, enabled: true });
          } else {
            auth = parseAuthHeader(value);
          }
        }
      }
    } else if (token === '-d' || token === '--data' || token === '--data-raw' || token === '--data-binary') {
      i++;
      if (i < tokens.length) {
        body = tokens[i];
        hasData = true;
      }
    } else if (token === '--data-urlencode') {
      i++;
      if (i < tokens.length) {
        if (body) body += '&';
        body += tokens[i];
        hasData = true;
        bodyType = 'x-www-form-urlencoded';
      }
    } else if (token === '-u' || token === '--user') {
      i++;
      if (i < tokens.length) {
        const [username, password] = tokens[i].split(':');
        auth = {
          type: 'basic',
          basic: { username: username || '', password: password || '' },
        };
      }
    } else if (token === '--compressed' || token === '-k' || token === '--insecure' ||
               token === '-s' || token === '--silent' || token === '-S' || token === '--show-error' ||
               token === '-v' || token === '--verbose' || token === '-L' || token === '--location' ||
               token === '-i' || token === '--include') {
      // skip flags without values
    } else if (token === '--connect-timeout' || token === '--max-time' || token === '-o' || token === '--output') {
      i++; // skip flag + value
    } else if (!token.startsWith('-') && !url) {
      url = token;
    }

    i++;
  }

  if (hasData && !method) {
    method = 'POST';
  }
  if (hasData && method === 'GET') {
    method = 'POST';
  }

  if (hasData && bodyType === 'none') {
    const contentTypeHeader = headers.find(
      h => h.key.toLowerCase() === 'content-type'
    );
    if (contentTypeHeader) {
      if (contentTypeHeader.value.includes('application/json')) {
        bodyType = 'json';
      } else if (contentTypeHeader.value.includes('x-www-form-urlencoded')) {
        bodyType = 'x-www-form-urlencoded';
      } else {
        bodyType = 'raw';
      }
    } else {
      try {
        JSON.parse(body);
        bodyType = 'json';
      } catch {
        if (body.includes('=') && !body.includes('{')) {
          bodyType = 'x-www-form-urlencoded';
        } else {
          bodyType = 'raw';
        }
      }
    }
  }

  return { method, url, headers, body, bodyType, auth };
}

function parseAuthHeader(value: string): AuthConfig {
  if (value.startsWith('Basic ')) {
    try {
      const decoded = atob(value.substring(6).trim());
      const [username, ...rest] = decoded.split(':');
      return {
        type: 'basic',
        basic: { username, password: rest.join(':') },
      };
    } catch {
      return { type: 'bearer', bearer: { token: value.substring(6).trim() } };
    }
  }
  if (value.startsWith('Bearer ')) {
    return { type: 'bearer', bearer: { token: value.substring(7).trim() } };
  }
  return { type: 'bearer', bearer: { token: value } };
}

function tokenize(input: string): string[] {
  const tokens: string[] = [];
  let i = 0;
  const len = input.length;

  while (i < len) {
    while (i < len && /\s/.test(input[i])) i++;
    if (i >= len) break;

    const ch = input[i];

    if (ch === "'" || ch === '"') {
      const quote = ch;
      i++;
      let token = '';
      while (i < len && input[i] !== quote) {
        if (input[i] === '\\' && i + 1 < len) {
          i++;
          token += input[i];
        } else {
          token += input[i];
        }
        i++;
      }
      if (i < len) i++;
      tokens.push(token);
    } else if (ch === '$' && i + 1 < len && input[i + 1] === "'") {
      i += 2;
      let token = '';
      while (i < len && input[i] !== "'") {
        if (input[i] === '\\' && i + 1 < len) {
          const next = input[i + 1];
          if (next === 'n') { token += '\n'; i += 2; }
          else if (next === 't') { token += '\t'; i += 2; }
          else if (next === '\\') { token += '\\'; i += 2; }
          else if (next === "'") { token += "'"; i += 2; }
          else { token += input[i]; i++; }
        } else {
          token += input[i];
          i++;
        }
      }
      if (i < len) i++;
      tokens.push(token);
    } else {
      let token = '';
      while (i < len && !/\s/.test(input[i])) {
        token += input[i];
        i++;
      }
      tokens.push(token);
    }
  }

  return tokens;
}
