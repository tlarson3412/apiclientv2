import { useEffect, useState, useCallback } from 'react';
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Notifications } from "@/components/ui/notifications";
import { CollectionSync } from "@/components/workspace/CollectionSync";
import { RequestBuilder } from "@/components/request/RequestBuilder";
import { ResponseViewer } from "@/components/response/ResponseViewer";
import { WebSocketPanel } from "@/components/websocket/WebSocketPanel";
import { CollectionView } from "@/components/collections/CollectionView";
import { ConsolePanel } from "@/components/console/ConsolePanel";
import { SettingsView } from "@/components/settings/SettingsView";
import { useStore } from "@/store/useStore";
import { useConsoleStore } from "@/store/useConsoleStore";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useVSCodeTheme } from "@/hooks/useVSCodeTheme";
import { executeRequest } from "@/utils/httpClient";
import { runAssertions } from "@/utils/testRunner";
import { runExtractions } from "@/utils/extractionRunner";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { Terminal } from "lucide-react";
import { v4 as uuidv4 } from 'uuid';

declare global {
  interface Window {
    __initData?: any;
    __requestId?: string | null;
    __webviewType?: string;
  }
}

/**
 * Root component for the editor webview.
 * Each editor panel renders a request builder + response viewer,
 * or a collection/folder view, depending on the init data.
 */
export function EditorApp() {
  useVSCodeTheme();

  const initData = window.__initData || {};
  const requestId = window.__requestId || null;
  const viewType = initData.viewType || 'request'; // 'request' | 'collection' | 'folder'

  const [showConsole, setShowConsole] = useState(false);
  const consoleLogCount = useConsoleStore(s => s.logs.length);

  // Initialize the store with the request for this editor panel
  useEffect(() => {
    if (viewType === 'request' && requestId) {
      const state = useStore.getState();
      const existingRequest = state.requests.find(r => r.id === requestId);

      if (!existingRequest) {
        // Create a new request entry in the store for this panel
        const newRequest = {
          id: requestId,
          name: initData.name || 'Untitled Request',
          method: initData.method || 'GET',
          url: initData.url || '',
          headers: initData.headers || [],
          queryParams: initData.queryParams || [],
          body: initData.body || '',
          bodyType: initData.bodyType || 'none',
          auth: initData.auth || { type: 'inherit' },
          assertions: initData.assertions || [],
          extractions: initData.extractions || [],
          collectionId: initData.collectionId,
          folderId: initData.folderId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        useStore.setState(s => ({
          requests: [...s.requests, newRequest],
        }));
      }

      // Create a tab for this request and make it active
      const tabId = uuidv4();
      const tab = {
        id: tabId,
        requestId: requestId,
        name: initData.name || existingRequest?.name || 'Untitled Request',
        isModified: false,
        type: 'request' as const,
      };

      useStore.setState({
        tabs: [tab],
        activeTabId: tabId,
      });
    }

    // Listen for state updates from other webviews
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      if (message?.type === 'state:update') {
        if (message.slice === 'collections') {
          queryClient.invalidateQueries({ queryKey: ['/api/collections'] });
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

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

  useKeyboardShortcuts({
    sendRequest: doSendRequest,
  });

  // Render based on view type
  const renderContent = () => {
    if (viewType === 'settings') {
      return (
        <div className="flex-1 overflow-auto">
          <SettingsView />
        </div>
      );
    }

    if (viewType === 'collection') {
      return (
        <div className="flex-1 overflow-auto">
          <CollectionView
            collectionId={initData.collectionId}
            folderId={undefined}
          />
        </div>
      );
    }

    if (viewType === 'folder') {
      return (
        <div className="flex-1 overflow-auto">
          <CollectionView
            collectionId={initData.collectionId}
            folderId={initData.folderId}
          />
        </div>
      );
    }

    // Default: request editor
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
  };

  return (
    <QueryClientProvider client={queryClient}>
      <CollectionSync />
      <Notifications />
      <div className="flex flex-col h-screen bg-background">
        {renderContent()}

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
      </div>
    </QueryClientProvider>
  );
}
