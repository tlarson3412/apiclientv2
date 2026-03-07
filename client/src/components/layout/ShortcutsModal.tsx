import { Modal, ModalContent, ModalHeader, ModalTitle, ModalDescription } from '@/components/ui/modal';
import { Typography } from '@/components/ui/typography';
import { cn } from '@/lib/utils';

interface ShortcutsModalProps {
  open: boolean;
  onClose: () => void;
}

const SHORTCUTS = [
  { key: 'Ctrl+Enter', macKey: 'Cmd+Enter', description: 'Send the current request' },
  { key: 'Ctrl+N', macKey: 'Cmd+N', description: 'Open a new tab' },
  { key: 'Ctrl+W', macKey: 'Cmd+W', description: 'Close the active tab' },
  { key: 'Ctrl+Shift+S', macKey: 'Cmd+Shift+S', description: 'Save request to collection' },
  { key: 'Ctrl+/', macKey: 'Cmd+/', description: 'Toggle shortcuts help' },
];

export function ShortcutsModal({ open, onClose }: ShortcutsModalProps) {
  const isMac = typeof window !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform);

  return (
    <Modal open={open} onOpenChange={onClose}>
      <ModalContent>
        <ModalHeader>
          <ModalTitle>Keyboard Shortcuts</ModalTitle>
          <ModalDescription>
            Use these keyboard shortcuts to work faster in the API Client
          </ModalDescription>
        </ModalHeader>

        <div className="space-y-3 my-4">
          {SHORTCUTS.map((shortcut, index) => (
            <div key={index} className="flex items-center gap-4">
              <kbd className={cn(
                'px-2 py-1 rounded border border-utility-subdued bg-surface-alternate-muted text-label-vivid text-[12px] font-mono font-medium min-w-[130px] text-center'
              )}>
                {isMac ? shortcut.macKey : shortcut.key}
              </kbd>
              <Typography variant="body-small" className="text-label-mid">
                {shortcut.description}
              </Typography>
            </div>
          ))}
        </div>
      </ModalContent>
    </Modal>
  );
}
