import { ReactNode, createContext, useContext, useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "./use-auth";

export interface WorkspaceWithRole {
  id: number;
  name: string;
  description: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceMember {
  id: number;
  userId: number;
  username: string;
  displayName: string | null;
  role: string;
  joinedAt: string;
}

interface WorkspaceContextType {
  workspaces: WorkspaceWithRole[];
  activeWorkspace: WorkspaceWithRole | null;
  setActiveWorkspaceId: (id: number) => void;
  isLoading: boolean;
  myRole: string | null;
  createWorkspace: (name: string, description?: string) => Promise<void>;
  members: WorkspaceMember[];
  membersLoading: boolean;
  inviteMember: (username: string, role: string) => Promise<void>;
  removeMember: (memberId: number) => Promise<void>;
  updateMemberRole: (memberId: number, role: string) => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [activeWorkspaceId, setActiveWorkspaceIdState] = useState<number | null>(() => {
    const saved = localStorage.getItem("usb-active-workspace");
    return saved ? parseInt(saved) : null;
  });

  const { data: workspaces = [], isLoading } = useQuery<WorkspaceWithRole[]>({
    queryKey: ["/api/workspaces"],
    enabled: !!user,
  });

  useEffect(() => {
    if (workspaces.length > 0 && !activeWorkspaceId) {
      setActiveWorkspaceIdState(workspaces[0].id);
    }
    if (activeWorkspaceId && workspaces.length > 0 && !workspaces.find(w => w.id === activeWorkspaceId)) {
      setActiveWorkspaceIdState(workspaces[0].id);
    }
  }, [workspaces, activeWorkspaceId]);

  const setActiveWorkspaceId = useCallback((id: number) => {
    setActiveWorkspaceIdState(id);
    localStorage.setItem("usb-active-workspace", String(id));
  }, []);

  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId) || null;
  const myRole = activeWorkspace?.role || null;

  const { data: members = [], isLoading: membersLoading } = useQuery<WorkspaceMember[]>({
    queryKey: ["/api/workspaces", activeWorkspaceId, "members"],
    queryFn: async () => {
      if (!activeWorkspaceId) return [];
      const res = await fetch(`/api/workspaces/${activeWorkspaceId}/members`, {
        credentials: "include",
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!activeWorkspaceId && !!user,
  });

  const createWorkspace = useCallback(async (name: string, description?: string) => {
    await apiRequest("POST", "/api/workspaces", { name, description });
    queryClient.invalidateQueries({ queryKey: ["/api/workspaces"] });
  }, []);

  const inviteMember = useCallback(async (username: string, role: string) => {
    if (!activeWorkspaceId) return;
    await apiRequest("POST", `/api/workspaces/${activeWorkspaceId}/invite`, { username, role });
    queryClient.invalidateQueries({ queryKey: ["/api/workspaces", activeWorkspaceId, "members"] });
  }, [activeWorkspaceId]);

  const removeMember = useCallback(async (memberId: number) => {
    if (!activeWorkspaceId) return;
    await apiRequest("DELETE", `/api/workspaces/${activeWorkspaceId}/members/${memberId}`);
    queryClient.invalidateQueries({ queryKey: ["/api/workspaces", activeWorkspaceId, "members"] });
  }, [activeWorkspaceId]);

  const updateMemberRole = useCallback(async (memberId: number, role: string) => {
    if (!activeWorkspaceId) return;
    await apiRequest("PATCH", `/api/workspaces/${activeWorkspaceId}/members/${memberId}`, { role });
    queryClient.invalidateQueries({ queryKey: ["/api/workspaces", activeWorkspaceId, "members"] });
  }, [activeWorkspaceId]);

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        activeWorkspace,
        setActiveWorkspaceId,
        isLoading,
        myRole,
        createWorkspace,
        members,
        membersLoading,
        inviteMember,
        removeMember,
        updateMemberRole,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return context;
}
