import { useState, useMemo } from 'react';
import { useStore } from '@/store/useStore';
import { useWorkspace } from '@/hooks/use-workspace';
import { Button } from '@/components/ui/button';
import { Typography } from '@/components/ui/typography';
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription } from '@/components/ui/modal';
import { Copy, ArrowRight } from 'lucide-react';

interface CopyCollectionModalProps {
  open: boolean;
  onClose: () => void;
  preselectedCollectionId?: string;
}

export function CopyCollectionModal({ open, onClose, preselectedCollectionId }: CopyCollectionModalProps) {
  const collections = useStore(s => s.collections);
  const copyCollection = useStore(s => s.copyCollection);
  const { workspaces, activeWorkspace } = useWorkspace();

  const [collectionId, setCollectionId] = useState(preselectedCollectionId || '');
  const [copyName, setCopyName] = useState('');
  const [targetWorkspaceId, setTargetWorkspaceId] = useState<number | ''>('');
  const [copying, setCopying] = useState(false);
  const [success, setSuccess] = useState(false);

  const editableWorkspaces = useMemo(() => {
    return workspaces.filter(w => w.role === 'owner' || w.role === 'editor');
  }, [workspaces]);

  const otherEditableWorkspaces = useMemo(() => {
    return editableWorkspaces.filter(w => w.id !== activeWorkspace?.id);
  }, [editableWorkspaces, activeWorkspace]);

  const handleSelectCollection = (id: string) => {
    setCollectionId(id);
    const col = collections.find(c => c.id === id);
    setCopyName(col?.name || '');
  };

  const handleCopy = async () => {
    if (!collectionId) return;
    setCopying(true);
    try {
      const target = targetWorkspaceId || undefined;
      copyCollection(collectionId, target as number | undefined, copyName.trim() || undefined);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setCollectionId('');
        setCopyName('');
        setTargetWorkspaceId('');
        onClose();
      }, 1500);
    } finally {
      setCopying(false);
    }
  };

  const selectedTargetWs = targetWorkspaceId
    ? workspaces.find(w => w.id === targetWorkspaceId)
    : activeWorkspace;

  const isCrossWorkspace = targetWorkspaceId && targetWorkspaceId !== activeWorkspace?.id;

  return (
    <Modal open={open} onOpenChange={(o) => { if (!o) { onClose(); setCollectionId(preselectedCollectionId || ''); setCopyName(''); setTargetWorkspaceId(''); setSuccess(false); } }}>
      <ModalContent className="max-w-[480px]">
        <ModalHeader>
          <ModalTitle>Copy Collection</ModalTitle>
          <ModalDescription>Copy a collection to this or another workspace</ModalDescription>
        </ModalHeader>

        <div className="space-y-4 p-1">
          <div>
            <label className="text-xs text-label-muted block mb-1">Collection</label>
            <select
              value={collectionId}
              onChange={(e) => handleSelectCollection(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-surface border border-utility-subdued rounded-md text-label-vivid focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">Select collection</option>
              {collections.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {collectionId && (
            <>
              <div>
                <label className="text-xs text-label-muted block mb-1">Name</label>
                <input
                  type="text"
                  value={copyName}
                  onChange={(e) => setCopyName(e.target.value)}
                  placeholder="Collection name"
                  className="w-full px-3 py-2 text-sm bg-surface border border-utility-subdued rounded-md text-label-vivid focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="text-xs text-label-muted block mb-1">Copy to workspace</label>
                <select
                  value={targetWorkspaceId}
                  onChange={(e) => setTargetWorkspaceId(e.target.value ? parseInt(e.target.value) : '')}
                  className="w-full px-3 py-2 text-sm bg-surface border border-utility-subdued rounded-md text-label-vivid focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">Current workspace ({activeWorkspace?.name})</option>
                  {otherEditableWorkspaces.map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
                {isCrossWorkspace && (
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <ArrowRight className="w-3 h-3 text-primary" />
                    <span className="text-xs text-primary">
                      Will copy to "{selectedTargetWs?.name}"
                    </span>
                  </div>
                )}
              </div>

              <Button
                variant="primary"
                size="small"
                onClick={handleCopy}
                disabled={!collectionId || copying}
                className="w-full"
              >
                <Copy className="w-4 h-4" />
                {copying ? 'Copying...' : isCrossWorkspace ? 'Copy to Workspace' : 'Copy Collection'}
              </Button>
            </>
          )}

          {success && (
            <Typography variant="body-small" className="text-status-success-mid text-center">
              Collection copied successfully
            </Typography>
          )}
        </div>
      </ModalContent>
    </Modal>
  );
}
