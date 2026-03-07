import { useState, useEffect, useRef } from 'react';
import { useStore } from '@/store/useStore';
import { Button } from '@/components/ui/button';
import { Play, Check, X } from 'lucide-react';
import { runPmScript } from '@/utils/pmSandbox';
import { AssertionEditor } from './AssertionEditor';
import { TestSnippetLibrary } from '@/components/testing/TestSnippetLibrary';
import { cn } from '@/lib/utils';
// @ts-ignore
import { EditorView, basicSetup } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { javascript } from '@codemirror/lang-javascript';

type ScriptTab = 'pre-request' | 'post-response';

function ScriptCodeEditor({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!editorRef.current) return;

    if (viewRef.current) {
      viewRef.current.destroy();
      viewRef.current = null;
    }

    const updateListener = EditorView.updateListener.of((update: any) => {
      if (update.docChanged) {
        onChangeRef.current(update.state.doc.toString());
      }
    });

    const state = EditorState.create({
      doc: value || '',
      extensions: [
        basicSetup,
        javascript(),
        updateListener,
        EditorView.theme({
          '&': { fontSize: '13px', height: '100%', border: 'none' },
          '.cm-scroller': { overflow: 'auto' },
          '.cm-content': { fontFamily: 'var(--font-mono)', padding: '8px 0' },
          '.cm-gutters': { backgroundColor: 'var(--surface-alternate-muted)', borderRight: '1px solid var(--utility-subdued)' },
          '&.cm-focused': { outline: 'none' },
        }),
        EditorView.contentAttributes.of({ 'aria-label': label }),
      ],
    });

    viewRef.current = new EditorView({
      state,
      parent: editorRef.current,
    });

    return () => {
      viewRef.current?.destroy();
      viewRef.current = null;
    };
  }, [label]);

  return <div ref={editorRef} className="h-full" />;
}

export function RequestScriptsPanel({ requestId }: { requestId: string }) {
  const activeRequest = useStore(s => s.requests.find(r => r.id === requestId));
  const updateRequest = useStore(s => s.updateRequest);
  const interpolate = useStore(s => s.interpolateVariables);
  const [activeScript, setActiveScript] = useState<ScriptTab>('pre-request');
  const [testResult, setTestResult] = useState<{ success: boolean; logs: string[]; error?: string; testResults?: any[] } | null>(null);

  if (!activeRequest) return null;

  const hasPreRequest = !!(activeRequest.preRequestScript && activeRequest.preRequestScript.trim());
  const hasPostResponse = !!(activeRequest.testScript && activeRequest.testScript.trim());

  const handleTest = () => {
    const storeState = useStore.getState();
    const env = storeState.environments.find(e => e.id === storeState.activeEnvironmentId);
    const envVars = env
      ? Object.fromEntries(env.variables.filter(v => v.enabled).map(v => [v.key, v.value]))
      : {};
    const col = activeRequest.collectionId
      ? storeState.collections.find(c => c.id === activeRequest.collectionId)
      : undefined;
    const colVars = col?.variables
      ? Object.fromEntries(col.variables.filter(v => v.enabled).map(v => [v.key, v.value]))
      : {};

    const isTest = activeScript === 'post-response';
    const script = isTest ? (activeRequest.testScript || '') : (activeRequest.preRequestScript || '');

    const mockResponse = isTest ? {
      status: 200,
      statusText: 'OK',
      headers: { 'content-type': 'application/json' },
      body: '{}',
      size: 2,
      time: 100,
      contentType: 'application/json',
    } : undefined;

    const result = runPmScript({
      script,
      request: activeRequest,
      response: mockResponse,
      envVariables: envVars,
      collectionVariables: colVars,
      interpolate,
      isTestScript: isTest,
    });
    setTestResult(result);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex border border-utility-subdued rounded overflow-hidden" style={{ minHeight: '360px' }}>
        <div className="w-36 shrink-0 border-r border-utility-subdued bg-surface-alternate-muted flex flex-col">
          <button
            className={cn(
              'flex items-center gap-2 px-3 py-2.5 text-[13px] text-left transition-colors',
              activeScript === 'pre-request'
                ? 'bg-surface text-label-vivid'
                : 'text-label-muted hover:text-label-mid hover:bg-surface'
            )}
            onClick={() => { setActiveScript('pre-request'); setTestResult(null); }}
          >
            <span className={cn(
              'w-1.5 h-1.5 rounded-full shrink-0',
              hasPreRequest ? 'bg-status-success-mid' : 'bg-utility-mid'
            )} />
            Pre-request
          </button>
          <button
            className={cn(
              'flex items-center gap-2 px-3 py-2.5 text-[13px] text-left transition-colors',
              activeScript === 'post-response'
                ? 'bg-surface text-label-vivid'
                : 'text-label-muted hover:text-label-mid hover:bg-surface'
            )}
            onClick={() => { setActiveScript('post-response'); setTestResult(null); }}
          >
            <span className={cn(
              'w-1.5 h-1.5 rounded-full shrink-0',
              hasPostResponse ? 'bg-status-success-mid' : 'bg-utility-mid'
            )} />
            Post-response
          </button>
        </div>

        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-utility-subdued bg-surface-alternate-muted">
            <span className="text-[11px] text-label-muted uppercase tracking-wider font-medium">
              {activeScript === 'pre-request' ? 'Pre-request Script' : 'Post-response Script'}
            </span>
            <div className="flex items-center gap-2">
              <Button variant="text" size="small" onClick={handleTest} className="text-[11px]">
                <Play className="w-3 h-3" /> Run
              </Button>
            </div>
          </div>
          <div className="flex-1">
            {activeScript === 'pre-request' ? (
              <ScriptCodeEditor
                key={`pre-${requestId}`}
                value={activeRequest.preRequestScript || ''}
                onChange={(v) => updateRequest(requestId, { preRequestScript: v })}
                label="Pre-request script"
              />
            ) : (
              <ScriptCodeEditor
                key={`post-${requestId}`}
                value={activeRequest.testScript || ''}
                onChange={(v) => updateRequest(requestId, { testScript: v })}
                label="Post-response script"
              />
            )}
          </div>
        </div>

        <div className="w-48 shrink-0 border-l border-utility-subdued bg-surface-alternate-muted overflow-y-auto">
          <div className="px-3 py-1.5 border-b border-utility-subdued">
            <span className="text-[11px] text-label-muted uppercase tracking-wider font-medium">Snippets</span>
          </div>
          <div className="p-1">
            <TestSnippetLibrary requestId={requestId} compact />
          </div>
        </div>
      </div>

      {testResult && (
        <div className="space-y-2">
          <div className={`p-3 rounded border text-[13px] ${testResult.success ? 'border-status-success-muted bg-status-success-muted' : 'border-status-danger-muted bg-status-danger-muted'}`}>
            <div className="flex items-center gap-2 mb-1">
              {testResult.success ? (
                <><Check className="w-4 h-4 text-status-success-mid" /><span className="text-status-success-mid font-medium">Script passed</span></>
              ) : (
                <><X className="w-4 h-4 text-status-danger-mid" /><span className="text-status-danger-mid font-medium">Script failed: {testResult.error}</span></>
              )}
            </div>
            {testResult.logs.length > 0 && (
              <div className="mt-2 font-mono text-[12px] text-label-mid">
                {testResult.logs.map((log, i) => (
                  <div key={i} className="py-0.5">{log}</div>
                ))}
              </div>
            )}
          </div>
          {testResult.testResults && testResult.testResults.length > 0 && (
            <div className="space-y-1">
              {testResult.testResults.map((tr: any, i: number) => (
                <div key={i} className={`flex items-center gap-2 text-[13px] py-1 px-2 rounded ${tr.passed ? 'text-status-success-mid' : 'text-status-danger-mid'}`}>
                  {tr.passed ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                  <span>{tr.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
