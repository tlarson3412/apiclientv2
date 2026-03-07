import { useState, useRef, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { Plus, X, Radio, FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

const METHOD_COLORS: Record<string, string> = {
  GET: 'text-status-success-mid',
  POST: 'text-standard-subdued',
  PUT: 'text-status-caution-mid',
  DELETE: 'text-status-danger-mid',
  PATCH: 'text-status-caution-mid',
  HEAD: 'text-label-muted',
  OPTIONS: 'text-label-muted',
};

function getTabLabel(request: { name?: string; url: string } | undefined, tabName: string) {
  if (request?.name) return request.name;
  if (request?.url) {
    try { return new URL(request.url).pathname.split('/').pop() || request.url; } catch { return request.url; }
  }
  return tabName;
}

function EditableTabName({ requestId, currentName, onDone }: { requestId: string; currentName: string; onDone: () => void }) {
  const updateRequest = useStore(s => s.updateRequest);
  const [value, setValue] = useState(currentName);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const confirm = () => {
    const trimmed = value.trim();
    if (trimmed && trimmed !== currentName) {
      updateRequest(requestId, { name: trimmed });
    }
    onDone();
  };

  return (
    <input
      ref={inputRef}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === 'Enter') confirm();
        if (e.key === 'Escape') onDone();
      }}
      onBlur={confirm}
      onClick={(e) => e.stopPropagation()}
      className="max-w-[140px] w-full bg-transparent border-b border-standard-subdued text-[13px] text-label-vivid outline-none px-0 py-0"
    />
  );
}

interface RequestTabsProps {
  mode: 'http' | 'websocket';
  onSwitchToHttp: () => void;
  onOpenCreateNew: () => void;
}

export function RequestTabs({ mode, onSwitchToHttp, onOpenCreateNew }: RequestTabsProps) {
  const tabs = useStore(s => s.tabs);
  const activeTabId = useStore(s => s.activeTabId);
  const requests = useStore(s => s.requests);
  const setActiveTab = useStore(s => s.setActiveTab);
  const removeTab = useStore(s => s.removeTab);
  const [editingTabId, setEditingTabId] = useState<string | null>(null);

  return (
    <div className="flex items-center gap-0.5 bg-surface-alternate-muted px-1 overflow-x-auto">
      {mode === 'websocket' && (
        <div
          className="flex items-center gap-1.5 px-3 py-2 text-[13px] transition-colors relative group shrink-0 cursor-pointer border-b-2 bg-surface border-standard-subdued text-label-vivid"
        >
          <Radio className="w-3.5 h-3.5 text-standard-subdued" />
          <span>WebSocket</span>
          <button
            className="p-0.5 rounded hover:bg-utility-subdued transition-colors opacity-100"
            onClick={onSwitchToHttp}
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
      {tabs.map(tab => {
        const isCollectionOrFolder = tab.type === 'collection' || tab.type === 'folder';
        const request = !isCollectionOrFolder ? requests.find(r => r.id === tab.requestId) : undefined;
        const isActive = tab.id === activeTabId && mode === 'http';
        const method = request?.method || 'GET';
        const isEditing = editingTabId === tab.id;

        const collections = useStore.getState().collections;
        const tabCollection = isCollectionOrFolder ? collections.find(c => c.id === tab.collectionId) : undefined;
        const tabFolder = tab.type === 'folder' && tabCollection ? tabCollection.folders.find(f => f.id === tab.folderId) : undefined;
        const displayName = tabFolder?.name || tabCollection?.name || tab.name;

        return (
          <div
            key={tab.id}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 text-[13px] transition-colors relative group shrink-0 cursor-pointer',
              'border-b-2',
              isActive
                ? 'bg-surface border-standard-subdued text-label-vivid'
                : 'border-transparent text-label-muted hover:text-label-mid hover:bg-utility-muted'
            )}
            onClick={() => {
              onSwitchToHttp();
              setActiveTab(tab.id);
            }}
          >
            {isCollectionOrFolder ? (
              <FolderOpen className="w-3.5 h-3.5 text-status-caution-mid shrink-0" />
            ) : (
              <span className={cn('font-mono text-[11px] font-medium', METHOD_COLORS[method])}>
                {method}
              </span>
            )}
            {isEditing && request ? (
              <EditableTabName
                requestId={request.id}
                currentName={request.name || ''}
                onDone={() => setEditingTabId(null)}
              />
            ) : (
              <span
                className="max-w-[140px] truncate"
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  if (request) setEditingTabId(tab.id);
                }}
              >
                {isCollectionOrFolder ? displayName : getTabLabel(request, tab.name)}
              </span>
            )}
            {tab.isModified && <span className="w-1.5 h-1.5 rounded-full bg-standard-subdued" />}
            <button
              className={cn(
                'p-0.5 rounded hover:bg-utility-subdued transition-colors',
                isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
              )}
              onClick={(e) => { e.stopPropagation(); removeTab(tab.id); }}
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        );
      })}
      <button
        className="p-2 text-label-muted hover:text-label-mid hover:bg-utility-muted rounded transition-colors shrink-0"
        onClick={onOpenCreateNew}
        title="Create New"
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
}
