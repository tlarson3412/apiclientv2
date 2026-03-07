import { useStore } from '@/store/useStore';
import { Typography } from '@/components/ui/typography';
import { Checkbox } from '@/components/ui/checkbox';
import { Shield } from 'lucide-react';
import type { ClientCertConfig } from '@/types';

export function ClientCertEditor() {
  const activeRequest = useStore(s => {
    const activeTab = s.tabs.find(t => t.id === s.activeTabId);
    if (!activeTab) return undefined;
    return s.requests.find(r => r.id === activeTab.requestId);
  });
  const updateRequest = useStore(s => s.updateRequest);

  if (!activeRequest) return null;

  const cert = activeRequest.clientCert || {
    enabled: false,
    certPem: '',
    keyPem: '',
    caPem: '',
    passphrase: '',
  };

  const updateCert = (updates: Partial<ClientCertConfig>) => {
    updateRequest(activeRequest.id, {
      clientCert: { ...cert, ...updates },
    });
  };

  const textareaClass = "w-full min-h-[100px] px-3 py-2 text-[12px] font-mono bg-surface border border-utility-subdued rounded text-label-vivid placeholder:text-label-muted focus:outline-none focus:border-standard-subdued resize-none";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Checkbox
          checked={cert.enabled}
          onCheckedChange={(c) => updateCert({ enabled: !!c })}
        />
        <Typography variant="body-small" className="text-label-vivid">
          Enable client certificate (mTLS)
        </Typography>
      </div>

      {!cert.enabled && (
        <div className="flex items-center gap-3 py-4 justify-center">
          <Shield className="w-5 h-5 text-utility-mid" />
          <Typography variant="body-small" className="text-label-muted">
            Client certificates are used for mutual TLS authentication
          </Typography>
        </div>
      )}

      {cert.enabled && (
        <div className="flex flex-col gap-4 max-w-2xl">
          <div>
            <Typography variant="caption" className="text-label-muted mb-1 block">
              Client Certificate (PEM)
            </Typography>
            <textarea
              value={cert.certPem}
              onChange={e => updateCert({ certPem: e.target.value })}
              placeholder="-----BEGIN CERTIFICATE-----&#10;...&#10;-----END CERTIFICATE-----"
              className={textareaClass}
              rows={5}
            />
          </div>

          <div>
            <Typography variant="caption" className="text-label-muted mb-1 block">
              Private Key (PEM)
            </Typography>
            <textarea
              value={cert.keyPem}
              onChange={e => updateCert({ keyPem: e.target.value })}
              placeholder="-----BEGIN PRIVATE KEY-----&#10;...&#10;-----END PRIVATE KEY-----"
              className={textareaClass}
              rows={5}
            />
          </div>

          <div>
            <Typography variant="caption" className="text-label-muted mb-1 block">
              CA Certificate (PEM, optional)
            </Typography>
            <textarea
              value={cert.caPem || ''}
              onChange={e => updateCert({ caPem: e.target.value })}
              placeholder="-----BEGIN CERTIFICATE-----&#10;...&#10;-----END CERTIFICATE-----"
              className={textareaClass}
              rows={4}
            />
          </div>

          <div className="max-w-xs">
            <Typography variant="caption" className="text-label-muted mb-1 block">
              Passphrase (optional)
            </Typography>
            <input
              type="password"
              value={cert.passphrase || ''}
              onChange={e => updateCert({ passphrase: e.target.value })}
              placeholder="Private key passphrase"
              className="w-full h-8 px-3 text-[13px] bg-surface border border-utility-subdued rounded text-label-vivid placeholder:text-label-muted focus:outline-none focus:border-standard-subdued"
            />
          </div>

          <Typography variant="caption" className="text-label-muted">
            Certificates are stored locally and sent to the proxy server for mTLS connections.
            Only applies to HTTPS requests.
          </Typography>
        </div>
      )}
    </div>
  );
}
