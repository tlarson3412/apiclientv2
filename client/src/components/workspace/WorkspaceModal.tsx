import { useState } from "react";
import { useWorkspace } from "@/hooks/use-workspace";
import { Button } from "@/components/ui/button";
import { TextInput } from "@/components/ui/text-input";
import { Typography } from "@/components/ui/typography";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalBody,
  ModalFooter,
} from "@/components/ui/modal";
import { Plus, UserPlus, Crown, Pencil, Eye, Trash2, Users } from "lucide-react";

interface WorkspaceModalProps {
  open: boolean;
  onClose: () => void;
}

export function WorkspaceModal({ open, onClose }: WorkspaceModalProps) {
  const {
    workspaces,
    activeWorkspace,
    setActiveWorkspaceId,
    myRole,
    createWorkspace,
    members,
    inviteMember,
    removeMember,
    updateMemberRole,
  } = useWorkspace();

  const [tab, setTab] = useState<"switch" | "create" | "members">("switch");
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [inviteUsername, setInviteUsername] = useState("");
  const [inviteRole, setInviteRole] = useState("viewer");
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [inviting, setInviting] = useState(false);

  const handleCreate = async () => {
    if (!newName.trim()) {
      setError("Name is required");
      return;
    }
    setCreating(true);
    setError("");
    try {
      await createWorkspace(newName.trim(), newDesc.trim());
      setNewName("");
      setNewDesc("");
      setTab("switch");
    } catch (err: any) {
      setError(err.message?.replace(/^\d+:\s*/, "") || "Failed to create workspace");
    } finally {
      setCreating(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteUsername.trim()) {
      setError("Username is required");
      return;
    }
    setInviting(true);
    setError("");
    try {
      await inviteMember(inviteUsername.trim(), inviteRole);
      setInviteUsername("");
      setInviteRole("viewer");
    } catch (err: any) {
      setError(err.message?.replace(/^\d+:\s*/, "") || "Failed to invite");
    } finally {
      setInviting(false);
    }
  };

  const roleIcon = (role: string) => {
    switch (role) {
      case "owner": return <Crown className="w-3.5 h-3.5 text-status-caution-mid" />;
      case "editor": return <Pencil className="w-3.5 h-3.5 text-standard-subdued" />;
      default: return <Eye className="w-3.5 h-3.5 text-label-muted" />;
    }
  };

  return (
    <Modal open={open} onOpenChange={(v) => !v && onClose()}>
      <ModalContent className="max-w-lg">
        <ModalHeader>
          <ModalTitle>Workspaces</ModalTitle>
          <ModalDescription>
            Manage workspaces and team members
          </ModalDescription>
        </ModalHeader>

        <div className="flex gap-1 mb-3">
          {(["switch", "members", "create"] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setError(""); }}
              className={`px-3 py-1.5 text-[13px] rounded-md transition-colors ${
                tab === t
                  ? "bg-standard-subdued text-white"
                  : "text-label-mid hover:bg-surface-alternate-muted"
              }`}
            >
              {t === "switch" ? "My Workspaces" : t === "members" ? "Members" : "Create New"}
            </button>
          ))}
        </div>

        <ModalBody className="min-h-[200px]">
          {tab === "switch" && (
            <div className="flex flex-col gap-2">
              {workspaces.map((ws) => (
                <button
                  key={ws.id}
                  onClick={() => {
                    setActiveWorkspaceId(ws.id);
                    onClose();
                  }}
                  className={`flex items-center justify-between p-3 rounded-md border transition-colors text-left ${
                    activeWorkspace?.id === ws.id
                      ? "border-standard-subdued bg-surface-alternate-muted"
                      : "border-utility-subdued hover:border-utility-mid"
                  }`}
                >
                  <div>
                    <Typography variant="subheading-small">{ws.name}</Typography>
                    {ws.description && (
                      <Typography variant="caption" className="text-label-muted">{ws.description}</Typography>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-[12px] text-label-muted">
                    {roleIcon(ws.role)}
                    {ws.role}
                  </div>
                </button>
              ))}
              {workspaces.length === 0 && (
                <Typography variant="body-small" className="text-center py-4 text-label-muted">
                  No workspaces yet
                </Typography>
              )}
            </div>
          )}

          {tab === "members" && (
            <div className="flex flex-col gap-3">
              {(myRole === "owner" || myRole === "editor") && (
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <TextInput
                      label="Invite by username"
                      value={inviteUsername}
                      onValueChange={setInviteUsername}
                    />
                  </div>
                  <Select value={inviteRole} onValueChange={setInviteRole}>
                    <SelectTrigger className="w-[100px] h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="viewer">Viewer</SelectItem>
                      <SelectItem value="editor">Editor</SelectItem>
                      <SelectItem value="owner">Owner</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="primary"
                    size="small"
                    onClick={handleInvite}
                    disabled={inviting}
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}

              {error && (
                <p className="text-[13px] text-status-danger-mid">{error}</p>
              )}

              <div className="flex flex-col gap-1">
                {members.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between py-2 px-2 rounded hover:bg-surface-alternate-muted"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-standard-subdued flex items-center justify-center text-white text-[12px] font-medium">
                        {m.username[0].toUpperCase()}
                      </div>
                      <div>
                        <Typography variant="subheading-small">
                          {m.displayName || m.username}
                        </Typography>
                        {m.displayName && (
                          <Typography variant="caption" className="text-label-muted">
                            @{m.username}
                          </Typography>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {myRole === "owner" ? (
                        <Select
                          value={m.role}
                          onValueChange={(role) => updateMemberRole(m.id, role)}
                        >
                          <SelectTrigger className="w-[100px] h-7 text-[12px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="viewer">Viewer</SelectItem>
                            <SelectItem value="editor">Editor</SelectItem>
                            <SelectItem value="owner">Owner</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="flex items-center gap-1 text-[12px] text-label-muted">
                          {roleIcon(m.role)} {m.role}
                        </span>
                      )}
                      {myRole === "owner" && (
                        <button
                          onClick={() => removeMember(m.id)}
                          className="p-1 text-label-muted hover:text-status-danger-mid transition-colors"
                          title="Remove member"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "create" && (
            <div className="flex flex-col gap-4">
              <TextInput
                label="Workspace name"
                value={newName}
                onValueChange={setNewName}
                errorState={error && !newName.trim() ? "Required" : ""}
              />
              <TextInput
                label="Description (optional)"
                value={newDesc}
                onValueChange={setNewDesc}
              />
              {error && newName.trim() && (
                <p className="text-[13px] text-status-danger-mid">{error}</p>
              )}
            </div>
          )}
        </ModalBody>

        {tab === "create" ? (
          <ModalFooter
            buttonCount={2}
            primaryLabel="Create"
            secondaryLabel="Cancel"
            onPrimaryClick={handleCreate}
            onSecondaryClick={onClose}
          />
        ) : (
          <ModalFooter
            buttonCount={1}
            primaryLabel="Done"
            onPrimaryClick={onClose}
          />
        )}
      </ModalContent>
    </Modal>
  );
}
