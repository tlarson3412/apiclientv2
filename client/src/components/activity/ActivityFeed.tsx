import { useState, useMemo } from 'react';
import { useStore } from '@/store/useStore';
import { Button } from '@/components/ui/button';
import { Typography } from '@/components/ui/typography';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
} from '@/components/ui/modal';
import { Download, Trash2, Search } from 'lucide-react';
import type { HttpMethod } from '@/types';

const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-status-success-mid',
  POST: 'bg-standard-subdued',
  PUT: 'bg-status-caution-mid',
  DELETE: 'bg-status-danger-mid',
  PATCH: 'bg-status-caution-mid',
  HEAD: 'bg-label-muted',
  OPTIONS: 'bg-label-muted',
};

const STATUS_TEXT_COLORS: Record<string, string> = {
  '2': 'text-status-success-mid',
  '3': 'text-standard-subdued',
  '4': 'text-status-caution-mid',
  '5': 'text-status-danger-mid',
};

function getStatusColor(status: number): string {
  return STATUS_TEXT_COLORS[String(status)[0]] || 'text-label-muted';
}

function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

const METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];
const STATUS_RANGES = ['2xx', '3xx', '4xx', '5xx'];

interface ActivityFeedProps {
  open: boolean;
  onClose: () => void;
}

export function ActivityFeed({ open, onClose }: ActivityFeedProps) {
  const history = useStore(s => s.history);
  const clearHistory = useStore(s => s.clearHistory);

  const [searchQuery, setSearchQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState<HttpMethod | ''>('');
  const [statusFilter, setStatusFilter] = useState('');

  const filtered = useMemo(() => {
    return history.filter(entry => {
      if (searchQuery && !entry.request.url.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      if (methodFilter && entry.request.method !== methodFilter) {
        return false;
      }
      if (statusFilter) {
        const group = `${Math.floor(entry.response.status / 100)}xx`;
        if (group !== statusFilter) return false;
      }
      return true;
    });
  }, [history, searchQuery, methodFilter, statusFilter]);

  const handleExport = () => {
    const headers = ['Timestamp', 'Method', 'URL', 'Status', 'Response Time (ms)'];
    const rows = filtered.map(entry => [
      new Date(entry.timestamp).toISOString(),
      entry.request.method,
      `"${entry.request.url.replace(/"/g, '""')}"`,
      String(entry.response.status),
      String(entry.response.time),
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `api-activity-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Modal open={open} onOpenChange={(v) => !v && onClose()}>
      <ModalContent className="max-w-[700px] max-h-[85vh] overflow-y-auto">
        <ModalHeader>
          <ModalTitle>Activity Feed</ModalTitle>
          <ModalDescription>Timeline of all API request activity</ModalDescription>
        </ModalHeader>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 flex-1 min-w-[200px] border border-utility-subdued rounded-lg px-2 py-1.5">
            <Search className="w-4 h-4 text-label-muted shrink-0" />
            <input
              type="text"
              placeholder="Search URLs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent text-[13px] text-label-vivid outline-none flex-1 placeholder:text-label-muted"
            />
          </div>
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value as HttpMethod | '')}
            className="border border-utility-subdued rounded-lg px-2 py-1.5 text-[13px] bg-surface text-label-vivid"
          >
            <option value="">All Methods</option>
            {METHODS.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-utility-subdued rounded-lg px-2 py-1.5 text-[13px] bg-surface text-label-vivid"
          >
            <option value="">All Status</option>
            {STATUS_RANGES.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 mt-2">
          <Button variant="secondary" size="small" onClick={handleExport} disabled={filtered.length === 0}>
            <Download className="w-3.5 h-3.5" /> Export CSV
          </Button>
          <Button variant="utility" size="small" onClick={clearHistory} disabled={history.length === 0}>
            <Trash2 className="w-3.5 h-3.5" /> Clear All
          </Button>
          <span className="text-[12px] text-label-muted ml-auto">
            {filtered.length} of {history.length} entries
          </span>
        </div>

        <div className="relative mt-4 ml-3">
          <div className="absolute left-[5px] top-0 bottom-0 w-[2px] bg-utility-subdued" />

          {filtered.length === 0 ? (
            <div className="pl-6 py-4">
              <Typography variant="caption">No activity to display</Typography>
            </div>
          ) : (
            <div className="flex flex-col">
              {filtered.map((entry) => (
                <div key={entry.id} className="relative flex items-start gap-3 pl-6 py-2 hover:bg-surface-muted rounded transition-colors">
                  <div className="absolute left-0 top-[14px] w-3 h-3 rounded-full border-2 border-utility-subdued bg-surface" />
                  <div className="flex items-center gap-2 flex-1 min-w-0 flex-wrap">
                    <span className="text-[11px] text-label-muted shrink-0 w-[130px]">
                      {formatTimestamp(entry.timestamp)}
                    </span>
                    <span className={`text-[10px] font-mono font-bold text-white px-1.5 py-0.5 rounded ${METHOD_COLORS[entry.request.method] || 'bg-label-muted'}`}>
                      {entry.request.method}
                    </span>
                    <span className="text-[12px] text-label-mid truncate flex-1 min-w-0">
                      {entry.request.url || 'Untitled'}
                    </span>
                    <span className={`text-[12px] font-mono font-medium shrink-0 ${getStatusColor(entry.response.status)}`}>
                      {entry.response.status}
                    </span>
                    <span className="text-[11px] text-label-muted shrink-0">
                      {entry.response.time}ms
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </ModalContent>
    </Modal>
  );
}
