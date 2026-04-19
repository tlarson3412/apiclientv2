/**
 * Webview-side messaging client.
 * Replaces fetch("/api/...") calls with VS Code postMessage communication.
 */

import { v4 as uuidv4 } from 'uuid';

interface VsCodeApi {
  postMessage(message: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
}

declare global {
  interface Window {
    __vscode?: VsCodeApi;
  }
}

type PendingRequest = {
  resolve: (data: unknown) => void;
  reject: (error: Error) => void;
};

const pendingRequests = new Map<string, PendingRequest>();

let initialized = false;

function getVsCodeApi(): VsCodeApi {
  if (!window.__vscode) {
    throw new Error('VS Code API not available. Are you running inside a webview?');
  }
  return window.__vscode;
}

function ensureListener() {
  if (initialized) return;
  initialized = true;

  window.addEventListener('message', (event) => {
    const message = event.data;
    if (message?.type === 'response' && message.requestId) {
      const pending = pendingRequests.get(message.requestId);
      if (pending) {
        pendingRequests.delete(message.requestId);
        if (message.success) {
          pending.resolve(message.data);
        } else {
          pending.reject(new Error(message.error || 'Unknown error'));
        }
      }
    }
  });
}

/**
 * Send a typed message to the extension host and await the response.
 */
export function sendMessage<T = unknown>(
  type: string,
  payload: Record<string, unknown> = {}
): Promise<T> {
  ensureListener();

  const requestId = uuidv4();
  const vscodeApi = getVsCodeApi();

  return new Promise<T>((resolve, reject) => {
    pendingRequests.set(requestId, {
      resolve: resolve as (data: unknown) => void,
      reject,
    });

    vscodeApi.postMessage({
      type,
      requestId,
      ...payload,
    });

    // Timeout after 60 seconds
    setTimeout(() => {
      if (pendingRequests.has(requestId)) {
        pendingRequests.delete(requestId);
        reject(new Error(`Request timed out: ${type}`));
      }
    }, 60000);
  });
}

/**
 * Check if running inside a VS Code webview.
 */
export function isVsCodeWebview(): boolean {
  return !!window.__vscode;
}

// ---- Convenience methods matching the message protocol ----

export const vscodeClient = {
  // Collections
  listCollections: () =>
    sendMessage('collections:list'),

  createCollection: (data: { name: string; description?: string }) =>
    sendMessage('collections:create', { data }),

  updateCollection: (collectionId: string, data: Record<string, unknown>) =>
    sendMessage('collections:update', { collectionId, data }),

  deleteCollection: (collectionId: string) =>
    sendMessage('collections:delete', { collectionId }),

  // Folders
  createFolder: (collectionId: string, data: { name: string; parentId?: string }) =>
    sendMessage('folders:create', { collectionId, data }),

  updateFolder: (folderId: string, data: Record<string, unknown>) =>
    sendMessage('folders:update', { folderId, data }),

  deleteFolder: (folderId: string) =>
    sendMessage('folders:delete', { folderId }),

  // Requests
  createRequest: (collectionId: string, data: Record<string, unknown>) =>
    sendMessage('requests:create', { collectionId, data }),

  updateRequest: (reqId: string, data: Record<string, unknown>) =>
    sendMessage('requests:update', { reqId, data }),

  deleteRequest: (reqId: string) =>
    sendMessage('requests:delete', { reqId }),

  // Import / Copy
  importCollections: (collections: unknown[]) => {
    console.log('[vscodeApi] importCollections sending message, collections count:', collections.length);
    return sendMessage('collections:import', { data: { collections } });
  },

  copyCollection: (collectionId: string, name?: string) =>
    sendMessage('collections:copy', { data: { collectionId, name } }),

  // Proxy
  executeProxy: (data: {
    method: string;
    url: string;
    headers: Record<string, string>;
    body?: string;
    digestAuth?: { username: string; password: string };
    clientCert?: {
      certPem?: string;
      keyPem?: string;
      caPem?: string;
      passphrase?: string;
    };
    binaryBase64?: boolean;
    timeout?: number;
    followRedirects?: boolean;
  }) => sendMessage('proxy:execute', { data }),

  // File dialogs
  openFileDialog: (filters?: Record<string, string[]>) =>
    sendMessage<{ path: string; content: string } | null>('dialog:open', { data: { filters } }),

  openFileBinaryDialog: (filters?: Record<string, string[]>) =>
    sendMessage<{ path: string; content: string } | null>('dialog:open', { data: { filters, encoding: 'base64' } }),

  saveFileDialog: (content: string, filters?: Record<string, string[]>, defaultName?: string) =>
    sendMessage<{ path: string } | null>('dialog:save', { data: { content, filters, defaultName } }),
};
