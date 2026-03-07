import { Modal, ModalContent, ModalHeader, ModalTitle } from '@/components/ui/modal';
import { CookieManager } from './CookieManager';

interface CookieModalProps {
  open: boolean;
  onClose: () => void;
}

export function CookieModal({ open, onClose }: CookieModalProps) {
  return (
    <Modal open={open} onOpenChange={onClose}>
      <ModalContent className="max-w-[600px]">
        <ModalHeader>
          <ModalTitle>Cookies</ModalTitle>
        </ModalHeader>
        <div className="max-h-[60vh] overflow-y-auto">
          <CookieManager />
        </div>
      </ModalContent>
    </Modal>
  );
}
