import { AlertTriangle } from 'lucide-react';
import { Modal, ModalContent, ModalHeader, ModalTitle, ModalFooter } from '@/components/ui/modal';
import { Typography } from '@/components/ui/typography';

interface ApprovalDialogProps {
  open: boolean;
  onClose: () => void;
  onApprove: () => void;
  ruleName: string;
  method: string;
  url: string;
}

export function ApprovalDialog({ open, onClose, onApprove, ruleName, method, url }: ApprovalDialogProps) {
  return (
    <Modal open={open} onOpenChange={onClose}>
      <ModalContent>
        <ModalHeader>
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-amber-500" />
            <ModalTitle>Request Requires Approval</ModalTitle>
          </div>
        </ModalHeader>
        <div className="space-y-4">
          <Typography variant="body-medium">
            This request matched the rule: <span className="font-medium text-label-vivid">{ruleName}</span>
          </Typography>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-md bg-standard-subdued px-2 py-1 text-xs font-medium text-primary-foreground uppercase">
              {method}
            </span>
            <Typography variant="body-small" className="truncate">{url}</Typography>
          </div>
        </div>
        <ModalFooter
          buttonCount={2}
          secondaryLabel="Cancel"
          primaryLabel="Approve & Send"
          onSecondaryClick={onClose}
          onPrimaryClick={onApprove}
        />
      </ModalContent>
    </Modal>
  );
}
