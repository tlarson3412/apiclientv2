import { useMemo } from 'react';
import { useStore } from '@/store/useStore';
import { Typography } from '@/components/ui/typography';
import { Star } from 'lucide-react';
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

export function FavoritesPanel() {
  const allRequests = useStore(s => s.requests);
  const requests = useMemo(() => allRequests.filter(r => r.pinned), [allRequests]);
  const addTab = useStore(s => s.addTab);
  const togglePin = useStore(s => s.togglePinRequest);

  return (
    <div className="flex flex-col gap-2 pt-2">
      <Typography variant="subheading-small">Favorites</Typography>

      {requests.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-6">
          <Star className="w-8 h-8 text-utility-mid" />
          <Typography variant="caption" className="text-center">
            Pin requests to see them here. Click the star icon on any request.
          </Typography>
        </div>
      )}

      {requests.map(req => (
        <div key={req.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-utility-muted transition-colors">
          <button
            onClick={() => togglePin(req.id)}
            className="shrink-0"
          >
            <Star className="w-3.5 h-3.5 text-status-caution-mid fill-status-caution-mid" />
          </button>
          <button
            className="flex items-center gap-2 flex-1 min-w-0 text-left"
            onClick={() => addTab(req.id)}
          >
            <span className={cn('text-[11px] font-mono font-medium w-10 shrink-0', METHOD_COLORS[req.method])}>
              {req.method}
            </span>
            <span className="text-[12px] text-label-mid truncate flex-1">
              {req.name || req.url || 'Untitled'}
            </span>
          </button>
        </div>
      ))}
    </div>
  );
}
