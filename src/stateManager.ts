import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';
import { LocalStorageService } from './localStorageService';
import { executeProxy } from './proxyHandler';
import { executeScript } from './scriptExecutor';

/**
 * Central state manager for the extension host.
 * Coordinates state between multiple webviews (sidebar + editor panels).
 * Handles all CRUD, proxying, and cross-webview communication.
 */

interface WebviewEntry {
  webview: vscode.Webview;
  type: 'sidebar' | 'editor';
  requestId?: string; // For editor panels: which request this panel is editing
}

interface StoredAppState {
  environments: any[];
  activeEnvironmentId: string | null;
  history: any[];
  cookies: any[];
  proxyConfig: any;
  globalSettings: any;
}

const DEFAULT_STATE: StoredAppState = {
  environments: [],
  activeEnvironmentId: null,
  history: [],
  cookies: [],
  proxyConfig: { enabled: false, host: '', port: '' },
  globalSettings: {
    requestTimeout: 0,
    maxResponseSizeMb: 50,
    followRedirects: true,
    sslCertificateVerification: false,
    trimKeysAndValues: false,
    sendNoCacheHeader: true,
    autoFollowRedirects: true,
  },
};

export class StateManager {
  private webviews = new Map<string, WebviewEntry>();
  private appState: StoredAppState = { ...DEFAULT_STATE };
  private statePath: string;
  private dirty = false;
  private saveTimer: NodeJS.Timeout | undefined;

  constructor(
    private storage: LocalStorageService,
    private storagePath: string,
  ) {
    this.statePath = path.join(storagePath, 'appState.json');
  }

  async initialize(): Promise<void> {
    await fs.mkdir(this.storagePath, { recursive: true });
    try {
      const data = await fs.readFile(this.statePath, 'utf-8');
      const parsed = JSON.parse(data);
      this.appState = { ...DEFAULT_STATE, ...parsed };
    } catch {
      this.appState = { ...DEFAULT_STATE };
    }
  }

  // ---- Webview registration ----

  registerWebview(id: string, webview: vscode.Webview, type: 'sidebar' | 'editor', requestId?: string): void {
    this.webviews.set(id, { webview, type, requestId });
  }

  unregisterWebview(id: string): void {
    this.webviews.delete(id);
  }

  // ---- Broadcasting ----

  broadcast(message: any, excludeId?: string): void {
    this.webviews.forEach((entry, id) => {
      if (id !== excludeId) {
        entry.webview.postMessage(message);
      }
    });
  }

  private broadcastStateUpdate(slice: string, data: any, excludeId?: string): void {
    this.broadcast({
      type: 'state:update',
      slice,
      data,
    }, excludeId);
  }

  // ---- Message handling ----

  async handleMessage(message: any, sourceId: string): Promise<any> {
    switch (message.type) {
      // ---- Collections CRUD (delegates to LocalStorageService) ----
      case 'collections:list':
        return await this.storage.listCollections();

      case 'collections:create': {
        const result = await this.storage.createCollection(message.data);
        this.broadcastStateUpdate('collections', null, sourceId);
        return result;
      }

      case 'collections:update': {
        const result = await this.storage.updateCollection(message.collectionId, message.data);
        this.broadcastStateUpdate('collections', null, sourceId);
        return result;
      }

      case 'collections:delete': {
        const result = await this.storage.deleteCollection(message.collectionId);
        this.broadcastStateUpdate('collections', null, sourceId);
        return result;
      }

      // ---- Folders ----
      case 'folders:create': {
        const result = await this.storage.createFolder(message.collectionId, message.data);
        this.broadcastStateUpdate('collections', null, sourceId);
        return result;
      }

      case 'folders:update': {
        const result = await this.storage.updateFolder(message.folderId, message.data);
        this.broadcastStateUpdate('collections', null, sourceId);
        return result;
      }

      case 'folders:delete': {
        const result = await this.storage.deleteFolder(message.folderId);
        this.broadcastStateUpdate('collections', null, sourceId);
        return result;
      }

      // ---- Requests ----
      case 'requests:create': {
        const result = await this.storage.createRequest(message.collectionId, message.data);
        this.broadcastStateUpdate('collections', null, sourceId);
        return result;
      }

      case 'requests:update': {
        const result = await this.storage.updateRequest(message.reqId, message.data);
        this.broadcastStateUpdate('collections', null, sourceId);
        return result;
      }

      case 'requests:delete': {
        const result = await this.storage.deleteRequest(message.reqId);
        this.broadcastStateUpdate('collections', null, sourceId);
        return result;
      }

      // ---- Import / Copy ----
      case 'collections:import': {
        const result = await this.storage.importCollections(message.data.collections);
        this.broadcastStateUpdate('collections', null, sourceId);
        return result;
      }

      case 'collections:copy': {
        const result = await this.storage.copyCollection(message.data.collectionId, message.data.name);
        this.broadcastStateUpdate('collections', null, sourceId);
        return result;
      }

      // ---- HTTP Proxy ----
      case 'proxy:execute':
        return await executeProxy(message.data);

      // ---- File Dialogs ----
      case 'dialog:open': {
        const filters: Record<string, string[]> = message.data.filters || { 'All Files': ['*'] };
        const encoding = message.data.encoding || 'utf-8';
        const uris = await vscode.window.showOpenDialog({
          canSelectMany: false,
          filters,
        });
        if (uris && uris.length > 0) {
          const content = await vscode.workspace.fs.readFile(uris[0]);
          return {
            path: uris[0].fsPath,
            content: Buffer.from(content).toString(encoding as BufferEncoding),
          };
        }
        return null;
      }

      case 'dialog:save': {
        const saveFilters: Record<string, string[]> = message.data.filters || { 'All Files': ['*'] };
        const uri = await vscode.window.showSaveDialog({
          filters: saveFilters,
          defaultUri: message.data.defaultName
            ? vscode.Uri.file(message.data.defaultName)
            : undefined,
        });
        if (uri && message.data.content) {
          await vscode.workspace.fs.writeFile(uri, Buffer.from(message.data.content, 'utf-8'));
          return { path: uri.fsPath };
        }
        return null;
      }

      // ---- State sync (new protocol) ----
      case 'state:get': {
        return {
          environments: this.appState.environments,
          activeEnvironmentId: this.appState.activeEnvironmentId,
          history: this.appState.history,
          cookies: this.appState.cookies,
          proxyConfig: this.appState.proxyConfig,
          globalSettings: this.appState.globalSettings,
        };
      }

      case 'state:set': {
        const { slice, data } = message;
        if (slice && data !== undefined && slice in this.appState) {
          (this.appState as any)[slice] = data;
          this.scheduleSave();
          this.broadcastStateUpdate(slice, data, sourceId);
        }
        return { ok: true };
      }

      // ---- UI actions (cross-webview) ----
      case 'ui:openRequest': {
        // Sidebar wants to open a request in an editor panel
        // The extension will handle this via the EditorManager
        return { action: 'openRequest', requestId: message.targetRequestId, data: message.data };
      }

      case 'ui:openCollection': {
        return { action: 'openCollection', collectionId: message.collectionId, data: message.data };
      }

      case 'ui:openFolder': {
        return { action: 'openFolder', collectionId: message.collectionId, folderId: message.folderId, data: message.data };
      }

      case 'ui:openSettings': {
        return { action: 'openSettings' };
      }

      // ---- Script execution ----
      case 'script:execute': {
        return await executeScript(message.data);
      }

      default:
        throw new Error(`Unknown message type: ${(message as any).type}`);
    }
  }

  // ---- State persistence ----

  private scheduleSave(): void {
    this.dirty = true;
    if (this.saveTimer) return;
    this.saveTimer = setTimeout(() => {
      this.saveTimer = undefined;
      if (this.dirty) {
        this.persistState();
      }
    }, 1000);
  }

  private async persistState(): Promise<void> {
    this.dirty = false;
    try {
      const tmpPath = this.statePath + '.tmp';
      await fs.writeFile(tmpPath, JSON.stringify(this.appState, null, 2), 'utf-8');
      await fs.rename(tmpPath, this.statePath);
    } catch (err) {
      console.error('[StateManager] Failed to persist state:', err);
    }
  }

  async dispose(): Promise<void> {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }
    if (this.dirty) {
      await this.persistState();
    }
  }
}
