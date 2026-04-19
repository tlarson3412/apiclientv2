import { useState, useMemo } from 'react';
import { useStore } from '@/store/useStore';
import { Button } from '@/components/ui/button';
import { Typography } from '@/components/ui/typography';
import { TextInput } from '@/components/ui/text-input';
import { FolderOpen, FolderPlus, Plus, Trash2, ChevronRight, ChevronDown, File, Upload, Download, Play, Pencil, ArrowRight, Star, Search, Copy, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { importPostmanCollection, importUSBCollection, exportCollection, exportAsUSB, exportAsBruno, downloadFile } from '@/utils/importExport';
import { parseOpenApiSpec } from '@/utils/openApiImport';
import { CollectionRunner } from './CollectionRunner';
import { vscodeClient } from '@/lib/vscodeApi';
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
  collectionId,
}: {
  req: ApiRequest;
  depth: number;
  expandedRequests: Set<string>;
  toggleRequest: (id: string) => void;
  showMoveToRoot?: boolean;
  collectionId?: string;
}) {
  const addTab = useStore(s => s.addTab);
  const deleteRequest = useStore(s => s.deleteRequest);
  const moveRequestToFolder = useStore(s => s.moveRequestToFolder);
  const duplicateRequest = useStore(s => s.duplicateRequest);
  const updateRequest = useStore(s => s.updateRequest);

  const [renaming, setRenaming] = useState(false);
  const [renameName, setRenameName] = useState(req.name);

  const examples = req.examples || [];
  const hasExamples = examples.length > 0;
  const isExpanded = expandedRequests.has(req.id);
  const paddingLeft = `${depth * 16 + (showMoveToRoot ? 20 : 6)}px`;

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('application/x-request-id', req.id);
    if (collectionId) e.dataTransfer.setData('application/x-collection-id', collectionId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleRename = () => {
    const trimmed = renameName.trim();
    if (trimmed && trimmed !== req.name) {
      updateRequest(req.id, { name: trimmed });
    }
    setRenaming(false);
  };

  return (
    <div>
      <div
        draggable={!renaming}
        onDragStart={handleDragStart}
        className="group flex items-center gap-2 w-full px-2 py-1 rounded hover:bg-utility-muted transition-colors text-left cursor-pointer"
        style={{ paddingLeft }}
        onClick={() => !renaming && addTab(req.id)}
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
        {renaming ? (
          <input
            value={renameName}
            onChange={e => setRenameName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={e => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setRenaming(false); }}
            className="flex-1 text-[12px] bg-transparent border-b border-standard-subdued text-label-vivid focus:outline-none px-1"
            autoFocus
            onClick={e => e.stopPropagation()}
          />
        ) : (
          <span className="text-[12px] text-label-mid truncate flex-1">{req.name}</span>
        )}
        <button
          className="p-0.5 rounded hover:bg-utility-muted transition-colors opacity-0 group-hover:opacity-100"
          onClick={(e) => { e.stopPropagation(); setRenameName(req.name); setRenaming(true); }}
          title="Rename request"
        >
          <Pencil className="w-3 h-3 text-label-muted" />
        </button>
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
          className="p-0.5 rounded hover:bg-utility-muted transition-colors opacity-0 group-hover:opacity-100 ml-auto"
          onClick={(e) => { e.stopPropagation(); duplicateRequest(req.id); }}
          title="Duplicate request"
        >
          <Copy className="w-3 h-3 text-label-muted" />
        </button>
        <button
          className="p-0.5 rounded hover:bg-status-danger-muted transition-colors opacity-0 group-hover:opacity-100"
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
  const moveRequestToFolder = useStore(s => s.moveRequestToFolder);

  const [renaming, setRenaming] = useState(false);
  const [renameName, setRenameName] = useState(folder.name);
  const [addingSubfolder, setAddingSubfolder] = useState(false);
  const [subfolderName, setSubfolderName] = useState('');
  const [dragOver, setDragOver] = useState(false);

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

  const handleDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('application/x-request-id')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      setDragOver(true);
    }
  };

  const handleDragLeave = () => setDragOver(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const requestId = e.dataTransfer.getData('application/x-request-id');
    if (requestId) {
      moveRequestToFolder(requestId, folder.id);
      if (!isExpanded) toggleFolder(folder.id);
    }
  };

  return (
    <div>
      <div
        className={cn(
          "group flex items-center gap-1.5 w-full px-1.5 py-1 rounded hover:bg-utility-muted transition-colors text-left cursor-pointer",
          dragOver && "ring-2 ring-standard-subdued bg-standard-muted"
        )}
        style={{ paddingLeft: `${depth * 16 + 6}px` }}
        onClick={() => { toggleFolder(folder.id); addFolderTab(collection.id, folder.id); }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
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
              collectionId={collection.id}
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
  const moveRequestToFolder = useStore(s => s.moveRequestToFolder);
  const [searchQuery, setSearchQuery] = useState('');
  const [newName, setNewName] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [expandedCollections, setExpandedCollections] = useState<Set<string>>(new Set());
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [expandedRequests, setExpandedRequests] = useState<Set<string>>(new Set());
  const [runnerCollection, setRunnerCollection] = useState<{ id: string; name: string } | null>(null);
  const [addingFolderTo, setAddingFolderTo] = useState<string | null>(null);
  const [folderName, setFolderName] = useState('');
  const [renamingCollectionId, setRenamingCollectionId] = useState<string | null>(null);
  const [renameCollectionName, setRenameCollectionName] = useState('');
  const [dropTargetCollectionId, setDropTargetCollectionId] = useState<string | null>(null);
  const [exportPickerCollectionId, setExportPickerCollectionId] = useState<string | null>(null);

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

  const handleImport = async () => {
    try {
      const result = await vscodeClient.openFileDialog({ 'Collection Files': ['json'] });
      if (!result || !result.content) return;

      const content = result.content;
      const parsed = JSON.parse(content);

      let importResult;
      if (parsed.info && parsed.item) {
        importResult = importPostmanCollection(content);
      } else if (parsed.version && parsed.collection) {
        importResult = importUSBCollection(content);
      } else {
        alert('Unrecognized collection format. Supports Postman and USB API Client formats.');
        return;
      }

      importCollectionToStore(importResult.collection, importResult.requests);
      setExpandedCollections(prev => {
        const next = new Set(prev);
        next.add(importResult.collection.id);
        return next;
      });
    } catch (err) {
      alert('Failed to import collection. Please check the file format.');
      console.error('Import error:', err);
    }
  };

  const handleOpenApiImport = async () => {
    try {
      const result = await vscodeClient.openFileDialog({ 'OpenAPI/Swagger': ['json', 'yaml', 'yml'] });
      if (!result || !result.content) return;

      const importResult = parseOpenApiSpec(result.content);
      importCollectionToStore(importResult.collection, importResult.requests);
      setExpandedCollections(prev => {
        const next = new Set(prev);
        next.add(importResult.collection.id);
        return next;
      });
    } catch (err: any) {
      alert(`Failed to import OpenAPI spec: ${err.message}`);
      console.error('OpenAPI import error:', err);
    }
  };

  const handleExport = (collectionId: string) => {
    setExportPickerCollectionId(collectionId);
  };

  const handleExportAs = (format: 'postman' | 'bruno' | 'usb') => {
    const col = collections.find(c => c.id === exportPickerCollectionId);
    if (!col) return;
    const safeName = col.name.replace(/\s+/g, '_');
    if (format === 'postman') {
      downloadFile(exportCollection(col, requests), `${safeName}_postman.json`);
    } else if (format === 'bruno') {
      downloadFile(exportAsBruno(col, requests), `${safeName}_bruno.json`);
    } else {
      downloadFile(exportAsUSB(col, requests), `${safeName}_usb.json`);
    }
    setExportPickerCollectionId(null);
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
              className={cn(
                "group flex items-center gap-2 w-full px-2 py-1.5 rounded hover:bg-utility-muted transition-colors text-left cursor-pointer",
                dropTargetCollectionId === col.id && "ring-2 ring-standard-subdued bg-standard-muted"
              )}
              onClick={() => { toggleExpanded(col.id); addCollectionTab(col.id); }}
              onDragOver={(e) => {
                if (e.dataTransfer.types.includes('application/x-request-id')) {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                  setDropTargetCollectionId(col.id);
                }
              }}
              onDragLeave={() => setDropTargetCollectionId(null)}
              onDrop={(e) => {
                e.preventDefault();
                setDropTargetCollectionId(null);
                const requestId = e.dataTransfer.getData('application/x-request-id');
                if (requestId) {
                  moveRequestToFolder(requestId, undefined);
                  if (!isExpanded) toggleExpanded(col.id);
                }
              }}
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
              {renamingCollectionId === col.id ? (
                <input
                  value={renameCollectionName}
                  onChange={e => setRenameCollectionName(e.target.value)}
                  onBlur={() => {
                    const trimmed = renameCollectionName.trim();
                    if (trimmed) updateCollection(col.id, { name: trimmed });
                    setRenamingCollectionId(null);
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      const trimmed = renameCollectionName.trim();
                      if (trimmed) updateCollection(col.id, { name: trimmed });
                      setRenamingCollectionId(null);
                    }
                    if (e.key === 'Escape') setRenamingCollectionId(null);
                  }}
                  className="flex-1 text-[14px] bg-transparent border-b border-standard-subdued text-label-vivid focus:outline-none font-mono px-1"
                  autoFocus
                  onClick={e => e.stopPropagation()}
                />
              ) : (
                <span className="text-[14px] text-label-vivid flex-1 truncate">{col.name}</span>
              )}
              <button
                className="p-0.5 rounded hover:bg-utility-muted transition-colors opacity-0 group-hover:opacity-100"
                onClick={(e) => { e.stopPropagation(); setRenameCollectionName(col.name); setRenamingCollectionId(col.id); }}
                title="Rename Collection"
              >
                <Pencil className="w-3.5 h-3.5 text-label-muted" />
              </button>
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
              <button
                className="p-0.5 rounded hover:bg-utility-muted transition-colors opacity-0 group-hover:opacity-100"
                onClick={(e) => { e.stopPropagation(); copyCollection(col.id); }}
                title="Copy Collection"
              >
                <Copy className="w-3.5 h-3.5 text-label-muted" />
              </button>
              <button
                className="p-0.5 rounded hover:bg-utility-muted transition-colors opacity-0 group-hover:opacity-100"
                onClick={(e) => { e.stopPropagation(); handleExport(col.id); }}
                title="Export Collection"
              >
                <Download className="w-3.5 h-3.5 text-label-muted" />
              </button>
              {true && (
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
                    collectionId={col.id}
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

      {exportPickerCollectionId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setExportPickerCollectionId(null)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative bg-surface border border-utility-subdued rounded-lg shadow-xl p-4 min-w-[260px]" onClick={e => e.stopPropagation()}>
            <Typography variant="subheading-small" className="mb-3">Export Format</Typography>
            <div className="flex flex-col gap-1.5">
              <button
                className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-utility-muted transition-colors text-left"
                onClick={() => handleExportAs('postman')}
              >
                <Download className="w-4 h-4 text-label-muted" />
                <div>
                  <div className="text-[13px] text-label-vivid font-medium">Postman</div>
                  <div className="text-[11px] text-label-muted">Collection v2.1 format</div>
                </div>
              </button>
              <button
                className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-utility-muted transition-colors text-left"
                onClick={() => handleExportAs('bruno')}
              >
                <Download className="w-4 h-4 text-label-muted" />
                <div>
                  <div className="text-[13px] text-label-vivid font-medium">Bruno</div>
                  <div className="text-[11px] text-label-muted">Bruno collection format</div>
                </div>
              </button>
              <button
                className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-utility-muted transition-colors text-left"
                onClick={() => handleExportAs('usb')}
              >
                <Download className="w-4 h-4 text-label-muted" />
                <div>
                  <div className="text-[13px] text-label-vivid font-medium">USB API Client</div>
                  <div className="text-[11px] text-label-muted">Native USBX format</div>
                </div>
              </button>
            </div>
            <button
              className="mt-3 w-full text-center text-[12px] text-label-muted hover:text-label-mid py-1.5"
              onClick={() => setExportPickerCollectionId(null)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
