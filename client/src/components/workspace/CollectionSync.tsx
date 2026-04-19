import { useEffect, useRef } from "react";
import { useCollections } from "@/hooks/use-collections";
import { useStore } from "@/store/useStore";
import type { EnvironmentVariable, AuthConfig, Collection, ApiRequest } from "@/types";

export function CollectionSync() {
  const {
    collections, requests, isLoading,
    addCollection, updateCollection, deleteCollection,
    addFolder, updateFolder, deleteFolder,
    addRequest, updateRequest: updateApiRequest, deleteRequest,
    importCollections, copyCollection: copyCollectionFn,
  } = useCollections();
  const initialized = useRef(false);
  const originals = useRef<Record<string, Function>>({});

  useEffect(() => {
    if (isLoading) return;
    console.log('[CollectionSync] Syncing collections from React Query to store, count:', collections.length);

    const storeCollections = collections.map(c => ({
      id: c.id,
      name: c.name,
      description: c.description,
      folders: c.folders,
      starred: c.starred,
      variables: c.variables,
      auth: c.auth,
      preRequestScript: c.preRequestScript,
      testScript: c.testScript,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));

    useStore.setState({ collections: storeCollections });

    const personalRequests = useStore.getState().requests.filter(r => !r.collectionId);
    useStore.setState({ requests: [...personalRequests, ...requests] });
  }, [collections, requests, isLoading]);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const state = useStore.getState();
    originals.current = {
      addCollection: state.addCollection,
      updateCollection: state.updateCollection,
      deleteCollection: state.deleteCollection,
      addFolderToCollection: state.addFolderToCollection,
      renameFolderInCollection: state.renameFolderInCollection,
      deleteFolderFromCollection: state.deleteFolderFromCollection,
      saveRequestToCollection: state.saveRequestToCollection,
      toggleStarCollection: state.toggleStarCollection,
      updateRequest: state.updateRequest,
      addCollectionVariable: state.addCollectionVariable,
      updateCollectionVariable: state.updateCollectionVariable,
      deleteCollectionVariable: state.deleteCollectionVariable,
      setCollectionAuth: state.setCollectionAuth,
      setFolderAuth: state.setFolderAuth,
      importCollection: state.importCollection,
      moveRequestToFolder: state.moveRequestToFolder,
      duplicateRequest: state.duplicateRequest,
      deleteRequest: state.deleteRequest,
      togglePinRequest: state.togglePinRequest,
      copyCollection: state.copyCollection,
    };

    useStore.setState({
      addCollection: (name: string) => {
        addCollection(name).catch(console.error);
      },
      updateCollection: (id: string, updates: any) => {
        useStore.setState({
          collections: useStore.getState().collections.map(c =>
            c.id === id ? { ...c, ...updates } : c
          ),
        });
        updateCollection(id, updates).catch(console.error);
      },
      deleteCollection: (id: string) => {
        useStore.setState({
          collections: useStore.getState().collections.filter(c => c.id !== id),
        });
        deleteCollection(id).catch(console.error);
      },
      addFolderToCollection: (collectionId: string, name: string, parentId?: string) => {
        addFolder(collectionId, name, parentId).catch(console.error);
      },
      renameFolderInCollection: (_collectionId: string, folderId: string, name: string) => {
        updateFolder(folderId, { name }).catch(console.error);
      },
      deleteFolderFromCollection: (_collectionId: string, folderId: string) => {
        deleteFolder(folderId).catch(console.error);
      },
      saveRequestToCollection: (requestId: string, collectionId: string, folderId?: string) => {
        const request = useStore.getState().requests.find(r => r.id === requestId);
        if (request) {
          addRequest(collectionId, { ...request, folderId }).catch(console.error);
        }
      },
      toggleStarCollection: (collectionId: string) => {
        const col = useStore.getState().collections.find(c => c.id === collectionId);
        if (col) {
          const newStarred = !col.starred;
          useStore.setState({
            collections: useStore.getState().collections.map(c =>
              c.id === collectionId ? { ...c, starred: newStarred } : c
            ),
          });
          updateCollection(collectionId, { starred: newStarred }).catch(console.error);
        }
      },
      updateRequest: (id: string, updates: any) => {
        const request = useStore.getState().requests.find(r => r.id === id);
        if (request?.collectionId) {
          useStore.setState({
            requests: useStore.getState().requests.map(r =>
              r.id === id ? { ...r, ...updates } : r
            ),
          });
          updateApiRequest(id, updates).catch(console.error);
        } else {
          (originals.current.updateRequest as Function)(id, updates);
        }
      },
      addCollectionVariable: (collectionId: string, variable: Omit<EnvironmentVariable, 'id'>) => {
        const col = useStore.getState().collections.find(c => c.id === collectionId);
        if (col) {
          const newVar = { ...variable, id: crypto.randomUUID() };
          const vars = [...(col.variables || []), newVar];
          useStore.setState({
            collections: useStore.getState().collections.map(c =>
              c.id === collectionId ? { ...c, variables: vars } : c
            ),
          });
          updateCollection(collectionId, { variables: vars }).catch(console.error);
        }
      },
      updateCollectionVariable: (collectionId: string, varId: string, updates: Partial<EnvironmentVariable>) => {
        const col = useStore.getState().collections.find(c => c.id === collectionId);
        if (col) {
          const vars = (col.variables || []).map((v: EnvironmentVariable) =>
            v.id === varId ? { ...v, ...updates } : v
          );
          useStore.setState({
            collections: useStore.getState().collections.map(c =>
              c.id === collectionId ? { ...c, variables: vars } : c
            ),
          });
          updateCollection(collectionId, { variables: vars }).catch(console.error);
        }
      },
      deleteCollectionVariable: (collectionId: string, varId: string) => {
        const col = useStore.getState().collections.find(c => c.id === collectionId);
        if (col) {
          const vars = (col.variables || []).filter((v: EnvironmentVariable) => v.id !== varId);
          useStore.setState({
            collections: useStore.getState().collections.map(c =>
              c.id === collectionId ? { ...c, variables: vars } : c
            ),
          });
          updateCollection(collectionId, { variables: vars }).catch(console.error);
        }
      },
      setCollectionAuth: (collectionId: string, auth: AuthConfig) => {
        useStore.setState({
          collections: useStore.getState().collections.map(c =>
            c.id === collectionId ? { ...c, auth } : c
          ),
        });
        updateCollection(collectionId, { auth }).catch(console.error);
      },
      setFolderAuth: (_collectionId: string, folderId: string, auth: AuthConfig) => {
        updateFolder(folderId, { auth }).catch(console.error);
      },
      importCollection: (collection: Collection, reqs: ApiRequest[]) => {
        console.log('[CollectionSync] importCollection called:', collection.name, reqs.length, 'requests');
        // Optimistic local update so the collection shows immediately
        useStore.setState(s => ({
          collections: [...s.collections, collection],
          requests: [...s.requests, ...reqs],
        }));
        console.log('[CollectionSync] Optimistic state updated, collections count:', useStore.getState().collections.length);

        // Persist to extension host, then refetch to get the real IDs
        importCollections([{
          name: collection.name,
          description: collection.description,
          starred: collection.starred,
          variables: collection.variables,
          auth: collection.auth,
          preRequestScript: collection.preRequestScript,
          testScript: collection.testScript,
          folders: collection.folders,
          requests: reqs,
        }]).then(() => {
          console.log('[CollectionSync] importCollections resolved successfully');
        }).catch((err) => {
          console.error('[CollectionSync] importCollections FAILED:', err);
          // Rollback optimistic update on failure
          useStore.setState(s => ({
            collections: s.collections.filter(c => c.id !== collection.id),
            requests: s.requests.filter(r => !reqs.some(nr => nr.id === r.id)),
          }));
        });
      },
      moveRequestToFolder: (requestId: string, folderId?: string) => {
        const request = useStore.getState().requests.find(r => r.id === requestId);
        if (request?.collectionId) {
          updateApiRequest(requestId, { folderId }).catch(console.error);
        } else {
          (originals.current.moveRequestToFolder as Function)(requestId, folderId);
        }
      },
      duplicateRequest: (requestId: string) => {
        const request = useStore.getState().requests.find(r => r.id === requestId);
        if (request?.collectionId) {
          const { id, ...rest } = request;
          addRequest(request.collectionId, {
            ...rest,
            name: `Copy of ${request.name}`,
          }).catch(console.error);
        } else {
          (originals.current.duplicateRequest as Function)(requestId);
        }
      },
      deleteRequest: (requestId: string) => {
        const request = useStore.getState().requests.find(r => r.id === requestId);
        if (request?.collectionId) {
          useStore.setState({
            requests: useStore.getState().requests.filter(r => r.id !== requestId),
            tabs: useStore.getState().tabs.filter(t => t.requestId !== requestId),
          });
          deleteRequest(requestId).catch(console.error);
        } else {
          (originals.current.deleteRequest as Function)(requestId);
        }
      },
      togglePinRequest: (requestId: string) => {
        const request = useStore.getState().requests.find(r => r.id === requestId);
        if (request?.collectionId) {
          updateApiRequest(requestId, { pinned: !request.pinned }).catch(console.error);
        } else {
          (originals.current.togglePinRequest as Function)(requestId);
        }
      },
      copyCollection: (collectionId: string, _targetWorkspaceId?: number, name?: string) => {
        copyCollectionFn(collectionId, name).catch(console.error);
      },
    });

    return () => {
      useStore.setState(originals.current as any);
      initialized.current = false;
    };
  }, [addCollection, updateCollection, deleteCollection, addFolder, updateFolder, deleteFolder, addRequest, updateApiRequest, deleteRequest, importCollections]);

  return null;
}
