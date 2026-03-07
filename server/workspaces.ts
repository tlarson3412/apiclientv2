import { type Express, type Request, type Response } from "express";
import { db } from "../db";
import { workspaces, workspaceMembers, users } from "@shared/schema";
import { eq, and } from "drizzle-orm";

function requireAuth(req: Request, res: Response): boolean {
  if (!req.isAuthenticated()) {
    res.sendStatus(401);
    return false;
  }
  return true;
}

export function setupWorkspaceRoutes(app: Express) {
  app.get("/api/workspaces", async (req, res) => {
    if (!requireAuth(req, res)) return;

    const memberships = await db
      .select({
        workspace: workspaces,
        role: workspaceMembers.role,
      })
      .from(workspaceMembers)
      .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
      .where(eq(workspaceMembers.userId, req.user!.id));

    res.json(
      memberships.map((m) => ({
        ...m.workspace,
        role: m.role,
      }))
    );
  });

  app.post("/api/workspaces", async (req, res) => {
    if (!requireAuth(req, res)) return;

    const { name, description } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ message: "Workspace name is required" });
    }

    const [workspace] = await db
      .insert(workspaces)
      .values({ name: name.trim(), description: description || "" })
      .returning();

    await db.insert(workspaceMembers).values({
      workspaceId: workspace.id,
      userId: req.user!.id,
      role: "owner",
    });

    res.status(201).json({ ...workspace, role: "owner" });
  });

  app.get("/api/workspaces/:id/members", async (req, res) => {
    if (!requireAuth(req, res)) return;
    const workspaceId = parseInt(req.params.id);

    const membership = await db
      .select()
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.userId, req.user!.id)
        )
      )
      .limit(1);

    if (membership.length === 0) {
      return res.status(403).json({ message: "Not a member of this workspace" });
    }

    const members = await db
      .select({
        id: workspaceMembers.id,
        userId: workspaceMembers.userId,
        username: users.username,
        displayName: users.displayName,
        role: workspaceMembers.role,
        joinedAt: workspaceMembers.joinedAt,
      })
      .from(workspaceMembers)
      .innerJoin(users, eq(workspaceMembers.userId, users.id))
      .where(eq(workspaceMembers.workspaceId, workspaceId));

    res.json(members);
  });

  app.post("/api/workspaces/:id/invite", async (req, res) => {
    if (!requireAuth(req, res)) return;
    const workspaceId = parseInt(req.params.id);
    const { username, role = "viewer" } = req.body;

    if (!username?.trim()) {
      return res.status(400).json({ message: "Username is required" });
    }

    if (!["owner", "editor", "viewer"].includes(role)) {
      return res.status(400).json({ message: "Role must be owner, editor, or viewer" });
    }

    const [membership] = await db
      .select()
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.userId, req.user!.id)
        )
      )
      .limit(1);

    if (!membership || (membership.role !== "owner" && membership.role !== "editor")) {
      return res.status(403).json({ message: "Only owners and editors can invite members" });
    }

    const [targetUser] = await db
      .select()
      .from(users)
      .where(eq(users.username, username.trim()))
      .limit(1);

    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const [existing] = await db
      .select()
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.userId, targetUser.id)
        )
      )
      .limit(1);

    if (existing) {
      return res.status(400).json({ message: "User is already a member" });
    }

    const [newMember] = await db
      .insert(workspaceMembers)
      .values({
        workspaceId,
        userId: targetUser.id,
        role,
      })
      .returning();

    res.status(201).json({
      ...newMember,
      username: targetUser.username,
      displayName: targetUser.displayName,
    });
  });

  app.patch("/api/workspaces/:id/members/:memberId", async (req, res) => {
    if (!requireAuth(req, res)) return;
    const workspaceId = parseInt(req.params.id);
    const memberId = parseInt(req.params.memberId);
    const { role } = req.body;

    if (!["owner", "editor", "viewer"].includes(role)) {
      return res.status(400).json({ message: "Role must be owner, editor, or viewer" });
    }

    const [myMembership] = await db
      .select()
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.userId, req.user!.id)
        )
      )
      .limit(1);

    if (!myMembership || myMembership.role !== "owner") {
      return res.status(403).json({ message: "Only owners can change roles" });
    }

    const [updated] = await db
      .update(workspaceMembers)
      .set({ role })
      .where(
        and(
          eq(workspaceMembers.id, memberId),
          eq(workspaceMembers.workspaceId, workspaceId)
        )
      )
      .returning();

    if (!updated) {
      return res.status(404).json({ message: "Member not found" });
    }

    res.json(updated);
  });

  app.delete("/api/workspaces/:id/members/:memberId", async (req, res) => {
    if (!requireAuth(req, res)) return;
    const workspaceId = parseInt(req.params.id);
    const memberId = parseInt(req.params.memberId);

    const [myMembership] = await db
      .select()
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.userId, req.user!.id)
        )
      )
      .limit(1);

    if (!myMembership || myMembership.role !== "owner") {
      return res.status(403).json({ message: "Only owners can remove members" });
    }

    const [target] = await db
      .select()
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.id, memberId),
          eq(workspaceMembers.workspaceId, workspaceId)
        )
      )
      .limit(1);

    if (!target) {
      return res.status(404).json({ message: "Member not found" });
    }

    if (target.userId === req.user!.id) {
      return res.status(400).json({ message: "Cannot remove yourself" });
    }

    await db
      .delete(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.id, memberId),
          eq(workspaceMembers.workspaceId, workspaceId)
        )
      );

    res.sendStatus(204);
  });
}
