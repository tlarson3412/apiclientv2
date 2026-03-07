import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { TextInput } from '@/components/ui/text-input';
import { Typography } from '@/components/ui/typography';
import { Search, ChevronUp, ChevronDown, X, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ResponseSearchProps {
  body: string;
  contentType: string;
  onFilteredBody?: (filtered: string) => void;
}

interface SearchMatch {
  start: number;
  end: number;
}

// Simple JSONPath resolver for dot-notation paths
function resolveJsonPath(obj: any, path: string): any {
  // Handle $.property format
  if (path.startsWith('$.')) {
    path = path.slice(2);
  }
  // Handle leading dot
  if (path.startsWith('.')) {
    path = path.slice(1);
  }

  const parts = path.match(/([^\.\[\]]+)|\[(\d+)\]/g) || [];
  
  let current = obj;
  for (const part of parts) {
    if (!current) return undefined;
    
    if (part.startsWith('[') && part.endsWith(']')) {
      const index = parseInt(part.slice(1, -1));
      current = current[index];
    } else {
      current = current[part];
    }
  }
  
  return current;
}

// Find all matches in text (case-sensitive by default)
function findMatches(text: string, searchTerm: string, caseSensitive: boolean): SearchMatch[] {
  if (!searchTerm) return [];
  
  const matches: SearchMatch[] = [];
  const searchText = caseSensitive ? text : text.toLowerCase();
  const searchValue = caseSensitive ? searchTerm : searchTerm.toLowerCase();
  
  let index = 0;
  while ((index = searchText.indexOf(searchValue, index)) !== -1) {
    matches.push({
      start: index,
      end: index + searchValue.length,
    });
    index += 1;
  }
  
  return matches;
}

export function ResponseSearch({ body, contentType, onFilteredBody }: ResponseSearchProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [matches, setMatches] = useState<SearchMatch[]>([]);
  
  const [jsonPath, setJsonPath] = useState('');
  const [jsonError, setJsonError] = useState('');
  const [filteredResult, setFilteredResult] = useState('');
  
  const isJson = contentType.includes('json');

  // Update search matches
  useEffect(() => {
    if (!searchTerm) {
      setMatches([]);
      setCurrentMatchIndex(0);
      return;
    }
    
    const newMatches = findMatches(body, searchTerm, caseSensitive);
    setMatches(newMatches);
    setCurrentMatchIndex(0);
  }, [searchTerm, caseSensitive, body]);

  // Handle JSONPath filtering
  const handleJsonPathChange = useCallback((path: string) => {
    setJsonPath(path);
    setJsonError('');
    setFilteredResult('');
    
    if (!path.trim()) {
      onFilteredBody?.(body);
      return;
    }

    try {
      const parsed = JSON.parse(body);
      const result = resolveJsonPath(parsed, path);
      
      if (result === undefined) {
        setJsonError('Path not found in JSON');
        onFilteredBody?.(body);
      } else {
        const resultStr = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
        setFilteredResult(resultStr);
        onFilteredBody?.(resultStr);
      }
    } catch (error) {
      setJsonError('Invalid JSON or path');
      onFilteredBody?.(body);
    }
  }, [body, onFilteredBody]);

  const goToMatch = (index: number) => {
    if (matches.length > 0) {
      const newIndex = (index + matches.length) % matches.length;
      setCurrentMatchIndex(newIndex);
    }
  };

  const nextMatch = () => goToMatch(currentMatchIndex + 1);
  const prevMatch = () => goToMatch(currentMatchIndex - 1);
  const clearSearch = () => {
    setSearchTerm('');
    setMatches([]);
    setCurrentMatchIndex(0);
  };

  const matchLabel = matches.length > 0 ? `${currentMatchIndex + 1} of ${matches.length}` : '0 matches';

  return (
    <div className="flex flex-col gap-4 p-3 bg-surface border-b border-utility-subdued">
      {/* Text Search Section */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-label-muted flex-shrink-0" />
          <Typography variant="caption" className="text-label-muted">
            Search Response
          </Typography>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search text..."
              className="w-full px-3 py-2 rounded border border-utility-subdued bg-transparent font-normal text-[14px] placeholder:text-label-muted focus:outline-none focus:border-standard-subdued"
            />
          </div>
          
          <div className="flex items-center gap-1">
            <Typography variant="caption" className="text-label-muted whitespace-nowrap">
              {matchLabel}
            </Typography>
          </div>
          
          <Button
            variant="text"
            size="small"
            onClick={prevMatch}
            disabled={matches.length === 0}
            className="p-1"
            title="Previous match"
          >
            <ChevronUp className="w-4 h-4" />
          </Button>
          
          <Button
            variant="text"
            size="small"
            onClick={nextMatch}
            disabled={matches.length === 0}
            className="p-1"
            title="Next match"
          >
            <ChevronDown className="w-4 h-4" />
          </Button>
          
          <Button
            variant="text"
            size="small"
            onClick={() => setCaseSensitive(!caseSensitive)}
            className={cn('p-1', caseSensitive && 'bg-utility-muted')}
            title="Toggle case sensitivity"
          >
            <span className="text-[11px] font-mono">Aa</span>
          </Button>
          
          <Button
            variant="text"
            size="small"
            onClick={clearSearch}
            disabled={!searchTerm}
            className="p-1"
            title="Clear search"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* JSONPath Filter Section */}
      {isJson && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-label-muted flex-shrink-0" />
            <Typography variant="caption" className="text-label-muted">
              JSONPath Filter
            </Typography>
          </div>
          
          <div className="flex flex-col gap-2">
            <input
              type="text"
              value={jsonPath}
              onChange={(e) => handleJsonPathChange(e.target.value)}
              placeholder="e.g., data.users[0].name or $.items"
              className="w-full px-3 py-2 rounded border border-utility-subdued bg-transparent font-mono text-[13px] placeholder:text-label-muted focus:outline-none focus:border-standard-subdued"
            />
            
            {jsonError && (
              <Typography variant="caption" className="text-status-danger">
                {jsonError}
              </Typography>
            )}
            
            {filteredResult && !jsonError && (
              <div className="p-2 rounded border border-utility-subdued bg-surface-alternate-muted max-h-[120px] overflow-auto">
                <Typography variant="caption" className="text-label-muted font-mono whitespace-pre-wrap break-words">
                  {filteredResult}
                </Typography>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
