import { useState, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2 } from 'lucide-react';
import type { KeyValuePair } from '@/types';
import { cn } from '@/lib/utils';
import { getHeaderSuggestions, getValueSuggestions } from '@/utils/headerSuggestions';

interface KeyValueEditorProps {
  pairs: KeyValuePair[];
  onChange: (pairs: KeyValuePair[]) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
  showHeaderSuggestions?: boolean;
}

function AutocompleteInput({
  value,
  onChange,
  placeholder,
  suggestions,
  className,
}: {
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
  suggestions: string[];
  className?: string;
}) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filtered, setFiltered] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showSuggestions && value) {
      const lower = value.toLowerCase();
      setFiltered(suggestions.filter(s => s.toLowerCase().includes(lower)).slice(0, 8));
    } else if (showSuggestions) {
      setFiltered(suggestions.slice(0, 8));
    }
  }, [value, showSuggestions, suggestions]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setShowSuggestions(true)}
        placeholder={placeholder}
        className={className}
      />
      {showSuggestions && filtered.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-surface border border-utility-subdued rounded shadow-lg max-h-[200px] overflow-auto">
          {filtered.map((suggestion) => (
            <button
              key={suggestion}
              className="w-full text-left px-2 py-1 text-[12px] text-label-mid hover:bg-utility-muted transition-colors font-mono"
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(suggestion);
                setShowSuggestions(false);
              }}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function KeyValueEditor({
  pairs,
  onChange,
  keyPlaceholder = 'Key',
  valuePlaceholder = 'Value',
  showHeaderSuggestions = false,
}: KeyValueEditorProps) {
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkText, setBulkText] = useState('');

  const serializeToBulk = (items: KeyValuePair[]) => {
    return items
      .map(item => {
        const prefix = item.enabled ? '' : '// ';
        return `${prefix}${item.key}:${item.value}`;
      })
      .join('\n');
  };

  const parseBulkText = (text: string): KeyValuePair[] => {
    return text
      .split('\n')
      .filter(line => line.trim().length > 0)
      .map(line => {
        let enabled = true;
        let cleanLine = line;

        if (line.trim().startsWith('//')) {
          enabled = false;
          cleanLine = line.replace(/^\/\/\s*/, '');
        }

        const [key, ...valueParts] = cleanLine.split(':');
        const value = valueParts.join(':');

        return {
          id: uuidv4(),
          key: key.trim(),
          value: value.trim(),
          enabled,
        };
      });
  };

  const handleBulkModeToggle = () => {
    if (!bulkMode) {
      setBulkText(serializeToBulk(pairs));
      setBulkMode(true);
    } else {
      const parsedPairs = parseBulkText(bulkText);
      onChange(parsedPairs);
      setBulkMode(false);
      setBulkText('');
    }
  };

  const handleBulkTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setBulkText(e.target.value);
  };

  const addPair = () => {
    onChange([...pairs, { id: uuidv4(), key: '', value: '', enabled: true }]);
  };

  const updatePair = (id: string, updates: Partial<KeyValuePair>) => {
    onChange(pairs.map(p => (p.id === id ? { ...p, ...updates } : p)));
  };

  const removePair = (id: string) => {
    onChange(pairs.filter(p => p.id !== id));
  };

  const inputClass = "h-8 px-2 text-[13px] bg-transparent border-b border-utility-subdued text-label-vivid placeholder:text-label-muted focus:outline-none focus:border-standard-subdued font-mono";
  const inputClassValue = "h-8 px-2 text-[13px] bg-transparent border-b border-utility-subdued text-label-mid placeholder:text-label-muted focus:outline-none focus:border-standard-subdued font-mono";

  if (bulkMode) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-label-muted font-medium uppercase tracking-wider">Bulk Edit Mode</span>
          <Button
            variant="text"
            size="small"
            onClick={handleBulkModeToggle}
            className="text-[13px]"
          >
            {bulkMode ? 'Key-Value' : 'Bulk Edit'}
          </Button>
        </div>
        <textarea
          value={bulkText}
          onChange={handleBulkTextChange}
          placeholder="key:value&#10;key:value&#10;// disabled:value"
          className={cn(
            "w-full min-h-[200px] p-2 text-[13px] font-mono",
            "bg-surface border border-utility-subdued rounded",
            "text-label-vivid placeholder:text-label-muted",
            "focus:outline-none focus:border-standard-subdued",
            "resize-none"
          )}
        />
        <div className="text-[12px] text-label-muted">
          Format: key:value (one per line). Prefix with // to disable a line.
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      {(pairs.length > 0 || true) && (
        <div className="flex items-center justify-between px-1 pb-1">
          <div className="grid grid-cols-[24px_1fr_1fr_28px] gap-2 flex-1">
            <span />
            <span className="text-[11px] text-label-muted font-medium uppercase tracking-wider">{keyPlaceholder}</span>
            <span className="text-[11px] text-label-muted font-medium uppercase tracking-wider">{valuePlaceholder}</span>
            <span />
          </div>
          <Button
            variant="text"
            size="small"
            onClick={handleBulkModeToggle}
            className="text-[13px]"
          >
            {bulkMode ? 'Key-Value' : 'Bulk Edit'}
          </Button>
        </div>
      )}
      {pairs.map(pair => (
        <div key={pair.id} className="grid grid-cols-[24px_1fr_1fr_28px] gap-2 items-center">
          <Checkbox
            checked={pair.enabled}
            onCheckedChange={(c) => updatePair(pair.id, { enabled: !!c })}
          />
          {showHeaderSuggestions ? (
            <AutocompleteInput
              value={pair.key}
              onChange={(val) => updatePair(pair.id, { key: val })}
              placeholder={keyPlaceholder}
              suggestions={getHeaderSuggestions('')}
              className={inputClass}
            />
          ) : (
            <input
              value={pair.key}
              onChange={e => updatePair(pair.id, { key: e.target.value })}
              placeholder={keyPlaceholder}
              className={inputClass}
            />
          )}
          {showHeaderSuggestions && pair.key ? (
            <AutocompleteInput
              value={pair.value}
              onChange={(val) => updatePair(pair.id, { value: val })}
              placeholder={valuePlaceholder}
              suggestions={getValueSuggestions(pair.key)}
              className={inputClassValue}
            />
          ) : (
            <input
              value={pair.value}
              onChange={e => updatePair(pair.id, { value: e.target.value })}
              placeholder={valuePlaceholder}
              className={inputClassValue}
            />
          )}
          <button
            onClick={() => removePair(pair.id)}
            className="p-1 rounded hover:bg-status-danger-muted transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5 text-status-danger-mid" />
          </button>
        </div>
      ))}
      <Button variant="text" size="small" onClick={addPair} className="self-start mt-1">
        <Plus className="w-3.5 h-3.5" /> Add
      </Button>
    </div>
  );
}
