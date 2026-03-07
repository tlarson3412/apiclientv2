import { useState, useMemo } from 'react';
import { Typography } from '@/components/ui/typography';
import { Button } from '@/components/ui/button';
import { ChevronUp, ChevronDown } from 'lucide-react';

const BAR_COLORS = [
  'bg-standard-subdued',
  'bg-status-success-mid',
  'bg-status-caution-mid',
  'bg-status-danger-mid',
  'bg-primary',
];

function formatCellValue(value: unknown): { display: string; className: string } {
  if (value === null || value === undefined) {
    return { display: 'null', className: 'text-label-muted italic' };
  }
  if (typeof value === 'boolean') {
    return {
      display: String(value),
      className: value ? 'text-status-success-mid font-medium' : 'text-status-danger-mid font-medium',
    };
  }
  if (typeof value === 'number') {
    return { display: value.toLocaleString(), className: 'font-mono' };
  }
  if (typeof value === 'object') {
    return { display: JSON.stringify(value), className: 'font-mono text-label-muted' };
  }
  return { display: String(value), className: '' };
}

interface ResponseVisualizerProps {
  body: string;
  contentType: string;
}

type SortDir = 'asc' | 'desc';

export function ResponseVisualizer({ body, contentType }: ResponseVisualizerProps) {
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [page, setPage] = useState(0);
  const pageSize = 20;

  const parsed = useMemo(() => {
    if (!contentType.includes('json') && !contentType.includes('javascript')) {
      return null;
    }
    try {
      return JSON.parse(body);
    } catch {
      return null;
    }
  }, [body, contentType]);

  const vizType = useMemo(() => {
    if (parsed === null) return 'none';
    if (Array.isArray(parsed)) {
      if (parsed.length > 0 && typeof parsed[0] === 'object' && parsed[0] !== null) {
        return 'table';
      }
      if (parsed.length > 0 && parsed.every(v => typeof v === 'number')) {
        return 'number-array';
      }
      return 'none';
    }
    if (typeof parsed === 'object' && parsed !== null) {
      const values = Object.values(parsed);
      if (values.length > 0 && values.some(v => typeof v === 'number')) {
        return 'object-chart';
      }
    }
    return 'none';
  }, [parsed]);

  const columns = useMemo(() => {
    if (vizType !== 'table' || !Array.isArray(parsed)) return [];
    const sample = parsed.slice(0, 5);
    const keys = new Set<string>();
    sample.forEach(item => {
      if (typeof item === 'object' && item !== null) {
        Object.keys(item).forEach(k => keys.add(k));
      }
    });
    return Array.from(keys);
  }, [vizType, parsed]);

  const sortedData = useMemo(() => {
    if (vizType !== 'table' || !Array.isArray(parsed)) return [];
    if (!sortCol) return parsed;
    return [...parsed].sort((a, b) => {
      const aVal = a[sortCol];
      const bVal = b[sortCol];
      if (aVal === bVal) return 0;
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      const cmp = aVal < bVal ? -1 : 1;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [vizType, parsed, sortCol, sortDir]);

  const pagedData = useMemo(() => {
    return sortedData.slice(page * pageSize, (page + 1) * pageSize);
  }, [sortedData, page]);

  const totalPages = Math.ceil(sortedData.length / pageSize);

  const handleSort = (col: string) => {
    if (sortCol === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
    setPage(0);
  };

  if (vizType === 'none') {
    return (
      <div className="flex items-center justify-center py-8">
        <Typography variant="caption">Cannot visualize this response type</Typography>
      </div>
    );
  }

  if (vizType === 'number-array') {
    const numbers = parsed as number[];
    const max = Math.max(...numbers.map(Math.abs), 1);
    return (
      <div className="flex flex-col gap-1">
        <Typography variant="subheading-small" className="mb-2">Value Distribution</Typography>
        <div className="flex items-end gap-[2px] h-32">
          {numbers.map((val, i) => (
            <div
              key={i}
              className={`flex-1 ${BAR_COLORS[i % BAR_COLORS.length]} rounded-t transition-all hover:opacity-80`}
              style={{ height: `${(Math.abs(val) / max) * 100}%`, minHeight: '2px' }}
              title={String(val)}
            />
          ))}
        </div>
      </div>
    );
  }

  if (vizType === 'object-chart') {
    const entries = Object.entries(parsed as Record<string, unknown>)
      .filter(([, v]) => typeof v === 'number')
      .map(([k, v]) => ({ label: k, value: v as number }));
    const max = Math.max(...entries.map(e => Math.abs(e.value)), 1);
    return (
      <div className="flex flex-col gap-1">
        <Typography variant="subheading-small" className="mb-2">Data Visualization</Typography>
        <div className="flex flex-col gap-2">
          {entries.map((entry, i) => (
            <div key={entry.label} className="flex items-center gap-2">
              <span className="text-[12px] text-label-muted w-24 truncate text-right shrink-0">{entry.label}</span>
              <div className="flex-1 h-5 bg-surface-muted rounded overflow-hidden">
                <div
                  className={`h-full rounded ${BAR_COLORS[i % BAR_COLORS.length]} transition-all`}
                  style={{ width: `${(Math.abs(entry.value) / max) * 100}%` }}
                />
              </div>
              <span className="text-[12px] font-mono text-label-mid w-16 text-right shrink-0">
                {entry.value.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <Typography variant="subheading-small">Data Table ({sortedData.length} rows)</Typography>
      </div>
      <div className="overflow-x-auto border border-utility-subdued rounded-lg">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="bg-surface-muted border-b border-utility-subdued">
              {columns.map(col => (
                <th
                  key={col}
                  className="text-left py-2 px-3 font-medium text-label-muted cursor-pointer hover:text-label-vivid select-none whitespace-nowrap"
                  onClick={() => handleSort(col)}
                >
                  <span className="inline-flex items-center gap-1">
                    {col}
                    {sortCol === col && (
                      sortDir === 'asc'
                        ? <ChevronUp className="w-3 h-3" />
                        : <ChevronDown className="w-3 h-3" />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pagedData.map((row, i) => (
              <tr key={i} className="border-b border-utility-subdued last:border-0 hover:bg-surface-muted transition-colors">
                {columns.map(col => {
                  const { display, className } = formatCellValue(row[col]);
                  return (
                    <td key={col} className={`py-1.5 px-3 text-label-mid max-w-[200px] truncate ${className}`}>
                      {display}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Typography variant="caption">
            Page {page + 1} of {totalPages}
          </Typography>
          <div className="flex items-center gap-1">
            <Button
              variant="utility"
              size="small"
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              Previous
            </Button>
            <Button
              variant="utility"
              size="small"
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
