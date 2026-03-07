import { useState, useMemo } from 'react';
import { useStore } from '@/store/useStore';
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription } from '@/components/ui/modal';
import { Typography } from '@/components/ui/typography';
import { cn } from '@/lib/utils';

interface CompareModalProps {
  open: boolean;
  onClose: () => void;
}

function diffLines(a: string, b: string) {
  const aLines = a.split('\n');
  const bLines = b.split('\n');
  const maxLen = Math.max(aLines.length, bLines.length);
  const result: Array<{ left: string; right: string; type: 'same' | 'changed' | 'added' | 'removed'; lineA: number | null; lineB: number | null }> = [];

  for (let i = 0; i < maxLen; i++) {
    const leftLine = i < aLines.length ? aLines[i] : undefined;
    const rightLine = i < bLines.length ? bLines[i] : undefined;

    if (leftLine !== undefined && rightLine !== undefined) {
      result.push({
        left: leftLine,
        right: rightLine,
        type: leftLine === rightLine ? 'same' : 'changed',
        lineA: i + 1,
        lineB: i + 1,
      });
    } else if (leftLine !== undefined) {
      result.push({ left: leftLine, right: '', type: 'removed', lineA: i + 1, lineB: null });
    } else {
      result.push({ left: '', right: rightLine || '', type: 'added', lineA: null, lineB: i + 1 });
    }
  }
  return result;
}

function formatBody(body: string, contentType: string): string {
  if (contentType.includes('json')) {
    try {
      return JSON.stringify(JSON.parse(body), null, 2);
    } catch {}
  }
  return body;
}

function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function CompareModal({ open, onClose }: CompareModalProps) {
  const history = useStore(s => s.history);
  const [leftId, setLeftId] = useState<string | null>(null);
  const [rightId, setRightId] = useState<string | null>(null);

  const leftEntry = history.find(h => h.id === leftId);
  const rightEntry = history.find(h => h.id === rightId);

  const diff = useMemo(() => {
    if (!leftEntry || !rightEntry) return null;
    const leftBody = formatBody(leftEntry.response.body, leftEntry.response.contentType);
    const rightBody = formatBody(rightEntry.response.body, rightEntry.response.contentType);
    return diffLines(leftBody, rightBody);
  }, [leftEntry, rightEntry]);

  const diffStats = useMemo(() => {
    if (!diff) return null;
    let added = 0;
    let removed = 0;
    let changed = 0;
    diff.forEach(line => {
      if (line.type === 'added') added++;
      else if (line.type === 'removed') removed++;
      else if (line.type === 'changed') changed++;
    });
    return { added, removed, changed };
  }, [diff]);

  return (
    <Modal open={open} onOpenChange={onClose}>
      <ModalContent className="max-w-5xl max-h-[85vh] overflow-hidden flex flex-col">
        <ModalHeader>
          <ModalTitle>Compare Responses</ModalTitle>
          <ModalDescription>Select two responses from history to compare side by side</ModalDescription>
        </ModalHeader>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <select
            value={leftId || ''}
            onChange={(e) => setLeftId(e.target.value || null)}
            className="h-8 px-2 text-[13px] bg-surface border border-utility-subdued rounded text-label-vivid focus:outline-none focus:border-standard-subdued"
          >
            <option value="">Select Response A...</option>
            {history.map(h => (
              <option key={h.id} value={h.id}>
                {h.request.method} {h.request.url} - {h.response.status} ({timeAgo(h.timestamp)})
              </option>
            ))}
          </select>
          <select
            value={rightId || ''}
            onChange={(e) => setRightId(e.target.value || null)}
            className="h-8 px-2 text-[13px] bg-surface border border-utility-subdued rounded text-label-vivid focus:outline-none focus:border-standard-subdued"
          >
            <option value="">Select Response B...</option>
            {history.map(h => (
              <option key={h.id} value={h.id}>
                {h.request.method} {h.request.url} - {h.response.status} ({timeAgo(h.timestamp)})
              </option>
            ))}
          </select>
        </div>

        {leftEntry && rightEntry && (
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="flex items-center gap-3 text-[12px] px-2 py-1.5 bg-surface-muted rounded">
              <span className={cn('font-mono font-semibold', leftEntry.response.status < 400 ? 'text-status-success-mid' : 'text-status-danger-mid')}>
                {leftEntry.response.status}
              </span>
              <span className="text-label-muted">{leftEntry.response.contentType || 'unknown'}</span>
              <span className="text-label-muted">{formatSize(leftEntry.response.size)}</span>
              <span className="text-label-muted">{leftEntry.response.time}ms</span>
            </div>
            <div className="flex items-center gap-3 text-[12px] px-2 py-1.5 bg-surface-muted rounded">
              <span className={cn('font-mono font-semibold', rightEntry.response.status < 400 ? 'text-status-success-mid' : 'text-status-danger-mid')}>
                {rightEntry.response.status}
              </span>
              <span className="text-label-muted">{rightEntry.response.contentType || 'unknown'}</span>
              <span className="text-label-muted">{formatSize(rightEntry.response.size)}</span>
              <span className="text-label-muted">{rightEntry.response.time}ms</span>
            </div>
          </div>
        )}

        {diffStats && (
          <div className="flex items-center gap-3 mb-2 text-[11px]">
            <span className="text-status-success-mid">+{diffStats.added} added</span>
            <span className="text-status-danger-mid">-{diffStats.removed} removed</span>
            <span className="text-status-caution-mid">~{diffStats.changed} changed</span>
          </div>
        )}

        <div className="flex-1 overflow-auto border border-utility-subdued rounded">
          {!diff ? (
            <div className="flex items-center justify-center py-12">
              <Typography variant="body-small" className="text-label-muted">Select two responses to see the diff</Typography>
            </div>
          ) : (
            <div className="font-mono text-[12px] leading-relaxed">
              {diff.map((line, i) => (
                <div key={i} className="grid grid-cols-2 border-b border-utility-subdued last:border-0">
                  <div className={cn(
                    'flex border-r border-utility-subdued',
                    line.type === 'removed' && 'bg-status-danger-muted',
                    line.type === 'changed' && 'bg-status-caution-muted',
                  )}>
                    <span className="w-8 shrink-0 text-right pr-2 py-0.5 text-label-muted select-none border-r border-utility-subdued">
                      {line.lineA ?? ''}
                    </span>
                    <span className={cn(
                      'px-2 py-0.5 whitespace-pre-wrap break-all flex-1',
                      line.type === 'removed' && 'text-status-danger-mid',
                      line.type === 'changed' && 'text-label-vivid',
                      line.type === 'same' && 'text-label-mid',
                    )}>
                      {line.type === 'removed' && <span className="select-none mr-1">-</span>}
                      {line.type === 'changed' && <span className="select-none mr-1">~</span>}
                      {line.left}
                    </span>
                  </div>
                  <div className={cn(
                    'flex',
                    line.type === 'added' && 'bg-status-success-muted',
                    line.type === 'changed' && 'bg-status-success-muted',
                  )}>
                    <span className="w-8 shrink-0 text-right pr-2 py-0.5 text-label-muted select-none border-r border-utility-subdued">
                      {line.lineB ?? ''}
                    </span>
                    <span className={cn(
                      'px-2 py-0.5 whitespace-pre-wrap break-all flex-1',
                      line.type === 'added' && 'text-status-success-mid',
                      line.type === 'changed' && 'text-label-vivid',
                      line.type === 'same' && 'text-label-mid',
                    )}>
                      {line.type === 'added' && <span className="select-none mr-1">+</span>}
                      {line.type === 'changed' && <span className="select-none mr-1">~</span>}
                      {line.right}
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
