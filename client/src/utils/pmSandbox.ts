import type { ApiRequest, ApiResponse, TestResult } from '../types';

export interface PmScriptResult {
  success: boolean;
  logs: string[];
  error?: string;
  variableUpdates: Record<string, string>;
  collectionVariableUpdates: Record<string, string>;
  collectionVariableDeletes: string[];
  testResults: TestResult[];
  nextRequest?: string | null;
}

interface PmScriptOptions {
  script: string;
  request: ApiRequest;
  response?: ApiResponse;
  envVariables: Record<string, string>;
  collectionVariables: Record<string, string>;
  interpolate: (text: string) => string;
  isTestScript?: boolean;
}

function buildPmContext(options: PmScriptOptions) {
  const {
    script, request, response, envVariables,
    collectionVariables, interpolate, isTestScript,
  } = options;

  const logs: string[] = [];
  const variableUpdates: Record<string, string> = {};
  const collectionVariableUpdates: Record<string, string> = {};
  const collectionVariableDeletes: string[] = [];
  const testResults: TestResult[] = [];
  let nextRequest: string | null | undefined = undefined;

  const mergedVars = { ...collectionVariables, ...envVariables };

  const consoleMock = {
    log: (...args: any[]) => logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')),
    warn: (...args: any[]) => logs.push('[WARN] ' + args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')),
    error: (...args: any[]) => logs.push('[ERROR] ' + args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')),
    info: (...args: any[]) => logs.push('[INFO] ' + args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')),
  };

  let parsedResponseBody: any = null;
  if (response) {
    try { parsedResponseBody = JSON.parse(response.body); } catch {}
  }

  const pmResponse = response ? {
    code: response.status,
    status: response.statusText,
    headers: {
      get: (name: string) => {
        const key = Object.keys(response.headers).find(k => k.toLowerCase() === name.toLowerCase());
        return key ? response.headers[key] : undefined;
      },
      toObject: () => ({ ...response.headers }),
    },
    responseTime: response.time,
    responseSize: response.size,
    json: () => parsedResponseBody,
    text: () => response.body,
    to: {
      have: {
        status: (code: number) => response.status === code,
        jsonBody: (path?: string) => {
          if (!parsedResponseBody) return false;
          if (!path) return true;
          return evaluateJsonPath(parsedResponseBody, path) !== undefined;
        },
        header: (name: string) => {
          return Object.keys(response.headers).some(k => k.toLowerCase() === name.toLowerCase());
        },
        property: (prop: string) => parsedResponseBody && prop in parsedResponseBody,
      },
      not: {
        be: { error: response.status < 400 },
        have: {
          jsonBody: (path?: string) => {
            if (!parsedResponseBody) return true;
            if (!path) return false;
            return evaluateJsonPath(parsedResponseBody, path) === undefined;
          },
        },
      },
      be: {
        ok: response.status >= 200 && response.status < 300,
      },
    },
  } : undefined;

  const pmRequest = {
    url: {
      toString: () => interpolate(request.url),
      path: {
        join: (sep?: string) => {
          try {
            const url = new URL(interpolate(request.url));
            return url.pathname.split('/').filter(Boolean).join(sep || '/');
          } catch { return interpolate(request.url); }
        },
      },
    },
    headers: {
      get: (name: string) => {
        const h = request.headers.find(h => h.enabled && h.key.toLowerCase() === name.toLowerCase());
        return h?.value;
      },
      toObject: () => Object.fromEntries(
        request.headers.filter(h => h.enabled && h.key).map(h => [h.key, h.value])
      ),
    },
    method: request.method,
    body: {
      raw: request.body,
      toString: () => request.body,
      mode: request.bodyType || 'raw',
      urlencoded: request.bodyUrlEncoded || [],
    },
  };

  const chaiExpect = (val: any) => createChaiExpectable(val);

  const pm = {
    test: (name: string, fn: () => void) => {
      try {
        fn();
        testResults.push({
          assertionId: `pm-test-${testResults.length}`,
          passed: true,
          message: name,
        });
      } catch (err: any) {
        testResults.push({
          assertionId: `pm-test-${testResults.length}`,
          passed: false,
          message: `${name}: ${err.message || err}`,
        });
      }
    },
    expect: chaiExpect,
    response: pmResponse,
    request: pmRequest,
    variables: {
      get: (key: string) => variableUpdates[key] ?? mergedVars[key] ?? '',
      set: (key: string, value: any) => { variableUpdates[key] = String(value); },
      has: (key: string) => key in variableUpdates || key in mergedVars,
      replaceIn: (template: string) => {
        return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
          return variableUpdates[key] ?? mergedVars[key] ?? '';
        });
      },
      toObject: () => ({ ...mergedVars, ...variableUpdates }),
    },
    environment: {
      get: (key: string) => variableUpdates[key] ?? envVariables[key] ?? '',
      set: (key: string, value: any) => { variableUpdates[key] = String(value); },
      has: (key: string) => key in variableUpdates || key in envVariables,
      unset: (key: string) => { variableUpdates[key] = ''; },
      toObject: () => ({ ...envVariables, ...variableUpdates }),
    },
    collectionVariables: {
      get: (key: string) => collectionVariableUpdates[key] ?? collectionVariables[key] ?? '',
      set: (key: string, value: any) => { collectionVariableUpdates[key] = String(value); },
      has: (key: string) => key in collectionVariableUpdates || key in collectionVariables,
      unset: (key: string) => { collectionVariableDeletes.push(key); },
      toObject: () => ({ ...collectionVariables, ...collectionVariableUpdates }),
    },
    info: {
      requestId: request.id,
      requestName: request.name,
      iteration: 0,
      iterationCount: 1,
      eventName: isTestScript ? 'test' : 'prerequest',
    },
    execution: {
      setNextRequest: (name: string | null) => {
        nextRequest = name;
      },
    },
    sendRequest: null as any,
  };

  const requireMock = (name: string) => {
    logs.push(`[WARN] require('${name}') is not supported; returning empty object`);
    return {};
  };

  const getResult = (): PmScriptResult => ({
    success: true, logs, variableUpdates,
    collectionVariableUpdates, collectionVariableDeletes, testResults,
    nextRequest,
  });

  const getErrorResult = (err: any): PmScriptResult => ({
    success: false,
    logs,
    error: err.message || 'Script execution failed',
    variableUpdates,
    collectionVariableUpdates,
    collectionVariableDeletes,
    testResults,
    nextRequest,
  });

  return {
    pm, consoleMock, pmRequest, mergedVars, variableUpdates,
    requireMock, getResult, getErrorResult, logs,
  };
}

export function runPmScript(options: PmScriptOptions): PmScriptResult {
  if (!options.script || !options.script.trim()) {
    return {
      success: true, logs: [], variableUpdates: {},
      collectionVariableUpdates: {}, collectionVariableDeletes: [], testResults: [],
    };
  }

  const ctx = buildPmContext(options);

  ctx.pm.sendRequest = (_req: any, _cb: any) => {
    ctx.logs.push('[WARN] pm.sendRequest is not supported in synchronous mode. Use the Send button to run scripts with full pm.sendRequest support.');
  };

  try {
    const fn = new Function(
      'pm', 'console', 'request', 'variables', 'setVariable',
      'btoa', 'atob', 'Date', 'Math', 'JSON',
      'parseInt', 'parseFloat', 'encodeURIComponent', 'decodeURIComponent',
      'setTimeout', 'require',
      options.script
    );

    fn(
      ctx.pm, ctx.consoleMock, ctx.pmRequest,
      { ...ctx.mergedVars, ...ctx.variableUpdates },
      (key: string, value: string) => { ctx.variableUpdates[key] = value; },
      btoa, atob, Date, Math, JSON,
      parseInt, parseFloat, encodeURIComponent, decodeURIComponent,
      (cb: Function, _ms?: number) => { try { cb(); } catch {} },
      ctx.requireMock,
    );

    return ctx.getResult();
  } catch (err: any) {
    return ctx.getErrorResult(err);
  }
}

async function proxySendRequest(reqSpec: any): Promise<{ error: any; response: any }> {
  try {
    let url = '';
    let method = 'GET';
    let headers: Record<string, string> = {};
    let body: string | undefined;

    if (typeof reqSpec === 'string') {
      url = reqSpec;
    } else if (reqSpec && typeof reqSpec === 'object') {
      const rawUrl = reqSpec.url?.toString?.() || reqSpec.url || '';
      if (typeof rawUrl === 'object' && (rawUrl as any).raw) {
        url = (rawUrl as any).raw;
      } else {
        url = String(rawUrl);
      }
      method = (reqSpec.method || 'GET').toUpperCase();

      if (Array.isArray(reqSpec.header)) {
        for (const h of reqSpec.header) {
          if (h.key && h.value !== undefined) {
            headers[h.key] = h.value;
          }
        }
      } else if (reqSpec.header && typeof reqSpec.header === 'object') {
        headers = { ...reqSpec.header };
      }

      if (reqSpec.body) {
        if (reqSpec.body.mode === 'urlencoded' && Array.isArray(reqSpec.body.urlencoded)) {
          const params = new URLSearchParams();
          for (const p of reqSpec.body.urlencoded) {
            if (p.key !== undefined) {
              params.append(p.key, p.value ?? '');
            }
          }
          body = params.toString();
          if (!headers['content-type'] && !headers['Content-Type']) {
            headers['Content-Type'] = 'application/x-www-form-urlencoded';
          }
        } else if (reqSpec.body.mode === 'raw') {
          body = reqSpec.body.raw || '';
        } else if (typeof reqSpec.body === 'string') {
          body = reqSpec.body;
        }
      }
    }

    const proxyResponse = await fetch('/api/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ method, url, headers, body }),
    });

    const data = await proxyResponse.json();

    let responseBody = '';
    if (typeof data.body === 'string') {
      responseBody = data.body;
    } else if (data.body !== undefined) {
      responseBody = JSON.stringify(data.body);
    }

    let parsedJson: any = null;
    try { parsedJson = JSON.parse(responseBody); } catch {}

    const responseObj = {
      code: data.status || 0,
      status: data.statusText || '',
      headers: {
        get: (name: string) => {
          if (!data.headers) return undefined;
          const key = Object.keys(data.headers).find(k => k.toLowerCase() === name.toLowerCase());
          return key ? data.headers[key] : undefined;
        },
        toObject: () => data.headers || {},
      },
      json: () => parsedJson,
      text: () => responseBody,
      responseTime: data.time || 0,
    };

    return { error: null, response: responseObj };
  } catch (err: any) {
    return { error: err, response: null };
  }
}

export async function runPmScriptAsync(options: PmScriptOptions): Promise<PmScriptResult> {
  if (!options.script || !options.script.trim()) {
    return {
      success: true, logs: [], variableUpdates: {},
      collectionVariableUpdates: {}, collectionVariableDeletes: [], testResults: [],
    };
  }

  const ctx = buildPmContext(options);

  const sendRequestPromises: Promise<void>[] = [];

  ctx.pm.sendRequest = (reqSpec: any, callback?: (err: any, response: any) => void) => {
    const promise = proxySendRequest(reqSpec).then(({ error, response }) => {
      if (callback) {
        try {
          callback(error, response);
        } catch (e: any) {
          ctx.logs.push(`[ERROR] pm.sendRequest callback error: ${e.message}`);
        }
      }
    });
    sendRequestPromises.push(promise);
  };

  try {
    const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;

    const wrappedScript = `
      ${options.script}
      ;await Promise.all(__sendRequestPromises__);
    `;

    const fn = new AsyncFunction(
      'pm', 'console', 'request', 'variables', 'setVariable',
      'btoa', 'atob', 'Date', 'Math', 'JSON',
      'parseInt', 'parseFloat', 'encodeURIComponent', 'decodeURIComponent',
      'setTimeout', 'require', '__sendRequestPromises__',
      'Buffer',
      wrappedScript
    );

    const BufferMock = {
      from: (str: string, encoding?: string) => {
        if (encoding === 'utf-8' || encoding === 'utf8' || !encoding) {
          return {
            toString: (enc?: string) => {
              if (enc === 'base64') return btoa(str);
              return str;
            },
          };
        }
        return {
          toString: (enc?: string) => {
            if (enc === 'base64') return btoa(str);
            return str;
          },
        };
      },
    };

    await fn(
      ctx.pm, ctx.consoleMock, ctx.pmRequest,
      { ...ctx.mergedVars, ...ctx.variableUpdates },
      (key: string, value: string) => { ctx.variableUpdates[key] = value; },
      btoa, atob, Date, Math, JSON,
      parseInt, parseFloat, encodeURIComponent, decodeURIComponent,
      (cb: Function, ms?: number) => {
        return new Promise<void>(resolve => {
          setTimeout(() => { try { cb(); } catch {} resolve(); }, ms || 0);
        });
      },
      ctx.requireMock,
      sendRequestPromises,
      BufferMock,
    );

    return ctx.getResult();
  } catch (err: any) {
    return ctx.getErrorResult(err);
  }
}

function evaluateJsonPath(obj: any, path: string): any {
  try {
    const parts = path.replace(/^\$\.?/, '').split(/\.|\[|\]/).filter(Boolean);
    let current = obj;
    for (const part of parts) {
      if (current === null || current === undefined) return undefined;
      current = current[part];
    }
    return current;
  } catch { return undefined; }
}

function createChaiExpectable(actual: any) {
  const state = { negated: false };

  const check = (condition: boolean, msg: string) => {
    const pass = state.negated ? !condition : condition;
    if (!pass) throw new Error(msg);
  };

  const chainable: any = {
    to: null as any,
    be: null as any,
    have: null as any,
    not: null as any,
    a: (type: string) => {
      check(typeof actual === type, `expected ${JSON.stringify(actual)} to be a ${type}`);
      return chainable;
    },
    an: (type: string) => chainable.a(type),
    equal: (expected: any) => {
      check(actual === expected, `expected ${JSON.stringify(actual)} to equal ${JSON.stringify(expected)}`);
      return chainable;
    },
    eql: (expected: any) => {
      check(JSON.stringify(actual) === JSON.stringify(expected),
        `expected ${JSON.stringify(actual)} to deeply equal ${JSON.stringify(expected)}`);
      return chainable;
    },
    property: (prop: string) => {
      check(actual != null && prop in actual, `expected object to have property '${prop}'`);
      return createChaiExpectable(actual?.[prop]);
    },
    include: (val: any) => {
      if (typeof actual === 'string') {
        check(actual.includes(val), `expected '${actual}' to include '${val}'`);
      } else if (Array.isArray(actual)) {
        check(actual.includes(val), `expected array to include ${JSON.stringify(val)}`);
      }
      return chainable;
    },
    above: (n: number) => {
      check(actual > n, `expected ${actual} to be above ${n}`);
      return chainable;
    },
    below: (n: number) => {
      check(actual < n, `expected ${actual} to be below ${n}`);
      return chainable;
    },
    least: (n: number) => {
      check(actual >= n, `expected ${actual} to be at least ${n}`);
      return chainable;
    },
    most: (n: number) => {
      check(actual <= n, `expected ${actual} to be at most ${n}`);
      return chainable;
    },
    ok: undefined as any,
    true: undefined as any,
    false: undefined as any,
    null: undefined as any,
    undefined: undefined as any,
    exist: undefined as any,
    empty: undefined as any,
    length: (n: number) => {
      const len = actual?.length;
      check(len === n, `expected length ${len} to equal ${n}`);
      return chainable;
    },
    string: (s: string) => chainable.include(s),
    oneOf: (list: any[]) => {
      check(list.includes(actual), `expected ${JSON.stringify(actual)} to be one of ${JSON.stringify(list)}`);
      return chainable;
    },
    status: (code: number) => {
      const actualCode = actual?.code || actual?.status || actual;
      check(actualCode === code, `expected status ${actualCode} to equal ${code}`);
      return chainable;
    },
    at: null as any,
  };

  Object.defineProperty(chainable, 'ok', {
    get: () => { check(!!actual, `expected ${JSON.stringify(actual)} to be truthy`); return chainable; },
  });
  Object.defineProperty(chainable, 'true', {
    get: () => { check(actual === true, `expected ${actual} to be true`); return chainable; },
  });
  Object.defineProperty(chainable, 'false', {
    get: () => { check(actual === false, `expected ${actual} to be false`); return chainable; },
  });
  Object.defineProperty(chainable, 'null', {
    get: () => { check(actual === null, `expected ${actual} to be null`); return chainable; },
  });
  Object.defineProperty(chainable, 'undefined', {
    get: () => { check(actual === undefined, `expected ${actual} to be undefined`); return chainable; },
  });
  Object.defineProperty(chainable, 'exist', {
    get: () => { check(actual != null, `expected value to exist`); return chainable; },
  });
  Object.defineProperty(chainable, 'empty', {
    get: () => {
      const isEmpty = actual == null || actual === '' || (Array.isArray(actual) && actual.length === 0) || (typeof actual === 'object' && Object.keys(actual).length === 0);
      check(isEmpty, `expected ${JSON.stringify(actual)} to be empty`);
      return chainable;
    },
  });

  chainable.to = chainable;
  chainable.be = chainable;
  chainable.have = chainable;
  chainable.at = chainable;

  Object.defineProperty(chainable, 'not', {
    get: () => {
      state.negated = !state.negated;
      return chainable;
    },
  });

  return chainable;
}
