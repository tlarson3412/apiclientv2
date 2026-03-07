import { useState, useMemo, useRef, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { Typography } from '@/components/ui/typography';
import { Search, X, FolderOpen, Clock, File } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GlobalSearchProps {
  open: boolean;
  onClose: () => void;
}

interface SearchResult {
  type: 'request' | 'collection' | 'history';
  id: string;
  title: string;
  subtitle: string;
  method?: string;
  requestId?: string;
}

const METHOD_COLORS: Record<string, string> = {
  GET: 'text-status-success-mid',
  POST: 'text-standard-subdued',
  PUT: 'text-status-caution-mid',
  DELETE: 'text-status-danger-mid',
  PATCH: 'text-status-caution-mid',
};

export function GlobalSearch({ open, onClose }: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const requests = useStore(s => s.requests);
  const collections = useStore(s => s.collections);
  const history = useStore(s => s.history);
  const addTab = useStore(s => s.addTab);

  useEffect(() => {
    if (open) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const results = useMemo<SearchResult[]>(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    const items: SearchResult[] = [];

    requests.forEach(r => {
      if (
        r.name.toLowerCase().includes(q) ||
        r.url.toLowerCase().includes(q) ||
        r.method.toLowerCase().includes(q) ||
        r.headers.some(h => h.key.toLowerCase().includes(q) || h.value.toLowerCase().includes(q)) ||
        r.body.toLowerCase().includes(q)
      ) {
        items.push({
          type: 'request',
          id: r.id,
          title: r.name || r.url || 'Untitled',
          subtitle: `${r.method} ${r.url}`,
          method: r.method,
          requestId: r.id,
        });
      }
    });

    collections.forEach(c => {
      if (c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q)) {
        items.push({
          type: 'collection',
          id: c.id,
          title: c.name,
          subtitle: c.description || `${requests.filter(r => r.collectionId === c.id).length} requests`,
        });
      }
    });

    history.forEach(h => {
      if (
        h.request.url.toLowerCase().includes(q) ||
        h.request.method.toLowerCase().includes(q) ||
        h.response.body.toLowerCase().includes(q)
      ) {
        items.push({
          type: 'history',
          id: h.id,
          title: `${h.request.method} ${h.request.url}`,
          subtitle: `${h.response.status} — ${new Date(h.timestamp).toLocaleString()}`,
          method: h.request.method,
          requestId: h.request.id,
        });
      }
    });

    return items.slice(0, 20);
  }, [query, requests, collections, history]);

  const handleSelect = (result: SearchResult) => {
    if (result.requestId) {
      addTab(result.requestId);
    }
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative w-full max-w-lg bg-surface border border-utility-subdued rounded-lg shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-3 border-b border-utility-subdued">
          <Search className="w-4 h-4 text-label-muted shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search requests, collections, history..."
            className="flex-1 h-10 bg-transparent text-[14px] text-label-vivid placeholder:text-label-muted focus:outline-none"
          />
          <button onClick={onClose} className="p-1 rounded hover:bg-utility-muted">
            <X className="w-4 h-4 text-label-muted" />
          </button>
        </div>

        <div className="max-h-[400px] overflow-auto">
          {query && results.length === 0 && (
            <div className="py-8 text-center">
              <Typography variant="body-small" className="text-label-muted">No results found</Typography>
            </div>
          )}
          {results.map((result) => (
            <button
              key={`${result.type}-${result.id}`}
              className="flex items-center gap-3 w-full px-3 py-2.5 hover:bg-utility-muted transition-colors text-left"
              onClick={() => handleSelect(result)}
            >
              {result.type === 'request' && <File className="w-4 h-4 text-label-muted shrink-0" />}
              {result.type === 'collection' && <FolderOpen className="w-4 h-4 text-label-muted shrink-0" />}
              {result.type === 'history' && <Clock className="w-4 h-4 text-label-muted shrink-0" />}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {result.method && (
                    <span className={cn('text-[11px] font-mono font-semibold', METHOD_COLORS[result.method] || 'text-label-muted')}>
                      {result.method}
                    </span>
                  )}
                  <span className="text-[13px] text-label-vivid truncate">{result.title}</span>
                </div>
                <span className="text-[12px] text-label-muted truncate block">{result.subtitle}</span>
              </div>
              <span className="text-[11px] text-label-muted shrink-0 capitalize">{result.type}</span>
            </button>
          ))}
        </div>

        {!query && (
          <div className="py-6 text-center">
            <Typography variant="caption" className="text-label-muted">Type to search across requests, collections, and history</Typography>
          </div>
        )}
      </div>
    </div>
  );
}
