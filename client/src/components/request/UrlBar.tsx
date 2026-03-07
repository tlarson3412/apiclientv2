import { useState, useMemo } from 'react';
import { useStore } from '@/store/useStore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Send, Loader2, FlaskConical, Save, Pencil, Check, FolderOpen, ChevronRight, Cookie } from 'lucide-react';
import { executeRequest } from '@/utils/httpClient';
import type { HttpMethod } from '@/types';
import { cn } from '@/lib/utils';
import { LoadTestRunner } from '@/components/loadtest/LoadTestRunner';
import { CookieModal } from '@/components/cookies/CookieModal';
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription, ModalBody, ModalFooter } from '@/components/ui/modal';
import { Typography } from '@/components/ui/typography';

const METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];

const METHOD_COLORS: Record<string, string> = {
  GET: 'text-status-success-mid',
  POST: 'text-standard-subdued',
  PUT: 'text-status-caution-mid',
  DELETE: 'text-status-danger-mid',
  PATCH: 'text-status-caution-mid',
  HEAD: 'text-label-muted',
  OPTIONS: 'text-label-muted',
};

export function UrlBar() {
  const activeRequest = useStore(s => {
    const activeTab = s.tabs.find(t => t.id === s.activeTabId);
    if (!activeTab) return undefined;
    return s.requests.find(r => r.id === activeTab.requestId);
  });
  const updateRequest = useStore(s => s.updateRequest);
  const setResponse = useStore(s => s.setResponse);
  const setLoading = useStore(s => s.setLoading);
  const loadingRequests = useStore(s => s.loadingRequests);
  const addHistoryEntry = useStore(s => s.addHistoryEntry);
  const interpolateVariables = useStore(s => s.interpolateVariables);
  const collections = useStore(s => s.collections);
  const saveRequestToCollection = useStore(s => s.saveRequestToCollection);

  const cookieCount = useStore(s => s.cookies.length);

  const [showLoadTest, setShowLoadTest] = useState(false);
  const [showCookieModal, setShowCookieModal] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState('');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | undefined>(undefined);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  if (!activeRequest) return null;

  const isLoading = loadingRequests.has(activeRequest.id);

  const handleSend = async () => {
    if (!activeRequest.url.trim()) return;
    setLoading(activeRequest.id, true);
    try {
      const interpolate = (text: string) => interpolateVariables(text, activeRequest.collectionId);
      const response = await executeRequest(activeRequest, interpolate);
      setResponse(activeRequest.id, response);
      addHistoryEntry(activeRequest, response);
    } catch (err) {
      console.error('Request failed:', err);
    } finally {
      setLoading(activeRequest.id, false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSend();
  };

  const startRename = () => {
    setEditName(activeRequest.name || '');
    setIsEditingName(true);
  };

  const confirmRename = () => {
    const trimmed = editName.trim();
    if (trimmed) {
      updateRequest(activeRequest.id, { name: trimmed });
    }
    setIsEditingName(false);
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') confirmRename();
    if (e.key === 'Escape') setIsEditingName(false);
  };

  const openSaveModal = () => {
    setSelectedCollectionId(activeRequest.collectionId || (collections.length > 0 ? collections[0].id : null));
    setSelectedFolderId(activeRequest.folderId);
    setExpandedFolders(new Set());
    setShowSaveModal(true);
  };

  const handleSaveToCollection = () => {
    if (!selectedCollectionId) return;
    saveRequestToCollection(activeRequest.id, selectedCollectionId, selectedFolderId);
    setShowSaveModal(false);
  };

  const selectedCollection = collections.find(c => c.id === selectedCollectionId);
  const rootFolders = selectedCollection?.folders.filter(f => !f.parentId) || [];

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  };

  const renderFolderTree = (parentId: string | undefined, depth: number) => {
    if (!selectedCollection) return null;
    const folders = selectedCollection.folders.filter(f => f.parentId === parentId);
    if (folders.length === 0) return null;

    return folders.map(folder => {
      const hasChildren = selectedCollection.folders.some(f => f.parentId === folder.id);
      const isExpanded = expandedFolders.has(folder.id);
      const isSelected = selectedFolderId === folder.id;

      return (
        <div key={folder.id}>
          <button
            className={cn(
              'flex items-center gap-1.5 w-full px-2 py-1.5 text-[13px] rounded transition-colors text-left',
              isSelected
                ? 'bg-standard-subdued/20 text-label-vivid'
                : 'text-label-mid hover:bg-utility-muted'
            )}
            style={{ paddingLeft: `${12 + depth * 16}px` }}
            onClick={() => {
              setSelectedFolderId(isSelected ? undefined : folder.id);
              if (hasChildren) toggleFolder(folder.id);
            }}
          >
            {hasChildren && (
              <ChevronRight className={cn('w-3 h-3 transition-transform shrink-0', isExpanded && 'rotate-90')} />
            )}
            <FolderOpen className="w-3.5 h-3.5 shrink-0 text-status-caution-mid" />
            <span className="truncate">{folder.name}</span>
          </button>
          {isExpanded && renderFolderTree(folder.id, depth + 1)}
        </div>
      );
    });
  };

  const isSaved = !!activeRequest.collectionId;
  const savedCollection = isSaved ? collections.find(c => c.id === activeRequest.collectionId) : null;
  const savedFolder = savedCollection?.folders.find(f => f.id === activeRequest.folderId);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        {isEditingName ? (
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <input
              autoFocus
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={handleRenameKeyDown}
              onBlur={confirmRename}
              placeholder="Request name"
              className="flex-1 min-w-0 h-7 px-2 rounded border border-utility-mid bg-surface text-[13px] text-label-vivid placeholder:text-label-muted focus:outline-none focus:ring-1 focus:ring-standard-subdued"
            />
            <button
              onClick={confirmRename}
              className="p-1 rounded hover:bg-utility-muted transition-colors text-status-success-mid"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={startRename}
            className="flex items-center gap-1.5 min-w-0 group"
          >
            <span className="text-[13px] text-label-mid truncate max-w-[300px]">
              {activeRequest.name || 'Untitled Request'}
            </span>
            <Pencil className="w-3 h-3 text-label-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
          </button>
        )}

        {isSaved && (
          <span className="text-[11px] text-label-muted shrink-0">
            in {savedCollection?.name}{savedFolder ? ` / ${savedFolder.name}` : ''}
          </span>
        )}

        <div className="ml-auto shrink-0">
          <Button
            variant="utility"
            size="small"
            onClick={openSaveModal}
            className="h-7 text-[12px]"
          >
            <Save className="w-3.5 h-3.5" />
            {isSaved ? 'Move' : 'Save'}
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Select
          value={activeRequest.method}
          onValueChange={(v) => updateRequest(activeRequest.id, { method: v as HttpMethod })}
        >
          <SelectTrigger className="w-[120px] h-10 font-mono font-medium">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {METHODS.map(m => (
              <SelectItem key={m} value={m}>
                <span className={cn('font-mono font-medium', METHOD_COLORS[m])}>{m}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex-1 relative">
          <input
            value={activeRequest.url}
            onChange={(e) => updateRequest(activeRequest.id, { url: e.target.value })}
            onKeyDown={handleKeyDown}
            placeholder="Enter request URL (e.g., https://api.example.com/users)"
            className="w-full h-10 px-3 rounded-md border border-utility-mid bg-surface text-[14px] text-label-vivid placeholder:text-label-muted focus:outline-none focus:ring-2 focus:ring-standard-subdued focus:ring-offset-1 font-mono"
          />
        </div>

        <Button
          variant="primary"
          size="medium"
          onClick={handleSend}
          disabled={isLoading || !activeRequest.url.trim()}
          className="h-10 min-w-[90px]"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Send className="w-4 h-4" />
              Send
            </>
          )}
        </Button>
        <Button
          variant="utility"
          size="medium"
          onClick={() => setShowLoadTest(true)}
          className="h-10"
          title="Load Test with Data File"
        >
          <FlaskConical className="w-4 h-4" />
        </Button>
        <LoadTestRunner
          requestId={activeRequest.id}
          open={showLoadTest}
          onClose={() => setShowLoadTest(false)}
        />
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => setShowCookieModal(true)}
          className="flex items-center gap-1 text-[12px] text-label-muted hover:text-standard-subdued transition-colors"
        >
          <Cookie className="w-3.5 h-3.5" />
          Cookies{cookieCount > 0 && ` (${cookieCount})`}
        </button>
      </div>

      <CookieModal open={showCookieModal} onClose={() => setShowCookieModal(false)} />

      <Modal open={showSaveModal} onOpenChange={setShowSaveModal}>
        <ModalContent className="max-w-md">
          <ModalHeader>
            <ModalTitle>Save to Collection</ModalTitle>
            <ModalDescription>
              Choose a collection and optionally a folder to save this request.
            </ModalDescription>
          </ModalHeader>
          <ModalBody>
            {collections.length === 0 ? (
              <div className="py-4 text-center">
                <Typography variant="caption" className="text-label-muted">
                  No collections yet. Create a collection in the sidebar first.
                </Typography>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <div>
                  <Typography variant="caption" className="text-label-muted mb-1.5 block">Collection</Typography>
                  <div className="flex flex-col gap-0.5 max-h-[150px] overflow-y-auto border border-utility-subdued rounded-md p-1">
                    {collections.map(col => (
                      <button
                        key={col.id}
                        className={cn(
                          'flex items-center gap-2 w-full px-2 py-1.5 text-[13px] rounded transition-colors text-left',
                          selectedCollectionId === col.id
                            ? 'bg-standard-subdued/20 text-label-vivid'
                            : 'text-label-mid hover:bg-utility-muted'
                        )}
                        onClick={() => {
                          setSelectedCollectionId(col.id);
                          setSelectedFolderId(undefined);
                          setExpandedFolders(new Set());
                        }}
                      >
                        <FolderOpen className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{col.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {selectedCollection && selectedCollection.folders.length > 0 && (
                  <div>
                    <Typography variant="caption" className="text-label-muted mb-1.5 block">
                      Folder (optional)
                    </Typography>
                    <div className="flex flex-col gap-0.5 max-h-[180px] overflow-y-auto border border-utility-subdued rounded-md p-1">
                      <button
                        className={cn(
                          'flex items-center gap-2 w-full px-2 py-1.5 text-[13px] rounded transition-colors text-left',
                          !selectedFolderId
                            ? 'bg-standard-subdued/20 text-label-vivid'
                            : 'text-label-mid hover:bg-utility-muted'
                        )}
                        onClick={() => setSelectedFolderId(undefined)}
                      >
                        <span className="truncate">Root (no folder)</span>
                      </button>
                      {renderFolderTree(undefined, 0)}
                    </div>
                  </div>
                )}
              </div>
            )}
          </ModalBody>
          <ModalFooter
            buttonCount={2}
            primaryLabel="Save"
            secondaryLabel="Cancel"
            onPrimaryClick={handleSaveToCollection}
            onSecondaryClick={() => setShowSaveModal(false)}
          />
        </ModalContent>
      </Modal>
    </div>
  );
}
