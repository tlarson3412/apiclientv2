/**
 * Typed message protocol for extension host <-> webview communication.
 * Replaces all REST API calls (fetch("/api/...")) with postMessage.
 */

// ---- Request messages (webview -> extension host) ----

export interface CollectionsListRequest {
  type: 'collections:list';
  requestId: string;
}

export interface CollectionCreateRequest {
  type: 'collections:create';
  requestId: string;
  data: { name: string; description?: string };
}

export interface CollectionUpdateRequest {
  type: 'collections:update';
  requestId: string;
  collectionId: string;
  data: Record<string, unknown>;
}

export interface CollectionDeleteRequest {
  type: 'collections:delete';
  requestId: string;
  collectionId: string;
}

export interface FolderCreateRequest {
  type: 'folders:create';
  requestId: string;
  collectionId: string;
  data: { name: string; parentId?: string };
}

export interface FolderUpdateRequest {
  type: 'folders:update';
  requestId: string;
  folderId: string;
  data: Record<string, unknown>;
}

export interface FolderDeleteRequest {
  type: 'folders:delete';
  requestId: string;
  folderId: string;
}

export interface RequestCreateRequest {
  type: 'requests:create';
  requestId: string;
  collectionId: string;
  data: Record<string, unknown>;
}

export interface RequestUpdateRequest {
  type: 'requests:update';
  requestId: string;
  reqId: string;
  data: Record<string, unknown>;
}

export interface RequestDeleteRequest {
  type: 'requests:delete';
  requestId: string;
  reqId: string;
}

export interface ImportCollectionsRequest {
  type: 'collections:import';
  requestId: string;
  data: { collections: unknown[] };
}

export interface CopyCollectionRequest {
  type: 'collections:copy';
  requestId: string;
  data: { collectionId: string; name?: string };
}

export interface ProxyExecuteRequest {
  type: 'proxy:execute';
  requestId: string;
  data: {
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
  };
}

export interface FileDialogRequest {
  type: 'dialog:open' | 'dialog:save';
  requestId: string;
  data: {
    filters?: Record<string, string[]>;
    defaultName?: string;
    content?: string;
    encoding?: 'utf-8' | 'base64';
  };
}

export type WebviewToExtensionMessage =
  | CollectionsListRequest
  | CollectionCreateRequest
  | CollectionUpdateRequest
  | CollectionDeleteRequest
  | FolderCreateRequest
  | FolderUpdateRequest
  | FolderDeleteRequest
  | RequestCreateRequest
  | RequestUpdateRequest
  | RequestDeleteRequest
  | ImportCollectionsRequest
  | CopyCollectionRequest
  | ProxyExecuteRequest
  | FileDialogRequest;

// ---- Response messages (extension host -> webview) ----

export interface SuccessResponse {
  type: 'response';
  requestId: string;
  success: true;
  data: unknown;
}

export interface ErrorResponse {
  type: 'response';
  requestId: string;
  success: false;
  error: string;
}

export type ExtensionToWebviewMessage = SuccessResponse | ErrorResponse;
