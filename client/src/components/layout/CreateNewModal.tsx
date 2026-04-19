import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { Modal, ModalContent, ModalHeader, ModalTitle } from '@/components/ui/modal';
import { Typography } from '@/components/ui/typography';
import { Globe, FolderOpen, Braces, FileText, FlaskConical } from 'lucide-react';

interface CreateNewModalProps {
  open: boolean;
  onClose: () => void;
  onSwitchToWebSocket?: () => void;
}

interface BuildingBlock {
  id: string;
  icon: React.ReactNode;
  label: string;
  description: string;
  color: string;
}

const BUILDING_BLOCKS: BuildingBlock[] = [
  {
    id: 'http',
    icon: <Globe className="w-5 h-5" />,
    label: 'HTTP Request',
    description: 'Create a basic HTTP request',
    color: 'text-status-success-mid',
  },
  {
    id: 'collection',
    icon: <FolderOpen className="w-5 h-5" />,
    label: 'Collection',
    description: 'Save your requests for reuse and sharing',
    color: 'text-status-caution-mid',
  },
  {
    id: 'environment',
    icon: <Braces className="w-5 h-5" />,
    label: 'Environment',
    description: 'Store values you frequently use in an environment',
    color: 'text-status-info-mid',
  },
];

const ADVANCED_BLOCKS: BuildingBlock[] = [
  {
    id: 'template',
    icon: <FileText className="w-5 h-5" />,
    label: 'From Template',
    description: 'Start from a pre-built API request template',
    color: 'text-label-mid',
  },
  {
    id: 'loadtest',
    icon: <FlaskConical className="w-5 h-5" />,
    label: 'Load Test',
    description: 'Run data-driven load tests against your API',
    color: 'text-status-danger-mid',
  },
];

export function CreateNewModal({ open, onClose, onSwitchToWebSocket }: CreateNewModalProps) {
  const addTab = useStore(s => s.addTab);
  const addCollection = useStore(s => s.addCollection);
  const addEnvironment = useStore(s => s.addEnvironment);
  const setSidebarSection = useStore(s => s.setSidebarSection);

  const [showNameInput, setShowNameInput] = useState<'collection' | 'environment' | null>(null);
  const [nameValue, setNameValue] = useState('');

  const handleClick = (id: string) => {
    switch (id) {
      case 'http':
        addTab();
        onClose();
        break;
      case 'collection':
        setShowNameInput('collection');
        setNameValue('');
        break;
      case 'environment':
        setShowNameInput('environment');
        setNameValue('');
        break;
      case 'template':
        setSidebarSection('templates');
        onClose();
        break;
      case 'loadtest':
        addTab();
        onClose();
        break;
    }
  };

  const handleNameSubmit = () => {
    if (!nameValue.trim()) return;
    if (showNameInput === 'collection') {
      addCollection(nameValue.trim());
      setSidebarSection('collections');
    } else if (showNameInput === 'environment') {
      addEnvironment(nameValue.trim());
      setSidebarSection('environments');
    }
    setShowNameInput(null);
    setNameValue('');
    onClose();
  };

  const handleClose = () => {
    setShowNameInput(null);
    setNameValue('');
    onClose();
  };

  return (
    <Modal open={open} onOpenChange={handleClose}>
      <ModalContent className="max-w-[560px]">
        <ModalHeader>
          <ModalTitle>Create New</ModalTitle>
        </ModalHeader>

        {showNameInput ? (
          <div className="flex flex-col gap-3 py-2">
            <Typography variant="body-small" className="text-label-mid">
              {showNameInput === 'collection' ? 'Collection' : 'Environment'} Name
            </Typography>
            <input
              autoFocus
              value={nameValue}
              onChange={e => setNameValue(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleNameSubmit()}
              placeholder={showNameInput === 'collection' ? 'My Collection' : 'My Environment'}
              className="h-9 px-3 text-[14px] bg-transparent border border-utility-subdued rounded text-label-vivid placeholder:text-label-muted focus:outline-none focus:border-standard-subdued"
            />
            <div className="flex items-center gap-2 justify-end mt-1">
              <button
                onClick={() => setShowNameInput(null)}
                className="px-3 py-1.5 text-[13px] text-label-muted hover:text-label-mid transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleNameSubmit}
                disabled={!nameValue.trim()}
                className="px-4 py-1.5 text-[13px] bg-standard-subdued text-label-white rounded hover:bg-standard-mid transition-colors disabled:opacity-50"
              >
                Create
              </button>
            </div>
          </div>
        ) : (
          <>
            <div>
              <Typography variant="caption" className="text-label-muted uppercase tracking-wider font-medium mb-3 block">
                Building Blocks
              </Typography>
              <div className="grid grid-cols-2 gap-2">
                {BUILDING_BLOCKS.map(block => (
                  <button
                    key={block.id}
                    onClick={() => handleClick(block.id)}
                    className="flex items-start gap-3 p-3 rounded-lg border border-utility-subdued hover:border-utility-mid hover:bg-surface-alternate-muted transition-colors text-left group"
                  >
                    <div className={`mt-0.5 ${block.color}`}>
                      {block.icon}
                    </div>
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="text-[13px] font-medium text-label-vivid group-hover:text-standard-subdued transition-colors">
                        {block.label}
                      </span>
                      <span className="text-[11px] text-label-muted leading-snug">
                        {block.description}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-2">
              <Typography variant="caption" className="text-label-muted uppercase tracking-wider font-medium mb-3 block">
                Advanced
              </Typography>
              <div className="grid grid-cols-2 gap-2">
                {ADVANCED_BLOCKS.map(block => (
                  <button
                    key={block.id}
                    onClick={() => handleClick(block.id)}
                    className="flex items-start gap-3 p-3 rounded-lg border border-utility-subdued hover:border-utility-mid hover:bg-surface-alternate-muted transition-colors text-left group"
                  >
                    <div className={`mt-0.5 ${block.color}`}>
                      {block.icon}
                    </div>
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="text-[13px] font-medium text-label-vivid group-hover:text-standard-subdued transition-colors">
                        {block.label}
                      </span>
                      <span className="text-[11px] text-label-muted leading-snug">
                        {block.description}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
