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

export function TestScriptEditor() {
  const activeRequest = useStore(s => {
    const activeTab = s.tabs.find(t => t.id === s.activeTabId);
    if (!activeTab) return undefined;
    return s.requests.find(r => r.id === activeTab.requestId);
  });
  const updateRequest = useStore(s => s.updateRequest);
  const interpolate = useStore(s => s.interpolateVariables);
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const [testResult, setTestResult] = useState<{ success: boolean; logs: string[]; error?: string; testResults?: any[] } | null>(null);

  useEffect(() => {
    if (!editorRef.current || !activeRequest) return;

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        const value = update.state.doc.toString();
        updateRequest(activeRequest.id, { testScript: value });
      }
    });

    const state = EditorState.create({
      doc: activeRequest.testScript || '',
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

    const mockResponse = {
      status: 200,
      statusText: 'OK',
      headers: { 'content-type': 'application/json' },
      body: '{}',
      size: 2,
      time: 100,
      contentType: 'application/json',
    };

    const result = await runPmScript({
      script: activeRequest.testScript || '',
      request: activeRequest,
      response: mockResponse,
      envVariables: envVars,
      collectionVariables: colVars,
      interpolate,
      isTestScript: true,
    });
    setTestResult(result);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <Typography variant="body-small" className="text-label-muted">
          JavaScript that runs after response is received. Supports Postman pm.test() and pm.expect() API.
        </Typography>
        <Button variant="text" size="small" onClick={handleTest}>
          <Play className="w-3.5 h-3.5" /> Test Script
        </Button>
      </div>

      <div ref={editorRef} className="border border-utility-subdued rounded overflow-hidden" />

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

      <div className="text-[12px] text-label-muted space-y-1">
        <div><code className="bg-utility-muted px-1 rounded">pm.test("name", () =&gt; {'{ ... }'})</code> — Define a test</div>
        <div><code className="bg-utility-muted px-1 rounded">pm.expect(value).to.equal(expected)</code> — Chai assertions</div>
        <div><code className="bg-utility-muted px-1 rounded">pm.response.json()</code> — Get parsed JSON response</div>
        <div><code className="bg-utility-muted px-1 rounded">pm.collectionVariables.set("key", value)</code> — Store variables</div>
      </div>
    </div>
  );
}
