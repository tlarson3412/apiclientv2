import { useState, useMemo } from 'react';
import { useStore } from '@/store/useStore';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Typography } from '@/components/ui/typography';
import { UrlBar } from './UrlBar';
import { KeyValueEditor } from './KeyValueEditor';
import { PathVariablesEditor } from './PathVariablesEditor';
import { BodyEditor } from './BodyEditor';
import { AuthEditor } from './AuthEditor';
import { DocumentationEditor } from './DocumentationEditor';
import { RequestScriptsPanel } from './RequestScriptsPanel';
import { RequestSettings } from './RequestSettings';
import { Star, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { extractPathVariables } from '@/utils/pathVariables';

export function RequestBuilder() {
  const activeRequest = useStore(s => {
    const activeTab = s.tabs.find(t => t.id === s.activeTabId);
    if (!activeTab) return undefined;
    return s.requests.find(r => r.id === activeTab.requestId);
  });
  const collections = useStore(s => s.collections);
  const updateRequest = useStore(s => s.updateRequest);
  const togglePin = useStore(s => s.togglePinRequest);
  const duplicateRequest = useStore(s => s.duplicateRequest);
  const [activeTab, setActiveTab] = useState('docs');

  const pathVarKeys = useMemo(
    () => activeRequest ? extractPathVariables(activeRequest.url) : [],
    [activeRequest?.url]
  );

  const currentPathVars = useMemo(() => {
    if (!activeRequest || pathVarKeys.length === 0) return [];
    const existing = activeRequest.pathVariables || [];
    const existingMap = new Map(existing.map(pv => [pv.key, pv]));
    return pathVarKeys.map(key => {
      const prev = existingMap.get(key);
      if (prev) return prev;
      return { id: `pv-${key}`, key, value: '', enabled: true };
    });
  }, [pathVarKeys, activeRequest?.pathVariables, activeRequest]);

  if (!activeRequest) return null;

  const hasPathVars = pathVarKeys.length > 0;

  const assertionCount = (activeRequest.assertions || []).length;
  const hasDescription = !!(activeRequest.description && activeRequest.description.trim());
  const hasScript = !!(activeRequest.preRequestScript && activeRequest.preRequestScript.trim());
  const hasTestScript = !!(activeRequest.testScript && activeRequest.testScript.trim());

  const collection = activeRequest.collectionId
    ? collections.find(c => c.id === activeRequest.collectionId)
    : undefined;
  const folder = collection && activeRequest.folderId
    ? collection.folders.find(f => f.id === activeRequest.folderId)
    : undefined;

  return (
    <div className="flex flex-col gap-4">
      {collection && (
        <div className="flex items-center gap-1 text-[12px] text-label-muted">
          <span>{collection.name}</span>
          {folder && (
            <>
              <span>/</span>
              <span>{folder.name}</span>
            </>
          )}
          <span>/</span>
          <span>{activeRequest.name}</span>
        </div>
      )}
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <UrlBar />
        </div>
        <button
          onClick={() => duplicateRequest(activeRequest.id)}
          className="p-1.5 rounded transition-colors shrink-0 text-label-muted hover:text-label-vivid"
          title="Duplicate request"
        >
          <Copy className="w-4 h-4" />
        </button>
        <button
          onClick={() => togglePin(activeRequest.id)}
          className={cn(
            'p-1.5 rounded transition-colors shrink-0',
            activeRequest.pinned
              ? 'text-status-caution-mid'
              : 'text-label-muted hover:text-status-caution-mid'
          )}
          title={activeRequest.pinned ? 'Unpin from favorites' : 'Pin to favorites'}
        >
          <Star className={cn('w-4 h-4', activeRequest.pinned && 'fill-status-caution-mid')} />
        </button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="docs">
            Docs
            {hasDescription && (
              <span className="ml-1.5 w-2 h-2 bg-standard-subdued rounded-full inline-block" />
            )}
          </TabsTrigger>
          <TabsTrigger value="params">
            Params
            {(activeRequest.queryParams.filter(p => p.enabled && p.key).length + (hasPathVars ? currentPathVars.length : 0)) > 0 && (
              <span className="ml-1.5 text-[11px] bg-standard-subdued text-label-white rounded-full px-1.5 py-0.5 leading-none">
                {activeRequest.queryParams.filter(p => p.enabled && p.key).length + (hasPathVars ? currentPathVars.length : 0)}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="auth">Authorization</TabsTrigger>
          <TabsTrigger value="headers">
            Headers
            {activeRequest.headers.filter(h => h.enabled && h.key).length > 0 && (
              <span className="ml-1.5 text-[11px] bg-standard-subdued text-label-white rounded-full px-1.5 py-0.5 leading-none">
                {activeRequest.headers.filter(h => h.enabled && h.key).length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="body">
            Body
            {activeRequest.bodyType && activeRequest.bodyType !== 'none' && (
              <span className="ml-1.5 w-2 h-2 bg-standard-subdued rounded-full inline-block" />
            )}
          </TabsTrigger>
          <TabsTrigger value="scripts">
            Scripts
            {(hasScript || hasTestScript || assertionCount > 0) && (
              <span className="ml-1.5 w-2 h-2 bg-standard-subdued rounded-full inline-block" />
            )}
          </TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="docs">
          <DocumentationEditor />
        </TabsContent>

        <TabsContent value="params">
          <div className="space-y-4">
            <div>
              <Typography variant="subheading-small" className="mb-2 text-muted-foreground">Query Params</Typography>
              <KeyValueEditor
                pairs={activeRequest.queryParams}
                onChange={(queryParams) => updateRequest(activeRequest.id, { queryParams })}
                keyPlaceholder="Parameter"
                valuePlaceholder="Value"
              />
            </div>
            {hasPathVars && (
              <div>
                <Typography variant="subheading-small" className="mb-2 text-muted-foreground">Path Variables</Typography>
                <PathVariablesEditor
                  variables={currentPathVars}
                  onChange={(pathVariables) => updateRequest(activeRequest.id, { pathVariables })}
                />
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="auth">
          <AuthEditor />
        </TabsContent>

        <TabsContent value="headers">
          <KeyValueEditor
            pairs={activeRequest.headers}
            onChange={(headers) => updateRequest(activeRequest.id, { headers })}
            keyPlaceholder="Header"
            valuePlaceholder="Value"
            showHeaderSuggestions
          />
        </TabsContent>

        <TabsContent value="body">
          <BodyEditor />
        </TabsContent>

        <TabsContent value="scripts">
          <RequestScriptsPanel requestId={activeRequest.id} />
        </TabsContent>

        <TabsContent value="settings">
          <RequestSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
