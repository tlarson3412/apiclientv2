import { useState, useEffect, useCallback } from 'react';
import { useStore } from '@/store/useStore';
import { TopBar } from './TopBar';
import { Sidebar } from './Sidebar';
import { RequestTabs } from './RequestTabs';
import { RequestBuilder } from '@/components/request/RequestBuilder';
import { ResponseViewer } from '@/components/response/ResponseViewer';
import { WebSocketPanel } from '@/components/websocket/WebSocketPanel';
import { ConsolePanel } from '@/components/console/ConsolePanel';
import { CollectionView } from '@/components/collections/CollectionView';
import { CreateNewModal } from './CreateNewModal';
import { Typography } from '@/components/ui/typography';
import { Button } from '@/components/ui/button';
import { Terminal } from 'lucide-react';
import usBankLogo from '@/assets/US-Bank-Logo.png';
import { useConsoleStore } from '@/store/useConsoleStore';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { executeRequest } from '@/utils/httpClient';
import { runAssertions } from '@/utils/testRunner';
import { runExtractions } from '@/utils/extractionRunner';

export function AppLayout() {
  const tabs = useStore(s => s.tabs);
  const activeTabId = useStore(s => s.activeTabId);
  const addTab = useStore(s => s.addTab);
  const [mode, setMode] = useState<'http' | 'websocket'>('http');
  const [showCreateNew, setShowCreateNew] = useState(false);
  const [showConsole, setShowConsole] = useState(false);
  const consoleLogCount = useConsoleStore(s => s.logs.length);

  const doSendRequest = useCallback(async () => {
    const state = useStore.getState();
    const activeRequest = state.getActiveRequest();
    if (!activeRequest || !activeRequest.url.trim()) return;
    state.setLoading(activeRequest.id, true);
    try {
      const interpolate = (text: string) => state.interpolateVariables(text, activeRequest.collectionId);
      const response = await executeRequest(activeRequest, interpolate);

      const assertions = activeRequest.assertions || [];
      const structuredResults = assertions.length > 0 ? runAssertions(response, assertions) : [];
      const scriptResults = response.testResults || [];
      const testResults = [...structuredResults, ...scriptResults];

      const responseWithTests = { ...response, testResults: testResults.length > 0 ? testResults : undefined };
      state.setResponse(activeRequest.id, responseWithTests);
      state.addHistoryEntry(activeRequest, responseWithTests);

      const extractions = activeRequest.extractions || [];
      if (extractions.length > 0) {
        const extractedVars = runExtractions(response, extractions);
        extractedVars.forEach(({ variableName, value }) => {
          state.setExtractedVariable(variableName, value);
        });
      }
    } catch (err) {
      console.error('Request failed:', err);
    } finally {
      state.setLoading(activeRequest.id, false);
    }
  }, []);

  const handleSendRequest = useCallback(async () => {
    await doSendRequest();
  }, [doSendRequest]);

  useKeyboardShortcuts({
    sendRequest: handleSendRequest,
  });

  useEffect(() => {
    if (tabs.length === 0) {
      addTab();
    }
  }, []);

  const handleSwitchToWebSocket = useCallback(() => setMode('websocket'), []);
  const handleSwitchToHttp = useCallback(() => setMode('http'), []);
  const handleOpenCreateNew = useCallback(() => setShowCreateNew(true), []);

  return (
    <div className="flex flex-col h-screen bg-background">
      <TopBar />
      <PanelGroup direction="horizontal" className="flex-1">
        <Panel defaultSize={22} minSize={15} maxSize={40}>
          <Sidebar onSwitchToWebSocket={handleSwitchToWebSocket} />
        </Panel>
        <PanelResizeHandle className="w-1 bg-utility-subdued hover:bg-standard-subdued transition-colors cursor-col-resize" />
        <Panel defaultSize={78} minSize={40}>
          <div className="flex flex-col h-full">
            <div className="flex items-center border-b border-utility-subdued bg-surface">
              <div className="flex-1">
                <RequestTabs
                  mode={mode}
                  onSwitchToHttp={handleSwitchToHttp}
                  onOpenCreateNew={handleOpenCreateNew}
                />
              </div>
            </div>
            {(() => {
              const activeTab = tabs.find(t => t.id === activeTabId);
              const isCollectionTab = activeTab?.type === 'collection' || activeTab?.type === 'folder';

              if (mode === 'websocket') {
                return (
                  <div className="flex-1 p-4 overflow-auto">
                    <WebSocketPanel />
                  </div>
                );
              }

              if (tabs.length === 0) {
                return (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center flex flex-col items-center gap-4">
                      <img src={usBankLogo} alt="US Bank" className="h-20 object-contain" />
                      <Typography variant="heading-small" className="text-label-muted">
                        Create a new request to get started
                      </Typography>
                      <Button variant="primary" size="medium" onClick={() => setShowCreateNew(true)}>
                        New Request
                      </Button>
                    </div>
                  </div>
                );
              }

              if (isCollectionTab && activeTab) {
                return (
                  <div className="flex-1 overflow-auto">
                    <CollectionView
                      collectionId={activeTab.collectionId!}
                      folderId={activeTab.folderId}
                    />
                  </div>
                );
              }

              return (
                <PanelGroup direction="vertical" className="flex-1">
                  <Panel defaultSize={50} minSize={25}>
                    <div className="p-4 overflow-auto h-full">
                      <RequestBuilder />
                    </div>
                  </Panel>
                  <PanelResizeHandle className="h-1 bg-utility-subdued hover:bg-standard-subdued transition-colors cursor-row-resize" />
                  <Panel defaultSize={50} minSize={20}>
                    <div className="p-4 overflow-auto h-full">
                      <ResponseViewer />
                    </div>
                  </Panel>
                </PanelGroup>
              );
            })()}
          </div>
        </Panel>
      </PanelGroup>
      {showConsole && (
        <>
          <div className="h-px bg-utility-subdued" />
          <div className="h-64 overflow-auto border-t border-utility-subdued bg-surface">
            <ConsolePanel />
          </div>
        </>
      )}

      <div className="flex items-center justify-between px-4 py-1 border-t border-utility-subdued bg-surface-alternate-muted">
        <button
          onClick={() => setShowConsole(!showConsole)}
          className="flex items-center gap-1.5 text-[12px] text-label-muted hover:text-label-vivid transition-colors"
        >
          <Terminal className="w-3.5 h-3.5" />
          Console
          {consoleLogCount > 0 && (
            <span className="text-[10px] bg-utility-muted rounded-full px-1.5 py-0.5 leading-none">
              {consoleLogCount}
            </span>
          )}
        </button>
      </div>

      <CreateNewModal
        open={showCreateNew}
        onClose={() => setShowCreateNew(false)}
        onSwitchToWebSocket={handleSwitchToWebSocket}
      />
    </div>
  );
}
