import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type {
  ApiRequest,
  ApiResponse,
  Collection,
  CollectionFolder,
  Environment,
  EnvironmentVariable,
  HistoryEntry,
  RequestTab,
  RequestExample,
  HttpMethod,
  AuthConfig,
  KeyValuePair,
  BodyType,
  TestAssertion,
  ResponseExtraction,
  Cookie,
  ProxyConfig,
  ClientCertConfig,
  GlobalSettings,
} from '../types';

function createDefaultRequest(): ApiRequest {
  return {
    id: uuidv4(),
    name: 'Untitled Request',
    method: 'GET',
    url: '',
    headers: [],
    queryParams: [],
    body: '',
    bodyType: 'none',
    auth: { type: 'inherit' },
    assertions: [],
    extractions: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

interface AppState {
  collections: Collection[];
  requests: ApiRequest[];
  environments: Environment[];
  history: HistoryEntry[];
  tabs: RequestTab[];
  activeTabId: string | null;
  activeEnvironmentId: string | null;
  sidebarSection: string;
  responses: Record<string, ApiResponse>;
  loadingRequests: Set<string>;
  cookies: Cookie[];
  proxyConfig: ProxyConfig;
  globalSettings: GlobalSettings;

  addTab: (requestId?: string) => void;
  addCollectionTab: (collectionId: string) => void;
  addFolderTab: (collectionId: string, folderId: string) => void;
  removeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  setSidebarSection: (section: string) => void;

  updateRequest: (id: string, updates: Partial<ApiRequest>) => void;
  getActiveRequest: () => ApiRequest | undefined;

  setResponse: (requestId: string, response: ApiResponse) => void;
  setLoading: (requestId: string, loading: boolean) => void;

  addCollection: (name: string) => void;
  updateCollection: (id: string, updates: Partial<Collection>) => void;
  deleteCollection: (id: string) => void;
  addFolderToCollection: (collectionId: string, name: string, parentId?: string) => void;
  renameFolderInCollection: (collectionId: string, folderId: string, name: string) => void;
  deleteFolderFromCollection: (collectionId: string, folderId: string) => void;
  saveRequestToCollection: (requestId: string, collectionId: string, folderId?: string) => void;
  moveRequestToFolder: (requestId: string, folderId?: string) => void;
  importCollection: (collection: Collection, requests: ApiRequest[]) => void;

  addEnvironment: (name: string) => void;
  deleteEnvironment: (id: string) => void;
  setActiveEnvironment: (id: string | null) => void;
  addVariable: (envId: string, variable: Omit<EnvironmentVariable, 'id'>) => void;
  updateVariable: (envId: string, varId: string, updates: Partial<EnvironmentVariable>) => void;
  deleteVariable: (envId: string, varId: string) => void;

  addHistoryEntry: (request: ApiRequest, response: ApiResponse) => void;
  clearHistory: () => void;

  interpolateVariables: (text: string, collectionId?: string) => string;

  addAssertion: (requestId: string, assertion: TestAssertion) => void;
  updateAssertion: (requestId: string, assertionId: string, updates: Partial<TestAssertion>) => void;
  deleteAssertion: (requestId: string, assertionId: string) => void;

  addExtraction: (requestId: string, extraction: ResponseExtraction) => void;
  updateExtraction: (requestId: string, extractionId: string, updates: Partial<ResponseExtraction>) => void;
  deleteExtraction: (requestId: string, extractionId: string) => void;

  addCookie: (cookie: Cookie) => void;
  updateCookie: (cookieId: string, updates: Partial<Cookie>) => void;
  deleteCookie: (cookieId: string) => void;
  clearCookies: () => void;
  getCookiesForDomain: (domain: string) => Cookie[];
  captureResponseCookies: (url: string, headers: Record<string, string>, setCookies?: string[]) => void;

  addCollectionVariable: (collectionId: string, variable: Omit<EnvironmentVariable, 'id'>) => void;
  updateCollectionVariable: (collectionId: string, varId: string, updates: Partial<EnvironmentVariable>) => void;
  deleteCollectionVariable: (collectionId: string, varId: string) => void;

  setCollectionAuth: (collectionId: string, auth: AuthConfig) => void;
  setFolderAuth: (collectionId: string, folderId: string, auth: AuthConfig) => void;
  getEffectiveAuth: (requestId: string) => AuthConfig;

  setExtractedVariable: (key: string, value: string) => void;

  duplicateRequest: (requestId: string) => void;
  deleteRequest: (requestId: string) => void;
  deleteHistoryEntries: (ids: string[]) => void;
  togglePinRequest: (requestId: string) => void;
  toggleStarCollection: (collectionId: string) => void;
  setProxyConfig: (config: ProxyConfig) => void;
  setGlobalSettings: (settings: Partial<GlobalSettings>) => void;

  addExample: (requestId: string, name: string, response: ApiResponse) => void;
  deleteExample: (requestId: string, exampleId: string) => void;
  renameExample: (requestId: string, exampleId: string, name: string) => void;

  copyCollection: (collectionId: string, targetWorkspaceId?: number, name?: string) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      collections: [],
      requests: [],
      environments: [],
      history: [],
      tabs: [],
      activeTabId: null,
      activeEnvironmentId: null,
      sidebarSection: 'collections',
      responses: {},
      loadingRequests: new Set(),
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

      addTab: (requestId?: string) => {
        const state = get();
        if (requestId) {
          const existing = state.tabs.find(t => t.requestId === requestId && (!t.type || t.type === 'request'));
          if (existing) {
            set({ activeTabId: existing.id });
            return;
          }
        }

        const request = requestId
          ? state.requests.find(r => r.id === requestId)
          : undefined;

        const newRequest = request || createDefaultRequest();
        if (!request) {
          set(s => ({ requests: [...s.requests, newRequest] }));
        }

        const tab: RequestTab = {
          id: uuidv4(),
          requestId: newRequest.id,
          name: newRequest.name,
          isModified: false,
          type: 'request',
        };

        set(s => ({
          tabs: [...s.tabs, tab],
          activeTabId: tab.id,
        }));
      },

      addCollectionTab: (collectionId: string) => {
        const state = get();
        const existing = state.tabs.find(t => t.type === 'collection' && t.collectionId === collectionId);
        if (existing) {
          set({ activeTabId: existing.id });
          return;
        }
        const collection = state.collections.find(c => c.id === collectionId);
        if (!collection) return;
        const tab: RequestTab = {
          id: uuidv4(),
          requestId: '',
          name: collection.name,
          isModified: false,
          type: 'collection',
          collectionId,
        };
        set(s => ({ tabs: [...s.tabs, tab], activeTabId: tab.id }));
      },

      addFolderTab: (collectionId: string, folderId: string) => {
        const state = get();
        const existing = state.tabs.find(t => t.type === 'folder' && t.folderId === folderId);
        if (existing) {
          set({ activeTabId: existing.id });
          return;
        }
        const collection = state.collections.find(c => c.id === collectionId);
        if (!collection) return;
        const folder = collection.folders.find(f => f.id === folderId);
        if (!folder) return;
        const tab: RequestTab = {
          id: uuidv4(),
          requestId: '',
          name: folder.name,
          isModified: false,
          type: 'folder',
          collectionId,
          folderId,
        };
        set(s => ({ tabs: [...s.tabs, tab], activeTabId: tab.id }));
      },

      removeTab: (tabId: string) => {
        set(s => {
          const newTabs = s.tabs.filter(t => t.id !== tabId);
          let newActiveTabId = s.activeTabId;
          if (s.activeTabId === tabId) {
            const idx = s.tabs.findIndex(t => t.id === tabId);
            newActiveTabId = newTabs[Math.min(idx, newTabs.length - 1)]?.id || null;
          }
          return { tabs: newTabs, activeTabId: newActiveTabId };
        });
      },

      setActiveTab: (tabId: string) => set({ activeTabId: tabId }),

      setSidebarSection: (section) => set({ sidebarSection: section }),

      updateRequest: (id, updates) => {
        set(s => ({
          requests: s.requests.map(r =>
            r.id === id ? { ...r, ...updates, updatedAt: Date.now() } : r
          ),
          tabs: s.tabs.map(t =>
            t.requestId === id ? { ...t, name: updates.name || t.name, isModified: true } : t
          ),
        }));
      },

      getActiveRequest: () => {
        const state = get();
        const activeTab = state.tabs.find(t => t.id === state.activeTabId);
        if (!activeTab) return undefined;
        return state.requests.find(r => r.id === activeTab.requestId);
      },

      setResponse: (requestId, response) => {
        set(s => ({ responses: { ...s.responses, [requestId]: response } }));
      },

      setLoading: (requestId, loading) => {
        set(s => {
          const newSet = new Set(s.loadingRequests);
          if (loading) newSet.add(requestId);
          else newSet.delete(requestId);
          return { loadingRequests: newSet };
        });
      },

      addCollection: (name) => {
        const collection: Collection = {
          id: uuidv4(),
          name,
          description: '',
          folders: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        set(s => ({ collections: [...s.collections, collection] }));
      },

      updateCollection: (id, updates) => {
        set(s => ({
          collections: s.collections.map(c =>
            c.id === id ? { ...c, ...updates, updatedAt: Date.now() } : c
          ),
        }));
      },

      deleteCollection: (id) => {
        set(s => ({ collections: s.collections.filter(c => c.id !== id) }));
      },

      addFolderToCollection: (collectionId, name, parentId) => {
        const folder: CollectionFolder = { id: uuidv4(), name, parentId };
        set(s => ({
          collections: s.collections.map(c =>
            c.id === collectionId
              ? { ...c, folders: [...c.folders, folder], updatedAt: Date.now() }
              : c
          ),
        }));
      },

      renameFolderInCollection: (collectionId, folderId, name) => {
        set(s => ({
          collections: s.collections.map(c =>
            c.id === collectionId
              ? {
                  ...c,
                  folders: c.folders.map(f => f.id === folderId ? { ...f, name } : f),
                  updatedAt: Date.now(),
                }
              : c
          ),
        }));
      },

      deleteFolderFromCollection: (collectionId, folderId) => {
        set(s => {
          const col = s.collections.find(c => c.id === collectionId);
          if (!col) return {};

          const folderIdsToDelete = new Set<string>();
          const collectChildren = (parentId: string) => {
            folderIdsToDelete.add(parentId);
            col.folders.filter(f => f.parentId === parentId).forEach(f => collectChildren(f.id));
          };
          collectChildren(folderId);

          return {
            collections: s.collections.map(c =>
              c.id === collectionId
                ? { ...c, folders: c.folders.filter(f => !folderIdsToDelete.has(f.id)), updatedAt: Date.now() }
                : c
            ),
            requests: s.requests.map(r =>
              r.collectionId === collectionId && r.folderId && folderIdsToDelete.has(r.folderId)
                ? { ...r, folderId: undefined, updatedAt: Date.now() }
                : r
            ),
          };
        });
      },

      saveRequestToCollection: (requestId, collectionId, folderId) => {
        set(s => ({
          requests: s.requests.map(r =>
            r.id === requestId
              ? { ...r, collectionId, folderId, updatedAt: Date.now() }
              : r
          ),
        }));
      },

      moveRequestToFolder: (requestId, folderId) => {
        set(s => ({
          requests: s.requests.map(r =>
            r.id === requestId
              ? { ...r, folderId, updatedAt: Date.now() }
              : r
          ),
        }));
      },

      importCollection: (collection, newRequests) => {
        set(s => ({
          collections: [...s.collections, collection],
          requests: [...s.requests, ...newRequests],
        }));
      },

      addEnvironment: (name) => {
        const env: Environment = {
          id: uuidv4(),
          name,
          variables: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        set(s => ({ environments: [...s.environments, env] }));
      },

      deleteEnvironment: (id) => {
        set(s => ({
          environments: s.environments.filter(e => e.id !== id),
          activeEnvironmentId: s.activeEnvironmentId === id ? null : s.activeEnvironmentId,
        }));
      },

      setActiveEnvironment: (id) => set({ activeEnvironmentId: id }),

      addVariable: (envId, variable) => {
        const v: EnvironmentVariable = { ...variable, id: uuidv4() };
        set(s => ({
          environments: s.environments.map(e =>
            e.id === envId
              ? { ...e, variables: [...e.variables, v], updatedAt: Date.now() }
              : e
          ),
        }));
      },

      updateVariable: (envId, varId, updates) => {
        set(s => ({
          environments: s.environments.map(e =>
            e.id === envId
              ? {
                  ...e,
                  variables: e.variables.map(v => (v.id === varId ? { ...v, ...updates } : v)),
                  updatedAt: Date.now(),
                }
              : e
          ),
        }));
      },

      deleteVariable: (envId, varId) => {
        set(s => ({
          environments: s.environments.map(e =>
            e.id === envId
              ? { ...e, variables: e.variables.filter(v => v.id !== varId), updatedAt: Date.now() }
              : e
          ),
        }));
      },

      addHistoryEntry: (request, response) => {
        const entry: HistoryEntry = {
          id: uuidv4(),
          request: { ...request },
          response: { ...response },
          timestamp: Date.now(),
        };
        set(s => ({ history: [entry, ...s.history].slice(0, 100) }));
      },

      clearHistory: () => set({ history: [] }),

      interpolateVariables: (text: string, collectionId?: string) => {
        const state = get();
        let result = text;

        // Also substitute extracted/global variables stored in state
        const extracted = (state as any)._extractedVars as Record<string, string> | undefined;
        if (extracted) {
          Object.entries(extracted).forEach(([k, v]) => {
            result = result.replace(new RegExp(`\\{\\{${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\}\\}`, 'g'), v);
          });
        }

        if (collectionId) {
          const collection = state.collections.find(c => c.id === collectionId);
          if (collection?.variables) {
            collection.variables
              .filter(v => v.enabled)
              .forEach(v => {
                result = result.replace(new RegExp(`\\{\\{${v.key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\}\\}`, 'g'), v.value);
              });
          }
        }

        const env = state.environments.find(e => e.id === state.activeEnvironmentId);
        if (env) {
          env.variables
            .filter(v => v.enabled)
            .forEach(v => {
              result = result.replace(new RegExp(`\\{\\{${v.key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\}\\}`, 'g'), v.value);
            });
        }

        if (result !== text) {
          console.log('[Interpolate] Resolved:', text, '→', result);
        } else if (/\{\{.+?\}\}/.test(text)) {
          console.log('[Interpolate] UNRESOLVED variables in:', text,
            '| activeEnvId:', state.activeEnvironmentId,
            '| envCount:', state.environments.length,
            '| env vars:', env?.variables.map(v => v.key).join(',') || 'none');
        }

        return result;
      },

      addAssertion: (requestId, assertion) => {
        set(s => ({
          requests: s.requests.map(r =>
            r.id === requestId
              ? { ...r, assertions: [...(r.assertions || []), assertion], updatedAt: Date.now() }
              : r
          ),
        }));
      },

      updateAssertion: (requestId, assertionId, updates) => {
        set(s => ({
          requests: s.requests.map(r =>
            r.id === requestId
              ? {
                  ...r,
                  assertions: (r.assertions || []).map(a =>
                    a.id === assertionId ? { ...a, ...updates } : a
                  ),
                  updatedAt: Date.now(),
                }
              : r
          ),
        }));
      },

      deleteAssertion: (requestId, assertionId) => {
        set(s => ({
          requests: s.requests.map(r =>
            r.id === requestId
              ? { ...r, assertions: (r.assertions || []).filter(a => a.id !== assertionId), updatedAt: Date.now() }
              : r
          ),
        }));
      },

      addExtraction: (requestId, extraction) => {
        set(s => ({
          requests: s.requests.map(r =>
            r.id === requestId
              ? { ...r, extractions: [...(r.extractions || []), extraction], updatedAt: Date.now() }
              : r
          ),
        }));
      },

      updateExtraction: (requestId, extractionId, updates) => {
        set(s => ({
          requests: s.requests.map(r =>
            r.id === requestId
              ? {
                  ...r,
                  extractions: (r.extractions || []).map(e =>
                    e.id === extractionId ? { ...e, ...updates } : e
                  ),
                  updatedAt: Date.now(),
                }
              : r
          ),
        }));
      },

      deleteExtraction: (requestId, extractionId) => {
        set(s => ({
          requests: s.requests.map(r =>
            r.id === requestId
              ? { ...r, extractions: (r.extractions || []).filter(e => e.id !== extractionId), updatedAt: Date.now() }
              : r
          ),
        }));
      },

      addCookie: (cookie) => {
        set(s => {
          const existing = s.cookies.findIndex(
            c => c.name === cookie.name && c.domain === cookie.domain && c.path === cookie.path
          );
          if (existing >= 0) {
            const updated = [...s.cookies];
            updated[existing] = cookie;
            return { cookies: updated };
          }
          return { cookies: [...s.cookies, cookie] };
        });
      },

      updateCookie: (cookieId, updates) => {
        set(s => ({
          cookies: s.cookies.map(c => (c.id === cookieId ? { ...c, ...updates } : c)),
        }));
      },

      deleteCookie: (cookieId) => {
        set(s => ({ cookies: s.cookies.filter(c => c.id !== cookieId) }));
      },

      clearCookies: () => set({ cookies: [] }),

      getCookiesForDomain: (domain: string) => {
        const state = get();
        return state.cookies.filter(c => {
          if (!c.enabled) return false;
          if (c.expires && c.expires < Date.now()) return false;
          return domain.endsWith(c.domain) || c.domain === domain;
        });
      },

      captureResponseCookies: (url: string, headers: Record<string, string>, setCookies?: string[]) => {
        try {
          const urlObj = new URL(url);
          const domain = urlObj.hostname;

          const cookieHeaders: string[] = [];
          if (setCookies && setCookies.length > 0) {
            cookieHeaders.push(...setCookies);
          } else {
            Object.entries(headers).forEach(([key, value]) => {
              if (key.toLowerCase() === 'set-cookie') {
                value.split(/,(?=\s*\w+=)/).forEach(c => cookieHeaders.push(c.trim()));
              }
            });
          }

          cookieHeaders.forEach(cookieStr => {
            const parts = cookieStr.split(';').map(p => p.trim());
            const [nameValue, ...attrs] = parts;
            const eqIdx = nameValue.indexOf('=');
            if (eqIdx === -1) return;

            const name = nameValue.substring(0, eqIdx).trim();
            const value = nameValue.substring(eqIdx + 1).trim();

            let path = '/';
            let expires: number | undefined;
            let httpOnly = false;
            let secure = false;
            let cookieDomain = domain;

            attrs.forEach(attr => {
              const [attrName, attrVal] = attr.split('=').map(s => s.trim());
              const lower = attrName.toLowerCase();
              if (lower === 'path' && attrVal) path = attrVal;
              if (lower === 'domain' && attrVal) cookieDomain = attrVal.replace(/^\./, '');
              if (lower === 'expires' && attrVal) expires = new Date(attrVal).getTime();
              if (lower === 'max-age' && attrVal) expires = Date.now() + parseInt(attrVal) * 1000;
              if (lower === 'httponly') httpOnly = true;
              if (lower === 'secure') secure = true;
            });

            const cookie: Cookie = {
              id: uuidv4(),
              name,
              value,
              domain: cookieDomain,
              path,
              expires,
              httpOnly,
              secure,
              enabled: true,
            };

            get().addCookie(cookie);
          });
        } catch {}
      },

      addCollectionVariable: (collectionId, variable) => {
        const v: EnvironmentVariable = { ...variable, id: uuidv4() };
        set(s => ({
          collections: s.collections.map(c =>
            c.id === collectionId
              ? { ...c, variables: [...(c.variables || []), v], updatedAt: Date.now() }
              : c
          ),
        }));
      },

      updateCollectionVariable: (collectionId, varId, updates) => {
        set(s => ({
          collections: s.collections.map(c =>
            c.id === collectionId
              ? {
                  ...c,
                  variables: (c.variables || []).map(v => (v.id === varId ? { ...v, ...updates } : v)),
                  updatedAt: Date.now(),
                }
              : c
          ),
        }));
      },

      deleteCollectionVariable: (collectionId, varId) => {
        set(s => ({
          collections: s.collections.map(c =>
            c.id === collectionId
              ? { ...c, variables: (c.variables || []).filter(v => v.id !== varId), updatedAt: Date.now() }
              : c
          ),
        }));
      },

      setCollectionAuth: (collectionId, auth) => {
        set(s => ({
          collections: s.collections.map(c =>
            c.id === collectionId
              ? { ...c, auth, updatedAt: Date.now() }
              : c
          ),
        }));
      },

      setFolderAuth: (collectionId, folderId, auth) => {
        set(s => ({
          collections: s.collections.map(c =>
            c.id === collectionId
              ? {
                  ...c,
                  folders: c.folders.map(f => (f.id === folderId ? { ...f, auth } : f)),
                  updatedAt: Date.now(),
                }
              : c
          ),
        }));
      },

      getEffectiveAuth: (requestId: string) => {
        const state = get();
        const request = state.requests.find(r => r.id === requestId);
        if (!request) return { type: 'none' as const };

        if (request.auth && request.auth.type !== 'inherit') return request.auth;

        if (request.folderId && request.collectionId) {
          const collection = state.collections.find(c => c.id === request.collectionId);
          if (collection) {
            const folder = collection.folders.find(f => f.id === request.folderId);
            if (folder?.auth && folder.auth.type !== 'none' && folder.auth.type !== 'inherit') return folder.auth;
          }
        }

        if (request.collectionId) {
          const collection = state.collections.find(c => c.id === request.collectionId);
          if (collection?.auth && collection.auth.type !== 'none' && collection.auth.type !== 'inherit') return collection.auth;
        }

        return { type: 'none' as const };
      },

      duplicateRequest: (requestId: string) => {
        const state = get();
        const original = state.requests.find(r => r.id === requestId);
        if (!original) return;
        const newId = uuidv4();
        const newRequest = {
          ...JSON.parse(JSON.stringify(original)),
          id: newId,
          name: `Copy of ${original.name}`,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        set(s => ({ requests: [...s.requests, newRequest] }));
        get().addTab(newId);
      },

      deleteRequest: (requestId: string) => {
        set(s => ({
          requests: s.requests.filter(r => r.id !== requestId),
          tabs: s.tabs.filter(t => t.requestId !== requestId),
        }));
      },

      deleteHistoryEntries: (ids: string[]) => {
        const idSet = new Set(ids);
        set(s => ({ history: s.history.filter(h => !idSet.has(h.id)) }));
      },

      togglePinRequest: (requestId: string) => {
        set(s => ({
          requests: s.requests.map(r =>
            r.id === requestId ? { ...r, pinned: !r.pinned } : r
          ),
        }));
      },

      toggleStarCollection: (collectionId: string) => {
        set(s => ({
          collections: s.collections.map(c =>
            c.id === collectionId ? { ...c, starred: !c.starred } : c
          ),
        }));
      },

      setProxyConfig: (config: ProxyConfig) => {
        set({ proxyConfig: config });
      },

      setGlobalSettings: (updates: Partial<GlobalSettings>) => {
        set(s => ({ globalSettings: { ...s.globalSettings, ...updates } }));
      },

      addExample: (requestId, name, response) => {
        const example: RequestExample = {
          id: uuidv4(),
          name,
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
          body: response.body,
          createdAt: Date.now(),
        };
        set(s => ({
          requests: s.requests.map(r =>
            r.id === requestId
              ? { ...r, examples: [...(r.examples || []), example], updatedAt: Date.now() }
              : r
          ),
        }));
      },

      deleteExample: (requestId, exampleId) => {
        set(s => ({
          requests: s.requests.map(r =>
            r.id === requestId
              ? { ...r, examples: (r.examples || []).filter(e => e.id !== exampleId), updatedAt: Date.now() }
              : r
          ),
        }));
      },

      renameExample: (requestId, exampleId, name) => {
        set(s => ({
          requests: s.requests.map(r =>
            r.id === requestId
              ? { ...r, examples: (r.examples || []).map(e => e.id === exampleId ? { ...e, name } : e), updatedAt: Date.now() }
              : r
          ),
        }));
      },

      copyCollection: (collectionId: string) => {
        const state = get();
        const original = state.collections.find(c => c.id === collectionId);
        if (!original) return;
        const newId = uuidv4();
        const idMap = new Map<string, string>();
        const newFolders = original.folders.map(f => {
          const newFolderId = uuidv4();
          idMap.set(f.id, newFolderId);
          return { ...f, id: newFolderId, parentId: f.parentId ? idMap.get(f.parentId) || f.parentId : undefined };
        });
        const copiedCollection: Collection = {
          ...JSON.parse(JSON.stringify(original)),
          id: newId,
          name: `${original.name} (Copy)`,
          folders: newFolders,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        const originalRequests = state.requests.filter(r => r.collectionId === collectionId);
        const newRequests = originalRequests.map(r => ({
          ...JSON.parse(JSON.stringify(r)),
          id: uuidv4(),
          collectionId: newId,
          folderId: r.folderId ? idMap.get(r.folderId) || r.folderId : undefined,
          name: r.name,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }));
        set(s => ({
          collections: [...s.collections, copiedCollection],
          requests: [...s.requests, ...newRequests],
        }));
      },

      setExtractedVariable: (key: string, value: string) => {
        const state = get();
        let envId = state.activeEnvironmentId;

        if (!envId) {
          const autoEnvName = 'Extracted Variables';
          let autoEnv = state.environments.find(e => e.name === autoEnvName);
          if (!autoEnv) {
            const newEnv: Environment = {
              id: uuidv4(),
              name: autoEnvName,
              variables: [],
              createdAt: Date.now(),
              updatedAt: Date.now(),
            };
            set(s => ({
              environments: [...s.environments, newEnv],
              activeEnvironmentId: newEnv.id,
            }));
            envId = newEnv.id;
          } else {
            set({ activeEnvironmentId: autoEnv.id });
            envId = autoEnv.id;
          }
        }

        const currentState = get();
        const env = currentState.environments.find(e => e.id === envId);
        if (!env) return;

        const existing = env.variables.find(v => v.key === key);
        if (existing) {
          get().updateVariable(envId, existing.id, { value });
        } else {
          get().addVariable(envId, { key, value, enabled: true, type: 'string' });
        }
      },
    }),
    {
      name: 'usbx-storage',
      partialize: (state) => ({
        environments: state.environments,
        history: state.history,
        tabs: state.tabs,
        activeTabId: state.activeTabId,
        activeEnvironmentId: state.activeEnvironmentId,
        sidebarSection: state.sidebarSection,
        cookies: state.cookies,
        proxyConfig: state.proxyConfig,
        globalSettings: state.globalSettings,
      }),
    }
  )
);
