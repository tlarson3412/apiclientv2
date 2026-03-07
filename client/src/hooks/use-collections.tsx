import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "./use-workspace";
import { apiRequest } from "@/lib/queryClient";
import type { Collection, ApiRequest, CollectionFolder } from "@/types";

export interface WorkspaceCollection extends Collection {
  requests: ApiRequest[];
}

export function useCollections() {
  const { activeWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  const wsId = activeWorkspace?.id;

  const collectionsKey = ["/api/workspaces", wsId, "collections"];

  const { data: collections = [], isLoading } = useQuery<WorkspaceCollection[]>({
    queryKey: collectionsKey,
    queryFn: async () => {
      if (!wsId) return [];
      const res = await fetch(`/api/workspaces/${wsId}/collections`, {
        credentials: "include",
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!wsId,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: collectionsKey });

  const addCollection = async (name: string) => {
    if (!wsId) return;
    await apiRequest("POST", `/api/workspaces/${wsId}/collections`, { name });
    invalidate();
  };

  const updateCollection = async (colId: string, updates: Partial<Collection>) => {
    if (!wsId) return;
    await apiRequest("PATCH", `/api/workspaces/${wsId}/collections/${colId}`, updates);
    invalidate();
  };

  const deleteCollection = async (colId: string) => {
    if (!wsId) return;
    await apiRequest("DELETE", `/api/workspaces/${wsId}/collections/${colId}`);
    invalidate();
  };

  const addFolder = async (colId: string, name: string, parentId?: string) => {
    if (!wsId) return;
    await apiRequest("POST", `/api/workspaces/${wsId}/collections/${colId}/folders`, { name, parentId });
    invalidate();
  };

  const updateFolder = async (folderId: string, updates: Partial<CollectionFolder>) => {
    if (!wsId) return;
    await apiRequest("PATCH", `/api/workspaces/${wsId}/folders/${folderId}`, updates);
    invalidate();
  };

  const deleteFolder = async (folderId: string) => {
    if (!wsId) return;
    await apiRequest("DELETE", `/api/workspaces/${wsId}/folders/${folderId}`);
    invalidate();
  };

  const addRequest = async (colId: string, data: Partial<ApiRequest>) => {
    if (!wsId) return;
    const res = await apiRequest("POST", `/api/workspaces/${wsId}/collections/${colId}/requests`, data);
    invalidate();
    return await res.json();
  };

  const updateRequest = async (reqId: string, updates: Partial<ApiRequest>) => {
    if (!wsId) return;
    await apiRequest("PATCH", `/api/workspaces/${wsId}/requests/${reqId}`, updates);
    invalidate();
  };

  const deleteRequest = async (reqId: string) => {
    if (!wsId) return;
    await apiRequest("DELETE", `/api/workspaces/${wsId}/requests/${reqId}`);
    invalidate();
  };

  const importCollections = async (importData: any[]) => {
    if (!wsId) return;
    await apiRequest("POST", `/api/workspaces/${wsId}/collections/import`, { collections: importData });
    invalidate();
  };

  const copyCollectionToWorkspace = async (collectionId: string, sourceWorkspaceId: number, targetWorkspaceId: number, name?: string) => {
    await apiRequest("POST", `/api/workspaces/${targetWorkspaceId}/copy-collection`, {
      sourceWorkspaceId,
      collectionId,
      name,
    });
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
    copyCollectionToWorkspace,
    invalidate,
  };
}
