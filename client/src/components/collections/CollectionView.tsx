import { useState, useEffect, useRef, useCallback } from 'react';
import { useStore } from '@/store/useStore';
import { useCollections } from '@/hooks/use-collections';
import { Typography } from '@/components/ui/typography';
import { Button } from '@/components/ui/button';
import { TextInput } from '@/components/ui/text-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { Plus, Trash2, FolderOpen, File, ChevronRight, FileText, Code2, Play, Pencil, Eye } from 'lucide-react';
// @ts-ignore
import { EditorView, basicSetup } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { javascript } from '@codemirror/lang-javascript';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import type { AuthType, AuthConfig, OAuth2Config, EnvironmentVariable, Collection, CollectionFolder } from '@/types';

const AUTH_TYPES: { value: AuthType; label: string }[] = [
  { value: 'none', label: 'No Auth' },
  { value: 'basic', label: 'Basic Auth' },
  { value: 'bearer', label: 'Bearer Token' },
  { value: 'api-key', label: 'API Key' },
  { value: 'digest', label: 'Digest Auth' },
  { value: 'oauth2', label: 'OAuth 2.0' },
];

interface CollectionViewProps {
  collectionId: string;
  folderId?: string;
}

type SubTab = 'overview' | 'authorization' | 'scripts' | 'variables' | 'runs';

function AuthSection({ auth, onUpdate }: { auth: AuthConfig; onUpdate: (auth: AuthConfig) => void }) {
  const updateAuth = (updates: Partial<AuthConfig>) => {
    onUpdate({ ...auth, ...updates });
  };

  const updateOAuth2 = (updates: Partial<OAuth2Config>) => {
    updateAuth({
      oauth2: {
        grantType: 'client_credentials',
        tokenUrl: '',
        clientId: '',
        clientSecret: '',
        ...auth.oauth2,
        ...updates,
      },
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Typography variant="body-large" className="text-label-muted w-16 shrink-0">Type</Typography>
        <Select value={auth.type} onValueChange={(v: AuthType) => updateAuth({ type: v })}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {AUTH_TYPES.map(t => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {auth.type === 'basic' && (
        <div className="flex flex-col gap-3 mt-2">
          <TextInput
            label="Username"
            value={auth.basic?.username || ''}
            onValueChange={v => updateAuth({ basic: { username: v, password: auth.basic?.password || '' } })}
          />
          <TextInput
            label="Password"
            value={auth.basic?.password || ''}
            onValueChange={v => updateAuth({ basic: { username: auth.basic?.username || '', password: v } })}
          />
        </div>
      )}

      {auth.type === 'bearer' && (
        <div className="mt-2">
          <TextInput
            label="Token"
            value={auth.bearer?.token || ''}
            onValueChange={v => updateAuth({ bearer: { token: v } })}
          />
        </div>
      )}

      {auth.type === 'api-key' && (
        <div className="flex flex-col gap-3 mt-2">
          <TextInput
            label="Key"
            value={auth.apiKey?.key || ''}
            onValueChange={v => updateAuth({ apiKey: { key: v, value: auth.apiKey?.value || '', addTo: auth.apiKey?.addTo || 'header' } })}
          />
          <TextInput
            label="Value"
            value={auth.apiKey?.value || ''}
            onValueChange={v => updateAuth({ apiKey: { key: auth.apiKey?.key || '', value: v, addTo: auth.apiKey?.addTo || 'header' } })}
          />
          <div className="flex items-center gap-3">
            <Typography variant="body-large" className="text-label-muted w-16 shrink-0">Add to</Typography>
            <Select value={auth.apiKey?.addTo || 'header'} onValueChange={(v: 'header' | 'query') => updateAuth({ apiKey: { ...auth.apiKey!, addTo: v } })}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="header">Header</SelectItem>
                <SelectItem value="query">Query Params</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {auth.type === 'digest' && (
        <div className="flex flex-col gap-3 mt-2">
          <TextInput
            label="Username"
            value={auth.digest?.username || ''}
            onValueChange={v => updateAuth({ digest: { username: v, password: auth.digest?.password || '' } })}
          />
          <TextInput
            label="Password"
            value={auth.digest?.password || ''}
            onValueChange={v => updateAuth({ digest: { username: auth.digest?.username || '', password: v } })}
          />
        </div>
      )}

      {auth.type === 'oauth2' && (
        <div className="flex flex-col gap-3 mt-2">
          <div className="flex items-center gap-3">
            <Typography variant="body-large" className="text-label-muted w-24 shrink-0">Grant Type</Typography>
            <Select value={auth.oauth2?.grantType || 'client_credentials'} onValueChange={(v: 'client_credentials' | 'password') => updateOAuth2({ grantType: v })}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="client_credentials">Client Credentials</SelectItem>
                <SelectItem value="password">Password</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <TextInput label="Token URL" value={auth.oauth2?.tokenUrl || ''} onValueChange={v => updateOAuth2({ tokenUrl: v })} />
          <TextInput label="Client ID" value={auth.oauth2?.clientId || ''} onValueChange={v => updateOAuth2({ clientId: v })} />
          <TextInput label="Client Secret" value={auth.oauth2?.clientSecret || ''} onValueChange={v => updateOAuth2({ clientSecret: v })} />
          <TextInput label="Scope" value={auth.oauth2?.scope || ''} onValueChange={v => updateOAuth2({ scope: v })} />
        </div>
      )}

      {auth.type === 'none' && (
        <Typography variant="caption" className="text-label-muted mt-2">
          This collection/folder does not use any authorization. Requests will use their own authorization settings.
        </Typography>
      )}
    </div>
  );
}

function VariablesSection({ collection }: { collection: Collection }) {
  const addCollectionVariable = useStore(s => s.addCollectionVariable);
  const updateCollectionVariable = useStore(s => s.updateCollectionVariable);
  const deleteCollectionVariable = useStore(s => s.deleteCollectionVariable);

  const variables = collection.variables || [];

  return (
    <div className="flex flex-col gap-3">
      <Typography variant="caption" className="text-label-muted">
        These variables are specific to this collection and its requests.
      </Typography>

      <div className="border border-utility-subdued rounded overflow-hidden">
        <div className="grid grid-cols-[auto_1fr_1fr_1fr_auto] gap-0 text-[12px] font-medium text-label-muted bg-surface-alternate-muted border-b border-utility-subdued">
          <div className="px-3 py-2 w-10"></div>
          <div className="px-3 py-2 border-l border-utility-subdued">VARIABLE</div>
          <div className="px-3 py-2 border-l border-utility-subdued">INITIAL VALUE</div>
          <div className="px-3 py-2 border-l border-utility-subdued">CURRENT VALUE</div>
          <div className="px-3 py-2 border-l border-utility-subdued w-16 text-center">...</div>
        </div>

        {variables.map(v => (
          <div key={v.id} className="grid grid-cols-[auto_1fr_1fr_1fr_auto] gap-0 text-[13px] border-b border-utility-subdued last:border-b-0 hover:bg-utility-muted/30">
            <div className="px-3 py-1.5 flex items-center justify-center w-10">
              <Checkbox
                checked={v.enabled}
                onCheckedChange={(c) => updateCollectionVariable(collection.id, v.id, { enabled: !!c })}
              />
            </div>
            <div className="px-2 py-1.5 border-l border-utility-subdued">
              <input
                value={v.key}
                onChange={e => updateCollectionVariable(collection.id, v.id, { key: e.target.value })}
                className="w-full bg-transparent text-label-vivid focus:outline-none"
                placeholder="Variable name"
              />
            </div>
            <div className="px-2 py-1.5 border-l border-utility-subdued">
              <input
                value={v.value}
                onChange={e => updateCollectionVariable(collection.id, v.id, { value: e.target.value })}
                className="w-full bg-transparent text-label-mid focus:outline-none"
                placeholder="Initial value"
              />
            </div>
            <div className="px-2 py-1.5 border-l border-utility-subdued">
              <input
                value={v.value}
                className="w-full bg-transparent text-label-mid focus:outline-none"
                placeholder="Current value"
                readOnly
              />
            </div>
            <div className="px-2 py-1.5 border-l border-utility-subdued flex items-center justify-center w-16">
              <button onClick={() => deleteCollectionVariable(collection.id, v.id)} className="p-1 rounded hover:bg-status-danger-muted transition-colors">
                <Trash2 className="w-3.5 h-3.5 text-status-danger-mid" />
              </button>
            </div>
          </div>
        ))}

        <div
          className="grid grid-cols-[auto_1fr_1fr_1fr_auto] gap-0 text-[13px] text-label-muted hover:bg-utility-muted/30 cursor-pointer"
          onClick={() => addCollectionVariable(collection.id, { key: '', value: '', enabled: true, type: 'string' })}
        >
          <div className="px-3 py-1.5 w-10"></div>
          <div className="px-2 py-1.5 border-l border-utility-subdued">
            <span className="text-label-muted">Add a new variable</span>
          </div>
          <div className="px-2 py-1.5 border-l border-utility-subdued"></div>
          <div className="px-2 py-1.5 border-l border-utility-subdued"></div>
          <div className="px-2 py-1.5 border-l border-utility-subdued w-16"></div>
        </div>
      </div>

      <div className="flex items-center gap-3 mt-2">
        <Button variant="text" size="small" className="text-[12px]">
          Persist All
        </Button>
        <Button variant="text" size="small" className="text-[12px]">
          Reset All
        </Button>
      </div>
    </div>
  );
}

function FullScriptEditor({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!editorRef.current) return;

    if (viewRef.current) {
      viewRef.current.destroy();
      viewRef.current = null;
    }

    const updateListener = EditorView.updateListener.of((update: any) => {
      if (update.docChanged) {
        onChangeRef.current(update.state.doc.toString());
      }
    });

    const state = EditorState.create({
      doc: value || '',
      extensions: [
        basicSetup,
        javascript(),
        updateListener,
        EditorView.theme({
          '&': { fontSize: '13px', height: '100%', border: 'none' },
          '.cm-scroller': { overflow: 'auto' },
          '.cm-content': { fontFamily: 'var(--font-mono)', padding: '8px 0' },
          '.cm-gutters': { backgroundColor: 'var(--surface-alternate-muted)', borderRight: '1px solid var(--utility-subdued)' },
          '&.cm-focused': { outline: 'none' },
        }),
        EditorView.contentAttributes.of({ 'aria-label': label }),
      ],
    });

    viewRef.current = new EditorView({
      state,
      parent: editorRef.current,
    });

    return () => {
      viewRef.current?.destroy();
      viewRef.current = null;
    };
  }, [label]);

  return <div ref={editorRef} className="h-full" />;
}

function ScriptsSection({
  preRequestScript,
  testScript,
  onPreRequestChange,
  onTestChange,
  entityType,
}: {
  preRequestScript: string;
  testScript: string;
  onPreRequestChange: (val: string) => void;
  onTestChange: (val: string) => void;
  entityType: string;
}) {
  const [activeScript, setActiveScript] = useState<'pre-request' | 'post-response'>('pre-request');

  const hasPreRequest = !!(preRequestScript && preRequestScript.trim());
  const hasPostResponse = !!(testScript && testScript.trim());

  return (
    <div className="flex border border-utility-subdued rounded overflow-hidden" style={{ minHeight: '400px' }}>
      <div className="w-36 shrink-0 border-r border-utility-subdued bg-surface-alternate-muted flex flex-col">
        <button
          className={cn(
            'flex items-center gap-2 px-3 py-2.5 text-[13px] text-left transition-colors',
            activeScript === 'pre-request'
              ? 'bg-surface text-label-vivid'
              : 'text-label-muted hover:text-label-mid hover:bg-surface'
          )}
          onClick={() => setActiveScript('pre-request')}
        >
          <span className={cn(
            'w-1.5 h-1.5 rounded-full shrink-0',
            hasPreRequest ? 'bg-status-success-mid' : 'bg-utility-mid'
          )} />
          Pre-request
        </button>
        <button
          className={cn(
            'flex items-center gap-2 px-3 py-2.5 text-[13px] text-left transition-colors',
            activeScript === 'post-response'
              ? 'bg-surface text-label-vivid'
              : 'text-label-muted hover:text-label-mid hover:bg-surface'
          )}
          onClick={() => setActiveScript('post-response')}
        >
          <span className={cn(
            'w-1.5 h-1.5 rounded-full shrink-0',
            hasPostResponse ? 'bg-status-success-mid' : 'bg-utility-mid'
          )} />
          Post-response
        </button>
      </div>

      <div className="flex-1 min-w-0">
        {activeScript === 'pre-request' ? (
          <FullScriptEditor
            key="pre-request"
            value={preRequestScript}
            onChange={onPreRequestChange}
            label={`Pre-request script for this ${entityType}`}
          />
        ) : (
          <FullScriptEditor
            key="post-response"
            value={testScript}
            onChange={onTestChange}
            label={`Post-response script for this ${entityType}`}
          />
        )}
      </div>
    </div>
  );
}

function OverviewSection({
  collection,
  folderId,
  onDescriptionChange,
}: {
  collection: Collection;
  folderId?: string;
  onDescriptionChange: (desc: string) => void;
}) {
  const requests = useStore(s => s.requests);
  const addTab = useStore(s => s.addTab);
  const addFolderTab = useStore(s => s.addFolderTab);
  const [descriptionMode, setDescriptionMode] = useState<'preview' | 'edit'>('preview');

  const collectionRequests = requests.filter(r => r.collectionId === collection.id);
  const folder = folderId ? collection.folders.find(f => f.id === folderId) : null;

  const childFolders = folderId
    ? collection.folders.filter(f => f.parentId === folderId)
    : collection.folders.filter(f => !f.parentId);
  const childRequests = folderId
    ? collectionRequests.filter(r => r.folderId === folderId)
    : collectionRequests.filter(r => !r.folderId);

  const totalRequests = folderId
    ? collectionRequests.filter(r => {
        if (r.folderId === folderId) return true;
        const descendantFolderIds = getDescendantFolderIds(folderId, collection.folders);
        return r.folderId && descendantFolderIds.has(r.folderId);
      }).length
    : collectionRequests.length;

  const totalFolders = folderId
    ? getDescendantFolderIds(folderId, collection.folders).size
    : collection.folders.length;

  const description = folder ? '' : (collection.description || '');

  const methodCounts: Record<string, number> = {};
  const relevantRequests = folderId
    ? collectionRequests.filter(r => {
        if (r.folderId === folderId) return true;
        const descendantFolderIds = getDescendantFolderIds(folderId, collection.folders);
        return r.folderId && descendantFolderIds.has(r.folderId);
      })
    : collectionRequests;
  for (const r of relevantRequests) {
    methodCounts[r.method] = (methodCounts[r.method] || 0) + 1;
  }

  const authType = folder
    ? (folder.auth?.type || 'inherit')
    : (collection.auth?.type || 'none');

  const varsCount = !folderId ? (collection.variables?.length || 0) : 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="flex flex-col gap-1 p-3 rounded-lg bg-surface-alternate-muted border border-utility-subdued">
            <Typography variant="caption" className="text-label-muted uppercase tracking-wider">Requests</Typography>
            <Typography variant="heading-medium" className="text-label-vivid">{totalRequests}</Typography>
          </div>
          <div className="flex flex-col gap-1 p-3 rounded-lg bg-surface-alternate-muted border border-utility-subdued">
            <Typography variant="caption" className="text-label-muted uppercase tracking-wider">Folders</Typography>
            <Typography variant="heading-medium" className="text-label-vivid">{totalFolders}</Typography>
          </div>
          <div className="flex flex-col gap-1 p-3 rounded-lg bg-surface-alternate-muted border border-utility-subdued">
            <Typography variant="caption" className="text-label-muted uppercase tracking-wider">Auth</Typography>
            <Typography variant="body-large" className="text-label-vivid capitalize">{authType === 'none' ? 'None' : authType}</Typography>
          </div>
          {!folderId && (
            <div className="flex flex-col gap-1 p-3 rounded-lg bg-surface-alternate-muted border border-utility-subdued">
              <Typography variant="caption" className="text-label-muted uppercase tracking-wider">Variables</Typography>
              <Typography variant="heading-medium" className="text-label-vivid">{varsCount}</Typography>
            </div>
          )}
        </div>

        {Object.keys(methodCounts).length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            {Object.entries(methodCounts).sort((a, b) => b[1] - a[1]).map(([method, count]) => (
              <span key={method} className={cn(
                'px-2 py-0.5 rounded text-[11px] font-mono font-medium',
                method === 'GET' && 'bg-status-success-muted text-status-success-mid',
                method === 'POST' && 'bg-status-info-muted text-status-info-mid',
                method === 'PUT' && 'bg-status-caution-muted text-status-caution-mid',
                method === 'PATCH' && 'bg-standard-muted text-standard-subdued',
                method === 'DELETE' && 'bg-status-danger-muted text-status-danger-mid',
                !['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(method) && 'bg-utility-muted text-label-mid',
              )}>
                {method} {count}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Typography variant="body-medium" className="text-label-vivid font-medium">Description</Typography>
          {!folder && (
            <div className="flex items-center border border-utility-subdued rounded overflow-hidden">
              <button
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1 text-[12px] transition-colors',
                  descriptionMode === 'preview'
                    ? 'bg-standard-muted text-standard-subdued'
                    : 'text-label-muted hover:text-label-mid'
                )}
                onClick={() => setDescriptionMode('preview')}
              >
                <Eye className="w-3 h-3" />
                Preview
              </button>
              <button
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1 text-[12px] transition-colors border-l border-utility-subdued',
                  descriptionMode === 'edit'
                    ? 'bg-standard-muted text-standard-subdued'
                    : 'text-label-muted hover:text-label-mid'
                )}
                onClick={() => setDescriptionMode('edit')}
              >
                <Pencil className="w-3 h-3" />
                Edit
              </button>
            </div>
          )}
        </div>

        {descriptionMode === 'edit' && !folder ? (
          <textarea
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder="Write your collection description using Markdown..."
            rows={12}
            className="w-full px-3 py-2 font-mono text-[13px] text-label-mid placeholder:text-label-muted bg-transparent border border-utility-subdued hover:border-utility-mid focus:border-standard-subdued rounded resize-y focus:outline-none transition-colors"
          />
        ) : (
          <div
            className={cn(
              'border border-utility-subdued rounded px-4 py-3 min-h-[80px] overflow-auto',
              !description && 'flex items-center justify-center'
            )}
            onClick={() => !folder && !description && setDescriptionMode('edit')}
          >
            {description ? (
              <div className="prose prose-sm max-w-none text-label-mid prose-headings:text-label-vivid prose-headings:font-semibold prose-a:text-standard-subdued prose-a:no-underline hover:prose-a:underline prose-code:text-standard-subdued prose-code:bg-surface-alternate-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-[12px] prose-code:before:content-none prose-code:after:content-none prose-pre:bg-surface-alternate-muted prose-pre:border prose-pre:border-utility-subdued prose-strong:text-label-vivid prose-blockquote:border-standard-subdued prose-blockquote:text-label-muted prose-th:text-label-vivid prose-td:text-label-mid prose-hr:border-utility-subdued prose-img:rounded prose-img:max-w-full">
                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>{description}</ReactMarkdown>
              </div>
            ) : (
              <Typography variant="body-small" className="text-label-muted cursor-pointer">
                {folder ? 'No description' : 'Click to add a description...'}
              </Typography>
            )}
          </div>
        )}
      </div>

      {(childFolders.length > 0 || childRequests.length > 0) && (
        <div className="flex flex-col gap-1">
          <Typography variant="caption" className="text-label-muted uppercase tracking-wider">
            {folderId ? 'In this folder' : 'Contents'}
          </Typography>
          <div className="flex flex-col gap-0.5 mt-1">
            {childFolders.map(f => (
              <button
                key={f.id}
                className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-utility-muted transition-colors text-left text-[13px]"
                onClick={() => addFolderTab(collection.id, f.id)}
              >
                <FolderOpen className="w-4 h-4 text-label-muted" />
                <span className="text-label-vivid">{f.name}</span>
                <span className="text-label-muted text-[11px] ml-auto">
                  {collectionRequests.filter(r => r.folderId === f.id).length} requests
                </span>
              </button>
            ))}
            {childRequests.map(r => (
              <button
                key={r.id}
                className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-utility-muted transition-colors text-left text-[13px]"
                onClick={() => addTab(r.id)}
              >
                <span className={cn(
                  'text-[10px] font-mono font-bold w-12 shrink-0',
                  r.method === 'GET' && 'text-status-success-mid',
                  r.method === 'POST' && 'text-status-info-mid',
                  r.method === 'PUT' && 'text-status-caution-mid',
                  r.method === 'PATCH' && 'text-standard-subdued',
                  r.method === 'DELETE' && 'text-status-danger-mid',
                )}>{r.method}</span>
                <span className="text-label-vivid truncate">{r.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function getDescendantFolderIds(folderId: string, folders: CollectionFolder[]): Set<string> {
  const result = new Set<string>();
  const queue = [folderId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const f of folders) {
      if (f.parentId === current && !result.has(f.id)) {
        result.add(f.id);
        queue.push(f.id);
      }
    }
  }
  return result;
}

export function CollectionView({ collectionId, folderId }: CollectionViewProps) {
  const collection = useStore(s => s.collections.find(c => c.id === collectionId));
  const setCollectionAuth = useStore(s => s.setCollectionAuth);
  const setFolderAuth = useStore(s => s.setFolderAuth);
  const updateCollectionStore = useStore(s => s.updateCollection);
  const renameFolderInCollection = useStore(s => s.renameFolderInCollection);
  const { updateCollection, updateFolder } = useCollections();
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('overview');
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState('');

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const debouncedSave = useCallback((fn: () => void) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(fn, 800);
  }, []);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  if (!collection) {
    return (
      <div className="flex items-center justify-center h-full">
        <Typography variant="body-large" className="text-label-muted">Collection not found</Typography>
      </div>
    );
  }

  const folder = folderId ? collection.folders.find(f => f.id === folderId) : null;
  const displayName = folder ? folder.name : collection.name;
  const currentAuth = folder ? (folder.auth || { type: 'none' as AuthType }) : (collection.auth || { type: 'none' as AuthType });

  const handleAuthUpdate = (auth: AuthConfig) => {
    if (folderId) {
      setFolderAuth(collectionId, folderId, auth);
      debouncedSave(() => updateFolder(folderId, { auth }));
    } else {
      setCollectionAuth(collectionId, auth);
      debouncedSave(() => updateCollection(collectionId, { auth }));
    }
  };

  const handlePreRequestScriptChange = (value: string) => {
    if (folderId) {
      updateCollectionStore(collectionId, {
        folders: collection.folders.map(f =>
          f.id === folderId ? { ...f, preRequestScript: value } : f
        ),
      });
      debouncedSave(() => updateFolder(folderId, { preRequestScript: value }));
    } else {
      updateCollectionStore(collectionId, { preRequestScript: value });
      debouncedSave(() => updateCollection(collectionId, { preRequestScript: value }));
    }
  };

  const handleTestScriptChange = (value: string) => {
    if (folderId) {
      updateCollectionStore(collectionId, {
        folders: collection.folders.map(f =>
          f.id === folderId ? { ...f, testScript: value } : f
        ),
      });
      debouncedSave(() => updateFolder(folderId, { testScript: value }));
    } else {
      updateCollectionStore(collectionId, { testScript: value });
      debouncedSave(() => updateCollection(collectionId, { testScript: value }));
    }
  };

  const handleDescriptionChange = (description: string) => {
    if (!folderId) {
      updateCollectionStore(collectionId, { description });
      debouncedSave(() => updateCollection(collectionId, { description }));
    }
  };

  const currentPreRequestScript = folderId
    ? (folder?.preRequestScript || '')
    : (collection.preRequestScript || '');
  const currentTestScript = folderId
    ? (folder?.testScript || '')
    : (collection.testScript || '');

  const SUB_TABS: { value: SubTab; label: string }[] = [
    { value: 'overview', label: 'Overview' },
    { value: 'authorization', label: 'Authorization' },
    { value: 'scripts', label: 'Scripts' },
    ...(!folderId ? [{ value: 'variables' as SubTab, label: 'Variables' }] : []),
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 pt-5 pb-0 flex items-center gap-2 group">
        {editingName ? (
          <input
            value={nameValue}
            onChange={e => setNameValue(e.target.value)}
            onBlur={() => {
              const trimmed = nameValue.trim();
              if (trimmed && trimmed !== displayName) {
                if (folderId) {
                  renameFolderInCollection(collectionId, folderId, trimmed);
                } else {
                  updateCollectionStore(collectionId, { name: trimmed });
                  debouncedSave(() => updateCollection(collectionId, { name: trimmed }));
                }
              }
              setEditingName(false);
            }}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                (e.target as HTMLInputElement).blur();
              }
              if (e.key === 'Escape') setEditingName(false);
            }}
            className="text-lg font-semibold text-label-vivid bg-transparent border-b-2 border-standard-subdued focus:outline-none flex-1 min-w-0"
            autoFocus
          />
        ) : (
          <>
            <Typography variant="heading-small" className="text-label-vivid text-lg">
              {displayName}
            </Typography>
            <button
              onClick={() => { setNameValue(displayName); setEditingName(true); }}
              className="p-1 rounded hover:bg-utility-muted transition-colors opacity-0 group-hover:opacity-100"
              title={folderId ? "Rename folder" : "Rename collection"}
            >
              <Pencil className="w-3.5 h-3.5 text-label-muted" />
            </button>
          </>
        )}
      </div>

      <div className="flex items-center gap-0 px-6 mt-4 border-b border-utility-subdued">
        {SUB_TABS.map(tab => (
          <button
            key={tab.value}
            className={cn(
              'px-4 py-2.5 text-[13px] transition-colors relative',
              activeSubTab === tab.value
                ? 'text-label-vivid'
                : 'text-label-muted hover:text-label-mid'
            )}
            onClick={() => setActiveSubTab(tab.value)}
          >
            {tab.label}
            {activeSubTab === tab.value && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-standard-subdued" />
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 px-6 py-5 overflow-auto">
        {activeSubTab === 'overview' && (
          <OverviewSection
            collection={collection}
            folderId={folderId}
            onDescriptionChange={handleDescriptionChange}
          />
        )}

        {activeSubTab === 'authorization' && (
          <AuthSection auth={currentAuth} onUpdate={handleAuthUpdate} />
        )}

        {activeSubTab === 'scripts' && (
          <ScriptsSection
            preRequestScript={currentPreRequestScript}
            testScript={currentTestScript}
            onPreRequestChange={handlePreRequestScriptChange}
            onTestChange={handleTestScriptChange}
            entityType={folderId ? 'folder' : 'collection'}
          />
        )}

        {activeSubTab === 'variables' && !folderId && (
          <VariablesSection collection={collection} />
        )}
      </div>
    </div>
  );
}
