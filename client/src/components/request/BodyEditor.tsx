import { useEffect, useRef } from 'react';
import { useStore } from '@/store/useStore';
import { Typography } from '@/components/ui/typography';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { BodyType, KeyValuePair, FormDataEntry } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { Plus, Trash2, Upload } from 'lucide-react';
// @ts-ignore
import { EditorView, basicSetup } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { json } from '@codemirror/lang-json';
import { javascript } from '@codemirror/lang-javascript';
import { xml } from '@codemirror/lang-xml';
import { html } from '@codemirror/lang-html';
import { oneDark } from '@codemirror/theme-one-dark';
import { GraphQLEditor } from './GraphQLEditor';
import { cn } from '@/lib/utils';
import { vscodeClient } from '@/lib/vscodeApi';

const BODY_MODES: { value: BodyType; label: string }[] = [
  { value: 'none', label: 'none' },
  { value: 'form-data', label: 'form-data' },
  { value: 'x-www-form-urlencoded', label: 'x-www-form-urlencoded' },
  { value: 'raw', label: 'raw' },
  { value: 'binary', label: 'binary' },
  { value: 'graphql', label: 'GraphQL' },
];

function getLanguageExtension(bodyType: BodyType) {
  switch (bodyType) {
    case 'json': return json();
    case 'graphql': return javascript();
    case 'raw': return [];
    default: return [];
  }
}

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  bodyType: BodyType;
}

function CodeEditor({ value, onChange, bodyType }: CodeEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  useEffect(() => {
    if (!editorRef.current) return;

    const langExt = getLanguageExtension(bodyType);

    const state = EditorState.create({
      doc: value,
      extensions: [
        basicSetup,
        ...(Array.isArray(langExt) ? langExt : [langExt]),
        EditorView.updateListener.of((update: any) => {
          if (update.docChanged) {
            onChange(update.state.doc.toString());
          }
        }),
        EditorView.theme({
          '&': { height: '200px', fontSize: '13px' },
          '.cm-scroller': { overflow: 'auto' },
          '.cm-content': { fontFamily: 'var(--font-mono)' },
        }),
      ],
    });

    const view = new EditorView({
      state,
      parent: editorRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
    };
  }, [bodyType]);

  useEffect(() => {
    const view = viewRef.current;
    if (view && view.state.doc.toString() !== value) {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: value },
      });
    }
  }, [value]);

  return (
    <div
      ref={editorRef}
      className="border border-utility-subdued rounded overflow-hidden"
    />
  );
}

function UrlEncodedEditor({
  pairs,
  onChange,
}: {
  pairs: KeyValuePair[];
  onChange: (pairs: KeyValuePair[]) => void;
}) {
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

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center px-1 pb-1">
        <div className="grid grid-cols-[24px_1fr_1fr_28px] gap-2 flex-1">
          <span />
          <span className="text-[11px] text-label-muted font-medium uppercase tracking-wider">Key</span>
          <span className="text-[11px] text-label-muted font-medium uppercase tracking-wider">Value</span>
          <span />
        </div>
      </div>
      {pairs.map(pair => (
        <div key={pair.id} className="grid grid-cols-[24px_1fr_1fr_28px] gap-2 items-center">
          <Checkbox
            checked={pair.enabled}
            onCheckedChange={(c) => updatePair(pair.id, { enabled: !!c })}
          />
          <input
            value={pair.key}
            onChange={e => updatePair(pair.id, { key: e.target.value })}
            placeholder="Key"
            className={inputClass}
          />
          <input
            value={pair.value}
            onChange={e => updatePair(pair.id, { value: e.target.value })}
            placeholder="Value"
            className={inputClass}
          />
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

function FormDataEditor({
  entries,
  onChange,
}: {
  entries: FormDataEntry[];
  onChange: (entries: FormDataEntry[]) => void;
}) {
  const addEntry = (type: 'text' | 'file') => {
    onChange([...entries, {
      id: uuidv4(),
      key: '',
      value: '',
      type,
      enabled: true,
    }]);
  };

  const updateEntry = (id: string, updates: Partial<FormDataEntry>) => {
    onChange(entries.map(e => (e.id === id ? { ...e, ...updates } : e)));
  };

  const removeEntry = (id: string) => {
    onChange(entries.filter(e => e.id !== id));
  };

  const handleFileSelect = async (id: string) => {
    try {
      const result = await vscodeClient.openFileBinaryDialog();
      if (result) {
        const fileName = result.path.split(/[\\/]/).pop() || 'file';
        updateEntry(id, {
          fileName,
          fileContentBase64: result.content,
          contentType: 'application/octet-stream',
          value: fileName,
        });
      }
    } catch (err) {
      console.error('File select failed:', err);
    }
  };

  const inputClass = "h-8 px-2 text-[13px] bg-transparent border-b border-utility-subdued text-label-vivid placeholder:text-label-muted focus:outline-none focus:border-standard-subdued font-mono";

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center px-1 pb-1">
        <div className="grid grid-cols-[24px_80px_1fr_1fr_28px] gap-2 flex-1">
          <span />
          <span className="text-[11px] text-label-muted font-medium uppercase tracking-wider">Type</span>
          <span className="text-[11px] text-label-muted font-medium uppercase tracking-wider">Key</span>
          <span className="text-[11px] text-label-muted font-medium uppercase tracking-wider">Value</span>
          <span />
        </div>
      </div>
      {entries.map(entry => (
        <div key={entry.id} className="grid grid-cols-[24px_80px_1fr_1fr_28px] gap-2 items-center">
          <Checkbox
            checked={entry.enabled}
            onCheckedChange={(c) => updateEntry(entry.id, { enabled: !!c })}
          />
          <Select
            value={entry.type}
            onValueChange={(v) => updateEntry(entry.id, { type: v as 'text' | 'file' })}
          >
            <SelectTrigger className="h-7 text-[12px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="text">Text</SelectItem>
              <SelectItem value="file">File</SelectItem>
            </SelectContent>
          </Select>
          <input
            value={entry.key}
            onChange={e => updateEntry(entry.id, { key: e.target.value })}
            placeholder="Key"
            className={inputClass}
          />
          {entry.type === 'text' ? (
            <input
              value={entry.value}
              onChange={e => updateEntry(entry.id, { value: e.target.value })}
              placeholder="Value"
              className={inputClass}
            />
          ) : (
            <div className="flex items-center gap-2 h-8">
              <button
                onClick={() => handleFileSelect(entry.id)}
                className="flex items-center gap-1.5 px-2 py-1 text-[12px] text-label-mid border border-utility-subdued rounded cursor-pointer hover:bg-utility-muted transition-colors"
              >
                <Upload className="w-3 h-3" />
                {entry.fileName || 'Choose file'}
              </button>
            </div>
          )}
          <button
            onClick={() => removeEntry(entry.id)}
            className="p-1 rounded hover:bg-status-danger-muted transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5 text-status-danger-mid" />
          </button>
        </div>
      ))}
      <div className="flex items-center gap-2 mt-1">
        <Button variant="text" size="small" onClick={() => addEntry('text')}>
          <Plus className="w-3.5 h-3.5" /> Text
        </Button>
        <Button variant="text" size="small" onClick={() => addEntry('file')}>
          <Upload className="w-3.5 h-3.5" /> File
        </Button>
      </div>
    </div>
  );
}

function BinaryEditor({
  request,
}: {
  request: { id: string; body: string; bodyFormData?: FormDataEntry[] };
}) {
  const updateRequest = useStore(s => s.updateRequest);

  const fileEntry = request.bodyFormData?.[0];

  const handleFileSelect = async () => {
    try {
      const result = await vscodeClient.openFileBinaryDialog();
      if (result) {
        const fileName = result.path.split(/[\\/]/).pop() || 'file';
        updateRequest(request.id, {
          bodyFormData: [{
            id: uuidv4(),
            key: 'file',
            value: fileName,
            type: 'file',
            fileName,
            fileContentBase64: result.content,
            contentType: 'application/octet-stream',
            enabled: true,
          }],
        });
      }
    } catch (err) {
      console.error('File select failed:', err);
    }
  };

  return (
    <div className="flex flex-col items-center gap-3 py-6">
      <button
        onClick={handleFileSelect}
        className="flex items-center gap-2 px-4 py-2 text-[13px] text-label-mid border border-utility-subdued rounded cursor-pointer hover:bg-utility-muted transition-colors"
      >
        <Upload className="w-4 h-4" />
        {fileEntry?.fileName || 'Select file'}
      </button>
      {fileEntry?.fileName && (
        <Typography variant="caption" className="text-label-muted">
          {fileEntry.fileName} ({fileEntry.contentType})
        </Typography>
      )}
    </div>
  );
}

export function BodyEditor() {
  const activeRequest = useStore(s => {
    const activeTab = s.tabs.find(t => t.id === s.activeTabId);
    if (!activeTab) return undefined;
    return s.requests.find(r => r.id === activeTab.requestId);
  });
  const updateRequest = useStore(s => s.updateRequest);

  if (!activeRequest) return null;

  const currentMode = activeRequest.bodyType === 'json' ? 'raw' : activeRequest.bodyType;

  const handleModeChange = (mode: BodyType) => {
    if (mode === 'raw') {
      updateRequest(activeRequest.id, { bodyType: 'json' });
    } else {
      updateRequest(activeRequest.id, { bodyType: mode });
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-4 flex-wrap">
        {BODY_MODES.map(mode => (
          <label
            key={mode.value}
            className="flex items-center gap-1.5 cursor-pointer"
          >
            <input
              type="radio"
              name="bodyType"
              checked={currentMode === mode.value}
              onChange={() => handleModeChange(mode.value)}
              className="w-3.5 h-3.5 accent-[var(--standard-mid)]"
            />
            <span className={cn(
              'text-[13px]',
              currentMode === mode.value ? 'text-label-vivid' : 'text-label-muted'
            )}>
              {mode.label}
            </span>
          </label>
        ))}
      </div>

      {activeRequest.bodyType === 'none' ? (
        <div className="flex items-center justify-center py-8">
          <Typography variant="body-small" className="text-label-muted">
            This request does not have a body
          </Typography>
        </div>
      ) : activeRequest.bodyType === 'graphql' ? (
        <GraphQLEditor />
      ) : activeRequest.bodyType === 'x-www-form-urlencoded' ? (
        <UrlEncodedEditor
          pairs={activeRequest.bodyUrlEncoded || []}
          onChange={(pairs) => updateRequest(activeRequest.id, { bodyUrlEncoded: pairs })}
        />
      ) : activeRequest.bodyType === 'form-data' ? (
        <FormDataEditor
          entries={activeRequest.bodyFormData || []}
          onChange={(entries) => updateRequest(activeRequest.id, { bodyFormData: entries })}
        />
      ) : activeRequest.bodyType === 'binary' ? (
        <BinaryEditor request={activeRequest} />
      ) : (
        <>
          {(activeRequest.bodyType === 'json' || activeRequest.bodyType === 'raw') && (
            <div className="flex items-center gap-2">
              <Select
                value={activeRequest.bodyType}
                onValueChange={(v) => updateRequest(activeRequest.id, { bodyType: v as BodyType })}
              >
                <SelectTrigger className="w-[120px] h-7 text-[12px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="json">JSON</SelectItem>
                  <SelectItem value="raw">Text</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <CodeEditor
            value={activeRequest.body}
            onChange={(body) => updateRequest(activeRequest.id, { body })}
            bodyType={activeRequest.bodyType}
          />
        </>
      )}
    </div>
  );
}
