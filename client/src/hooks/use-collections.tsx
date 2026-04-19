import { useQuery, useQueryClient } from "@tanstack/react-query";
import { vscodeClient } from "@/lib/vscodeApi";
import type { Collection, ApiRequest, CollectionFolder } from "@/types";

export interface WorkspaceCollection extends Collection {
  requests: ApiRequest[];
}

export function useCollections() {
  const queryClient = useQueryClient();

  const collectionsKey = ["collections"];

  const { data: collections = [], isLoading } = useQuery<WorkspaceCollection[]>({
    queryKey: collectionsKey,
    queryFn: async () => {
      const result = await vscodeClient.listCollections() as any[];
      // Map stored collections to the shape the UI expects
      return result.map(c => ({
        ...c,
        requests: c.requests || [],
        folders: c.folders || [],
      }));
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: collectionsKey });

  const addCollection = async (name: string) => {
    await vscodeClient.createCollection({ name });
    invalidate();
  };

  const updateCollection = async (colId: string, updates: Partial<Collection>) => {
    await vscodeClient.updateCollection(colId, updates as Record<string, unknown>);
    invalidate();
  };

  const deleteCollection = async (colId: string) => {
    await vscodeClient.deleteCollection(colId);
    invalidate();
  };

  const addFolder = async (colId: string, name: string, parentId?: string) => {
    await vscodeClient.createFolder(colId, { name, parentId });
    invalidate();
  };

  const updateFolder = async (folderId: string, updates: Partial<CollectionFolder>) => {
    await vscodeClient.updateFolder(folderId, updates as Record<string, unknown>);
    invalidate();
  };

  const deleteFolder = async (folderId: string) => {
    await vscodeClient.deleteFolder(folderId);
    invalidate();
  };

  const addRequest = async (colId: string, data: Partial<ApiRequest>) => {
    const result = await vscodeClient.createRequest(colId, data as Record<string, unknown>);
    invalidate();
    return result;
  };

  const updateRequest = async (reqId: string, updates: Partial<ApiRequest>) => {
    await vscodeClient.updateRequest(reqId, updates as Record<string, unknown>);
    invalidate();
  };

  const deleteRequest = async (reqId: string) => {
    await vscodeClient.deleteRequest(reqId);
    invalidate();
  };

  const importCollections = async (importData: any[]) => {
    console.log('[useCollections] importCollections called, items:', importData.length);
    const result = await vscodeClient.importCollections(importData);
    console.log('[useCollections] importCollections result:', result);
    invalidate();
    console.log('[useCollections] cache invalidated');
  };

  const copyCollection = async (collectionId: string, name?: string) => {
    await vscodeClient.copyCollection(collectionId, name);
    invalidate();
  };

  const allRequests = collections.flatMap(c => c.requests || []);

  return {
    collections,
    requests: allRequests,
    isLoading,
    addCollection,
    updateCollection,
    deleteCollection,
    addFolder,
    updateFolder,
    deleteFolder,
    addRequest,
    updateRequest,
    deleteRequest,
    importCollections,
    copyCollection,
    invalidate,
  };
}
