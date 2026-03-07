import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { Typography } from '@/components/ui/typography';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, FileText, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ExamplesPanel() {
  const activeRequest = useStore(s => {
    const tab = s.tabs.find(t => t.id === s.activeTabId);
    return tab ? s.requests.find(r => r.id === tab.requestId) : undefined;
  });
  const response = useStore(s => activeRequest ? s.responses[activeRequest.id] : undefined);
  const addExample = useStore(s => s.addExample);
  const deleteExample = useStore(s => s.deleteExample);
  const renameExample = useStore(s => s.renameExample);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  if (!activeRequest) return null;

  const examples = activeRequest.examples || [];

  const handleSave = () => {
    if (!response) return;
    const name = prompt('Example name:');
    if (!name?.trim()) return;
    addExample(activeRequest.id, name.trim(), response);
  };

  const handleRenameStart = (id: string, currentName: string) => {
    setRenamingId(id);
    setRenameValue(currentName);
  };

  const handleRenameConfirm = () => {
    if (renamingId && renameValue.trim()) {
      renameExample(activeRequest.id, renamingId, renameValue.trim());
    }
    setRenamingId(null);
    setRenameValue('');
  };

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return 'text-status-success-mid';
    if (status >= 400 && status < 500) return 'text-status-caution-mid';
    if (status >= 500) return 'text-status-danger-mid';
    return 'text-label-muted';
  };

  const getStatusBgColor = (status: number) => {
    if (status >= 200 && status < 300) return 'bg-status-success-muted';
    if (status >= 400 && status < 500) return 'bg-status-caution-muted';
    if (status >= 500) return 'bg-status-danger-muted';
    return 'bg-surface-alternate-muted';
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <Typography variant="subheading-small">Request Examples</Typography>
        <Button variant="text" size="small" onClick={handleSave} disabled={!response}>
          <Plus className="w-3.5 h-3.5" /> Save Current Response
        </Button>
      </div>

      {examples.length === 0 && (
        <Typography variant="caption" className="text-label-muted py-2">
          No examples saved yet. Send a request and save the response.
        </Typography>
      )}

      <div className="flex flex-col gap-2">
        {examples.map(example => {
          const isExpanded = expandedId === example.id;
          const isRenaming = renamingId === example.id;

          return (
            <div key={example.id} className="rounded border border-utility-subdued bg-surface-alternate-muted">
              <div
                className="flex items-center gap-2 p-2.5 cursor-pointer hover:bg-surface-alternate-subdued transition-colors"
                onClick={() => setExpandedId(isExpanded ? null : example.id)}
              >
                {isExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5 text-label-muted shrink-0" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-label-muted shrink-0" />
                )}

                <FileText className="w-3.5 h-3.5 text-label-muted shrink-0" />

                {isRenaming ? (
                  <input
                    className="bg-transparent text-[13px] text-label-vivid border border-utility-subdued rounded px-1.5 py-0.5 flex-1"
                    value={renameValue}
                    onChange={e => setRenameValue(e.target.value)}
                    onBlur={handleRenameConfirm}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleRenameConfirm();
                      if (e.key === 'Escape') { setRenamingId(null); setRenameValue(''); }
                    }}
                    onClick={e => e.stopPropagation()}
                    autoFocus
                  />
                ) : (
                  <span
                    className="text-[13px] text-label-vivid flex-1 truncate"
                    onDoubleClick={e => { e.stopPropagation(); handleRenameStart(example.id, example.name); }}
                  >
                    {example.name}
                  </span>
                )}

                <span className={cn(
                  'text-[11px] font-medium px-1.5 py-0.5 rounded shrink-0',
                  getStatusColor(example.status),
                  getStatusBgColor(example.status)
                )}>
                  {example.status} {example.statusText}
                </span>

                <span className="text-[11px] text-label-muted shrink-0">
                  {new Date(example.createdAt).toLocaleString()}
                </span>

                <button
                  className="p-0.5 rounded hover:bg-status-danger-muted transition-colors shrink-0"
                  onClick={e => { e.stopPropagation(); deleteExample(activeRequest.id, example.id); }}
                >
                  <Trash2 className="w-3.5 h-3.5 text-status-danger-mid" />
                </button>
              </div>

              {isExpanded && (
                <div className="border-t border-utility-subdued p-2.5">
                  <pre className="text-[12px] font-mono text-label-vivid bg-surface-alternate-vivid rounded p-2 max-h-[200px] overflow-auto whitespace-pre-wrap break-all">
                    <code>{example.body}</code>
                  </pre>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
