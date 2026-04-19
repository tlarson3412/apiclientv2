import type { ApiRequest, ApiResponse, AuthConfig, TimingBreakdown } from '../types';
import { useConsoleStore } from '../store/useConsoleStore';
import { v4 as uuidv4 } from 'uuid';
import { runPmScriptAsync } from './pmSandbox';
import { substitutePathVariables } from './pathVariables';
import { vscodeClient } from '../lib/vscodeApi';

function buildAuthHeaders(auth: AuthConfig): Record<string, string> {
  const headers: Record<string, string> = {};
  switch (auth.type) {
    case 'basic':
      if (auth.basic) {
        headers['Authorization'] = `Basic ${btoa(`${auth.basic.username}:${auth.basic.password}`)}`;
      }
      break;
    case 'bearer':
      if (auth.bearer) {
        headers['Authorization'] = `Bearer ${auth.bearer.token}`;
      }
      break;
    case 'api-key':
      if (auth.apiKey && auth.apiKey.addTo === 'header') {
        headers[auth.apiKey.key] = auth.apiKey.value;
      }
      break;
    case 'oauth2':
      if (auth.oauth2?.accessToken) {
        headers['Authorization'] = `Bearer ${auth.oauth2.accessToken}`;
      }
      break;
  }
  return headers;
}

function generateMultipartBody(
  entries: { key: string; value: string; type: 'text' | 'file'; fileName?: string; fileContentBase64?: string; contentType?: string }[],
  boundary: string
): string {
  let body = '';
  for (const entry of entries) {
    body += `--${boundary}\r\n`;
    if (entry.type === 'file' && entry.fileContentBase64) {
      body += `Content-Disposition: form-data; name="${entry.key}"; filename="${entry.fileName || 'file'}"\r\n`;
      body += `Content-Type: ${entry.contentType || 'application/octet-stream'}\r\n`;
      body += `Content-Transfer-Encoding: base64\r\n\r\n`;
      body += entry.fileContentBase64 + '\r\n';
    } else {
      body += `Content-Disposition: form-data; name="${entry.key}"\r\n\r\n`;
      body += entry.value + '\r\n';
    }
  }
  body += `--${boundary}--\r\n`;
  return body;
}

async function applyScriptResult(
  scriptResult: Awaited<ReturnType<typeof runPmScriptAsync>>,
  request: ApiRequest,
  state: any,
) {
  if (scriptResult.variableUpdates) {
    Object.entries(scriptResult.variableUpdates).forEach(([key, value]) => {
      state.setExtractedVariable(key, value);
    });
  }
  if (scriptResult.collectionVariableUpdates) {
    const col = request.collectionId
      ? state.collections.find((c: any) => c.id === request.collectionId)
      : undefined;
    if (col) {
      Object.entries(scriptResult.collectionVariableUpdates).forEach(([key, value]) => {
        const existingVar = col.variables?.find((v: any) => v.key === key);
        if (existingVar) {
          state.updateCollectionVariable(col.id, existingVar.id, { value });
        } else {
          state.addCollectionVariable(col.id, { key, value, enabled: true, type: 'string' });
        }
      });
    }
  }
  if (scriptResult.collectionVariableDeletes && scriptResult.collectionVariableDeletes.length > 0) {
    const col = request.collectionId
      ? state.collections.find((c: any) => c.id === request.collectionId)
      : undefined;
    if (col) {
      for (const key of scriptResult.collectionVariableDeletes) {
        const existingVar = col.variables?.find((v: any) => v.key === key);
        if (existingVar) {
          state.deleteCollectionVariable(col.id, existingVar.id);
        }
      }
    }
  }
}

export async function executeRequest(
  request: ApiRequest,
  interpolate: (text: string) => string
): Promise<ApiResponse> {
  const startTime = performance.now();
  const { useStore } = await import('../store/useStore');
  const state = useStore.getState();

  const env = state.environments.find(e => e.id === state.activeEnvironmentId);
  const envVars = env
    ? Object.fromEntries(env.variables.filter(v => v.enabled).map(v => [v.key, v.value]))
    : {};

  const col = request.collectionId
    ? state.collections.find(c => c.id === request.collectionId)
    : undefined;
  const colVars = col?.variables
    ? Object.fromEntries(col.variables.filter(v => v.enabled).map(v => [v.key, v.value]))
    : {};

  const folder = (request.folderId && col)
    ? col.folders.find(f => f.id === request.folderId)
    : undefined;

  const getFolderAncestors = () => {
    if (!folder || !col) return [];
    const ancestors: typeof col.folders = [];
    let current = folder;
    while (current) {
      ancestors.unshift(current);
      if (current.parentId) {
        current = col.folders.find(f => f.id === current!.parentId)!;
      } else {
        break;
      }
    }
    return ancestors;
  };

  const buildScriptContext = () => {
    const freshState = useStore.getState();
    const freshCol = request.collectionId
      ? freshState.collections.find(c => c.id === request.collectionId)
      : undefined;
    const freshColVars = freshCol?.variables
      ? Object.fromEntries(freshCol.variables.filter(v => v.enabled).map(v => [v.key, v.value]))
      : {};
    const freshEnv = freshState.environments.find(e => e.id === freshState.activeEnvironmentId);
    const freshEnvVars = freshEnv
      ? Object.fromEntries(freshEnv.variables.filter(v => v.enabled).map(v => [v.key, v.value]))
      : {};
    return { envVars: freshEnvVars, colVars: freshColVars };
  };

  if (col?.preRequestScript && col.preRequestScript.trim()) {
    const ctx = buildScriptContext();
    const result = await runPmScriptAsync({
      script: col.preRequestScript,
      request,
      envVariables: ctx.envVars,
      collectionVariables: ctx.colVars,
      interpolate,
      isTestScript: false,
    });
    await applyScriptResult(result, request, useStore.getState());
    if (result.logs.length > 0) {
      result.logs.forEach(l => console.log(`[Collection Script] ${l}`));
    }
  }

  const folderChain = getFolderAncestors();
  for (const f of folderChain) {
    if (f.preRequestScript && f.preRequestScript.trim()) {
      const ctx = buildScriptContext();
      const result = await runPmScriptAsync({
        script: f.preRequestScript,
        request,
        envVariables: ctx.envVars,
        collectionVariables: ctx.colVars,
        interpolate,
        isTestScript: false,
      });
      await applyScriptResult(result, request, useStore.getState());
      if (result.logs.length > 0) {
        result.logs.forEach(l => console.log(`[Folder Script: ${f.name}] ${l}`));
      }
    }
  }

  if (request.preRequestScript && request.preRequestScript.trim()) {
    const ctx = buildScriptContext();
    const result = await runPmScriptAsync({
      script: request.preRequestScript,
      request,
      envVariables: ctx.envVars,
      collectionVariables: ctx.colVars,
      interpolate,
      isTestScript: false,
    });
    await applyScriptResult(result, request, useStore.getState());
  }

  const freshInterpolate = (text: string) => {
    const s = useStore.getState();
    return s.interpolateVariables(text, request.collectionId);
  };

  let url = freshInterpolate(request.url);
  url = substitutePathVariables(url, request.pathVariables, freshInterpolate);

  const enabledParams = request.queryParams.filter(p => p.enabled && p.key);
  if (enabledParams.length > 0) {
    const searchParams = new URLSearchParams();
    enabledParams.forEach(p => {
      searchParams.append(freshInterpolate(p.key), freshInterpolate(p.value));
    });
    const separator = url.includes('?') ? '&' : '?';
    url += separator + searchParams.toString();
  }

  const preAuthState = useStore.getState();
  const preEffectiveAuth = preAuthState.getEffectiveAuth(request.id);
  if (preEffectiveAuth.type === 'api-key' && preEffectiveAuth.apiKey?.addTo === 'query') {
    const separator = url.includes('?') ? '&' : '?';
    url += `${separator}${freshInterpolate(preEffectiveAuth.apiKey.key)}=${freshInterpolate(preEffectiveAuth.apiKey.value)}`;
  }

  const headers: Record<string, string> = {};
  request.headers.filter(h => h.enabled && h.key).forEach(h => {
    headers[freshInterpolate(h.key)] = freshInterpolate(h.value);
  });

  const effectiveAuth = useStore.getState().getEffectiveAuth(request.id);

  const resolvedAuth: AuthConfig = {
    ...effectiveAuth,
    bearer: effectiveAuth.bearer ? {
      token: freshInterpolate(effectiveAuth.bearer.token),
    } : undefined,
    basic: effectiveAuth.basic ? {
      username: freshInterpolate(effectiveAuth.basic.username),
      password: freshInterpolate(effectiveAuth.basic.password),
    } : undefined,
    apiKey: effectiveAuth.apiKey ? {
      key: freshInterpolate(effectiveAuth.apiKey.key),
      value: freshInterpolate(effectiveAuth.apiKey.value),
      addTo: effectiveAuth.apiKey.addTo,
    } : undefined,
  };

  if (effectiveAuth.type !== 'digest') {
    Object.assign(headers, buildAuthHeaders(resolvedAuth));
  }

  let body: string | undefined;
  let formDataEntries: any[] | undefined;

  if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method) && request.bodyType !== 'none') {
    if (request.bodyType === 'x-www-form-urlencoded') {
      const pairs = request.bodyUrlEncoded || [];
      const params = new URLSearchParams();
      pairs.filter(p => p.enabled && p.key).forEach(p => {
        params.append(freshInterpolate(p.key), freshInterpolate(p.value));
      });
      body = params.toString();
      if (!headers['Content-Type']) {
        headers['Content-Type'] = 'application/x-www-form-urlencoded';
      }
    } else if (request.bodyType === 'form-data') {
      const entries = (request.bodyFormData || []).filter(e => e.enabled && e.key);
      const boundary = '----FormBoundary' + Math.random().toString(36).substring(2);
      const interpolatedEntries = entries.map(e => ({
        key: freshInterpolate(e.key),
        value: e.type === 'text' ? freshInterpolate(e.value) : e.value,
        type: e.type,
        fileName: e.fileName,
        fileContentBase64: e.fileContentBase64,
        contentType: e.contentType,
      }));

      formDataEntries = interpolatedEntries;
      body = generateMultipartBody(interpolatedEntries, boundary);
      if (!headers['Content-Type']) {
        headers['Content-Type'] = `multipart/form-data; boundary=${boundary}`;
      }
    } else if (request.bodyType === 'binary') {
      const fileEntry = request.bodyFormData?.[0];
      if (fileEntry?.fileContentBase64) {
        body = fileEntry.fileContentBase64;
        if (!headers['Content-Type']) {
          headers['Content-Type'] = fileEntry.contentType || 'application/octet-stream';
        }
      }
    } else {
      body = freshInterpolate(request.body);
      if (request.bodyType === 'json' && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
      } else if (request.bodyType === 'graphql' && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
      } else if (request.bodyType === 'raw' && !headers['Content-Type']) {
        headers['Content-Type'] = 'text/plain';
      }
    }
  }

  try {
    const currentState = useStore.getState();
    try {
      const urlObj = new URL(url);
      const domainCookies = currentState.getCookiesForDomain(urlObj.hostname);
      if (domainCookies.length > 0) {
        const cookieStr = domainCookies.map(c => `${c.name}=${c.value}`).join('; ');
        if (headers['Cookie']) {
          headers['Cookie'] += '; ' + cookieStr;
        } else {
          headers['Cookie'] = cookieStr;
        }
      }
    } catch {}

    const proxyConfig = currentState.proxyConfig;
    const globalSettings = currentState.globalSettings;

    if (globalSettings.sendNoCacheHeader && !headers['Cache-Control']) {
      headers['Cache-Control'] = 'no-cache';
    }

    const proxyPayload: any = {
      method: request.method,
      url,
      headers,
      body,
      timeout: globalSettings.requestTimeout > 0 ? globalSettings.requestTimeout : undefined,
      followRedirects: globalSettings.followRedirects,
      maxResponseSize: globalSettings.maxResponseSizeMb * 1024 * 1024,
    };

    if (proxyConfig.enabled && proxyConfig.host) {
      proxyPayload.proxy = {
        host: proxyConfig.host,
        port: proxyConfig.port || '80',
        auth: proxyConfig.auth?.username ? proxyConfig.auth : undefined,
      };
    }

    if (effectiveAuth.type === 'digest' && effectiveAuth.digest) {
      proxyPayload.digestAuth = {
        username: freshInterpolate(effectiveAuth.digest.username),
        password: freshInterpolate(effectiveAuth.digest.password),
      };
    }

    const activeCert = request.clientCert?.enabled
      ? request.clientCert
      : globalSettings.globalCert?.enabled
        ? globalSettings.globalCert
        : null;

    if (activeCert) {
      proxyPayload.clientCert = {
        certPem: activeCert.certPem,
        keyPem: activeCert.keyPem,
        caPem: activeCert.caPem,
        passphrase: activeCert.passphrase,
      };
    }

    if (request.bodyType === 'binary' && request.bodyFormData?.[0]?.fileContentBase64) {
      proxyPayload.binaryBase64 = true;
    }

    const proxyResponse = await vscodeClient.executeProxy(proxyPayload) as any;

    const data = proxyResponse;
    const endTime = performance.now();

    let timing: TimingBreakdown | undefined;
    if (data.timing) {
      timing = {
        dns: data.timing.dns || 0,
        connect: data.timing.connect || 0,
        tls: data.timing.tls || 0,
        ttfb: data.timing.ttfb || 0,
        download: data.timing.download || 0,
        total: data.timing.total || data.time || Math.round(endTime - startTime),
      };
    }

    const apiResponse: ApiResponse = {
      status: data.status,
      statusText: data.statusText,
      headers: data.headers || {},
      body: typeof data.body === 'string' ? data.body : JSON.stringify(data.body, null, 2),
      size: new Blob([typeof data.body === 'string' ? data.body : JSON.stringify(data.body)]).size,
      time: data.time || Math.round(endTime - startTime),
      contentType: data.headers?.['content-type'] || '',
      timing,
    };

    try {
      currentState.captureResponseCookies(url, data.headers || {}, data.setCookies);
    } catch {}

    useConsoleStore.getState().addLog({
      id: uuidv4(),
      timestamp: Date.now(),
      method: request.method,
      url,
      status: apiResponse.status,
      statusText: apiResponse.statusText,
      duration: apiResponse.time,
      requestHeaders: headers,
      responseHeaders: apiResponse.headers,
      requestBody: body,
      responseBody: apiResponse.body.substring(0, 5000),
      timing: timing,
    });

    if (request.testScript && request.testScript.trim()) {
      const ctx = buildScriptContext();
      const testScriptResult = await runPmScriptAsync({
        script: request.testScript,
        request,
        response: apiResponse,
        envVariables: ctx.envVars,
        collectionVariables: ctx.colVars,
        interpolate: freshInterpolate,
        isTestScript: true,
      });
      await applyScriptResult(testScriptResult, request, useStore.getState());

      if (testScriptResult.testResults && testScriptResult.testResults.length > 0) {
        apiResponse.testResults = [
          ...(apiResponse.testResults || []),
          ...testScriptResult.testResults,
        ];
      }
    }

    for (const f of [...folderChain].reverse()) {
      if (f.testScript && f.testScript.trim()) {
        const ctx = buildScriptContext();
        const result = await runPmScriptAsync({
          script: f.testScript,
          request,
          response: apiResponse,
          envVariables: ctx.envVars,
          collectionVariables: ctx.colVars,
          interpolate: freshInterpolate,
          isTestScript: true,
        });
        await applyScriptResult(result, request, useStore.getState());
        if (result.testResults && result.testResults.length > 0) {
          apiResponse.testResults = [
            ...(apiResponse.testResults || []),
            ...result.testResults,
          ];
        }
      }
    }

    if (col?.testScript && col.testScript.trim()) {
      const ctx = buildScriptContext();
      const result = await runPmScriptAsync({
        script: col.testScript,
        request,
        response: apiResponse,
        envVariables: ctx.envVars,
        collectionVariables: ctx.colVars,
        interpolate: freshInterpolate,
        isTestScript: true,
      });
      await applyScriptResult(result, request, useStore.getState());
      if (result.testResults && result.testResults.length > 0) {
        apiResponse.testResults = [
          ...(apiResponse.testResults || []),
          ...result.testResults,
        ];
      }
    }

    return apiResponse;
  } catch (error: any) {
    const endTime = performance.now();

    useConsoleStore.getState().addLog({
      id: uuidv4(),
      timestamp: Date.now(),
      method: request.method,
      url,
      duration: Math.round(endTime - startTime),
      requestHeaders: headers,
      responseHeaders: {},
      error: error.message || 'Network error',
    });

    return {
      status: 0,
      statusText: 'Error',
      headers: {},
      body: error.message || 'Network error',
      size: 0,
      time: Math.round(endTime - startTime),
      contentType: 'text/plain',
    };
  }
}
