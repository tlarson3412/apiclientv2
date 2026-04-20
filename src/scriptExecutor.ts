import * as vm from 'vm';
import { executeProxy } from './proxyHandler';

interface ScriptInput {
  script: string;
  request: {
    id: string;
    name: string;
    method: string;
    url: string;
    interpolatedUrl: string;
    headers: { key: string; value: string; enabled: boolean }[];
    body: string;
    bodyType?: string;
    bodyUrlEncoded?: { key: string; value: string }[];
    collectionId?: string;
  };
  response?: {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    body: string;
    time: number;
    size: number;
    contentType: string;
  };
  envVariables: Record<string, string>;
  collectionVariables: Record<string, string>;
  isTestScript: boolean;
}

interface ScriptResult {
  success: boolean;
  logs: string[];
  error?: string;
  variableUpdates: Record<string, string>;
  collectionVariableUpdates: Record<string, string>;
  collectionVariableDeletes: string[];
  testResults: { assertionId: string; passed: boolean; message: string }[];
  nextRequest?: string | null;
}

function deepGet(obj: any, path: string): any {
  try {
    const parts = path.replace(/^\$\.?/, '').split(/\.|\[|\]/).filter(Boolean);
    let current = obj;
    for (const part of parts) {
      if (current == null) return undefined;
      current = current[part];
    }
    return current;
  } catch {
    return undefined;
  }
}

function createExpect(value: any): any {
  const state = { negated: false };

  const assert = (condition: boolean, message: string) => {
    if (!(state.negated ? !condition : condition)) {
      throw new Error(message);
    }
  };

  const chain: any = {
    to: null,
    be: null,
    have: null,
    not: null,
    at: null,

    a: (type: string) => {
      assert(typeof value === type, `expected ${JSON.stringify(value)} to be a ${type}`);
      return chain;
    },
    an: (type: string) => chain.a(type),

    equal: (expected: any) => {
      assert(value === expected, `expected ${JSON.stringify(value)} to equal ${JSON.stringify(expected)}`);
      return chain;
    },
    eql: (expected: any) => {
      assert(
        JSON.stringify(value) === JSON.stringify(expected),
        `expected ${JSON.stringify(value)} to deeply equal ${JSON.stringify(expected)}`
      );
      return chain;
    },

    property: (prop: string) => {
      assert(value != null && prop in value, `expected object to have property '${prop}'`);
      return createExpect(value?.[prop]);
    },

    include: (item: any) => {
      if (typeof value === 'string') {
        assert(value.includes(item), `expected '${value}' to include '${item}'`);
      } else if (Array.isArray(value)) {
        assert(value.includes(item), `expected array to include ${JSON.stringify(item)}`);
      }
      return chain;
    },

    above: (n: number) => {
      assert(value > n, `expected ${value} to be above ${n}`);
      return chain;
    },
    below: (n: number) => {
      assert(value < n, `expected ${value} to be below ${n}`);
      return chain;
    },
    least: (n: number) => {
      assert(value >= n, `expected ${value} to be at least ${n}`);
      return chain;
    },
    most: (n: number) => {
      assert(value <= n, `expected ${value} to be at most ${n}`);
      return chain;
    },

    ok: undefined as any,
    true: undefined as any,
    false: undefined as any,
    null: undefined as any,
    undefined: undefined as any,
    exist: undefined as any,
    empty: undefined as any,

    length: (expected: number) => {
      const len = value?.length;
      assert(len === expected, `expected length ${len} to equal ${expected}`);
      return chain;
    },
    string: (s: string) => chain.include(s),
    oneOf: (list: any[]) => {
      assert(list.includes(value), `expected ${JSON.stringify(value)} to be one of ${JSON.stringify(list)}`);
      return chain;
    },
    status: (code: number) => {
      const actual = value?.code || value?.status || value;
      assert(actual === code, `expected status ${actual} to equal ${code}`);
      return chain;
    },
  };

  Object.defineProperty(chain, 'ok', {
    get: () => { assert(!!value, `expected ${JSON.stringify(value)} to be truthy`); return chain; },
  });
  Object.defineProperty(chain, 'true', {
    get: () => { assert(value === true, `expected ${value} to be true`); return chain; },
  });
  Object.defineProperty(chain, 'false', {
    get: () => { assert(value === false, `expected ${value} to be false`); return chain; },
  });
  Object.defineProperty(chain, 'null', {
    get: () => { assert(value === null, `expected ${value} to be null`); return chain; },
  });
  Object.defineProperty(chain, 'undefined', {
    get: () => { assert(value === undefined, `expected ${value} to be undefined`); return chain; },
  });
  Object.defineProperty(chain, 'exist', {
    get: () => { assert(value != null, 'expected value to exist'); return chain; },
  });
  Object.defineProperty(chain, 'empty', {
    get: () => {
      const isEmpty =
        value == null ||
        value === '' ||
        (Array.isArray(value) && value.length === 0) ||
        (typeof value === 'object' && Object.keys(value).length === 0);
      assert(isEmpty, `expected ${JSON.stringify(value)} to be empty`);
      return chain;
    },
  });

  chain.to = chain;
  chain.be = chain;
  chain.have = chain;
  chain.at = chain;
  Object.defineProperty(chain, 'not', {
    get: () => { state.negated = !state.negated; return chain; },
  });

  return chain;
}

async function executeSendRequest(
  requestSpec: any,
  logs: string[],
): Promise<{ error: any; response: any }> {
  try {
    let url = '';
    let method = 'GET';
    const headers: Record<string, string> = {};
    let body: string | undefined;

    if (typeof requestSpec === 'string') {
      url = requestSpec;
    } else if (requestSpec && typeof requestSpec === 'object') {
      const rawUrl = requestSpec.url?.toString?.() || requestSpec.url || '';
      if (typeof rawUrl === 'object' && (rawUrl as any).raw) {
        url = (rawUrl as any).raw;
      } else {
        url = String(rawUrl);
      }

      method = (requestSpec.method || 'GET').toUpperCase();

      if (Array.isArray(requestSpec.header)) {
        for (const h of requestSpec.header) {
          if (h.key && h.value !== undefined) {
            headers[h.key] = h.value;
          }
        }
      } else if (requestSpec.header && typeof requestSpec.header === 'object') {
        Object.assign(headers, requestSpec.header);
      }

      if (requestSpec.body) {
        if (requestSpec.body.mode === 'urlencoded' && Array.isArray(requestSpec.body.urlencoded)) {
          const params = new URLSearchParams();
          for (const entry of requestSpec.body.urlencoded) {
            if (entry.key !== undefined) {
              params.append(entry.key, entry.value ?? '');
            }
          }
          body = params.toString();
          if (!headers['content-type'] && !headers['Content-Type']) {
            headers['Content-Type'] = 'application/x-www-form-urlencoded';
          }
        } else if (requestSpec.body.mode === 'raw') {
          body = requestSpec.body.raw || '';
        } else if (typeof requestSpec.body === 'string') {
          body = requestSpec.body;
        }
      }
    }

    const result = await executeProxy({ method, url, headers, body }) as any;

    let bodyStr = '';
    if (typeof result.body === 'string') {
      bodyStr = result.body;
    } else if (result.body !== undefined) {
      bodyStr = JSON.stringify(result.body);
    }

    let jsonBody: any = null;
    try { jsonBody = JSON.parse(bodyStr); } catch {}

    return {
      error: null,
      response: {
        code: result.status || 0,
        status: result.statusText || '',
        headers: {
          get: (name: string) => {
            if (!result.headers) return undefined;
            const key = Object.keys(result.headers).find(k => k.toLowerCase() === name.toLowerCase());
            return key ? result.headers[key] : undefined;
          },
          toObject: () => result.headers || {},
        },
        json: () => jsonBody,
        text: () => bodyStr,
        responseTime: result.time || 0,
      },
    };
  } catch (err: any) {
    return { error: err, response: null };
  }
}

export async function executeScript(input: ScriptInput): Promise<ScriptResult> {
  if (!input.script || !input.script.trim()) {
    return {
      success: true,
      logs: [],
      variableUpdates: {},
      collectionVariableUpdates: {},
      collectionVariableDeletes: [],
      testResults: [],
    };
  }

  const logs: string[] = [];
  const variableUpdates: Record<string, string> = {};
  const collectionVariableUpdates: Record<string, string> = {};
  const collectionVariableDeletes: string[] = [];
  const testResults: { assertionId: string; passed: boolean; message: string }[] = [];
  let nextRequest: string | null | undefined;

  const allVars: Record<string, string> = { ...input.collectionVariables, ...input.envVariables };

  const consoleMock = {
    log: (...args: any[]) => logs.push(
      args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')
    ),
    warn: (...args: any[]) => logs.push(
      '[WARN] ' + args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')
    ),
    error: (...args: any[]) => logs.push(
      '[ERROR] ' + args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')
    ),
    info: (...args: any[]) => logs.push(
      '[INFO] ' + args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')
    ),
  };

  let responseJson: any = null;
  if (input.response) {
    try { responseJson = JSON.parse(input.response.body); } catch {}
  }

  const pmResponse = input.response ? {
    code: input.response.status,
    status: input.response.statusText,
    headers: {
      get: (name: string) => {
        const key = Object.keys(input.response!.headers).find(
          k => k.toLowerCase() === name.toLowerCase()
        );
        return key ? input.response!.headers[key] : undefined;
      },
      toObject: () => ({ ...input.response!.headers }),
    },
    responseTime: input.response.time,
    responseSize: input.response.size,
    json: () => responseJson,
    text: () => input.response!.body,
    to: {
      have: {
        status: (code: number) => input.response!.status === code,
        jsonBody: (path?: string) => responseJson ? (path ? deepGet(responseJson, path) !== undefined : true) : false,
        header: (name: string) => Object.keys(input.response!.headers).some(
          k => k.toLowerCase() === name.toLowerCase()
        ),
        property: (prop: string) => responseJson && prop in responseJson,
      },
      not: {
        be: { error: input.response.status < 400 },
        have: {
          jsonBody: (path?: string) => responseJson ? (path ? deepGet(responseJson, path) === undefined : false) : true,
        },
      },
      be: {
        ok: input.response.status >= 200 && input.response.status < 300,
      },
    },
  } : undefined;

  const interpolatedUrl = input.request.interpolatedUrl;

  const pmRequest = {
    url: {
      toString: () => interpolatedUrl,
      path: {
        join: (sep?: string) => {
          try {
            return new URL(interpolatedUrl).pathname.split('/').filter(Boolean).join(sep || '/');
          } catch {
            return interpolatedUrl;
          }
        },
      },
    },
    headers: {
      get: (name: string) =>
        input.request.headers.find(
          h => h.enabled && h.key.toLowerCase() === name.toLowerCase()
        )?.value,
      toObject: () => Object.fromEntries(
        input.request.headers.filter(h => h.enabled && h.key).map(h => [h.key, h.value])
      ),
    },
    method: input.request.method,
    body: {
      raw: input.request.body,
      toString: () => input.request.body,
      mode: input.request.bodyType || 'raw',
      urlencoded: input.request.bodyUrlEncoded || [],
    },
  };

  const sendRequestPromises: Promise<void>[] = [];

  const pm: any = {
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
    expect: (val: any) => createExpect(val),
    response: pmResponse,
    request: pmRequest,
    variables: {
      get: (key: string) => variableUpdates[key] ?? allVars[key] ?? '',
      set: (key: string, val: any) => { variableUpdates[key] = String(val); },
      has: (key: string) => key in variableUpdates || key in allVars,
      replaceIn: (text: string) =>
        text.replace(/\{\{(\w+)\}\}/g, (_, k) => variableUpdates[k] ?? allVars[k] ?? ''),
      toObject: () => ({ ...allVars, ...variableUpdates }),
    },
    environment: {
      get: (key: string) => variableUpdates[key] ?? input.envVariables[key] ?? '',
      set: (key: string, val: any) => { variableUpdates[key] = String(val); },
      has: (key: string) => key in variableUpdates || key in input.envVariables,
      unset: (key: string) => { variableUpdates[key] = ''; },
      toObject: () => ({ ...input.envVariables, ...variableUpdates }),
    },
    collectionVariables: {
      get: (key: string) => collectionVariableUpdates[key] ?? input.collectionVariables[key] ?? '',
      set: (key: string, val: any) => { collectionVariableUpdates[key] = String(val); },
      has: (key: string) => key in collectionVariableUpdates || key in input.collectionVariables,
      unset: (key: string) => { collectionVariableDeletes.push(key); },
      toObject: () => ({ ...input.collectionVariables, ...collectionVariableUpdates }),
    },
    info: {
      requestId: input.request.id,
      requestName: input.request.name,
      iteration: 0,
      iterationCount: 1,
      eventName: input.isTestScript ? 'test' : 'prerequest',
    },
    execution: {
      setNextRequest: (name: string | null) => { nextRequest = name; },
    },
    sendRequest: (spec: any, callback?: (err: any, res: any) => void) => {
      const promise = executeSendRequest(spec, logs).then(({ error, response }) => {
        if (callback) {
          try {
            callback(error, response);
          } catch (err: any) {
            logs.push(`[ERROR] pm.sendRequest callback error: ${err.message}`);
          }
        }
      });
      sendRequestPromises.push(promise);
    },
  };

  const fakeRequire = (mod: string) => {
    logs.push(`[WARN] require('${mod}') is not supported; returning empty object`);
    return {};
  };

  try {
    const sandbox: any = {
      pm,
      console: consoleMock,
      request: pmRequest,
      variables: { ...allVars, ...variableUpdates },
      setVariable: (key: string, val: any) => { variableUpdates[key] = val; },
      btoa: (str: string) => Buffer.from(str, 'binary').toString('base64'),
      atob: (str: string) => Buffer.from(str, 'base64').toString('binary'),
      Date,
      Math,
      JSON,
      parseInt,
      parseFloat,
      encodeURIComponent,
      decodeURIComponent,
      Buffer,
      require: fakeRequire,
      setTimeout: (fn: () => void, ms?: number) =>
        new Promise<void>(resolve => {
          setTimeout(() => {
            try { fn(); } catch {}
            resolve();
          }, ms || 0);
        }),
    };

    const context = vm.createContext(sandbox);

    const wrappedScript = `
      (async () => {
        ${input.script}
        ;await Promise.all(__sendRequestPromises__);
      })()
    `;

    sandbox.__sendRequestPromises__ = sendRequestPromises;

    const script = new vm.Script(wrappedScript, {
      filename: 'postman-script.js',
      timeout: 30000,
    });

    const result = script.runInContext(context, { timeout: 30000 });
    if (result && typeof result.then === 'function') {
      await result;
    }

    return {
      success: true,
      logs,
      variableUpdates,
      collectionVariableUpdates,
      collectionVariableDeletes,
      testResults,
      nextRequest,
    };
  } catch (err: any) {
    return {
      success: false,
      logs,
      error: err.message || 'Script execution failed',
      variableUpdates,
      collectionVariableUpdates,
      collectionVariableDeletes,
      testResults,
      nextRequest,
    };
  }
}
