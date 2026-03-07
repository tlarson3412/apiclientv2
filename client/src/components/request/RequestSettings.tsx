import { useState } from 'react';
import { Typography } from '@/components/ui/typography';
import { cn } from '@/lib/utils';

interface SettingToggleProps {
  label: string;
  description: string;
  enabled: boolean;
  onChange: (val: boolean) => void;
  defaultNote?: string;
}

function SettingToggle({ label, description, enabled, onChange, defaultNote }: SettingToggleProps) {
  return (
    <div className="flex items-start justify-between gap-8 py-3">
      <div className="flex-1 min-w-0">
        <Typography variant="body-medium" className="text-label-vivid font-medium">{label}</Typography>
        <Typography variant="body-small" className="text-label-muted mt-0.5">{description}</Typography>
      </div>
      <div className="flex flex-col items-end gap-0.5 shrink-0">
        <button
          onClick={() => onChange(!enabled)}
          className={cn(
            'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
            enabled ? 'bg-standard-subdued' : 'bg-utility-subdued'
          )}
        >
          <span
            className={cn(
              'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
              enabled ? 'translate-x-6' : 'translate-x-1'
            )}
          />
        </button>
        <span className="text-[11px] text-label-muted">{enabled ? 'ON' : 'OFF'}</span>
        {defaultNote && (
          <span className="text-[11px] text-label-muted">Default: {defaultNote}</span>
        )}
      </div>
    </div>
  );
}

interface SettingInputProps {
  label: string;
  description: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  type?: 'text' | 'number' | 'textarea';
}

function SettingInput({ label, description, value, onChange, placeholder, type = 'text' }: SettingInputProps) {
  return (
    <div className="flex items-start justify-between gap-8 py-3">
      <div className="flex-1 min-w-0">
        <Typography variant="body-medium" className="text-label-vivid font-medium">{label}</Typography>
        <Typography variant="body-small" className="text-label-muted mt-0.5">{description}</Typography>
      </div>
      <div className="shrink-0 w-36">
        {type === 'textarea' ? (
          <textarea
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full px-2 py-1.5 text-[13px] bg-surface border border-utility-subdued rounded text-label-vivid placeholder:text-label-muted focus:outline-none focus:border-standard-subdued resize-none h-16"
          />
        ) : (
          <input
            type={type}
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full px-2 py-1.5 text-[13px] bg-surface border border-utility-subdued rounded text-label-vivid placeholder:text-label-muted focus:outline-none focus:border-standard-subdued"
          />
        )}
      </div>
    </div>
  );
}

interface SettingSelectProps {
  label: string;
  description: string;
  value: string;
  onChange: (val: string) => void;
  options: { value: string; label: string }[];
  defaultNote?: string;
}

function SettingSelect({ label, description, value, onChange, options, defaultNote }: SettingSelectProps) {
  return (
    <div className="flex items-start justify-between gap-8 py-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Typography variant="body-medium" className="text-label-vivid font-medium">{label}</Typography>
        </div>
        <Typography variant="body-small" className="text-label-muted mt-0.5">{description}</Typography>
      </div>
      <div className="flex flex-col items-end gap-0.5 shrink-0">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className="px-2 py-1.5 text-[13px] bg-surface border border-utility-subdued rounded text-label-vivid focus:outline-none focus:border-standard-subdued"
        >
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        {defaultNote && (
          <span className="text-[11px] text-label-muted">Default: {defaultNote}</span>
        )}
      </div>
    </div>
  );
}

export function RequestSettings() {
  const [httpVersion, setHttpVersion] = useState('auto');
  const [sslVerification, setSslVerification] = useState(false);
  const [followRedirects, setFollowRedirects] = useState(true);
  const [followOriginalMethod, setFollowOriginalMethod] = useState(false);
  const [followAuthHeader, setFollowAuthHeader] = useState(false);
  const [removeRefererHeader, setRemoveRefererHeader] = useState(false);
  const [strictHttp, setStrictHttp] = useState(false);
  const [encodeUrl, setEncodeUrl] = useState(true);
  const [disableCookieJar, setDisableCookieJar] = useState(false);
  const [useServerCipher, setUseServerCipher] = useState(false);
  const [maxRedirects, setMaxRedirects] = useState('10');
  const [tlsDisabled, setTlsDisabled] = useState('');
  const [cipherSuites, setCipherSuites] = useState('');

  return (
    <div className="divide-y divide-utility-subdued">
      <SettingSelect
        label="HTTP version"
        description="Select the HTTP version to use for sending the request."
        value={httpVersion}
        onChange={setHttpVersion}
        options={[
          { value: 'auto', label: 'Auto' },
          { value: 'http1', label: 'HTTP/1.1' },
          { value: 'http2', label: 'HTTP/2' },
        ]}
        defaultNote="Settings"
      />

      <SettingToggle
        label="Enable SSL certificate verification"
        description="Verify SSL certificates when sending a request. Verification failures will result in the request being aborted."
        enabled={sslVerification}
        onChange={setSslVerification}
        defaultNote="Settings"
      />

      <SettingToggle
        label="Automatically follow redirects"
        description="Follow HTTP 3xx responses as redirects."
        enabled={followRedirects}
        onChange={setFollowRedirects}
        defaultNote="Settings"
      />

      <SettingToggle
        label="Follow original HTTP Method"
        description="Redirect with the original HTTP method instead of the default behavior of redirecting with GET."
        enabled={followOriginalMethod}
        onChange={setFollowOriginalMethod}
      />

      <SettingToggle
        label="Follow Authorization header"
        description="Retain authorization header when a redirect happens to a different hostname."
        enabled={followAuthHeader}
        onChange={setFollowAuthHeader}
      />

      <SettingToggle
        label="Remove referer header on redirect"
        description="Remove the referer header when a redirect happens."
        enabled={removeRefererHeader}
        onChange={setRemoveRefererHeader}
      />

      <SettingToggle
        label="Enable strict HTTP parser"
        description="Restrict responses with invalid HTTP headers."
        enabled={strictHttp}
        onChange={setStrictHttp}
      />

      <SettingToggle
        label="Encode URL automatically"
        description="Encode the URL's path, query parameters, and authentication fields."
        enabled={encodeUrl}
        onChange={setEncodeUrl}
      />

      <SettingToggle
        label="Disable cookie jar"
        description="Prevent cookies used in this request from being stored in the cookie jar. Existing cookies in the cookie jar will not be added as headers for this request."
        enabled={disableCookieJar}
        onChange={setDisableCookieJar}
        defaultNote="Settings"
      />

      <SettingToggle
        label="Use server cipher suite during handshake"
        description="Use the server's cipher suite order instead of the client's during handshake."
        enabled={useServerCipher}
        onChange={setUseServerCipher}
      />

      <SettingInput
        label="Maximum number of redirects"
        description="Set a cap on the maximum number of redirects to follow."
        value={maxRedirects}
        onChange={setMaxRedirects}
        type="number"
      />

      <SettingInput
        label="TLS/SSL protocols disabled during handshake"
        description="Specify the SSL and TLS protocol versions to be disabled during handshake. All other protocols will be enabled."
        value={tlsDisabled}
        onChange={setTlsDisabled}
        type="textarea"
      />

      <SettingInput
        label="Cipher suite selection"
        description="Order of cipher suites that the SSL server profile uses to establish a secure connection."
        value={cipherSuites}
        onChange={setCipherSuites}
        placeholder="Enter cipher suites"
        type="textarea"
      />
    </div>
  );
}
