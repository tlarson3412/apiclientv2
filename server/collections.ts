import { type Express, type Request, type Response } from "express";
import { db } from "../db";
import { collections, collectionFolders, apiRequests, workspaceMembers } from "@shared/schema";
import { eq, and } from "drizzle-orm";

function requireAuth(req: Request, res: Response): boolean {
  if (!req.isAuthenticated()) {
    res.sendStatus(401);
    return false;
  }
  return true;
}

async function checkWorkspaceAccess(userId: number, workspaceId: number, minRole?: string) {
  const [membership] = await db
    .select()
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, userId)
      )
    )
    .limit(1);

  if (!membership) return null;

  if (minRole === "editor" && membership.role === "viewer") return null;
  if (minRole === "owner" && membership.role !== "owner") return null;

  return membership;
}

export function setupCollectionRoutes(app: Express) {
  app.get("/api/workspaces/:wsId/collections", async (req, res) => {
    if (!requireAuth(req, res)) return;
    const wsId = parseInt(req.params.wsId);

    const access = await checkWorkspaceAccess(req.user!.id, wsId);
    if (!access) return res.status(403).json({ message: "Access denied" });

    const cols = await db
      .select()
      .from(collections)
      .where(eq(collections.workspaceId, wsId));

    const colIds = cols.map(c => c.id);

    let folders: any[] = [];
    let requests: any[] = [];

    if (colIds.length > 0) {
      const allFolders = await db.select().from(collectionFolders);
      folders = allFolders.filter(f => colIds.includes(f.collectionId));

      const allRequests = await db.select().from(apiRequests);
      requests = allRequests.filter(r => colIds.includes(r.collectionId));
    }

    const result = cols.map(col => ({
      id: String(col.id),
      name: col.name,
      description: col.description || "",
      starred: col.starred || false,
      variables: col.variables || [],
      auth: col.auth || undefined,
      preRequestScript: col.preRequestScript || undefined,
      testScript: col.testScript || undefined,
      folders: folders
        .filter(f => f.collectionId === col.id)
        .map(f => ({
          id: String(f.id),
          name: f.name,
          parentId: f.parentId ? String(f.parentId) : undefined,
          auth: f.auth || undefined,
          preRequestScript: f.preRequestScript || undefined,
          testScript: f.testScript || undefined,
        })),
      requests: requests
        .filter(r => r.collectionId === col.id)
        .map(mapDbRequest),
      createdAt: col.createdAt.getTime(),
      updatedAt: col.updatedAt.getTime(),
    }));

    res.json(result);
  });

  app.post("/api/workspaces/:wsId/collections", async (req, res) => {
    if (!requireAuth(req, res)) return;
    const wsId = parseInt(req.params.wsId);

    const access = await checkWorkspaceAccess(req.user!.id, wsId, "editor");
    if (!access) return res.status(403).json({ message: "Editor access required" });

    const { name, description } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: "Name is required" });

    const [col] = await db
      .insert(collections)
      .values({
        workspaceId: wsId,
        name: name.trim(),
        description: description || "",
      })
      .returning();

    res.status(201).json({
      id: String(col.id),
      name: col.name,
      description: col.description || "",
      starred: false,
      variables: [],
      folders: [],
      requests: [],
      createdAt: col.createdAt.getTime(),
      updatedAt: col.updatedAt.getTime(),
    });
  });

  app.patch("/api/workspaces/:wsId/collections/:colId", async (req, res) => {
    if (!requireAuth(req, res)) return;
    const wsId = parseInt(req.params.wsId);
    const colId = parseInt(req.params.colId);

    const access = await checkWorkspaceAccess(req.user!.id, wsId, "editor");
    if (!access) return res.status(403).json({ message: "Editor access required" });

    const updates: any = { updatedAt: new Date() };
    if (req.body.name !== undefined) updates.name = req.body.name;
    if (req.body.description !== undefined) updates.description = req.body.description;
    if (req.body.starred !== undefined) updates.starred = req.body.starred;
    if (req.body.variables !== undefined) updates.variables = req.body.variables;
    if (req.body.auth !== undefined) updates.auth = req.body.auth;
    if (req.body.preRequestScript !== undefined) updates.preRequestScript = req.body.preRequestScript;
    if (req.body.testScript !== undefined) updates.testScript = req.body.testScript;

    const [updated] = await db
      .update(collections)
      .set(updates)
      .where(and(eq(collections.id, colId), eq(collections.workspaceId, wsId)))
      .returning();

    if (!updated) return res.status(404).json({ message: "Collection not found" });

    res.json({ ...updated, id: String(updated.id) });
  });

  app.delete("/api/workspaces/:wsId/collections/:colId", async (req, res) => {
    if (!requireAuth(req, res)) return;
    const wsId = parseInt(req.params.wsId);
    const colId = parseInt(req.params.colId);

    const access = await checkWorkspaceAccess(req.user!.id, wsId, "editor");
    if (!access) return res.status(403).json({ message: "Editor access required" });

    await db
      .delete(collections)
      .where(and(eq(collections.id, colId), eq(collections.workspaceId, wsId)));

    res.sendStatus(204);
  });

  app.post("/api/workspaces/:wsId/collections/:colId/folders", async (req, res) => {
    if (!requireAuth(req, res)) return;
    const wsId = parseInt(req.params.wsId);
    const colId = parseInt(req.params.colId);

    const access = await checkWorkspaceAccess(req.user!.id, wsId, "editor");
    if (!access) return res.status(403).json({ message: "Editor access required" });

    const { name, parentId } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: "Name is required" });

    const [folder] = await db
      .insert(collectionFolders)
      .values({
        collectionId: colId,
        name: name.trim(),
        parentId: parentId ? parseInt(parentId) : null,
      })
      .returning();

    res.status(201).json({
      id: String(folder.id),
      name: folder.name,
      parentId: folder.parentId ? String(folder.parentId) : undefined,
      auth: undefined,
    });
  });

  app.patch("/api/workspaces/:wsId/folders/:folderId", async (req, res) => {
    if (!requireAuth(req, res)) return;
    const wsId = parseInt(req.params.wsId);
    const folderId = parseInt(req.params.folderId);

    const access = await checkWorkspaceAccess(req.user!.id, wsId, "editor");
    if (!access) return res.status(403).json({ message: "Editor access required" });

    const updates: any = {};
    if (req.body.name !== undefined) updates.name = req.body.name;
    if (req.body.auth !== undefined) updates.auth = req.body.auth;
    if (req.body.preRequestScript !== undefined) updates.preRequestScript = req.body.preRequestScript;
    if (req.body.testScript !== undefined) updates.testScript = req.body.testScript;

    const [updated] = await db
      .update(collectionFolders)
      .set(updates)
      .where(eq(collectionFolders.id, folderId))
      .returning();

    if (!updated) return res.status(404).json({ message: "Folder not found" });

    res.json({
      id: String(updated.id),
      name: updated.name,
      parentId: updated.parentId ? String(updated.parentId) : undefined,
      auth: updated.auth || undefined,
      preRequestScript: updated.preRequestScript || undefined,
      testScript: updated.testScript || undefined,
    });
  });

  app.delete("/api/workspaces/:wsId/folders/:folderId", async (req, res) => {
    if (!requireAuth(req, res)) return;
    const wsId = parseInt(req.params.wsId);
    const folderId = parseInt(req.params.folderId);

    const access = await checkWorkspaceAccess(req.user!.id, wsId, "editor");
    if (!access) return res.status(403).json({ message: "Editor access required" });

    await db.delete(collectionFolders).where(eq(collectionFolders.id, folderId));
    res.sendStatus(204);
  });

  app.post("/api/workspaces/:wsId/collections/:colId/requests", async (req, res) => {
    if (!requireAuth(req, res)) return;
    const wsId = parseInt(req.params.wsId);
    const colId = parseInt(req.params.colId);

    const access = await checkWorkspaceAccess(req.user!.id, wsId, "editor");
    if (!access) return res.status(403).json({ message: "Editor access required" });

    const data = req.body;

    const [request] = await db
      .insert(apiRequests)
      .values({
        collectionId: colId,
        folderId: data.folderId ? parseInt(data.folderId) : null,
        name: data.name || "New Request",
        method: data.method || "GET",
        url: data.url || "",
        headers: data.headers || [],
        queryParams: data.queryParams || [],
        pathVariables: data.pathVariables || null,
        body: data.body || "",
        bodyType: data.bodyType || "none",
        bodyFormData: data.bodyFormData,
        bodyUrlEncoded: data.bodyUrlEncoded,
        auth: data.auth,
        assertions: data.assertions,
        extractions: data.extractions,
        description: data.description,
        preRequestScript: data.preRequestScript,
        testScript: data.testScript,
        jsonSchema: data.jsonSchema,
        pinned: data.pinned || false,
        clientCert: data.clientCert,
        examples: data.examples,
      })
      .returning();

    res.status(201).json(mapDbRequest(request));
  });

  app.patch("/api/workspaces/:wsId/requests/:reqId", async (req, res) => {
    if (!requireAuth(req, res)) return;
    const wsId = parseInt(req.params.wsId);
    const reqId = parseInt(req.params.reqId);

    const access = await checkWorkspaceAccess(req.user!.id, wsId, "editor");
    if (!access) return res.status(403).json({ message: "Editor access required" });

    const data = req.body;
    const updates: any = { updatedAt: new Date() };

    const fields = [
      'name', 'method', 'url', 'headers', 'queryParams', 'pathVariables', 'body', 'bodyType',
      'bodyFormData', 'bodyUrlEncoded', 'auth', 'assertions', 'extractions',
      'description', 'preRequestScript', 'testScript', 'jsonSchema', 'pinned', 'clientCert', 'examples',
    ];

    for (const field of fields) {
      if (data[field] !== undefined) {
        if (field === 'queryParams') {
          updates.queryParams = data[field];
        } else {
          updates[field] = data[field];
        }
      }
    }

    if (data.folderId !== undefined) {
      updates.folderId = data.folderId ? parseInt(data.folderId) : null;
    }

    const [updated] = await db
      .update(apiRequests)
      .set(updates)
      .where(eq(apiRequests.id, reqId))
      .returning();

    if (!updated) return res.status(404).json({ message: "Request not found" });

    res.json(mapDbRequest(updated));
  });

  app.delete("/api/workspaces/:wsId/requests/:reqId", async (req, res) => {
    if (!requireAuth(req, res)) return;
    const wsId = parseInt(req.params.wsId);
    const reqId = parseInt(req.params.reqId);

    const access = await checkWorkspaceAccess(req.user!.id, wsId, "editor");
    if (!access) return res.status(403).json({ message: "Editor access required" });

    await db.delete(apiRequests).where(eq(apiRequests.id, reqId));
    res.sendStatus(204);
  });

  app.post("/api/workspaces/:wsId/collections/import", async (req, res) => {
    if (!requireAuth(req, res)) return;
    const wsId = parseInt(req.params.wsId);

    const access = await checkWorkspaceAccess(req.user!.id, wsId, "editor");
    if (!access) return res.status(403).json({ message: "Editor access required" });

    const { collections: importData } = req.body;
    if (!Array.isArray(importData)) return res.status(400).json({ message: "Invalid import data" });

    const results = [];

    for (const colData of importData) {
      const [col] = await db
        .insert(collections)
        .values({
          workspaceId: wsId,
          name: colData.name || "Imported Collection",
          description: colData.description || "",
          starred: colData.starred || false,
          variables: colData.variables || [],
          auth: colData.auth,
          preRequestScript: colData.preRequestScript,
          testScript: colData.testScript,
        })
        .returning();

      const folderIdMap: Record<string, number> = {};

      if (Array.isArray(colData.folders)) {
        for (const folder of colData.folders) {
          const [dbFolder] = await db
            .insert(collectionFolders)
            .values({
              collectionId: col.id,
              name: folder.name,
              parentId: folder.parentId ? folderIdMap[folder.parentId] || null : null,
              auth: folder.auth,
              preRequestScript: folder.preRequestScript,
              testScript: folder.testScript,
            })
            .returning();
          folderIdMap[folder.id] = dbFolder.id;
        }
      }

      if (Array.isArray(colData.requests)) {
        for (const reqData of colData.requests) {
          await db.insert(apiRequests).values({
            collectionId: col.id,
            folderId: reqData.folderId ? folderIdMap[reqData.folderId] || null : null,
            name: reqData.name || "Request",
            method: reqData.method || "GET",
            url: reqData.url || "",
            headers: reqData.headers || [],
            queryParams: reqData.queryParams || [],
            pathVariables: reqData.pathVariables || null,
            body: reqData.body || "",
            bodyType: reqData.bodyType || "none",
            bodyFormData: reqData.bodyFormData,
            bodyUrlEncoded: reqData.bodyUrlEncoded,
            auth: reqData.auth,
            assertions: reqData.assertions,
            extractions: reqData.extractions,
            description: reqData.description,
            preRequestScript: reqData.preRequestScript,
            testScript: reqData.testScript,
            jsonSchema: reqData.jsonSchema,
            pinned: reqData.pinned || false,
            clientCert: reqData.clientCert,
            examples: reqData.examples,
          });
        }
      }

      results.push({ id: col.id, name: col.name });
    }

    res.status(201).json({ imported: results });
  });

  app.post("/api/workspaces/:wsId/copy-collection", async (req, res) => {
    if (!requireAuth(req, res)) return;
    const targetWsId = parseInt(req.params.wsId);
    const { sourceWorkspaceId, collectionId, name: customName } = req.body;

    if (!sourceWorkspaceId || !collectionId) {
      return res.status(400).json({ message: "sourceWorkspaceId and collectionId are required" });
    }

    const sourceWsId = parseInt(sourceWorkspaceId);
    const colId = parseInt(collectionId);

    const sourceAccess = await checkWorkspaceAccess(req.user!.id, sourceWsId);
    if (!sourceAccess) return res.status(403).json({ message: "No access to source workspace" });

    const targetAccess = await checkWorkspaceAccess(req.user!.id, targetWsId, "editor");
    if (!targetAccess) return res.status(403).json({ message: "Editor access required on target workspace" });

    const [sourceCol] = await db
      .select()
      .from(collections)
      .where(and(eq(collections.id, colId), eq(collections.workspaceId, sourceWsId)))
      .limit(1);

    if (!sourceCol) return res.status(404).json({ message: "Collection not found" });

    const sourceFolders = await db
      .select()
      .from(collectionFolders)
      .where(eq(collectionFolders.collectionId, colId));

    const sourceRequests = await db
      .select()
      .from(apiRequests)
      .where(eq(apiRequests.collectionId, colId));

    const desiredName = customName?.trim() || sourceCol.name;
    const existingCols = await db
      .select({ name: collections.name })
      .from(collections)
      .where(eq(collections.workspaceId, targetWsId));
    const existingNames = new Set(existingCols.map((c) => c.name));

    let finalName = desiredName;
    if (existingNames.has(finalName)) {
      let suffix = 2;
      while (existingNames.has(`${desiredName} (${suffix})`)) {
        suffix++;
      }
      finalName = `${desiredName} (${suffix})`;
    }

    const [newCol] = await db
      .insert(collections)
      .values({
        workspaceId: targetWsId,
        name: finalName,
        description: sourceCol.description || "",
        starred: false,
        variables: sourceCol.variables || [],
        auth: sourceCol.auth,
        preRequestScript: sourceCol.preRequestScript,
        testScript: sourceCol.testScript,
      })
      .returning();

    const folderIdMap: Record<number, number> = {};

    const sortedFolders: typeof sourceFolders = [];
    const remaining = [...sourceFolders];
    const mapped = new Set<number>();
    let safety = 0;
    while (remaining.length > 0 && safety < 100) {
      safety++;
      for (let i = remaining.length - 1; i >= 0; i--) {
        const f = remaining[i];
        if (!f.parentId || mapped.has(f.parentId)) {
          sortedFolders.push(f);
          mapped.add(f.id);
          remaining.splice(i, 1);
        }
      }
    }

    for (const folder of sortedFolders) {
      const [dbFolder] = await db
        .insert(collectionFolders)
        .values({
          collectionId: newCol.id,
          name: folder.name,
          parentId: folder.parentId ? folderIdMap[folder.parentId] || null : null,
          auth: folder.auth,
          preRequestScript: folder.preRequestScript,
          testScript: folder.testScript,
        })
        .returning();
      folderIdMap[folder.id] = dbFolder.id;
    }

    for (const reqData of sourceRequests) {
      await db.insert(apiRequests).values({
        collectionId: newCol.id,
        folderId: reqData.folderId ? folderIdMap[reqData.folderId] || null : null,
        name: reqData.name,
        method: reqData.method,
        url: reqData.url || "",
        headers: reqData.headers || [],
        queryParams: reqData.queryParams || [],
        pathVariables: reqData.pathVariables || null,
        body: reqData.body || "",
        bodyType: reqData.bodyType || "none",
        bodyFormData: reqData.bodyFormData,
        bodyUrlEncoded: reqData.bodyUrlEncoded,
        auth: reqData.auth,
        assertions: reqData.assertions,
        extractions: reqData.extractions,
        description: reqData.description,
        preRequestScript: reqData.preRequestScript,
        testScript: reqData.testScript,
        jsonSchema: reqData.jsonSchema,
        pinned: false,
        clientCert: reqData.clientCert,
        examples: reqData.examples,
      });
    }

    res.status(201).json({
      id: String(newCol.id),
      name: newCol.name,
      targetWorkspaceId: targetWsId,
      foldersCount: sourceFolders.length,
      requestsCount: sourceRequests.length,
    });
  });
}

function mapDbRequest(r: any) {
  return {
    id: String(r.id),
    name: r.name,
    method: r.method,
    url: r.url || "",
    headers: r.headers || [],
    queryParams: r.queryParams || [],
    pathVariables: r.pathVariables || null,
    body: r.body || "",
    bodyType: r.bodyType || "none",
    bodyFormData: r.bodyFormData,
    bodyUrlEncoded: r.bodyUrlEncoded,
    auth: r.auth || { type: 'none' },
    assertions: r.assertions,
    extractions: r.extractions,
    description: r.description,
    preRequestScript: r.preRequestScript,
    testScript: r.testScript,
    jsonSchema: r.jsonSchema,
    pinned: r.pinned || false,
    collectionId: String(r.collectionId),
    folderId: r.folderId ? String(r.folderId) : undefined,
    clientCert: r.clientCert,
    examples: r.examples,
    createdAt: r.createdAt instanceof Date ? r.createdAt.getTime() : r.createdAt,
    updatedAt: r.updatedAt instanceof Date ? r.updatedAt.getTime() : r.updatedAt,
  };
}
