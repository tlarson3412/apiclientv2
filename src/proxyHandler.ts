import * as http from 'http';
import * as https from 'https';
import * as crypto from 'crypto';

interface ProxyRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string;
  digestAuth?: { username: string; password: string };
  clientCert?: {
    certPem?: string;
    keyPem?: string;
    caPem?: string;
    passphrase?: string;
  };
  binaryBase64?: boolean;
  timeout?: number;
  followRedirects?: boolean;
}

interface TimingResult {
  dns: number;
  connect: number;
  tls: number;
  ttfb: number;
  download: number;
  total: number;
}

interface ProxyResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  setCookies: string[];
  body: string;
  time: number;
  timing: TimingResult;
}

function makeTimedRequest(
  targetUrl: string,
  options: {
    method: string;
    headers: Record<string, string>;
    body?: string;
    binaryBody?: Buffer;
    agent?: https.Agent;
    timeout?: number;
  }
): Promise<{
  status: number;
  statusText: string;
  headers: Record<string, string>;
  setCookies: string[];
  body: string;
  timing: TimingResult;
}> {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(targetUrl);
    const isHttps = parsedUrl.protocol === 'https:';
    const transport = isHttps ? https : http;

    const timing = {
      start: 0,
      dnsEnd: 0,
      connectEnd: 0,
      tlsEnd: 0,
      firstByte: 0,
      end: 0,
    };

    timing.start = performance.now();

    const reqOptions: any = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (isHttps ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      headers: options.headers || {},
    };

    if (options.agent) {
      reqOptions.agent = options.agent;
    }

    if (options.timeout && options.timeout > 0) {
      reqOptions.timeout = options.timeout;
    }

    const req = transport.request(reqOptions, (res) => {
      timing.firstByte = performance.now();

      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });

      res.on('end', () => {
        timing.end = performance.now();

        const responseHeaders: Record<string, string> = {};
        const rawHeaders = res.headers;
        const setCookieHeaders: string[] = [];
        for (const [key, value] of Object.entries(rawHeaders)) {
          if (value) {
            if (key.toLowerCase() === 'set-cookie') {
              if (Array.isArray(value)) {
                setCookieHeaders.push(...value);
              } else {
                setCookieHeaders.push(value);
              }
            }
            responseHeaders[key] = Array.isArray(value) ? value.join(', ') : value;
          }
        }

        const body = Buffer.concat(chunks).toString('utf-8');

        const dnsTime = Math.max(0, Math.round(timing.dnsEnd - timing.start));
        const connectTime = Math.max(0, Math.round(timing.connectEnd - (timing.dnsEnd || timing.start)));
        const tlsTime = isHttps ? Math.max(0, Math.round(timing.tlsEnd - timing.connectEnd)) : 0;
        const ttfbTime = Math.max(0, Math.round(timing.firstByte - (isHttps ? timing.tlsEnd : timing.connectEnd)));
        const downloadTime = Math.max(0, Math.round(timing.end - timing.firstByte));
        const totalTime = Math.round(timing.end - timing.start);

        resolve({
          status: res.statusCode || 0,
          statusText: res.statusMessage || '',
          headers: responseHeaders,
          setCookies: setCookieHeaders,
          body,
          timing: {
            dns: dnsTime,
            connect: connectTime,
            tls: tlsTime,
            ttfb: ttfbTime,
            download: downloadTime,
            total: totalTime,
          },
        });
      });
    });

    req.on('socket', (socket) => {
      socket.on('lookup', () => {
        timing.dnsEnd = performance.now();
      });
      socket.on('connect', () => {
        timing.connectEnd = performance.now();
      });
      socket.on('secureConnect', () => {
        timing.tlsEnd = performance.now();
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    const timeoutMs = options.timeout && options.timeout > 0 ? options.timeout : 30000;
    req.setTimeout(timeoutMs, () => {
      req.destroy();
      reject(new Error(`Request timed out after ${timeoutMs}ms`));
    });

    if (!['GET', 'HEAD', 'OPTIONS'].includes(options.method)) {
      if (options.binaryBody) {
        req.write(options.binaryBody);
      } else if (options.body) {
        req.write(options.body);
      }
    }

    req.end();
  });
}

function parseDigestChallenge(header: string): Record<string, string> {
  const params: Record<string, string> = {};
  const digestPrefix = header.replace(/^Digest\s+/i, '');
  const regex = /(\w+)=(?:"([^"]*)"|([\w=]+))/g;
  let match;
  while ((match = regex.exec(digestPrefix)) !== null) {
    params[match[1]] = match[2] !== undefined ? match[2] : match[3];
  }
  return params;
}

function computeDigestAuth(
  method: string,
  uri: string,
  username: string,
  password: string,
  challenge: Record<string, string>,
  nc: number
): string {
  const realm = challenge.realm || '';
  const nonce = challenge.nonce || '';
  const qop = challenge.qop || '';
  const opaque = challenge.opaque || '';
  const algorithm = (challenge.algorithm || 'MD5').toUpperCase();

  const hash = (data: string) => {
    if (algorithm === 'MD5-SESS' || algorithm === 'MD5') {
      return crypto.createHash('md5').update(data).digest('hex');
    }
    return crypto.createHash('sha256').update(data).digest('hex');
  };

  let ha1 = hash(`${username}:${realm}:${password}`);
  if (algorithm === 'MD5-SESS') {
    const cnonce = crypto.randomBytes(8).toString('hex');
    ha1 = hash(`${ha1}:${nonce}:${cnonce}`);
  }

  const ha2 = hash(`${method}:${uri}`);

  const ncStr = nc.toString(16).padStart(8, '0');
  const cnonce = crypto.randomBytes(8).toString('hex');

  let response: string;
  if (qop === 'auth' || qop === 'auth-int') {
    response = hash(`${ha1}:${nonce}:${ncStr}:${cnonce}:auth:${ha2}`);
  } else {
    response = hash(`${ha1}:${nonce}:${ha2}`);
  }

  let authHeader = `Digest username="${username}", realm="${realm}", nonce="${nonce}", uri="${uri}", response="${response}"`;
  if (qop) {
    authHeader += `, qop=auth, nc=${ncStr}, cnonce="${cnonce}"`;
  }
  if (opaque) {
    authHeader += `, opaque="${opaque}"`;
  }
  if (algorithm !== 'MD5') {
    authHeader += `, algorithm=${algorithm}`;
  }

  return authHeader;
}

export async function executeProxy(payload: ProxyRequest): Promise<ProxyResponse> {
  const { method, url, headers, body, digestAuth, clientCert, binaryBase64, timeout } = payload;

  if (!url) {
    throw new Error('URL is required');
  }

  let agent: https.Agent | undefined;
  const parsedUrl = new URL(url);
  const isHttps = parsedUrl.protocol === 'https:';

  if (clientCert && isHttps) {
    const agentOptions: https.AgentOptions = {
      rejectUnauthorized: true,
    };
    if (clientCert.certPem) { agentOptions.cert = clientCert.certPem; }
    if (clientCert.keyPem) { agentOptions.key = clientCert.keyPem; }
    if (clientCert.caPem) { agentOptions.ca = clientCert.caPem; }
    if (clientCert.passphrase) { agentOptions.passphrase = clientCert.passphrase; }
    agent = new https.Agent(agentOptions);
  }

  let requestBody = body;
  let binaryBuffer: Buffer | undefined;
  if (binaryBase64 && body) {
    binaryBuffer = Buffer.from(body, 'base64');
    requestBody = undefined;
  }

  let result = await makeTimedRequest(url, {
    method: method || 'GET',
    headers: headers || {},
    body: requestBody,
    binaryBody: binaryBuffer,
    agent,
    timeout: timeout || undefined,
  });

  if (digestAuth && result.status === 401) {
    const wwwAuth = result.headers['www-authenticate'] || '';
    if (wwwAuth.toLowerCase().startsWith('digest')) {
      const challenge = parseDigestChallenge(wwwAuth);
      const uri = parsedUrl.pathname + parsedUrl.search;
      const authHeader = computeDigestAuth(
        method || 'GET',
        uri,
        digestAuth.username,
        digestAuth.password,
        challenge,
        1
      );

      const retryHeaders = { ...(headers || {}), Authorization: authHeader };

      result = await makeTimedRequest(url, {
        method: method || 'GET',
        headers: retryHeaders,
        body: requestBody,
        binaryBody: binaryBuffer,
        agent,
        timeout: timeout || undefined,
      });
    }
  }

  if (agent) {
    agent.destroy();
  }

  return {
    status: result.status,
    statusText: result.statusText,
    headers: result.headers,
    setCookies: result.setCookies,
    body: result.body,
    time: result.timing.total,
    timing: result.timing,
  };
}
