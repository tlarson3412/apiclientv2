import { useStore } from '@/store/useStore';
import { Typography } from '@/components/ui/typography';
import { Checkbox } from '@/components/ui/checkbox';

export function ProxySettings() {
  const proxyConfig = useStore(s => s.proxyConfig);
  const setProxyConfig = useStore(s => s.setProxyConfig);

  return (
    <div className="flex flex-col gap-4 pt-2">
      <div className="flex items-center justify-between">
        <Typography variant="subheading-small">Proxy Settings</Typography>
        <div className="flex items-center gap-2">
          <Checkbox
            checked={proxyConfig.enabled}
            onCheckedChange={(checked) => setProxyConfig({ ...proxyConfig, enabled: !!checked })}
          />
          <Typography variant="caption" className="text-label-mid">Enable Proxy</Typography>
        </div>
      </div>

      <Typography variant="caption" className="text-label-muted">
        Route requests through a proxy server. The proxy settings are applied server-side.
      </Typography>

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] text-label-muted font-medium uppercase tracking-wider">Host</label>
          <input
            value={proxyConfig.host}
            onChange={(e) => setProxyConfig({ ...proxyConfig, host: e.target.value })}
            placeholder="proxy.example.com"
            disabled={!proxyConfig.enabled}
            className="h-8 px-2 text-[13px] bg-transparent border-b border-utility-subdued text-label-vivid placeholder:text-label-muted focus:outline-none focus:border-standard-subdued font-mono disabled:opacity-50"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] text-label-muted font-medium uppercase tracking-wider">Port</label>
          <input
            value={proxyConfig.port}
            onChange={(e) => setProxyConfig({ ...proxyConfig, port: e.target.value })}
            placeholder="8080"
            disabled={!proxyConfig.enabled}
            className="h-8 px-2 text-[13px] bg-transparent border-b border-utility-subdued text-label-vivid placeholder:text-label-muted focus:outline-none focus:border-standard-subdued font-mono disabled:opacity-50"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] text-label-muted font-medium uppercase tracking-wider">Username (optional)</label>
          <input
            value={proxyConfig.auth?.username || ''}
            onChange={(e) => setProxyConfig({
              ...proxyConfig,
              auth: { username: e.target.value, password: proxyConfig.auth?.password || '' }
            })}
            placeholder="username"
            disabled={!proxyConfig.enabled}
            className="h-8 px-2 text-[13px] bg-transparent border-b border-utility-subdued text-label-vivid placeholder:text-label-muted focus:outline-none focus:border-standard-subdued font-mono disabled:opacity-50"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] text-label-muted font-medium uppercase tracking-wider">Password (optional)</label>
          <input
            type="password"
            value={proxyConfig.auth?.password || ''}
            onChange={(e) => setProxyConfig({
              ...proxyConfig,
              auth: { username: proxyConfig.auth?.username || '', password: e.target.value }
            })}
            placeholder="password"
            disabled={!proxyConfig.enabled}
            className="h-8 px-2 text-[13px] bg-transparent border-b border-utility-subdued text-label-vivid placeholder:text-label-muted focus:outline-none focus:border-standard-subdued font-mono disabled:opacity-50"
          />
        </div>
      </div>

      {proxyConfig.enabled && proxyConfig.host && (
        <div className="p-2 rounded bg-status-info-muted text-[12px] text-status-info-mid">
          Proxy active: {proxyConfig.host}:{proxyConfig.port || '80'}
        </div>
      )}
    </div>
  );
}
