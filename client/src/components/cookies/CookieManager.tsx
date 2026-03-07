import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { Button } from '@/components/ui/button';
import { Typography } from '@/components/ui/typography';
import { TextInput } from '@/components/ui/text-input';
import { Cookie as CookieIcon, Trash2, Plus, Check, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { v4 as uuidv4 } from 'uuid';
import type { Cookie } from '@/types';

export function CookieManager() {
  const cookies = useStore(s => s.cookies);
  const addCookie = useStore(s => s.addCookie);
  const updateCookie = useStore(s => s.updateCookie);
  const deleteCookie = useStore(s => s.deleteCookie);
  const clearCookies = useStore(s => s.clearCookies);
  const [showAdd, setShowAdd] = useState(false);
  const [newCookie, setNewCookie] = useState({ name: '', value: '', domain: '', path: '/' });

  const domains = Array.from(new Set(cookies.map(c => c.domain))).sort();

  const handleAdd = () => {
    if (newCookie.name && newCookie.domain) {
      const cookie: Cookie = {
        id: uuidv4(),
        name: newCookie.name,
        value: newCookie.value,
        domain: newCookie.domain,
        path: newCookie.path || '/',
        httpOnly: false,
        secure: false,
        enabled: true,
      };
      addCookie(cookie);
      setNewCookie({ name: '', value: '', domain: '', path: '/' });
      setShowAdd(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 pt-2">
      <div className="flex items-center justify-between">
        <Typography variant="subheading-small">Cookies</Typography>
        <div className="flex items-center gap-1">
          {cookies.length > 0 && (
            <Button variant="text" size="small" onClick={clearCookies} title="Clear All">
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
          <Button variant="text" size="small" onClick={() => setShowAdd(!showAdd)} title="Add Cookie">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {showAdd && (
        <div className="flex flex-col gap-2 p-2 border border-utility-subdued rounded bg-surface-alternate-muted">
          <TextInput label="Name" value={newCookie.name} onValueChange={v => setNewCookie(p => ({ ...p, name: v }))} />
          <TextInput label="Value" value={newCookie.value} onValueChange={v => setNewCookie(p => ({ ...p, value: v }))} />
          <TextInput label="Domain" value={newCookie.domain} onValueChange={v => setNewCookie(p => ({ ...p, domain: v }))} />
          <TextInput label="Path" value={newCookie.path} onValueChange={v => setNewCookie(p => ({ ...p, path: v }))} />
          <Button variant="primary" size="small" onClick={handleAdd}>Add Cookie</Button>
        </div>
      )}

      {cookies.length === 0 && (
        <div className="flex flex-col items-center py-6 gap-2">
          <CookieIcon className="w-8 h-8 text-utility-mid" />
          <Typography variant="caption" className="text-label-muted text-center">
            No cookies stored. Cookies will be automatically captured from API responses.
          </Typography>
        </div>
      )}

      {domains.map(domain => {
        const domainCookies = cookies.filter(c => c.domain === domain);
        return (
          <div key={domain} className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5 px-1 py-1">
              <Globe className="w-3.5 h-3.5 text-standard-subdued" />
              <Typography variant="caption" className="text-label-mid font-medium">{domain}</Typography>
              <span className="text-[11px] text-label-muted">({domainCookies.length})</span>
            </div>

            {domainCookies.map(cookie => (
              <CookieRow
                key={cookie.id}
                cookie={cookie}
                onToggle={() => updateCookie(cookie.id, { enabled: !cookie.enabled })}
                onDelete={() => deleteCookie(cookie.id)}
                onUpdate={(updates) => updateCookie(cookie.id, updates)}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}

function CookieRow({
  cookie,
  onToggle,
  onDelete,
  onUpdate,
}: {
  cookie: Cookie;
  onToggle: () => void;
  onDelete: () => void;
  onUpdate: (updates: Partial<Cookie>) => void;
}) {
  const [editing, setEditing] = useState(false);

  return (
    <div className="flex flex-col gap-1 px-2 py-1.5 ml-3 rounded hover:bg-utility-muted transition-colors border-l-2 border-utility-subdued">
      <div className="flex items-center gap-2">
        <button
          className={cn(
            'w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors shrink-0',
            cookie.enabled
              ? 'bg-standard-subdued border-standard-subdued'
              : 'border-utility-mid bg-transparent'
          )}
          onClick={onToggle}
        >
          {cookie.enabled && <Check className="w-2.5 h-2.5 text-white" />}
        </button>

        <button
          className="flex-1 text-left"
          onClick={() => setEditing(!editing)}
        >
          <span className="text-[13px] text-label-vivid font-mono">{cookie.name}</span>
          <span className="text-[12px] text-label-muted ml-2 truncate">
            = {cookie.value.length > 20 ? cookie.value.slice(0, 20) + '...' : cookie.value}
          </span>
        </button>

        <div className="flex items-center gap-1">
          {cookie.httpOnly && (
            <span className="text-[9px] px-1 py-0.5 rounded bg-utility-muted text-label-muted">HTTP</span>
          )}
          {cookie.secure && (
            <span className="text-[9px] px-1 py-0.5 rounded bg-utility-muted text-label-muted">SEC</span>
          )}
          <button
            className="p-0.5 rounded hover:bg-status-danger-muted transition-colors"
            onClick={onDelete}
          >
            <Trash2 className="w-3 h-3 text-status-danger-mid" />
          </button>
        </div>
      </div>

      {editing && (
        <div className="flex flex-col gap-1.5 mt-1 pl-5">
          <TextInput
            label="Value"
            value={cookie.value}
            onValueChange={v => onUpdate({ value: v })}
          />
          <div className="flex gap-2 text-[11px] text-label-muted">
            <span>Path: {cookie.path}</span>
            {cookie.expires && (
              <span>Expires: {new Date(cookie.expires).toLocaleDateString()}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
