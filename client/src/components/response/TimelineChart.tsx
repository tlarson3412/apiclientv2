import { useStore } from '@/store/useStore';
import { Typography } from '@/components/ui/typography';
import { cn } from '@/lib/utils';
import type { TimingBreakdown } from '@/types';

const PHASES: { key: keyof TimingBreakdown; label: string; color: string; bgColor: string }[] = [
  { key: 'dns', label: 'DNS Lookup', color: 'bg-status-info-mid', bgColor: 'bg-status-info-muted' },
  { key: 'connect', label: 'TCP Connect', color: 'bg-status-caution-mid', bgColor: 'bg-status-caution-muted' },
  { key: 'tls', label: 'TLS Handshake', color: 'bg-[#9b59b6]', bgColor: 'bg-[#9b59b633]' },
  { key: 'ttfb', label: 'Time to First Byte', color: 'bg-status-success-mid', bgColor: 'bg-status-success-muted' },
  { key: 'download', label: 'Content Download', color: 'bg-standard-subdued', bgColor: 'bg-utility-muted' },
];

export function TimelineChart() {
  const activeRequest = useStore(s => {
    const tab = s.tabs.find(t => t.id === s.activeTabId);
    return tab ? s.requests.find(r => r.id === tab.requestId) : undefined;
  });
  const response = useStore(s => activeRequest ? s.responses[activeRequest.id] : undefined);

  if (!activeRequest || !response) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-2">
        <Typography variant="body-small" className="text-label-muted text-center">
          Send a request to see the timing breakdown
        </Typography>
      </div>
    );
  }

  const timing = response.timing;

  if (!timing) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3 p-3 rounded bg-utility-muted">
          <Typography variant="body-small" className="text-label-mid">
            Total Response Time
          </Typography>
          <div className="flex-1" />
          <span className="text-[20px] font-mono font-semibold text-label-vivid">{response.time} ms</span>
        </div>
        <Typography variant="caption" className="text-label-muted text-center">
          Detailed timing breakdown is available for requests made through the proxy server.
        </Typography>
      </div>
    );
  }

  const total = timing.total || response.time;
  const maxValue = Math.max(total, 1);

  let cumulative = 0;
  const bars = PHASES.map(phase => {
    const value = timing[phase.key] || 0;
    const offset = cumulative;
    cumulative += value;
    return { ...phase, value, offset };
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 p-3 rounded bg-utility-muted">
        <Typography variant="body-small" className="text-label-mid">
          Total Response Time
        </Typography>
        <div className="flex-1" />
        <span className="text-[20px] font-mono font-semibold text-label-vivid">{total} ms</span>
      </div>

      <div className="relative h-10 rounded overflow-hidden bg-surface-alternate-muted border border-utility-subdued">
        {bars.map(bar => {
          if (bar.value <= 0) return null;
          const left = (bar.offset / maxValue) * 100;
          const width = (bar.value / maxValue) * 100;
          return (
            <div
              key={bar.key}
              className={cn('absolute top-0 h-full', bar.color)}
              style={{ left: `${left}%`, width: `${Math.max(width, 0.5)}%` }}
              title={`${bar.label}: ${bar.value}ms`}
            />
          );
        })}
      </div>

      <div className="flex flex-col gap-1.5">
        {bars.map(bar => (
          <div key={bar.key} className="flex items-center gap-3 py-1.5">
            <div className={cn('w-3 h-3 rounded-sm shrink-0', bar.color)} />
            <Typography variant="body-small" className="text-label-mid w-40">
              {bar.label}
            </Typography>
            <div className="flex-1 h-2 rounded-full bg-surface-alternate-muted overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all', bar.color)}
                style={{ width: `${Math.max((bar.value / maxValue) * 100, bar.value > 0 ? 2 : 0)}%` }}
              />
            </div>
            <span className="text-[13px] font-mono text-label-vivid w-16 text-right">
              {bar.value} ms
            </span>
          </div>
        ))}
      </div>

      <div className="border border-utility-subdued rounded overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="bg-surface-alternate-muted">
              <th className="text-left px-3 py-2 font-medium text-label-muted border-b border-utility-subdued">Phase</th>
              <th className="text-right px-3 py-2 font-medium text-label-muted border-b border-utility-subdued">Duration</th>
              <th className="text-right px-3 py-2 font-medium text-label-muted border-b border-utility-subdued">% of Total</th>
            </tr>
          </thead>
          <tbody>
            {bars.map(bar => (
              <tr key={bar.key} className="border-b border-utility-subdued last:border-b-0 hover:bg-utility-muted transition-colors">
                <td className="px-3 py-1.5 text-label-vivid flex items-center gap-2">
                  <div className={cn('w-2 h-2 rounded-sm', bar.color)} />
                  {bar.label}
                </td>
                <td className="px-3 py-1.5 font-mono text-label-mid text-right">{bar.value} ms</td>
                <td className="px-3 py-1.5 font-mono text-label-muted text-right">
                  {total > 0 ? ((bar.value / total) * 100).toFixed(1) : '0.0'}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
