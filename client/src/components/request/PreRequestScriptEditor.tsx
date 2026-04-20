import { useEffect, useRef, useState } from 'react';
import { useStore } from '@/store/useStore';
import { Typography } from '@/components/ui/typography';
import { Button } from '@/components/ui/button';
import { Play, Check, X } from 'lucide-react';
import { runPmScript } from '@/utils/pmSandbox';
// @ts-ignore
import { EditorView, basicSetup } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { javascript } from '@codemirror/lang-javascript';

export function PreRequestScriptEditor() {
  const activeRequest = useStore(s => {
    const activeTab = s.tabs.find(t => t.id === s.activeTabId);
    if (!activeTab) return undefined;
    return s.requests.find(r => r.id === activeTab.requestId);
  });
  const updateRequest = useStore(s => s.updateRequest);
  const interpolate = useStore(s => s.interpolateVariables);
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const [testResult, setTestResult] = useState<{ success: boolean; logs: string[]; error?: string } | null>(null);

  useEffect(() => {
    if (!editorRef.current || !activeRequest) return;

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        const value = update.state.doc.toString();
        updateRequest(activeRequest.id, { preRequestScript: value });
      }
    });

    const state = EditorState.create({
      doc: activeRequest.preRequestScript || '',
      extensions: [
        basicSetup,
        javascript(),
        updateListener,
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
    return () => view.destroy();
  }, [activeRequest?.id]);

  if (!activeRequest) return null;

  const handleTest = async () => {
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

    const result = await runPmScript({
      script: activeRequest.preRequestScript || '',
      request: activeRequest,
      envVariables: envVars,
      collectionVariables: colVars,
      interpolate,
      isTestScript: false,
    });
    setTestResult(result);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <Typography variant="body-small" className="text-label-muted">
          JavaScript that runs before each request. Supports Postman pm.* API.
        </Typography>
        <Button variant="text" size="small" onClick={handleTest}>
          <Play className="w-3.5 h-3.5" /> Test Script
        </Button>
      </div>

      <div ref={editorRef} className="border border-utility-subdued rounded overflow-hidden" />

      {testResult && (
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
      )}

      <div className="text-[12px] text-label-muted space-y-1">
        <div><code className="bg-utility-muted px-1 rounded">pm.variables.get/set()</code> — Environment variables</div>
        <div><code className="bg-utility-muted px-1 rounded">pm.collectionVariables.get/set()</code> — Collection variables</div>
        <div><code className="bg-utility-muted px-1 rounded">pm.request.url</code>, <code className="bg-utility-muted px-1 rounded">pm.request.method</code> — Request info</div>
        <div><code className="bg-utility-muted px-1 rounded">console.log()</code> — Log output</div>
      </div>
    </div>
  );
}
