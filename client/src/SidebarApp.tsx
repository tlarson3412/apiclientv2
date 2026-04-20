import { useEffect } from 'react';
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Notifications } from "@/components/ui/notifications";
import { Sidebar } from "@/components/layout/Sidebar";
import { CollectionSync } from "@/components/workspace/CollectionSync";
import { useStore } from "@/store/useStore";
import { sendMessage } from "@/lib/vscodeApi";
import { useVSCodeTheme } from "@/hooks/useVSCodeTheme";

/**
 * Root component for the sidebar webview.
 * Renders the Collections/Environments/History/Templates panels.
 * Tab actions (open request, open collection, open folder) are redirected
 * to the extension host which opens editor WebviewPanels.
 */
export function SidebarApp() {
  useVSCodeTheme();

  // Override tab actions to send messages to the extension host
  // instead of managing tabs locally
  useEffect(() => {
    const store = useStore;

    // Override addTab: instead of creating a local tab, tell the extension host
    // to open the request in a VS Code editor tab
    store.setState({
      addTab: (requestId?: string) => {
        if (requestId) {
          const request = store.getState().requests.find(r => r.id === requestId);
          sendMessage('ui:openRequest', {
            targetRequestId: requestId,
            data: request ? {
              name: request.name,
              method: request.method,
              url: request.url,
              collectionId: request.collectionId,
            } : undefined,
          }).catch(console.error);
        } else {
          // New blank request
          const id = crypto.randomUUID();
          sendMessage('ui:openRequest', {
            targetRequestId: id,
            data: { name: 'Untitled Request', method: 'GET', url: '' },
          }).catch(console.error);
        }
      },

      addCollectionTab: (collectionId: string) => {
        const collection = store.getState().collections.find(c => c.id === collectionId);
        sendMessage('ui:openCollection', {
          collectionId,
          data: collection ? { name: collection.name } : undefined,
        }).catch(console.error);
      },

      addFolderTab: (collectionId: string, folderId: string) => {
        const collection = store.getState().collections.find(c => c.id === collectionId);
        const folder = collection?.folders.find(f => f.id === folderId);
        sendMessage('ui:openFolder', {
          collectionId,
          folderId,
          data: folder ? { name: folder.name } : undefined,
        }).catch(console.error);
      },
    });

    // Listen for state updates broadcast from other webviews via the extension host
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      if (message?.type === 'state:update') {
        if (message.slice === 'collections') {
          // Collections changed in another webview — refetch
          queryClient.invalidateQueries({ queryKey: ['/api/collections'] });
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <CollectionSync />
      <Notifications />
      <div className="h-screen overflow-hidden">
        <Sidebar />
      </div>
    </QueryClientProvider>
  );
}
