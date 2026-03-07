import { useState } from 'react';
import { useConsoleStore, type ConsoleLogEntry } from '@/store/useConsoleStore';
import { Typography } from '@/components/ui/typography';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Terminal, ChevronDown, ChevronRight, Trash2, Clock } from 'lucide-react';

function getMethodColor(method: string) {
  switch (method.toUpperCase()) {
    case 'GET': return 'text-status-success-mid';
    case 'POST': return 'text-standard-subdued';
    case 'PUT': return 'text-status-caution-mid';
    case 'DELETE': return 'text-status-danger-mid';
    default: return 'text-label-muted';
  }
}

function getStatusColor(status?: number) {
  if (!status) return 'text-label-muted';
  if (status >= 200 && status < 300) return 'text-status-success-mid';
  if (status >= 300 && status < 500) return 'text-status-caution-mid';
  return 'text-status-danger-mid';
}

function formatTime(timestamp: number) {
  const d = new Date(timestamp);
  return d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function truncateUrl(url: string, maxLen = 60) {
  if (url.length <= maxLen) return url;
  return url.slice(0, maxLen) + '…';
}

function truncateBody(body?: string, maxLen = 500) {
  if (!body) return null;
  if (body.length <= maxLen) return body;
  return body.slice(0, maxLen) + '…';
}

function TimingBar({ label, value, total }: { label: string; value: number; total: number }) {
  const pct = total > 0 ? Math.max((value / total) * 100, 1) : 0;
  return (
    <div className="flex items-center gap-2 text-[11px]">
      <span className="w-16 text-label-muted shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-utility-muted rounded overflow-hidden">
        <div className="h-full bg-standard-subdued rounded" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-12 text-right text-label-muted shrink-0">{value}ms</span>
    </div>
  );
}

function LogEntryDetail({ entry }: { entry: ConsoleLogEntry }) {
  return (
    <div className="px-3 pb-3 space-y-3 text-[12px]">
      {entry.error && (
        <div className="p-2 bg-status-danger-muted rounded">
          <Typography variant="body-small" className="text-status-danger-mid font-medium">Error</Typography>
          <pre className="font-mono text-[11px] text-status-danger-mid mt-1 whitespace-pre-wrap">{entry.error}</pre>
        </div>
      )}

      {entry.redirects && entry.redirects.length > 0 && (
        <div>
          <Typography variant="body-small" className="text-label-vivid font-medium mb-1">Redirects</Typography>
          <div className="space-y-0.5">
            {entry.redirects.map((r, i) => (
              <div key={i} className="font-mono text-[11px] text-label-muted">{r}</div>
            ))}
          </div>
        </div>
      )}

      {Object.keys(entry.requestHeaders).length > 0 && (
        <div>
          <Typography variant="body-small" className="text-label-vivid font-medium mb-1">Request Headers</Typography>
          <div className="bg-surface-alternate-muted rounded p-2 space-y-0.5">
            {Object.entries(entry.requestHeaders).map(([k, v]) => (
              <div key={k} className="font-mono text-[11px]">
                <span className="text-label-vivid">{k}</span>
                <span className="text-label-muted">: {v}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {Object.keys(entry.responseHeaders).length > 0 && (
        <div>
          <Typography variant="body-small" className="text-label-vivid font-medium mb-1">Response Headers</Typography>
          <div className="bg-surface-alternate-muted rounded p-2 space-y-0.5">
            {Object.entries(entry.responseHeaders).map(([k, v]) => (
              <div key={k} className="font-mono text-[11px]">
                <span className="text-label-vivid">{k}</span>
                <span className="text-label-muted">: {v}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {entry.timing && (
        <div>
          <Typography variant="body-small" className="text-label-vivid font-medium mb-1">Timing</Typography>
          <div className="bg-surface-alternate-muted rounded p-2 space-y-1">
            <TimingBar label="DNS" value={entry.timing.dns} total={entry.timing.total} />
            <TimingBar label="Connect" value={entry.timing.connect} total={entry.timing.total} />
            <TimingBar label="TLS" value={entry.timing.tls} total={entry.timing.total} />
            <TimingBar label="TTFB" value={entry.timing.ttfb} total={entry.timing.total} />
            <TimingBar label="Download" value={entry.timing.download} total={entry.timing.total} />
          </div>
        </div>
      )}

      {entry.requestBody && (
        <div>
          <Typography variant="body-small" className="text-label-vivid font-medium mb-1">Request Body</Typography>
          <pre className="font-mono text-[11px] text-label-muted bg-surface-alternate-muted rounded p-2 whitespace-pre-wrap break-all">
            {truncateBody(entry.requestBody)}
          </pre>
        </div>
      )}

      {entry.responseBody && (
        <div>
          <Typography variant="body-small" className="text-label-vivid font-medium mb-1">Response Body</Typography>
          <pre className="font-mono text-[11px] text-label-muted bg-surface-alternate-muted rounded p-2 whitespace-pre-wrap break-all">
            {truncateBody(entry.responseBody)}
          </pre>
        </div>
      )}
    </div>
  );
}

export function ConsolePanel() {
  const logs = useConsoleStore((s) => s.logs);
  const clearLogs = useConsoleStore((s) => s.clearLogs);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-utility-subdued">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-label-muted" />
          <Typography variant="body-small" className="text-label-vivid font-medium">
            Console
          </Typography>
          <span className="text-[11px] text-label-muted">({logs.length})</span>
        </div>
        <Button variant="text" size="small" onClick={clearLogs} className="h-6 px-2">
          <Trash2 className="w-3 h-3 mr-1" />
          <span className="text-[11px]">Clear</span>
        </Button>
      </div>

      <div className="flex-1 overflow-auto">
        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <Terminal className="w-8 h-8 text-utility-mid" />
            <Typography variant="body-small" className="text-label-muted">
              No requests logged yet
            </Typography>
          </div>
        ) : (
          <div>
            {logs.map((entry) => {
              const expanded = expandedIds.has(entry.id);
              return (
                <div key={entry.id} className="border-b border-utility-subdued">
                  <button
                    className={cn(
                      "w-full flex items-center gap-2 px-3 h-7 text-left hover:bg-surface-alternate-muted transition-colors",
                      expanded && "bg-surface-alternate-muted"
                    )}
                    onClick={() => toggleExpand(entry.id)}
                  >
                    {expanded ? (
                      <ChevronDown className="w-3 h-3 text-label-muted shrink-0" />
                    ) : (
                      <ChevronRight className="w-3 h-3 text-label-muted shrink-0" />
                    )}
                    <span className="text-[11px] text-label-muted shrink-0 w-16">
                      {formatTime(entry.timestamp)}
                    </span>
                    <span className={cn("text-[11px] font-mono font-medium shrink-0 w-12", getMethodColor(entry.method))}>
                      {entry.method}
                    </span>
                    <span className="text-[11px] text-label-vivid font-mono truncate flex-1 min-w-0">
                      {truncateUrl(entry.url)}
                    </span>
                    {entry.status !== undefined && (
                      <span className={cn("text-[11px] font-mono font-medium shrink-0", getStatusColor(entry.status))}>
                        {entry.status}
                      </span>
                    )}
                    {entry.duration !== undefined && (
                      <span className="flex items-center gap-0.5 text-[11px] text-label-muted shrink-0">
                        <Clock className="w-3 h-3" />
                        {entry.duration}ms
                      </span>
                    )}
                  </button>
                  {expanded && <LogEntryDetail entry={entry} />}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
