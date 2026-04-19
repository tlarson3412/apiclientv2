import { useState, useMemo } from 'react';
import { useStore } from '@/store/useStore';
import { vscodeClient } from '@/lib/vscodeApi';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TextInput } from '@/components/ui/text-input';
import { Typography } from '@/components/ui/typography';
import { Button } from '@/components/ui/button';
import type { AuthType, AuthConfig, OAuth2Config } from '@/types';
import { Shield, Key, Loader2, Check, AlertCircle, ArrowUpRight } from 'lucide-react';

const AUTH_TYPES: { value: AuthType; label: string }[] = [
  { value: 'inherit', label: 'Inherit auth from parent' },
  { value: 'none', label: 'No Auth' },
  { value: 'basic', label: 'Basic Auth' },
  { value: 'bearer', label: 'Bearer Token' },
  { value: 'api-key', label: 'API Key' },
  { value: 'digest', label: 'Digest Auth' },
  { value: 'oauth2', label: 'OAuth 2.0' },
];

const AUTH_TYPE_LABELS: Record<string, string> = {
  none: 'No Auth',
  basic: 'Basic Auth',
  bearer: 'Bearer Token',
  'api-key': 'API Key',
  digest: 'Digest Auth',
  oauth2: 'OAuth 2.0',
  inherit: 'Inherit auth from parent',
};

function InheritedAuthPreview({ requestId }: { requestId: string }) {
  const activeRequest = useStore(s => {
    const activeTab = s.tabs.find(t => t.id === s.activeTabId);
    if (!activeTab) return undefined;
    return s.requests.find(r => r.id === activeTab.requestId);
  });
  const collections = useStore(s => s.collections);

  const { effectiveAuth, parentLabel } = useMemo(() => {
    if (!activeRequest?.collectionId) return { effectiveAuth: { type: 'none' as const }, parentLabel: null };
    const collection = collections.find(c => c.id === activeRequest.collectionId);
    if (!collection) return { effectiveAuth: { type: 'none' as const }, parentLabel: null };

    let resolvedAuth: AuthConfig = { type: 'none' };
    let label: { name: string; type: 'folder' | 'collection' } | null = null;

    if (activeRequest.folderId) {
      const folder = collection.folders.find(f => f.id === activeRequest.folderId);
      if (folder?.auth && folder.auth.type !== 'none' && folder.auth.type !== 'inherit') {
        resolvedAuth = folder.auth;
        label = { name: folder.name, type: 'folder' };
      }
    }
    if (resolvedAuth.type === 'none' && collection.auth && collection.auth.type !== 'none' && collection.auth.type !== 'inherit') {
      resolvedAuth = collection.auth;
      label = { name: collection.name, type: 'collection' };
    }

    return { effectiveAuth: resolvedAuth, parentLabel: label };
  }, [activeRequest?.collectionId, activeRequest?.folderId, collections]);

  if (effectiveAuth.type === 'none') {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3 py-4 justify-center">
          <Shield className="w-5 h-5 text-utility-mid" />
          <Typography variant="body-small" className="text-label-muted">
            This request inherits authorization from its parent, but no auth is configured.
          </Typography>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Typography variant="body-medium" className="font-semibold text-label-mid">
          {AUTH_TYPE_LABELS[effectiveAuth.type] || effectiveAuth.type}
        </Typography>
        {parentLabel && (
          <button
            className="flex items-center gap-1 text-sm text-interactive-primary hover:text-interactive-primary-hover"
            onClick={() => {
              if (activeRequest?.collectionId) {
                useStore.getState().addCollectionTab(activeRequest.collectionId);
              }
            }}
          >
            Edit auth in {parentLabel.type}
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {effectiveAuth.type === 'bearer' && (
        <div className="flex items-center gap-4 max-w-lg">
          <Typography variant="body-small" className="text-label-muted whitespace-nowrap min-w-[60px]">Token</Typography>
          <div className="flex-1 px-3 py-1.5 rounded border border-utility-subdued bg-utility-muted font-mono text-[12px] text-label-mid">
            {effectiveAuth.bearer?.token || ''}
          </div>
        </div>
      )}

      {effectiveAuth.type === 'basic' && (
        <div className="flex flex-col gap-3 max-w-lg">
          <div className="flex items-center gap-4">
            <Typography variant="body-small" className="text-label-muted whitespace-nowrap min-w-[80px]">Username</Typography>
            <div className="flex-1 px-3 py-1.5 rounded border border-utility-subdued bg-utility-muted font-mono text-[12px] text-label-mid">
              {effectiveAuth.basic?.username || ''}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Typography variant="body-small" className="text-label-muted whitespace-nowrap min-w-[80px]">Password</Typography>
            <div className="flex-1 px-3 py-1.5 rounded border border-utility-subdued bg-utility-muted font-mono text-[12px] text-label-mid">
              {'•'.repeat(Math.min((effectiveAuth.basic?.password || '').length, 20)) || ''}
            </div>
          </div>
        </div>
      )}

      {effectiveAuth.type === 'api-key' && (
        <div className="flex flex-col gap-3 max-w-lg">
          <div className="flex items-center gap-4">
            <Typography variant="body-small" className="text-label-muted whitespace-nowrap min-w-[80px]">Key</Typography>
            <div className="flex-1 px-3 py-1.5 rounded border border-utility-subdued bg-utility-muted font-mono text-[12px] text-label-mid">
              {effectiveAuth.apiKey?.key || ''}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Typography variant="body-small" className="text-label-muted whitespace-nowrap min-w-[80px]">Value</Typography>
            <div className="flex-1 px-3 py-1.5 rounded border border-utility-subdued bg-utility-muted font-mono text-[12px] text-label-mid">
              {effectiveAuth.apiKey?.value || ''}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Typography variant="body-small" className="text-label-muted whitespace-nowrap min-w-[80px]">Add to</Typography>
            <div className="flex-1 px-3 py-1.5 rounded border border-utility-subdued bg-utility-muted font-mono text-[12px] text-label-mid capitalize">
              {effectiveAuth.apiKey?.addTo || 'header'}
            </div>
          </div>
        </div>
      )}

      {effectiveAuth.type === 'digest' && (
        <div className="flex flex-col gap-3 max-w-lg">
          <div className="flex items-center gap-4">
            <Typography variant="body-small" className="text-label-muted whitespace-nowrap min-w-[80px]">Username</Typography>
            <div className="flex-1 px-3 py-1.5 rounded border border-utility-subdued bg-utility-muted font-mono text-[12px] text-label-mid">
              {effectiveAuth.digest?.username || ''}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Typography variant="body-small" className="text-label-muted whitespace-nowrap min-w-[80px]">Password</Typography>
            <div className="flex-1 px-3 py-1.5 rounded border border-utility-subdued bg-utility-muted font-mono text-[12px] text-label-mid">
              {'•'.repeat(Math.min((effectiveAuth.digest?.password || '').length, 20)) || ''}
            </div>
          </div>
        </div>
      )}

      {effectiveAuth.type === 'oauth2' && (
        <div className="flex flex-col gap-3 max-w-lg">
          <div className="flex items-center gap-4">
            <Typography variant="body-small" className="text-label-muted whitespace-nowrap min-w-[80px]">Grant Type</Typography>
            <div className="flex-1 px-3 py-1.5 rounded border border-utility-subdued bg-utility-muted font-mono text-[12px] text-label-mid capitalize">
              {effectiveAuth.oauth2?.grantType?.replace('_', ' ') || 'client credentials'}
            </div>
          </div>
          {effectiveAuth.oauth2?.accessToken && (
            <div className="flex items-center gap-4">
              <Typography variant="body-small" className="text-label-muted whitespace-nowrap min-w-[80px]">Token</Typography>
              <div className="flex-1 px-3 py-1.5 rounded border border-utility-subdued bg-utility-muted font-mono text-[12px] text-label-mid break-all max-h-[60px] overflow-auto">
                {effectiveAuth.oauth2.accessToken}
              </div>
            </div>
          )}
        </div>
      )}

      <Typography variant="caption" className="text-label-muted">
        The authorization header will be automatically generated when you send the request.
      </Typography>
    </div>
  );
}

export function AuthEditor() {
  const activeRequest = useStore(s => {
    const activeTab = s.tabs.find(t => t.id === s.activeTabId);
    if (!activeTab) return undefined;
    return s.requests.find(r => r.id === activeTab.requestId);
  });
  const updateRequest = useStore(s => s.updateRequest);
  const interpolateVariables = useStore(s => s.interpolateVariables);
  const [fetchingToken, setFetchingToken] = useState(false);
  const [tokenError, setTokenError] = useState('');
  const [tokenSuccess, setTokenSuccess] = useState(false);

  if (!activeRequest) return null;

  const auth = activeRequest.auth;

  const updateAuth = (updates: any) => {
    updateRequest(activeRequest.id, {
      auth: { ...auth, ...updates },
    });
  };

  const updateOAuth2 = (updates: Partial<OAuth2Config>) => {
    updateAuth({
      oauth2: {
        grantType: 'client_credentials',
        tokenUrl: '',
        clientId: '',
        clientSecret: '',
        ...auth.oauth2,
        ...updates,
      },
    });
  };

  const handleFetchToken = async () => {
    const oauth2 = auth.oauth2;
    if (!oauth2?.tokenUrl || !oauth2?.clientId) return;

    setFetchingToken(true);
    setTokenError('');
    setTokenSuccess(false);

    try {
      const tokenUrl = interpolateVariables(oauth2.tokenUrl);
      const clientId = interpolateVariables(oauth2.clientId);
      const clientSecret = interpolateVariables(oauth2.clientSecret);
      const scope = oauth2.scope ? interpolateVariables(oauth2.scope) : '';

      const params = new URLSearchParams();
      params.append('grant_type', oauth2.grantType);
      params.append('client_id', clientId);
      params.append('client_secret', clientSecret);
      if (scope) params.append('scope', scope);

      if (oauth2.grantType === 'password') {
        params.append('username', interpolateVariables(oauth2.username || ''));
        params.append('password', interpolateVariables(oauth2.password || ''));
      }

      const data = await vscodeClient.executeProxy({
        method: 'POST',
        url: tokenUrl,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      }) as any;
      if (data.status >= 400) {
        let errMsg = `HTTP ${data.status}`;
        try {
          const errBody = JSON.parse(data.body);
          errMsg = errBody.error_description || errBody.error || errMsg;
        } catch {}
        throw new Error(errMsg);
      }

      let tokenData;
      try {
        tokenData = JSON.parse(data.body);
      } catch {
        throw new Error('Token endpoint returned non-JSON response');
      }

      if (tokenData.access_token) {
        const expiry = tokenData.expires_in
          ? Date.now() + tokenData.expires_in * 1000
          : undefined;
        updateOAuth2({ accessToken: tokenData.access_token, tokenExpiry: expiry });
        setTokenSuccess(true);
        setTimeout(() => setTokenSuccess(false), 3000);
      } else if (tokenData.error) {
        throw new Error(tokenData.error_description || tokenData.error);
      } else {
        throw new Error('No access_token in response');
      }
    } catch (err: any) {
      setTokenError(err.message || 'Failed to fetch token');
    } finally {
      setFetchingToken(false);
    }
  };

  const isInCollection = !!activeRequest.collectionId;

  return (
    <div className="flex h-full">
      <div className="w-[220px] shrink-0 border-r border-utility-subdued p-4 flex flex-col gap-3">
        <Typography variant="caption" className="text-label-muted font-semibold uppercase tracking-wider">Auth Type</Typography>
        <Select
          value={auth.type}
          onValueChange={(v) => updateAuth({ type: v as AuthType })}
        >
          <SelectTrigger className="w-full h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {AUTH_TYPES.filter(t => t.value !== 'inherit' || isInCollection).map(t => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {auth.type === 'inherit' && (
          <Typography variant="caption" className="text-label-muted leading-relaxed">
            The authorization header will be automatically generated when you send the request. <a href="https://learning.postman.com/docs/sending-requests/authorization/" target="_blank" rel="noopener noreferrer" className="text-interactive-primary hover:underline">Learn more about authorization</a>.
          </Typography>
        )}

        {auth.type === 'none' && (
          <Typography variant="caption" className="text-label-muted leading-relaxed">
            This request does not use any authorization.
          </Typography>
        )}
      </div>

      <div className="flex-1 p-4 overflow-auto">
        {auth.type === 'inherit' && (
          <InheritedAuthPreview requestId={activeRequest.id} />
        )}

        {auth.type === 'none' && (
          <div className="flex items-center gap-3 py-6 justify-center">
            <Shield className="w-5 h-5 text-utility-mid" />
            <Typography variant="body-small" className="text-label-muted">
              No authentication configured for this request
            </Typography>
          </div>
        )}

        {auth.type === 'basic' && (
          <div className="flex flex-col gap-3 max-w-md">
            <TextInput
              label="Username"
              value={auth.basic?.username || ''}
              onValueChange={(v) => updateAuth({ basic: { ...auth.basic, username: v, password: auth.basic?.password || '' } })}
            />
            <TextInput
              label="Password"
              type="password"
              value={auth.basic?.password || ''}
              onValueChange={(v) => updateAuth({ basic: { ...auth.basic, username: auth.basic?.username || '', password: v } })}
            />
          </div>
        )}

        {auth.type === 'bearer' && (
          <div className="max-w-md">
            <TextInput
              label="Token"
              value={auth.bearer?.token || ''}
              onValueChange={(v) => updateAuth({ bearer: { token: v } })}
            />
          </div>
        )}

        {auth.type === 'api-key' && (
          <div className="flex flex-col gap-3 max-w-md">
            <TextInput
              label="Key"
              value={auth.apiKey?.key || ''}
              onValueChange={(v) => updateAuth({
                apiKey: { ...auth.apiKey, key: v, value: auth.apiKey?.value || '', addTo: auth.apiKey?.addTo || 'header' }
              })}
            />
            <TextInput
              label="Value"
              value={auth.apiKey?.value || ''}
              onValueChange={(v) => updateAuth({
                apiKey: { ...auth.apiKey, key: auth.apiKey?.key || '', value: v, addTo: auth.apiKey?.addTo || 'header' }
              })}
            />
            <Select
              value={auth.apiKey?.addTo || 'header'}
              onValueChange={(v) => updateAuth({
                apiKey: { ...auth.apiKey, key: auth.apiKey?.key || '', value: auth.apiKey?.value || '', addTo: v }
              })}
            >
              <SelectTrigger className="w-[200px] h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="header">Header</SelectItem>
                <SelectItem value="query">Query Param</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {auth.type === 'digest' && (
          <div className="flex flex-col gap-3 max-w-md">
            <Typography variant="caption" className="text-label-muted">
              Digest authentication is handled automatically via challenge-response
            </Typography>
            <TextInput
              label="Username"
              value={auth.digest?.username || ''}
              onValueChange={(v) => updateAuth({ digest: { ...auth.digest, username: v, password: auth.digest?.password || '' } })}
            />
            <TextInput
              label="Password"
              type="password"
              value={auth.digest?.password || ''}
              onValueChange={(v) => updateAuth({ digest: { ...auth.digest, username: auth.digest?.username || '', password: v } })}
            />
          </div>
        )}

        {auth.type === 'oauth2' && (
          <div className="flex flex-col gap-3 max-w-lg">
            <Select
              value={auth.oauth2?.grantType || 'client_credentials'}
              onValueChange={(v) => updateOAuth2({ grantType: v as OAuth2Config['grantType'] })}
            >
              <SelectTrigger className="w-[250px] h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="client_credentials">Client Credentials</SelectItem>
                <SelectItem value="password">Password</SelectItem>
              </SelectContent>
            </Select>

            <TextInput
              label="Token URL"
              value={auth.oauth2?.tokenUrl || ''}
              onValueChange={(v) => updateOAuth2({ tokenUrl: v })}
            />
            <div className="grid grid-cols-2 gap-3">
              <TextInput
                label="Client ID"
                value={auth.oauth2?.clientId || ''}
                onValueChange={(v) => updateOAuth2({ clientId: v })}
              />
              <TextInput
                label="Client Secret"
                type="password"
                value={auth.oauth2?.clientSecret || ''}
                onValueChange={(v) => updateOAuth2({ clientSecret: v })}
              />
            </div>
            <TextInput
              label="Scope (optional)"
              value={auth.oauth2?.scope || ''}
              onValueChange={(v) => updateOAuth2({ scope: v })}
            />

            {auth.oauth2?.grantType === 'password' && (
              <div className="grid grid-cols-2 gap-3">
                <TextInput
                  label="Username"
                  value={auth.oauth2?.username || ''}
                  onValueChange={(v) => updateOAuth2({ username: v })}
                />
                <TextInput
                  label="Password"
                  type="password"
                  value={auth.oauth2?.password || ''}
                  onValueChange={(v) => updateOAuth2({ password: v })}
                />
              </div>
            )}

            <div className="flex items-center gap-3 pt-1">
              <Button
                variant="primary"
                size="small"
                onClick={handleFetchToken}
                disabled={fetchingToken || !auth.oauth2?.tokenUrl || !auth.oauth2?.clientId}
              >
                {fetchingToken ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Key className="w-3.5 h-3.5" />
                )}
                {fetchingToken ? 'Fetching...' : 'Get Token'}
              </Button>
              {tokenSuccess && (
                <div className="flex items-center gap-1.5 text-status-success-mid">
                  <Check className="w-4 h-4" />
                  <Typography variant="caption">Token received</Typography>
                </div>
              )}
              {tokenError && (
                <div className="flex items-center gap-1.5 text-status-danger-mid">
                  <AlertCircle className="w-4 h-4" />
                  <Typography variant="caption">{tokenError}</Typography>
                </div>
              )}
            </div>

            {auth.oauth2?.accessToken && (
              <div className="flex flex-col gap-1 pt-1">
                <div className="flex items-center justify-between">
                  <Typography variant="caption" className="text-label-muted">Access Token</Typography>
                  {auth.oauth2.tokenExpiry && (
                    <Typography variant="caption" className={
                      auth.oauth2.tokenExpiry < Date.now()
                        ? 'text-status-danger-mid'
                        : 'text-label-muted'
                    }>
                      {auth.oauth2.tokenExpiry < Date.now()
                        ? 'Expired'
                        : `Expires ${new Date(auth.oauth2.tokenExpiry).toLocaleTimeString()}`}
                    </Typography>
                  )}
                </div>
                <div className="px-3 py-2 rounded border border-utility-subdued bg-utility-muted font-mono text-[12px] text-label-mid break-all max-h-[80px] overflow-auto">
                  {auth.oauth2.accessToken}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
