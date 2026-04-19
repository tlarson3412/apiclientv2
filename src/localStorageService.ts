import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';

export interface StoredCollection {
  id: string;
  name: string;
  description: string;
  starred: boolean;
  variables: unknown[];
  auth: unknown | null;
  preRequestScript: string | null;
  testScript: string | null;
  createdAt: number;
  updatedAt: number;
  folders: StoredFolder[];
  requests: StoredRequest[];
}

export interface StoredFolder {
  id: string;
  collectionId: string;
  name: string;
  parentId: string | null;
  auth: unknown | null;
  preRequestScript: string | null;
  testScript: string | null;
  createdAt: number;
}

export interface StoredRequest {
  id: string;
  collectionId: string;
  folderId: string | null;
  name: string;
  method: string;
  url: string;
  headers: unknown[];
  queryParams: unknown[];
  pathVariables: unknown[] | null;
  body: string;
  bodyType: string;
  bodyFormData: unknown[] | null;
  bodyUrlEncoded: unknown[] | null;
  auth: unknown | null;
  assertions: unknown[] | null;
  extractions: unknown[] | null;
  description: string | null;
  preRequestScript: string | null;
  testScript: string | null;
  jsonSchema: string | null;
  pinned: boolean;
  clientCert: unknown | null;
  examples: unknown[] | null;
  createdAt: number;
  updatedAt: number;
}

/**
 * File-based storage service that replaces PostgreSQL.
 * Stores collections as individual JSON files in the VS Code globalStorageUri.
 */
export class LocalStorageService {
  private collectionsDir: string;

  constructor(private storagePath: string) {
    this.collectionsDir = path.join(storagePath, 'collections');
  }

  async initialize(): Promise<void> {
    await fs.mkdir(this.collectionsDir, { recursive: true });
  }

  // ---- Collections ----

  async listCollections(): Promise<StoredCollection[]> {
    await this.initialize();
    const files = await fs.readdir(this.collectionsDir);
    const jsonFiles = files.filter(f => f.endsWith('.json'));

    const collections: StoredCollection[] = [];
    for (const file of jsonFiles) {
      try {
        const content = await fs.readFile(path.join(this.collectionsDir, file), 'utf-8');
        collections.push(JSON.parse(content));
      } catch {
        // Skip corrupted files
      }
    }

    return collections.sort((a, b) => a.createdAt - b.createdAt);
  }

  async getCollection(id: string): Promise<StoredCollection | null> {
    try {
      const content = await fs.readFile(this.collectionPath(id), 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  async createCollection(data: { name: string; description?: string }): Promise<StoredCollection> {
    const id = crypto.randomUUID();
    const now = Date.now();

    const collection: StoredCollection = {
      id,
      name: data.name,
      description: data.description || '',
      starred: false,
      variables: [],
      auth: null,
      preRequestScript: null,
      testScript: null,
      createdAt: now,
      updatedAt: now,
      folders: [],
      requests: [],
    };

    await this.saveCollection(collection);
    return collection;
  }

  async updateCollection(id: string, updates: Partial<StoredCollection>): Promise<StoredCollection | null> {
    const collection = await this.getCollection(id);
    if (!collection) { return null; }

    const updated = {
      ...collection,
      ...updates,
      id, // prevent id overwrite
      updatedAt: Date.now(),
    };

    await this.saveCollection(updated);
    return updated;
  }

  async deleteCollection(id: string): Promise<boolean> {
    try {
      await fs.unlink(this.collectionPath(id));
      return true;
    } catch {
      return false;
    }
  }

  // ---- Folders ----

  async createFolder(collectionId: string, data: { name: string; parentId?: string }): Promise<StoredFolder | null> {
    const collection = await this.getCollection(collectionId);
    if (!collection) { return null; }

    const folder: StoredFolder = {
      id: crypto.randomUUID(),
      collectionId,
      name: data.name,
      parentId: data.parentId || null,
      auth: null,
      preRequestScript: null,
      testScript: null,
      createdAt: Date.now(),
    };

    collection.folders.push(folder);
    collection.updatedAt = Date.now();
    await this.saveCollection(collection);
    return folder;
  }

  async updateFolder(folderId: string, updates: Record<string, unknown>): Promise<StoredFolder | null> {
    const collections = await this.listCollections();

    for (const collection of collections) {
      const folderIndex = collection.folders.findIndex(f => f.id === folderId);
      if (folderIndex >= 0) {
        collection.folders[folderIndex] = {
          ...collection.folders[folderIndex],
          ...updates,
          id: folderId, // prevent id overwrite
          collectionId: collection.id,
        } as StoredFolder;
        collection.updatedAt = Date.now();
        await this.saveCollection(collection);
        return collection.folders[folderIndex];
      }
    }

    return null;
  }

  async deleteFolder(folderId: string): Promise<boolean> {
    const collections = await this.listCollections();

    for (const collection of collections) {
      const folderIndex = collection.folders.findIndex(f => f.id === folderId);
      if (folderIndex >= 0) {
        // Delete the folder and all child folders/requests
        const idsToDelete = this.getFolderDescendants(collection, folderId);
        idsToDelete.push(folderId);

        collection.folders = collection.folders.filter(f => !idsToDelete.includes(f.id));
        collection.requests = collection.requests.filter(r => !r.folderId || !idsToDelete.includes(r.folderId));
        collection.updatedAt = Date.now();
        await this.saveCollection(collection);
        return true;
      }
    }

    return false;
  }

  // ---- Requests ----

  async createRequest(collectionId: string, data: Record<string, unknown>): Promise<StoredRequest | null> {
    const collection = await this.getCollection(collectionId);
    if (!collection) { return null; }

    const now = Date.now();
    const request: StoredRequest = {
      id: crypto.randomUUID(),
      collectionId,
      folderId: (data.folderId as string) || null,
      name: (data.name as string) || 'Untitled Request',
      method: (data.method as string) || 'GET',
      url: (data.url as string) || '',
      headers: (data.headers as unknown[]) || [],
      queryParams: (data.queryParams as unknown[]) || [],
      pathVariables: (data.pathVariables as unknown[]) || null,
      body: (data.body as string) || '',
      bodyType: (data.bodyType as string) || 'none',
      bodyFormData: (data.bodyFormData as unknown[]) || null,
      bodyUrlEncoded: (data.bodyUrlEncoded as unknown[]) || null,
      auth: (data.auth as unknown) || null,
      assertions: (data.assertions as unknown[]) || null,
      extractions: (data.extractions as unknown[]) || null,
      description: (data.description as string) || null,
      preRequestScript: (data.preRequestScript as string) || null,
      testScript: (data.testScript as string) || null,
      jsonSchema: (data.jsonSchema as string) || null,
      pinned: (data.pinned as boolean) || false,
      clientCert: (data.clientCert as unknown) || null,
      examples: (data.examples as unknown[]) || null,
      createdAt: now,
      updatedAt: now,
    };

    collection.requests.push(request);
    collection.updatedAt = now;
    await this.saveCollection(collection);
    return request;
  }

  async updateRequest(reqId: string, updates: Record<string, unknown>): Promise<StoredRequest | null> {
    const collections = await this.listCollections();

    for (const collection of collections) {
      const reqIndex = collection.requests.findIndex(r => r.id === reqId);
      if (reqIndex >= 0) {
        collection.requests[reqIndex] = {
          ...collection.requests[reqIndex],
          ...updates,
          id: reqId,
          collectionId: collection.id,
          updatedAt: Date.now(),
        } as StoredRequest;
        collection.updatedAt = Date.now();
        await this.saveCollection(collection);
        return collection.requests[reqIndex];
      }
    }

    return null;
  }

  async deleteRequest(reqId: string): Promise<boolean> {
    const collections = await this.listCollections();

    for (const collection of collections) {
      const reqIndex = collection.requests.findIndex(r => r.id === reqId);
      if (reqIndex >= 0) {
        collection.requests.splice(reqIndex, 1);
        collection.updatedAt = Date.now();
        await this.saveCollection(collection);
        return true;
      }
    }

    return false;
  }

  // ---- Import ----

  async importCollections(importData: unknown[]): Promise<StoredCollection[]> {
    console.log('[Storage] importCollections called, items:', importData?.length);
    const results: StoredCollection[] = [];

    for (const item of importData as any[]) {
      const now = Date.now();
      const collectionId = crypto.randomUUID();

      const folders: StoredFolder[] = (item.folders || []).map((f: any) => ({
        id: f.id || crypto.randomUUID(),
        collectionId,
        name: f.name || 'Untitled Folder',
        parentId: f.parentId || null,
        auth: f.auth || null,
        preRequestScript: f.preRequestScript || null,
        testScript: f.testScript || null,
        createdAt: f.createdAt || now,
      }));

      const requests: StoredRequest[] = (item.requests || []).map((r: any) => ({
        id: r.id || crypto.randomUUID(),
        collectionId,
        folderId: r.folderId || null,
        name: r.name || 'Untitled Request',
        method: r.method || 'GET',
        url: r.url || '',
        headers: r.headers || [],
        queryParams: r.queryParams || [],
        pathVariables: r.pathVariables || null,
        body: r.body || '',
        bodyType: r.bodyType || 'none',
        bodyFormData: r.bodyFormData || null,
        bodyUrlEncoded: r.bodyUrlEncoded || null,
        auth: r.auth || null,
        assertions: r.assertions || null,
        extractions: r.extractions || null,
        description: r.description || null,
        preRequestScript: r.preRequestScript || null,
        testScript: r.testScript || null,
        jsonSchema: r.jsonSchema || null,
        pinned: r.pinned || false,
        clientCert: r.clientCert || null,
        examples: r.examples || null,
        createdAt: r.createdAt || now,
        updatedAt: r.updatedAt || now,
      }));

      const collection: StoredCollection = {
        id: collectionId,
        name: item.name || 'Imported Collection',
        description: item.description || '',
        starred: item.starred || false,
        variables: item.variables || [],
        auth: item.auth || null,
        preRequestScript: item.preRequestScript || null,
        testScript: item.testScript || null,
        createdAt: now,
        updatedAt: now,
        folders,
        requests,
      };

      await this.saveCollection(collection);
      console.log('[Storage] Saved collection:', collection.id, collection.name, 'to', this.collectionPath(collection.id));
      results.push(collection);
    }

    console.log('[Storage] importCollections complete, imported:', results.length);
    return results;
  }

  async copyCollection(collectionId: string, newName?: string): Promise<StoredCollection | null> {
    const original = await this.getCollection(collectionId);
    if (!original) { return null; }

    const now = Date.now();
    const newId = crypto.randomUUID();

    // Build ID mapping for folders so references stay consistent
    const folderIdMap = new Map<string, string>();
    for (const f of original.folders) {
      folderIdMap.set(f.id, crypto.randomUUID());
    }

    const copy: StoredCollection = {
      ...original,
      id: newId,
      name: newName || `${original.name} (Copy)`,
      createdAt: now,
      updatedAt: now,
      folders: original.folders.map(f => ({
        ...f,
        id: folderIdMap.get(f.id) || crypto.randomUUID(),
        collectionId: newId,
        parentId: f.parentId ? (folderIdMap.get(f.parentId) || null) : null,
        createdAt: now,
      })),
      requests: original.requests.map(r => ({
        ...r,
        id: crypto.randomUUID(),
        collectionId: newId,
        folderId: r.folderId ? (folderIdMap.get(r.folderId) || null) : null,
        createdAt: now,
        updatedAt: now,
      })),
    };

    await this.saveCollection(copy);
    return copy;
  }

  // ---- Private helpers ----

  private collectionPath(id: string): string {
    // Sanitize id to prevent path traversal
    const safeId = id.replace(/[^a-zA-Z0-9\-]/g, '');
    return path.join(this.collectionsDir, `${safeId}.json`);
  }

  private async saveCollection(collection: StoredCollection): Promise<void> {
    await this.initialize(); // ensure collections dir exists
    const filePath = this.collectionPath(collection.id);
    const tmpPath = filePath + '.tmp';
    const content = JSON.stringify(collection, null, 2);
    await fs.writeFile(tmpPath, content, 'utf-8');
    await fs.rename(tmpPath, filePath);
  }

  private getFolderDescendants(collection: StoredCollection, parentId: string): string[] {
    const children = collection.folders.filter(f => f.parentId === parentId);
    const descendants: string[] = [];
    for (const child of children) {
      descendants.push(child.id);
      descendants.push(...this.getFolderDescendants(collection, child.id));
    }
    return descendants;
  }
}
