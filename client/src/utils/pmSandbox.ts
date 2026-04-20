import type { ApiRequest, ApiResponse, TestResult } from '../types';
import { vscodeClient } from '../lib/vscodeApi';

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

/**
 * Runs a Postman-compatible script by delegating to the extension host.
 * Scripts execute in Node.js via the vm module, bypassing webview CSP restrictions.
 */
export function runPmScript(options: PmScriptOptions): Promise<PmScriptResult> {
  return runPmScriptAsync(options);
}

export async function runPmScriptAsync(options: PmScriptOptions): Promise<PmScriptResult> {
  if (!options.script || !options.script.trim()) {
    return {
      success: true, logs: [], variableUpdates: {},
      collectionVariableUpdates: {}, collectionVariableDeletes: [], testResults: [],
    };
  }

  try {
    const { request, response, envVariables, collectionVariables, interpolate, isTestScript } = options;

    const result = await vscodeClient.executeScript({
      script: options.script,
      request: {
        id: request.id,
        name: request.name,
        method: request.method,
        url: request.url,
        interpolatedUrl: interpolate(request.url),
        headers: request.headers.map(h => ({ key: h.key, value: h.value, enabled: h.enabled })),
        body: request.body,
        bodyType: request.bodyType,
        bodyUrlEncoded: request.bodyUrlEncoded,
        collectionId: request.collectionId,
      },
      response: response ? {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        body: response.body,
        time: response.time,
        size: response.size,
        contentType: response.contentType,
      } : undefined,
      envVariables,
      collectionVariables,
      isTestScript: isTestScript || false,
    }) as PmScriptResult;

    return result;
  } catch (err: any) {
    return {
      success: false,
      logs: [],
      error: err.message || 'Script execution failed',
      variableUpdates: {},
      collectionVariableUpdates: {},
      collectionVariableDeletes: [],
      testResults: [],
    };
  }
}
