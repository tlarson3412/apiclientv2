import { useStore } from '@/store/useStore';
import { Button } from '@/components/ui/button';
import { TextInput } from '@/components/ui/text-input';
import { Typography } from '@/components/ui/typography';
import { Plus, Trash2, Check, Link2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { v4 as uuidv4 } from 'uuid';
import type { ExtractionSource, ResponseExtraction } from '@/types';

const SOURCE_OPTIONS: { value: ExtractionSource; label: string; placeholder: string }[] = [
  { value: 'json-path', label: 'JSON Path', placeholder: '$.data.token' },
  { value: 'regex', label: 'Regex', placeholder: '"token":"([^"]+)"' },
  { value: 'header', label: 'Header', placeholder: 'Authorization' },
];

export function ExtractionEditor() {
  const activeRequest = useStore(s => {
    const tab = s.tabs.find(t => t.id === s.activeTabId);
    return tab ? s.requests.find(r => r.id === tab.requestId) : undefined;
  });
  const addExtraction = useStore(s => s.addExtraction);
  const updateExtraction = useStore(s => s.updateExtraction);
  const deleteExtraction = useStore(s => s.deleteExtraction);

  if (!activeRequest) return null;

  const extractions = activeRequest.extractions || [];

  const handleAdd = () => {
    const extraction: ResponseExtraction = {
      id: uuidv4(),
      name: 'New Extraction',
      source: 'json-path',
      expression: '',
      variableName: '',
      enabled: true,
    };
    addExtraction(activeRequest.id, extraction);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link2 className="w-4 h-4 text-standard-subdued" />
          <Typography variant="subheading-small">Response Extractions</Typography>
        </div>
        <Button variant="text" size="small" onClick={handleAdd}>
          <Plus className="w-3.5 h-3.5" /> Add
        </Button>
      </div>

      <Typography variant="caption" className="text-label-muted -mt-1">
        Extract values from responses and save them as environment variables for use in other requests.
      </Typography>

      {extractions.length === 0 && (
        <Typography variant="caption" className="text-label-muted py-2 text-center">
          No extractions defined
        </Typography>
      )}

      <div className="flex flex-col gap-2">
        {extractions.map(extraction => {
          const sourceConfig = SOURCE_OPTIONS.find(s => s.value === extraction.source);

          return (
            <div key={extraction.id} className="flex flex-col gap-1.5 p-2.5 rounded border border-utility-subdued bg-surface-alternate-muted">
              <div className="flex items-center gap-2">
                <button
                  className={cn(
                    'w-4 h-4 rounded border flex items-center justify-center transition-colors',
                    extraction.enabled
                      ? 'bg-standard-subdued border-standard-subdued'
                      : 'border-utility-mid bg-transparent'
                  )}
                  onClick={() => updateExtraction(activeRequest.id, extraction.id, { enabled: !extraction.enabled })}
                >
                  {extraction.enabled && <Check className="w-3 h-3 text-white" />}
                </button>

                <select
                  className="bg-transparent text-[13px] text-label-vivid border border-utility-subdued rounded px-2 py-1"
                  value={extraction.source}
                  onChange={e => updateExtraction(activeRequest.id, extraction.id, { source: e.target.value as ExtractionSource })}
                >
                  {SOURCE_OPTIONS.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>

                <div className="flex-1" />

                <button
                  className="p-0.5 rounded hover:bg-status-danger-muted transition-colors"
                  onClick={() => deleteExtraction(activeRequest.id, extraction.id)}
                >
                  <Trash2 className="w-3.5 h-3.5 text-status-danger-mid" />
                </button>
              </div>

              <div className="flex gap-2">
                <TextInput
                  label={`Expression (${sourceConfig?.placeholder || ''})`}
                  value={extraction.expression}
                  onValueChange={v => updateExtraction(activeRequest.id, extraction.id, { expression: v })}
                  className="flex-1"
                />
                <TextInput
                  label="Save as {{variable}}"
                  value={extraction.variableName}
                  onValueChange={v => updateExtraction(activeRequest.id, extraction.id, { variableName: v })}
                  className="flex-1"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
