import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { Button } from '@/components/ui/button';
import { Typography } from '@/components/ui/typography';
import { Checkbox } from '@/components/ui/checkbox';
import { Trash2, Clock } from 'lucide-react';
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

const STATUS_COLORS: Record<string, string> = {
  '2': 'text-status-success-mid',
  '3': 'text-standard-subdued',
  '4': 'text-status-caution-mid',
  '5': 'text-status-danger-mid',
};

function getStatusColor(status: number): string {
  return STATUS_COLORS[String(status)[0]] || 'text-label-muted';
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return 'Today';
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function HistoryPanel() {
  const history = useStore(s => s.history);
  const clearHistory = useStore(s => s.clearHistory);
  const deleteHistoryEntries = useStore(s => s.deleteHistoryEntries);
  const addTab = useStore(s => s.addTab);
  const requests = useStore(s => s.requests);
  const updateRequest = useStore(s => s.updateRequest);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const handleReplay = (entry: typeof history[0]) => {
    const existingReq = requests.find(r => r.id === entry.request.id);
    if (existingReq) {
      addTab(existingReq.id);
    } else {
      addTab();
      const state = useStore.getState();
      const activeReq = state.getActiveRequest();
      if (activeReq) {
        updateRequest(activeReq.id, {
          method: entry.request.method,
          url: entry.request.url,
          headers: entry.request.headers,
          queryParams: entry.request.queryParams,
          body: entry.request.body,
          bodyType: entry.request.bodyType,
          auth: entry.request.auth,
        });
      }
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allSelected = history.length > 0 && selectedIds.size === history.length;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(history.map(h => h.id)));
    }
  };

  const handleDeleteSelected = () => {
    deleteHistoryEntries(Array.from(selectedIds));
    setSelectedIds(new Set());
  };

  const grouped = history.reduce<Record<string, typeof history>>((acc, entry) => {
    const dateKey = formatDate(entry.timestamp);
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(entry);
    return acc;
  }, {});

  return (
    <div className="flex flex-col gap-2 pt-2">
      <div className="flex items-center justify-between">
        <Typography variant="subheading-small">History</Typography>
        {history.length > 0 && (
          <div className="flex items-center gap-1">
            {selectedIds.size > 0 && (
              <Button variant="text" size="small" onClick={handleDeleteSelected}>
                <Trash2 className="w-3.5 h-3.5" /> Delete ({selectedIds.size})
              </Button>
            )}
            <Button variant="text" size="small" onClick={clearHistory}>
              <Trash2 className="w-3.5 h-3.5" /> Clear
            </Button>
          </div>
        )}
      </div>

      {history.length > 0 && (
        <div className="flex items-center gap-2 px-2">
          <Checkbox
            checked={allSelected}
            onCheckedChange={toggleSelectAll}
          />
          <span className="text-[12px] text-label-muted">Select All</span>
        </div>
      )}

      {history.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-6">
          <Clock className="w-8 h-8 text-utility-mid" />
          <Typography variant="caption" className="text-center">
            No history yet. Send a request to see it here.
          </Typography>
        </div>
      )}

      {Object.entries(grouped).map(([date, entries]) => (
        <div key={date}>
          <Typography variant="caption" className="px-2 py-1 text-label-muted font-medium">{date}</Typography>
          {entries.map(entry => (
            <div
              key={entry.id}
              className="flex items-center gap-2 w-full px-2 py-1.5 rounded hover:bg-utility-muted transition-colors text-left"
            >
              <Checkbox
                checked={selectedIds.has(entry.id)}
                onCheckedChange={() => toggleSelect(entry.id)}
              />
              <button
                className="flex items-center gap-2 flex-1 min-w-0"
                onClick={() => handleReplay(entry)}
              >
                <span className={cn('text-[11px] font-mono font-medium w-10 shrink-0', METHOD_COLORS[entry.request.method])}>
                  {entry.request.method}
                </span>
                <span className="text-[12px] text-label-mid truncate flex-1">
                  {entry.request.url || 'Untitled'}
                </span>
                <span className={cn('text-[11px] font-mono shrink-0', getStatusColor(entry.response.status))}>
                  {entry.response.status}
                </span>
                <span className="text-[11px] text-label-muted shrink-0">
                  {formatTime(entry.timestamp)}
                </span>
              </button>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
