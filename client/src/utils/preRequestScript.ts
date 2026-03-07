import type { ApiRequest } from '../types';

interface ScriptContext {
  request: {
    url: string;
    method: string;
    headers: Record<string, string>;
    body: string;
  };
  variables: Record<string, string>;
  setVariable: (key: string, value: string) => void;
}

export interface ScriptResult {
  success: boolean;
  logs: string[];
  error?: string;
  variableUpdates: Record<string, string>;
}

export function runPreRequestScript(
  script: string,
  request: ApiRequest,
  interpolate: (text: string) => string,
  getVariables: () => Record<string, string>
): ScriptResult {
  const logs: string[] = [];
  const variableUpdates: Record<string, string> = {};

  if (!script || !script.trim()) {
    return { success: true, logs, variableUpdates };
  }

  const context: ScriptContext = {
    request: {
      url: interpolate(request.url),
      method: request.method,
      headers: Object.fromEntries(
        request.headers.filter(h => h.enabled && h.key).map(h => [h.key, h.value])
      ),
      body: request.body,
    },
    variables: { ...getVariables() },
    setVariable: (key: string, value: string) => {
      variableUpdates[key] = value;
    },
  };

  try {
    const consoleMock = {
      log: (...args: any[]) => logs.push(args.map(String).join(' ')),
      warn: (...args: any[]) => logs.push('[WARN] ' + args.map(String).join(' ')),
      error: (...args: any[]) => logs.push('[ERROR] ' + args.map(String).join(' ')),
      info: (...args: any[]) => logs.push('[INFO] ' + args.map(String).join(' ')),
    };

    const fn = new Function(
      'console',
      'request',
      'variables',
      'setVariable',
      'btoa',
      'atob',
      'Date',
      'Math',
      'JSON',
      'parseInt',
      'parseFloat',
      'encodeURIComponent',
      'decodeURIComponent',
      script
    );

    fn(
      consoleMock,
      context.request,
      context.variables,
      context.setVariable,
      btoa,
      atob,
      Date,
      Math,
      JSON,
      parseInt,
      parseFloat,
      encodeURIComponent,
      decodeURIComponent
    );

    return { success: true, logs, variableUpdates };
  } catch (err: any) {
    return {
      success: false,
      logs,
      error: err.message || 'Script execution failed',
      variableUpdates,
    };
  }
}
