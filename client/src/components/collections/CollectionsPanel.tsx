import { useState, useRef, useMemo } from 'react';
import { useStore } from '@/store/useStore';
import { Button } from '@/components/ui/button';
import { Typography } from '@/components/ui/typography';
import { TextInput } from '@/components/ui/text-input';
import { FolderOpen, FolderPlus, Plus, Trash2, ChevronRight, ChevronDown, File, Upload, Download, Play, Pencil, ArrowRight, Star, Search, Copy, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { importPostmanCollection, importUSBCollection, exportCollection, downloadFile } from '@/utils/importExport';
import { parseOpenApiSpec } from '@/utils/openApiImport';
import { CollectionRunner } from './CollectionRunner';
import { useWorkspace } from '@/hooks/use-workspace';
import type { Collection, CollectionFolder, ApiRequest } from '@/types';

const METHOD_COLORS: Record<string, string> = {
  GET: 'text-status-success-mid',
  POST: 'text-standard-subdued',
  PUT: 'text-status-caution-mid',
  DELETE: 'text-status-danger-mid',
  PATCH: 'text-status-caution-mid',
  HEAD: 'text-label-muted',
  OPTIONS: 'text-label-muted',
};

const STATUS_COLORS: Record<string, string> = {
  '2': 'text-status-success-mid',
  '3': 'text-standard-subdued',
  '4': 'text-status-caution-mid',
  '5': 'text-status-danger-mid',
};

function getStatusColor(status: number): string {
  const category = String(status).charAt(0);
  return STATUS_COLORS[category] || 'text-label-muted';
}

function RequestTreeItem({
  req,
  depth,
  expandedRequests,
  toggleRequest,
  showMoveToRoot,
}: {
  req: ApiRequest;
  depth: number;
  expandedRequests: Set<string>;
  toggleRequest: (id: string) => void;
  showMoveToRoot?: boolean;
}) {
  const addTab = useStore(s => s.addTab);
  const deleteRequest = useStore(s => s.deleteRequest);
  const moveRequestToFolder = useStore(s => s.moveRequestToFolder);

  const examples = req.examples || [];
  const hasExamples = examples.length > 0;
  const isExpanded = expandedRequests.has(req.id);
  const paddingLeft = `${depth * 16 + (showMoveToRoot ? 20 : 6)}px`;

  return (
    <div>
      <div
        className="group flex items-center gap-2 w-full px-2 py-1 rounded hover:bg-utility-muted transition-colors text-left cursor-pointer"
        style={{ paddingLeft }}
        onClick={() => addTab(req.id)}
      >
        {hasExamples ? (
          <button
            className="p-0 shrink-0"
            onClick={(e) => { e.stopPropagation(); toggleRequest(req.id); }}
          >
            {isExpanded
              ? <ChevronDown className="w-3 h-3 text-label-muted" />
              : <ChevronRight className="w-3 h-3 text-label-muted" />
            }
          </button>
        ) : (
          <span className="w-3 shrink-0" />
        )}
        <span className={cn('text-[11px] font-mono font-medium w-10 shrink-0', METHOD_COLORS[req.method])}>
          {req.method}
        </span>
        <span className="text-[12px] text-label-mid truncate flex-1">{req.name}</span>
        {showMoveToRoot && (
          <button
            className="p-0.5 rounded hover:bg-utility-muted transition-colors opacity-0 group-hover:opacity-100"
            onClick={(e) => { e.stopPropagation(); moveRequestToFolder(req.id, undefined); }}
            title="Move to root"
          >
            <ArrowRight className="w-3 h-3 text-label-muted" />
          </button>
        )}
        <button
          className="p-0.5 rounded hover:bg-status-danger-muted transition-colors opacity-0 group-hover:opacity-100 ml-auto"
          onClick={(e) => { e.stopPropagation(); deleteRequest(req.id); }}
          title="Delete request"
        >
          <Trash2 className="w-3 h-3 text-status-danger-mid" />
        </button>
      </div>

      {hasExamples && isExpanded && (
        <div>
          {examples.map(example => (
            <div
              key={example.id}
              className="flex items-center gap-2 w-full px-2 py-0.5 rounded hover:bg-utility-muted transition-colors text-left cursor-pointer"
              style={{ paddingLeft: `${parseInt(paddingLeft) + 20}px` }}
              onClick={() => addTab(req.id)}
            >
              <FileText className="w-3 h-3 text-label-muted shrink-0" />
              <span className={cn('text-[11px] font-mono font-medium shrink-0', getStatusColor(example.status))}>
                {example.status}
              </span>
              <span className="text-[11px] text-label-muted truncate">{example.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FolderTreeItem({
  folder,
  collection,
  allFolders,
  requests,
  expandedFolders,
  toggleFolder,
  expandedRequests,
  toggleRequest,
  depth,
}: {
  folder: CollectionFolder;
  collection: Collection;
  allFolders: CollectionFolder[];
  requests: ApiRequest[];
  expandedFolders: Set<string>;
  toggleFolder: (id: string) => void;
  expandedRequests: Set<string>;
  toggleRequest: (id: string) => void;
  depth: number;
}) {
  const addFolderTab = useStore(s => s.addFolderTab);
  const addFolderToCollection = useStore(s => s.addFolderToCollection);
  const renameFolderInCollection = useStore(s => s.renameFolderInCollection);
  const deleteFolderFromCollection = useStore(s => s.deleteFolderFromCollection);

  const [renaming, setRenaming] = useState(false);
  const [renameName, setRenameName] = useState(folder.name);
  const [addingSubfolder, setAddingSubfolder] = useState(false);
  const [subfolderName, setSubfolderName] = useState('');

  const isExpanded = expandedFolders.has(folder.id);
  const childFolders = allFolders.filter(f => f.parentId === folder.id);
  const folderRequests = requests.filter(r => r.folderId === folder.id);

  const handleRename = () => {
    if (renameName.trim()) {
      renameFolderInCollection(collection.id, folder.id, renameName.trim());
    }
    setRenaming(false);
  };

  const handleAddSubfolder = () => {
    if (subfolderName.trim()) {
      addFolderToCollection(collection.id, subfolderName.trim(), folder.id);
      setSubfolderName('');
      setAddingSubfolder(false);
      if (!isExpanded) toggleFolder(folder.id);
    }
  };

  return (
    <div>
      <div
        className="group flex items-center gap-1.5 w-full px-1.5 py-1 rounded hover:bg-utility-muted transition-colors text-left cursor-pointer"
        style={{ paddingLeft: `${depth * 16 + 6}px` }}
        onClick={() => { toggleFolder(folder.id); addFolderTab(collection.id, folder.id); }}
      >
        {isExpanded ? <ChevronDown className="w-3 h-3 text-label-muted shrink-0" /> : <ChevronRight className="w-3 h-3 text-label-muted shrink-0" />}
        <FolderOpen className="w-3.5 h-3.5 text-status-caution-mid shrink-0" />
        {renaming ? (
          <input
            value={renameName}
            onChange={e => setRenameName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={e => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setRenaming(false); }}
            className="flex-1 text-[13px] bg-transparent border-b border-standard-subdued text-label-vivid focus:outline-none font-mono px-1"
            autoFocus
            onClick={e => e.stopPropagation()}
          />
        ) : (
          <span className="text-[13px] text-label-vivid flex-1 truncate">{folder.name}</span>
        )}
        <button
          className="p-0.5 rounded hover:bg-utility-muted transition-colors opacity-0 group-hover:opacity-100"
          onClick={(e) => { e.stopPropagation(); setAddingSubfolder(true); if (!isExpanded) toggleFolder(folder.id); }}
          title="Add Subfolder"
        >
          <FolderPlus className="w-3 h-3 text-label-muted" />
        </button>
        <button
          className="p-0.5 rounded hover:bg-utility-muted transition-colors opacity-0 group-hover:opacity-100"
          onClick={(e) => { e.stopPropagation(); setRenameName(folder.name); setRenaming(true); }}
          title="Rename"
        >
          <Pencil className="w-3 h-3 text-label-muted" />
        </button>
        <button
          className="p-0.5 rounded hover:bg-status-danger-muted transition-colors opacity-0 group-hover:opacity-100"
          onClick={(e) => { e.stopPropagation(); deleteFolderFromCollection(collection.id, folder.id); }}
          title="Delete Folder"
        >
          <Trash2 className="w-3 h-3 text-status-danger-mid" />
        </button>
      </div>

      {isExpanded && (
        <div>
          {addingSubfolder && (
            <div className="flex gap-1 items-center py-1" style={{ paddingLeft: `${(depth + 1) * 16 + 20}px` }}>
              <input
                value={subfolderName}
                onChange={e => setSubfolderName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAddSubfolder(); if (e.key === 'Escape') { setAddingSubfolder(false); setSubfolderName(''); } }}
                placeholder="Folder name"
                className="flex-1 text-[12px] bg-transparent border-b border-utility-subdued text-label-vivid placeholder:text-label-muted focus:outline-none px-1 h-6"
                autoFocus
              />
              <Button variant="text" size="small" onClick={handleAddSubfolder} className="text-[11px] h-5 px-1.5">Add</Button>
            </div>
          )}

          {childFolders.map(child => (
            <FolderTreeItem
              key={child.id}
              folder={child}
              collection={collection}
              allFolders={allFolders}
              requests={requests}
              expandedFolders={expandedFolders}
              toggleFolder={toggleFolder}
              expandedRequests={expandedRequests}
              toggleRequest={toggleRequest}
              depth={depth + 1}
            />
          ))}

          {folderRequests.map(req => (
            <RequestTreeItem
              key={req.id}
              req={req}
              depth={depth + 1}
              expandedRequests={expandedRequests}
              toggleRequest={toggleRequest}
              showMoveToRoot
            />
          ))}

          {childFolders.length === 0 && folderRequests.length === 0 && !addingSubfolder && (
            <Typography variant="caption" className="text-label-muted" style={{ paddingLeft: `${(depth + 1) * 16 + 20}px` }}>
              Empty folder
            </Typography>
          )}
        </div>
      )}
    </div>
  );
}

export function CollectionsPanel() {
  const collections = useStore(s => s.collections);
  const requests = useStore(s => s.requests);
  const addCollection = useStore(s => s.addCollection);
  const updateCollection = useStore(s => s.updateCollection);
  const deleteCollection = useStore(s => s.deleteCollection);
  const addFolderToCollection = useStore(s => s.addFolderToCollection);
  const importCollectionToStore = useStore(s => s.importCollection);
  const toggleStarCollection = useStore(s => s.toggleStarCollection);
  const addTab = useStore(s => s.addTab);
  const addCollectionTab = useStore(s => s.addCollectionTab);
  const addFolderTab = useStore(s => s.addFolderTab);
  const deleteRequest = useStore(s => s.deleteRequest);
  const copyCollection = useStore(s => s.copyCollection);
  const { workspaces, activeWorkspace, myRole } = useWorkspace();
  const personalWorkspace = useMemo(() => {
    return workspaces.find(w => w.id !== activeWorkspace?.id && (w.role === 'owner' || w.role === 'editor'));
  }, [workspaces, activeWorkspace]);
  const [searchQuery, setSearchQuery] = useState('');
  const [newName, setNewName] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [expandedCollections, setExpandedCollections] = useState<Set<string>>(new Set());
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [expandedRequests, setExpandedRequests] = useState<Set<string>>(new Set());
  const [runnerCollection, setRunnerCollection] = useState<{ id: string; name: string } | null>(null);
  const [addingFolderTo, setAddingFolderTo] = useState<string | null>(null);
  const [folderName, setFolderName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const openApiInputRef = useRef<HTMLInputElement>(null);

  const sortedCollections = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    const sorted = [...collections].sort((a, b) => {
      const aStarred = a.starred ? 1 : 0;
      const bStarred = b.starred ? 1 : 0;
      if (aStarred !== bStarred) return bStarred - aStarred;
      return a.name.localeCompare(b.name);
    });
    if (!query) return sorted;
    return sorted.filter(col => {
      const colMatch = col.name.toLowerCase().includes(query);
      const colRequests = requests.filter(r => r.collectionId === col.id);
      const reqMatch = colRequests.some(r => r.name.toLowerCase().includes(query));
      return colMatch || reqMatch;
    });
  }, [collections, requests, searchQuery]);

  const toggleExpanded = (id: string) => {
    setExpandedCollections(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleFolder = (id: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleRequest = (id: string) => {
    setExpandedRequests(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAdd = () => {
    if (newName.trim()) {
      addCollection(newName.trim());
      setNewName('');
      setShowAdd(false);
    }
  };

  const handleAddFolder = (collectionId: string) => {
    if (folderName.trim()) {
      addFolderToCollection(collectionId, folderName.trim());
      setFolderName('');
      setAddingFolderTo(null);
    }
  };

  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const handleOpenApiImport = () => {
    openApiInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);

        let result;
        if (parsed.info && parsed.item) {
          result = importPostmanCollection(content);
        } else if (parsed.version && parsed.collection) {
          result = importUSBCollection(content);
        } else {
          alert('Unrecognized collection format. Supports Postman and USB API Client formats.');
          return;
        }

        importCollectionToStore(result.collection, result.requests);
        setExpandedCollections(prev => {
          const next = new Set(prev);
          next.add(result.collection.id);
          return next;
        });
      } catch (err) {
        alert('Failed to import collection. Please check the file format.');
        console.error('Import error:', err);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleOpenApiFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const result = parseOpenApiSpec(content);
        importCollectionToStore(result.collection, result.requests);
        setExpandedCollections(prev => {
          const next = new Set(prev);
          next.add(result.collection.id);
          return next;
        });
      } catch (err: any) {
        alert(`Failed to import OpenAPI spec: ${err.message}`);
        console.error('OpenAPI import error:', err);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleExport = (collectionId: string) => {
    const col = collections.find(c => c.id === collectionId);
    if (!col) return;
    const json = exportCollection(col, requests);
    downloadFile(json, `${col.name.replace(/\s+/g, '_')}.json`);
  };

  return (
    <div className="flex flex-col gap-2 pt-2">
      <div className="flex items-center justify-between">
        <Typography variant="subheading-small">Collections</Typography>
        <div className="flex items-center gap-1">
          <Button variant="text" size="small" onClick={handleImport} title="Import Collection">
            <Upload className="w-3.5 h-3.5" />
          </Button>
          <Button variant="text" size="small" onClick={handleOpenApiImport} title="Import OpenAPI/Swagger">
            <File className="w-3.5 h-3.5" />
          </Button>
          <Button variant="text" size="small" onClick={() => setShowAdd(!showAdd)} title="New Collection">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="px-1">
        <div className="flex items-center gap-1.5 px-2 py-1 rounded border border-utility-subdued focus-within:border-utility-mid transition-colors">
          <Search className="w-3.5 h-3.5 text-label-muted shrink-0" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search collections..."
            className="flex-1 text-[12px] bg-transparent text-label-vivid placeholder:text-label-muted focus:outline-none"
          />
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        ref={openApiInputRef}
        type="file"
        accept=".json,.yaml,.yml"
        onChange={handleOpenApiFileChange}
        className="hidden"
      />

      {showAdd && (
        <div className="flex gap-2">
          <TextInput
            label="Collection name"
            value={newName}
            onValueChange={setNewName}
            className="flex-1"
          />
          <Button variant="primary" size="small" onClick={handleAdd}>Add</Button>
        </div>
      )}

      {collections.length === 0 && (
        <Typography variant="caption" className="text-center py-4">
          No collections yet
        </Typography>
      )}

      {sortedCollections.map(col => {
        const isExpanded = expandedCollections.has(col.id) || (searchQuery.trim().length > 0);
        const query = searchQuery.toLowerCase().trim();
        const colRequests = requests.filter(r => r.collectionId === col.id);
        const filteredColRequests = query
          ? colRequests.filter(r => r.name.toLowerCase().includes(query))
          : colRequests;
        const rootFolders = col.folders.filter(f => !f.parentId);
        const rootRequests = filteredColRequests.filter(r => !r.folderId);

        return (
          <div key={col.id}>
            <div
              className="group flex items-center gap-2 w-full px-2 py-1.5 rounded hover:bg-utility-muted transition-colors text-left cursor-pointer"
              onClick={() => { toggleExpanded(col.id); addCollectionTab(col.id); }}
            >
              {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-label-muted" /> : <ChevronRight className="w-3.5 h-3.5 text-label-muted" />}
              <button
                className="p-0.5 rounded hover:bg-utility-muted transition-colors shrink-0"
                onClick={(e) => { e.stopPropagation(); toggleStarCollection(col.id); }}
                title={col.starred ? "Unstar collection" : "Star collection"}
              >
                <Star className={cn('w-3.5 h-3.5', col.starred ? 'fill-status-caution-mid text-status-caution-mid' : 'text-label-muted opacity-0 group-hover:opacity-100')} />
              </button>
              <FolderOpen className="w-4 h-4 text-standard-subdued" />
              <span className="text-[14px] text-label-vivid flex-1 truncate">{col.name}</span>
              <button
                className="p-0.5 rounded hover:bg-utility-muted transition-colors opacity-0 group-hover:opacity-100"
                onClick={(e) => { e.stopPropagation(); setAddingFolderTo(col.id); if (!isExpanded) toggleExpanded(col.id); }}
                title="Add Folder"
              >
                <FolderPlus className="w-3.5 h-3.5 text-label-muted" />
              </button>
              <button
                className="p-0.5 rounded hover:bg-status-success-muted transition-colors opacity-0 group-hover:opacity-100"
                onClick={(e) => { e.stopPropagation(); setRunnerCollection({ id: col.id, name: col.name }); }}
                title="Run Collection Tests"
              >
                <Play className="w-3.5 h-3.5 text-status-success-mid" />
              </button>
              {personalWorkspace && (
                <button
                  className="p-0.5 rounded hover:bg-utility-muted transition-colors opacity-0 group-hover:opacity-100"
                  onClick={(e) => { e.stopPropagation(); copyCollection(col.id, personalWorkspace.id); }}
                  title={`Copy to ${personalWorkspace.name}`}
                >
                  <Copy className="w-3.5 h-3.5 text-label-muted" />
                </button>
              )}
              <button
                className="p-0.5 rounded hover:bg-utility-muted transition-colors opacity-0 group-hover:opacity-100"
                onClick={(e) => { e.stopPropagation(); handleExport(col.id); }}
                title="Export Collection"
              >
                <Download className="w-3.5 h-3.5 text-label-muted" />
              </button>
              {myRole !== 'viewer' && (
                <button
                  className="p-0.5 rounded hover:bg-status-danger-muted transition-colors opacity-0 group-hover:opacity-100"
                  onClick={(e) => { e.stopPropagation(); deleteCollection(col.id); }}
                  title="Delete Collection"
                >
                  <Trash2 className="w-3.5 h-3.5 text-status-danger-mid" />
                </button>
              )}
            </div>

            {isExpanded && (
              <div className="ml-6 flex flex-col gap-0.5 mt-0.5">
                {addingFolderTo === col.id && (
                  <div className="flex gap-1 items-center px-2 py-1">
                    <FolderPlus className="w-3.5 h-3.5 text-status-caution-mid shrink-0" />
                    <input
                      value={folderName}
                      onChange={e => setFolderName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleAddFolder(col.id); if (e.key === 'Escape') { setAddingFolderTo(null); setFolderName(''); } }}
                      placeholder="Folder name"
                      className="flex-1 text-[12px] bg-transparent border-b border-utility-subdued text-label-vivid placeholder:text-label-muted focus:outline-none px-1 h-6"
                      autoFocus
                    />
                    <Button variant="text" size="small" onClick={() => handleAddFolder(col.id)} className="text-[11px] h-5 px-1.5">Add</Button>
                  </div>
                )}

                {rootFolders.map(folder => (
                  <FolderTreeItem
                    key={folder.id}
                    folder={folder}
                    collection={col}
                    allFolders={col.folders}
                    requests={filteredColRequests}
                    expandedFolders={expandedFolders}
                    toggleFolder={toggleFolder}
                    expandedRequests={expandedRequests}
                    toggleRequest={toggleRequest}
                    depth={0}
                  />
                ))}

                {rootRequests.map(req => (
                  <RequestTreeItem
                    key={req.id}
                    req={req}
                    depth={0}
                    expandedRequests={expandedRequests}
                    toggleRequest={toggleRequest}
                  />
                ))}

                {rootFolders.length === 0 && rootRequests.length === 0 && addingFolderTo !== col.id && (
                  <Typography variant="caption" className="pl-2 py-1">No requests</Typography>
                )}
              </div>
            )}
          </div>
        );
      })}

      {runnerCollection && (
        <CollectionRunner
          collectionId={runnerCollection.id}
          collectionName={runnerCollection.name}
          open={true}
          onClose={() => setRunnerCollection(null)}
        />
      )}
    </div>
  );
}
