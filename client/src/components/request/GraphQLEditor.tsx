import { useEffect, useRef, useState } from 'react';
import { useStore } from '@/store/useStore';
import { Typography } from '@/components/ui/typography';
// @ts-ignore
import { EditorView, basicSetup } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';

function GqlCodeEditor({ value, onChange, language, placeholder, height = '160px' }: {
  value: string;
  onChange: (v: string) => void;
  language: 'graphql' | 'json';
  placeholder?: string;
  height?: string;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  useEffect(() => {
    if (!editorRef.current) return;

    const langExt = language === 'json' ? json() : javascript();

    const state = EditorState.create({
      doc: value,
      extensions: [
        basicSetup,
        langExt,
        EditorView.updateListener.of((update: any) => {
          if (update.docChanged) {
            onChange(update.state.doc.toString());
          }
        }),
        EditorView.theme({
          '&': { height, fontSize: '13px' },
          '.cm-scroller': { overflow: 'auto' },
          '.cm-content': { fontFamily: 'var(--font-mono)' },
        }),
        placeholder ? EditorView.contentAttributes.of({ 'aria-placeholder': placeholder }) : [],
      ].flat(),
    });

    const view = new EditorView({
      state,
      parent: editorRef.current,
    });

    viewRef.current = view;
    return () => view.destroy();
  }, [language]);

  useEffect(() => {
    const view = viewRef.current;
    if (view && view.state.doc.toString() !== value) {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: value },
      });
    }
  }, [value]);

  return (
    <div ref={editorRef} className="border border-utility-subdued rounded overflow-hidden" />
  );
}

export function GraphQLEditor() {
  const activeRequest = useStore(s => {
    const activeTab = s.tabs.find(t => t.id === s.activeTabId);
    if (!activeTab) return undefined;
    return s.requests.find(r => r.id === activeTab.requestId);
  });
  const updateRequest = useStore(s => s.updateRequest);

  const [activePanel, setActivePanel] = useState<'query' | 'variables'>('query');

  if (!activeRequest) return null;

  let query = '';
  let variables = '';
  try {
    const parsed = JSON.parse(activeRequest.body);
    query = parsed.query || '';
    variables = parsed.variables ? JSON.stringify(parsed.variables, null, 2) : '';
  } catch {
    query = activeRequest.body;
  }

  const updateBody = (newQuery?: string, newVariables?: string) => {
    const q = newQuery !== undefined ? newQuery : query;
    const v = newVariables !== undefined ? newVariables : variables;

    let varsObj = {};
    if (v.trim()) {
      try { varsObj = JSON.parse(v); } catch { varsObj = {}; }
    }

    const body = JSON.stringify({
      query: q,
      ...(Object.keys(varsObj).length > 0 ? { variables: varsObj } : {}),
    }, null, 2);

    updateRequest(activeRequest.id, { body });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1 border-b border-utility-subdued">
        <button
          className={`px-3 py-1.5 text-[13px] font-medium border-b-2 transition-colors ${
            activePanel === 'query'
              ? 'border-standard-subdued text-label-vivid'
              : 'border-transparent text-label-muted hover:text-label-mid'
          }`}
          onClick={() => setActivePanel('query')}
        >
          Query
        </button>
        <button
          className={`px-3 py-1.5 text-[13px] font-medium border-b-2 transition-colors ${
            activePanel === 'variables'
              ? 'border-standard-subdued text-label-vivid'
              : 'border-transparent text-label-muted hover:text-label-mid'
          }`}
          onClick={() => setActivePanel('variables')}
        >
          Variables
        </button>
      </div>

      {activePanel === 'query' && (
        <GqlCodeEditor
          value={query}
          onChange={(v) => updateBody(v, undefined)}
          language="graphql"
          placeholder="query { ... }"
          height="200px"
        />
      )}

      {activePanel === 'variables' && (
        <GqlCodeEditor
          value={variables}
          onChange={(v) => updateBody(undefined, v)}
          language="json"
          placeholder='{"key": "value"}'
          height="150px"
        />
      )}

      <Typography variant="caption" className="text-label-muted">
        GraphQL queries are sent as JSON with query and variables fields
      </Typography>
    </div>
  );
}
