import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { Typography } from '@/components/ui/typography';
import { cn } from '@/lib/utils';
import { Settings } from 'lucide-react';

const TABS = [
  { id: 'general', label: 'General' },
  { id: 'certificates', label: 'Certificates' },
  { id: 'proxy', label: 'Proxy' },
  { id: 'shortcuts', label: 'Shortcuts' },
  { id: 'about', label: 'About' },
] as const;

type TabId = typeof TABS[number]['id'];

const SHORTCUTS = [
  { key: 'Ctrl+Enter', macKey: '⌘+Enter', description: 'Send the current request' },
  { key: 'Ctrl+N', macKey: '⌘+N', description: 'Open a new tab' },
  { key: 'Ctrl+W', macKey: '⌘+W', description: 'Close the active tab' },
  { key: 'Ctrl+Shift+S', macKey: '⌘+Shift+S', description: 'Save request to collection' },
  { key: 'Ctrl+K', macKey: '⌘+K', description: 'Open global search' },
  { key: 'Ctrl+/', macKey: '⌘+/', description: 'Toggle shortcuts help' },
];

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex flex-col gap-0.5">
        <span className="text-[13px] text-label-vivid">{label}</span>
        {description && (
          <span className="text-[11px] text-label-muted">{description}</span>
        )}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={cn(
          'relative w-10 h-5 rounded-full transition-colors',
          checked ? 'bg-standard-subdued' : 'bg-utility-subdued'
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform',
            checked ? 'translate-x-5' : 'translate-x-0.5'
          )}
        />
      </button>
    </div>
  );
}

function NumberInput({
  label,
  description,
  value,
  onChange,
  suffix,
  min = 0,
}: {
  label: string;
  description?: string;
  value: number;
  onChange: (value: number) => void;
  suffix?: string;
  min?: number;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex flex-col gap-0.5 flex-1">
        <span className="text-[13px] text-label-vivid">{label}</span>
        {description && (
          <span className="text-[11px] text-label-muted">{description}</span>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          value={value}
          min={min}
          onChange={e => onChange(Math.max(min, parseInt(e.target.value) || 0))}
          className="w-[80px] h-7 px-2 text-[13px] text-right bg-transparent border border-utility-subdued rounded text-label-vivid focus:outline-none focus:border-standard-subdued font-mono"
        />
        {suffix && (
          <span className="text-[11px] text-label-muted">{suffix}</span>
        )}
      </div>
    </div>
  );
}

function GeneralTab() {
  const globalSettings = useStore(s => s.globalSettings);
  const setGlobalSettings = useStore(s => s.setGlobalSettings);

  return (
    <div className="grid grid-cols-2 gap-x-10 gap-y-0">
      <div>
        <Typography variant="subheading-small" className="text-label-vivid mb-2 mt-1">Request</Typography>
        <ToggleRow
          label="Trim keys and values in request body"
          checked={globalSettings.trimKeysAndValues}
          onChange={v => setGlobalSettings({ trimKeysAndValues: v })}
        />
        <ToggleRow
          label="SSL certificate verification"
          checked={globalSettings.sslCertificateVerification}
          onChange={v => setGlobalSettings({ sslCertificateVerification: v })}
        />
        <ToggleRow
          label="Automatically follow redirects"
          checked={globalSettings.autoFollowRedirects}
          onChange={v => setGlobalSettings({ autoFollowRedirects: v })}
        />
        <NumberInput
          label="Request timeout in ms"
          description="Set how long to wait for a response. 0 means no timeout."
          value={globalSettings.requestTimeout}
          onChange={v => setGlobalSettings({ requestTimeout: v })}
        />
        <NumberInput
          label="Max response size in MB"
          description="Maximum size of a response to download."
          value={globalSettings.maxResponseSizeMb}
          onChange={v => setGlobalSettings({ maxResponseSizeMb: v })}
          min={1}
        />
      </div>
      <div>
        <Typography variant="subheading-small" className="text-label-vivid mb-2 mt-1">Headers</Typography>
        <ToggleRow
          label="Send no-cache header"
          checked={globalSettings.sendNoCacheHeader}
          onChange={v => setGlobalSettings({ sendNoCacheHeader: v })}
        />
        <ToggleRow
          label="Follow redirects"
          checked={globalSettings.followRedirects}
          onChange={v => setGlobalSettings({ followRedirects: v })}
        />
      </div>
    </div>
  );
}

function CertificatesTab() {
  const globalSettings = useStore(s => s.globalSettings);
  const setGlobalSettings = useStore(s => s.setGlobalSettings);

  const cert = globalSettings.globalCert || {
    enabled: false,
    certPem: '',
    keyPem: '',
    caPem: '',
    passphrase: '',
  };

  const updateCert = (updates: Record<string, any>) => {
    setGlobalSettings({
      globalCert: { ...cert, ...updates },
    });
  };

  const inputClass = "w-full px-2 py-1.5 text-[13px] bg-transparent border border-utility-subdued rounded text-label-vivid placeholder:text-label-muted focus:outline-none focus:border-standard-subdued font-mono disabled:opacity-50";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <Typography variant="body-small" className="text-label-vivid">SSL client certificates</Typography>
          <Typography variant="caption" className="text-label-muted">
            Add client certificates for mutual TLS authentication
          </Typography>
        </div>
        <button
          onClick={() => updateCert({ enabled: !cert.enabled })}
          className={cn(
            'relative w-10 h-5 rounded-full transition-colors',
            cert.enabled ? 'bg-standard-subdued' : 'bg-utility-subdued'
          )}
        >
          <span
            className={cn(
              'absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform',
              cert.enabled ? 'translate-x-5' : 'translate-x-0.5'
            )}
          />
        </button>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] text-label-muted font-medium uppercase tracking-wider">Certificate (PEM)</label>
          <textarea
            value={cert.certPem}
            onChange={e => updateCert({ certPem: e.target.value })}
            placeholder="-----BEGIN CERTIFICATE-----"
            disabled={!cert.enabled}
            rows={3}
            className={cn(inputClass, 'resize-none')}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] text-label-muted font-medium uppercase tracking-wider">Private Key (PEM)</label>
          <textarea
            value={cert.keyPem}
            onChange={e => updateCert({ keyPem: e.target.value })}
            placeholder="-----BEGIN PRIVATE KEY-----"
            disabled={!cert.enabled}
            rows={3}
            className={cn(inputClass, 'resize-none')}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] text-label-muted font-medium uppercase tracking-wider">CA Certificate (PEM, optional)</label>
          <textarea
            value={cert.caPem || ''}
            onChange={e => updateCert({ caPem: e.target.value })}
            placeholder="-----BEGIN CERTIFICATE-----"
            disabled={!cert.enabled}
            rows={3}
            className={cn(inputClass, 'resize-none')}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] text-label-muted font-medium uppercase tracking-wider">Passphrase (optional)</label>
          <input
            type="password"
            value={cert.passphrase || ''}
            onChange={e => updateCert({ passphrase: e.target.value })}
            placeholder="Enter passphrase"
            disabled={!cert.enabled}
            className={inputClass}
          />
        </div>
      </div>

      {cert.enabled && cert.certPem && (
        <div className="p-2 rounded bg-status-success-muted text-[12px] text-status-success-mid">
          Global client certificate is configured and will be used for all requests
        </div>
      )}
    </div>
  );
}

function ProxyTab() {
  const proxyConfig = useStore(s => s.proxyConfig);
  const setProxyConfig = useStore(s => s.setProxyConfig);

  const inputClass = "w-full h-8 px-2 text-[13px] bg-transparent border border-utility-subdued rounded text-label-vivid placeholder:text-label-muted focus:outline-none focus:border-standard-subdued font-mono disabled:opacity-50";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <Typography variant="body-small" className="text-label-vivid">Proxy Server</Typography>
          <Typography variant="caption" className="text-label-muted">
            Route requests through a proxy server
          </Typography>
        </div>
        <button
          onClick={() => setProxyConfig({ ...proxyConfig, enabled: !proxyConfig.enabled })}
          className={cn(
            'relative w-10 h-5 rounded-full transition-colors',
            proxyConfig.enabled ? 'bg-standard-subdued' : 'bg-utility-subdued'
          )}
        >
          <span
            className={cn(
              'absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform',
              proxyConfig.enabled ? 'translate-x-5' : 'translate-x-0.5'
            )}
          />
        </button>
      </div>

      <div className="grid grid-cols-[2fr_1fr] gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] text-label-muted font-medium uppercase tracking-wider">Host</label>
          <input
            value={proxyConfig.host}
            onChange={e => setProxyConfig({ ...proxyConfig, host: e.target.value })}
            placeholder="proxy.example.com"
            disabled={!proxyConfig.enabled}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] text-label-muted font-medium uppercase tracking-wider">Port</label>
          <input
            value={proxyConfig.port}
            onChange={e => setProxyConfig({ ...proxyConfig, port: e.target.value })}
            placeholder="8080"
            disabled={!proxyConfig.enabled}
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] text-label-muted font-medium uppercase tracking-wider">Username</label>
          <input
            value={proxyConfig.auth?.username || ''}
            onChange={e => setProxyConfig({
              ...proxyConfig,
              auth: { username: e.target.value, password: proxyConfig.auth?.password || '' }
            })}
            placeholder="Optional"
            disabled={!proxyConfig.enabled}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] text-label-muted font-medium uppercase tracking-wider">Password</label>
          <input
            type="password"
            value={proxyConfig.auth?.password || ''}
            onChange={e => setProxyConfig({
              ...proxyConfig,
              auth: { username: proxyConfig.auth?.username || '', password: e.target.value }
            })}
            placeholder="Optional"
            disabled={!proxyConfig.enabled}
            className={inputClass}
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

function ShortcutsTab() {
  const isMac = typeof window !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform);

  return (
    <div className="flex flex-col gap-2">
      <Typography variant="body-small" className="text-label-muted mb-2">
        Use these keyboard shortcuts to work faster
      </Typography>
      {SHORTCUTS.map((shortcut, i) => (
        <div key={i} className="flex items-center justify-between py-1.5">
          <span className="text-[13px] text-label-mid">{shortcut.description}</span>
          <kbd className="px-2 py-1 rounded border border-utility-subdued bg-surface-alternate-muted text-label-vivid text-[12px] font-mono font-medium min-w-[100px] text-center">
            {isMac ? shortcut.macKey : shortcut.key}
          </kbd>
        </div>
      ))}
    </div>
  );
}

function AboutTab() {
  return (
    <div className="flex flex-col gap-4 py-2">
      <div className="flex flex-col gap-1">
        <Typography variant="subheading-large" className="text-standard-subdued">
          USBX API Client
        </Typography>
        <Typography variant="caption" className="text-label-muted">
          Version 1.0.0
        </Typography>
      </div>
      <div className="h-px bg-utility-subdued" />
      <Typography variant="body-small" className="text-label-mid leading-relaxed">
        A full-featured API testing tool built for VS Code.
        Supports REST, GraphQL, and WebSocket protocols with comprehensive testing, documentation,
        and collaboration features.
      </Typography>
      <div className="flex flex-col gap-2 mt-2">
        <div className="flex justify-between text-[13px]">
          <span className="text-label-muted">Runtime</span>
          <span className="text-label-mid">React 18 + Vite</span>
        </div>
        <div className="flex justify-between text-[13px]">
          <span className="text-label-muted">Platform</span>
          <span className="text-label-mid">VS Code Extension</span>
        </div>
        <div className="flex justify-between text-[13px]">
          <span className="text-label-muted">Storage</span>
          <span className="text-label-mid">Extension Host (file-based)</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Full-page settings view for rendering inside a VS Code editor tab.
 * Contains the same settings as GlobalSettingsModal but laid out as a page.
 */
export function SettingsView() {
  const [activeTab, setActiveTab] = useState<TabId>('general');

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <Settings className="w-5 h-5 text-label-muted" />
        <Typography variant="subheading-large" className="text-label-vivid">
          Settings
        </Typography>
      </div>

      <div className="flex gap-6 border-b border-utility-subdued mb-4">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'pb-2 text-[13px] font-medium transition-colors border-b-2 -mb-px',
              activeTab === tab.id
                ? 'text-label-vivid border-standard-subdued'
                : 'text-label-muted border-transparent hover:text-label-mid'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="min-h-[400px]">
        {activeTab === 'general' && <GeneralTab />}
        {activeTab === 'certificates' && <CertificatesTab />}
        {activeTab === 'proxy' && <ProxyTab />}
        {activeTab === 'shortcuts' && <ShortcutsTab />}
        {activeTab === 'about' && <AboutTab />}
      </div>
    </div>
  );
}
