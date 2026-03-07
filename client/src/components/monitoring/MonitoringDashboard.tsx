import { useMemo } from 'react';
import { useStore } from '@/store/useStore';
import { Typography } from '@/components/ui/typography';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
} from '@/components/ui/modal';

const STATUS_GROUP_COLORS: Record<string, string> = {
  '2xx': 'bg-status-success-mid',
  '3xx': 'bg-standard-subdued',
  '4xx': 'bg-status-caution-mid',
  '5xx': 'bg-status-danger-mid',
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
  });
}

interface MonitoringDashboardProps {
  open: boolean;
  onClose: () => void;
}

export function MonitoringDashboard({ open, onClose }: MonitoringDashboardProps) {
  const history = useStore(s => s.history);

  const metrics = useMemo(() => {
    const total = history.length;
    const successCount = history.filter(h => h.response.status >= 200 && h.response.status < 300).length;
    const errorCount = history.filter(h => h.response.status < 200 || h.response.status >= 300).length;
    const successRate = total > 0 ? ((successCount / total) * 100).toFixed(1) : '0.0';
    const avgTime = total > 0
      ? Math.round(history.reduce((sum, h) => sum + h.response.time, 0) / total)
      : 0;

    const statusGroups: Record<string, number> = { '2xx': 0, '3xx': 0, '4xx': 0, '5xx': 0 };
    history.forEach(h => {
      const group = Math.floor(h.response.status / 100);
      const key = `${group}xx`;
      if (statusGroups[key] !== undefined) statusGroups[key]++;
    });

    const last20Times = history.slice(0, 20).map(h => h.response.time).reverse();

    const endpointMap = new Map<string, { count: number; totalTime: number; successCount: number }>();
    history.forEach(h => {
      const url = h.request.url || 'Unknown';
      const existing = endpointMap.get(url) || { count: 0, totalTime: 0, successCount: 0 };
      existing.count++;
      existing.totalTime += h.response.time;
      if (h.response.status >= 200 && h.response.status < 300) existing.successCount++;
      endpointMap.set(url, existing);
    });
    const topEndpoints = Array.from(endpointMap.entries())
      .map(([url, data]) => ({
        url,
        count: data.count,
        avgTime: Math.round(data.totalTime / data.count),
        successRate: ((data.successCount / data.count) * 100).toFixed(0),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const recentErrors = history
      .filter(h => h.response.status < 200 || h.response.status >= 300)
      .slice(0, 5);

    return { total, successRate, avgTime, errorCount, statusGroups, last20Times, topEndpoints, recentErrors };
  }, [history]);

  const maxStatusCount = Math.max(...Object.values(metrics.statusGroups), 1);
  const maxResponseTime = Math.max(...metrics.last20Times, 1);

  return (
    <Modal open={open} onOpenChange={(v) => !v && onClose()}>
      <ModalContent className="max-w-[900px] max-h-[85vh] overflow-y-auto">
        <ModalHeader>
          <ModalTitle>API Monitoring Dashboard</ModalTitle>
          <ModalDescription>Real-time metrics from your API request history</ModalDescription>
        </ModalHeader>

        <div className="grid grid-cols-4 gap-3">
          <div className="border border-utility-subdued rounded-lg p-3">
            <span className="text-[12px] text-label-muted">Total Requests</span>
            <div className="text-2xl font-bold text-label-vivid">{metrics.total}</div>
          </div>
          <div className="border border-utility-subdued rounded-lg p-3">
            <span className="text-[12px] text-label-muted">Success Rate</span>
            <div className="text-2xl font-bold text-status-success-mid">{metrics.successRate}%</div>
          </div>
          <div className="border border-utility-subdued rounded-lg p-3">
            <span className="text-[12px] text-label-muted">Avg Response Time</span>
            <div className="text-2xl font-bold text-label-vivid">{metrics.avgTime}ms</div>
          </div>
          <div className="border border-utility-subdued rounded-lg p-3">
            <span className="text-[12px] text-label-muted">Error Count</span>
            <div className="text-2xl font-bold text-status-danger-mid">{metrics.errorCount}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="border border-utility-subdued rounded-lg p-4">
            <Typography variant="subheading-small" className="mb-3">Status Code Distribution</Typography>
            <div className="flex flex-col gap-2">
              {Object.entries(metrics.statusGroups).map(([group, count]) => (
                <div key={group} className="flex items-center gap-2">
                  <span className="text-[12px] font-mono text-label-muted w-8">{group}</span>
                  <div className="flex-1 h-5 bg-surface-muted rounded overflow-hidden">
                    <div
                      className={`h-full rounded ${STATUS_GROUP_COLORS[group]} transition-all`}
                      style={{ width: `${(count / maxStatusCount) * 100}%` }}
                    />
                  </div>
                  <span className="text-[12px] font-mono text-label-mid w-6 text-right">{count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="border border-utility-subdued rounded-lg p-4">
            <Typography variant="subheading-small" className="mb-3">Response Time Trend</Typography>
            {metrics.last20Times.length === 0 ? (
              <Typography variant="caption">No data yet</Typography>
            ) : (
              <div className="flex items-end gap-[2px] h-24">
                {metrics.last20Times.map((time, i) => (
                  <div
                    key={i}
                    className="flex-1 bg-standard-subdued rounded-t hover:bg-primary transition-colors"
                    style={{ height: `${(time / maxResponseTime) * 100}%`, minHeight: '2px' }}
                    title={`${time}ms`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="border border-utility-subdued rounded-lg p-4 mt-4">
          <Typography variant="subheading-small" className="mb-3">Top Endpoints</Typography>
          {metrics.topEndpoints.length === 0 ? (
            <Typography variant="caption">No data yet</Typography>
          ) : (
            <table className="w-full text-[12px]">
              <thead>
                <tr className="text-label-muted border-b border-utility-subdued">
                  <th className="text-left py-1 font-medium">URL</th>
                  <th className="text-right py-1 font-medium w-16">Calls</th>
                  <th className="text-right py-1 font-medium w-20">Avg Time</th>
                  <th className="text-right py-1 font-medium w-20">Success</th>
                </tr>
              </thead>
              <tbody>
                {metrics.topEndpoints.map((ep) => (
                  <tr key={ep.url} className="border-b border-utility-subdued last:border-0">
                    <td className="py-1.5 text-label-mid truncate max-w-[300px]">{ep.url}</td>
                    <td className="py-1.5 text-right text-label-mid font-mono">{ep.count}</td>
                    <td className="py-1.5 text-right text-label-mid font-mono">{ep.avgTime}ms</td>
                    <td className="py-1.5 text-right font-mono">
                      <span className={Number(ep.successRate) >= 80 ? 'text-status-success-mid' : 'text-status-caution-mid'}>
                        {ep.successRate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="border border-utility-subdued rounded-lg p-4 mt-4">
          <Typography variant="subheading-small" className="mb-3">Recent Errors</Typography>
          {metrics.recentErrors.length === 0 ? (
            <Typography variant="caption">No errors recorded</Typography>
          ) : (
            <div className="flex flex-col gap-2">
              {metrics.recentErrors.map((entry) => (
                <div key={entry.id} className="flex items-center gap-3 text-[12px]">
                  <span className="text-label-muted shrink-0">{formatTimestamp(entry.timestamp)}</span>
                  <span className={`font-mono font-medium shrink-0 ${getStatusColor(entry.response.status)}`}>
                    {entry.response.status}
                  </span>
                  <span className="text-label-mid truncate flex-1">{entry.request.url}</span>
                  <span className="text-label-muted shrink-0">{entry.response.time}ms</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </ModalContent>
    </Modal>
  );
}
