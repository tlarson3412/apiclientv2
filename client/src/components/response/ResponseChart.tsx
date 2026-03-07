import { useState, useMemo } from 'react';
import { useStore } from '@/store/useStore';
import { Typography } from '@/components/ui/typography';
import { cn } from '@/lib/utils';

const CHART_COLORS = [
  'bg-standard-subdued',
  'bg-status-success-mid',
  'bg-status-caution-mid',
  'bg-status-info-mid',
  'bg-status-danger-mid',
];

type ChartType = 'bar' | 'table';

export function ResponseChart() {
  const activeRequest = useStore(s => {
    const activeTab = s.tabs.find(t => t.id === s.activeTabId);
    if (!activeTab) return undefined;
    return s.requests.find(r => r.id === activeTab.requestId);
  });
  const responses = useStore(s => s.responses);
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [xKey, setXKey] = useState('');
  const [yKey, setYKey] = useState('');

  const response = activeRequest ? responses[activeRequest.id] : undefined;

  const parsedData = useMemo(() => {
    if (!response) return null;
    try {
      const data = JSON.parse(response.body);
      if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'object') {
        return data;
      }
      if (typeof data === 'object' && data !== null) {
        for (const key of Object.keys(data)) {
          if (Array.isArray(data[key]) && data[key].length > 0 && typeof data[key][0] === 'object') {
            return data[key];
          }
        }
      }
    } catch {}
    return null;
  }, [response]);

  const keys = useMemo(() => {
    if (!parsedData || parsedData.length === 0) return [];
    return Object.keys(parsedData[0]);
  }, [parsedData]);

  const numericKeys = useMemo(() => {
    if (!parsedData || parsedData.length === 0) return [];
    return keys.filter(k => typeof parsedData[0][k] === 'number');
  }, [parsedData, keys]);

  const stringKeys = useMemo(() => {
    if (!parsedData || parsedData.length === 0) return [];
    return keys.filter(k => typeof parsedData[0][k] === 'string');
  }, [parsedData, keys]);

  const effectiveX = xKey || stringKeys[0] || keys[0] || '';
  const effectiveY = yKey || numericKeys[0] || '';

  if (!parsedData) {
    return (
      <div className="flex flex-col items-center py-8 gap-2">
        <Typography variant="body-small" className="text-label-muted text-center">
          Response data visualization works with JSON array responses.
        </Typography>
        <Typography variant="caption" className="text-label-muted text-center">
          Send a request that returns a JSON array of objects to see charts.
        </Typography>
      </div>
    );
  }

  const maxValue = effectiveY ? Math.max(...parsedData.map((d: any) => Number(d[effectiveY]) || 0)) : 0;
  const displayData = parsedData.slice(0, 50);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          <Typography variant="caption" className="text-label-muted">X Axis:</Typography>
          <select
            value={effectiveX}
            onChange={(e) => setXKey(e.target.value)}
            className="h-7 px-2 text-[12px] bg-surface border border-utility-subdued rounded text-label-vivid focus:outline-none"
          >
            {keys.map(k => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-1.5">
          <Typography variant="caption" className="text-label-muted">Y Axis:</Typography>
          <select
            value={effectiveY}
            onChange={(e) => setYKey(e.target.value)}
            className="h-7 px-2 text-[12px] bg-surface border border-utility-subdued rounded text-label-vivid focus:outline-none"
          >
            {numericKeys.map(k => <option key={k} value={k}>{k}</option>)}
            {numericKeys.length === 0 && keys.map(k => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-1 ml-auto">
          <button
            onClick={() => setChartType('bar')}
            className={cn('px-2 py-1 text-[11px] rounded', chartType === 'bar' ? 'bg-standard-subdued text-label-white' : 'text-label-muted hover:bg-utility-muted')}
          >
            Bar
          </button>
          <button
            onClick={() => setChartType('table')}
            className={cn('px-2 py-1 text-[11px] rounded', chartType === 'table' ? 'bg-standard-subdued text-label-white' : 'text-label-muted hover:bg-utility-muted')}
          >
            Table
          </button>
        </div>
      </div>

      <Typography variant="caption" className="text-label-muted">
        {parsedData.length} items{parsedData.length > 50 ? ' (showing first 50)' : ''}
      </Typography>

      {chartType === 'bar' && effectiveY && maxValue > 0 && (
        <div className="flex items-end gap-1 h-[200px] border-b border-l border-utility-subdued pt-2 pl-2 overflow-x-auto">
          {displayData.map((item: any, i: number) => {
            const val = Number(item[effectiveY]) || 0;
            const height = maxValue > 0 ? (val / maxValue) * 100 : 0;
            return (
              <div key={i} className="flex flex-col items-center gap-1 min-w-[24px] flex-1 max-w-[60px]" title={`${item[effectiveX]}: ${val}`}>
                <span className="text-[10px] text-label-muted">{val}</span>
                <div
                  className={cn('w-full rounded-t transition-all', CHART_COLORS[i % CHART_COLORS.length])}
                  style={{ height: `${height}%`, minHeight: val > 0 ? '2px' : '0' }}
                />
                <span className="text-[10px] text-label-muted truncate w-full text-center">
                  {String(item[effectiveX]).slice(0, 8)}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {chartType === 'table' && (
        <div className="border border-utility-subdued rounded overflow-auto max-h-[300px]">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="bg-surface-alternate-muted sticky top-0">
                {keys.slice(0, 6).map(k => (
                  <th key={k} className="text-left px-2 py-1.5 font-medium text-label-muted border-b border-utility-subdued">{k}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayData.map((item: any, i: number) => (
                <tr key={i} className="border-b border-utility-subdued last:border-0 hover:bg-utility-muted">
                  {keys.slice(0, 6).map(k => (
                    <td key={k} className="px-2 py-1 font-mono text-label-mid truncate max-w-[200px]">
                      {typeof item[k] === 'object' ? JSON.stringify(item[k]) : String(item[k] ?? '')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
