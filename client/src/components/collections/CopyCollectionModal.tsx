import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { Button } from '@/components/ui/button';
import { Typography } from '@/components/ui/typography';
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription } from '@/components/ui/modal';
import { Copy } from 'lucide-react';

interface CopyCollectionModalProps {
  open: boolean;
  onClose: () => void;
  preselectedCollectionId?: string;
}

export function CopyCollectionModal({ open, onClose, preselectedCollectionId }: CopyCollectionModalProps) {
  const collections = useStore(s => s.collections);
  const copyCollection = useStore(s => s.copyCollection);

  const [collectionId, setCollectionId] = useState(preselectedCollectionId || '');
  const [copyName, setCopyName] = useState('');
  const [copying, setCopying] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSelectCollection = (id: string) => {
    setCollectionId(id);
    const col = collections.find(c => c.id === id);
    setCopyName(col ? `${col.name} (Copy)` : '');
  };

  const handleCopy = async () => {
    if (!collectionId) return;
    setCopying(true);
    try {
      copyCollection(collectionId, undefined, copyName.trim() || undefined);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setCollectionId('');
        setCopyName('');
        onClose();
      }, 1500);
    } finally {
      setCopying(false);
    }
  };

  return (
    <Modal open={open} onOpenChange={(o) => { if (!o) { onClose(); setCollectionId(preselectedCollectionId || ''); setCopyName(''); setSuccess(false); } }}>
      <ModalContent className="max-w-[480px]">
        <ModalHeader>
          <ModalTitle>Copy Collection</ModalTitle>
          <ModalDescription>Duplicate a collection</ModalDescription>
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

              <Button
                variant="primary"
                size="small"
                onClick={handleCopy}
                disabled={!collectionId || copying}
                className="w-full"
              >
                <Copy className="w-4 h-4" />
                {copying ? 'Copying...' : 'Copy Collection'}
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
