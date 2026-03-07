import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Modal, ModalContent, ModalHeader, ModalTitle } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Typography } from '@/components/ui/typography';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useApprovalStore, type ApprovalRule } from '@/store/useApprovalStore';

interface ApprovalRulesManagerProps {
  open: boolean;
  onClose: () => void;
}

export function ApprovalRulesManager({ open, onClose }: ApprovalRulesManagerProps) {
  const { rules, approvalEnabled, setApprovalEnabled, addRule, toggleRule, deleteRule } = useApprovalStore();
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<ApprovalRule['type']>('method');
  const [newValue, setNewValue] = useState('');

  const handleAddRule = () => {
    if (!newName.trim() || !newValue.trim()) return;
    addRule({ name: newName.trim(), type: newType, value: newValue.trim(), enabled: true });
    setNewName('');
    setNewType('method');
    setNewValue('');
  };

  return (
    <Modal open={open} onOpenChange={onClose}>
      <ModalContent className="max-w-[600px]">
        <ModalHeader>
          <ModalTitle>Approval Rules</ModalTitle>
        </ModalHeader>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          <div className="flex items-center gap-3">
            <Checkbox
              checked={approvalEnabled}
              onCheckedChange={(checked) => setApprovalEnabled(checked === true)}
            />
            <Typography variant="subheading-small">Enable request approval workflow</Typography>
          </div>

          <div className="space-y-2">
            {rules.map((rule) => (
              <div key={rule.id} className="flex items-center gap-3 rounded-md border border-utility-subdued p-3">
                <Checkbox
                  checked={rule.enabled}
                  onCheckedChange={() => toggleRule(rule.id)}
                />
                <div className="flex-1 min-w-0">
                  <Typography variant="subheading-small">{rule.name}</Typography>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="inline-flex items-center rounded-md bg-surface-muted px-2 py-0.5 text-xs font-medium text-label-mid">
                      {rule.type}
                    </span>
                    <Typography variant="caption" className="truncate">{rule.value}</Typography>
                  </div>
                </div>
                <Button variant="text" size="small" onClick={() => deleteRule(rule.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          <div className="border-t border-utility-subdued pt-4 space-y-3">
            <Typography variant="subheading-small">Add Rule</Typography>
            <div className="flex flex-col gap-2">
              <Input
                placeholder="Rule name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
              <div className="flex gap-2">
                <Select value={newType} onValueChange={(v) => setNewType(v as ApprovalRule['type'])}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="method">method</SelectItem>
                    <SelectItem value="url-pattern">url-pattern</SelectItem>
                    <SelectItem value="header">header</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Value"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  className="flex-1"
                />
              </div>
              <Button variant="secondary" size="small" onClick={handleAddRule}>
                Add Rule
              </Button>
            </div>
          </div>
        </div>
      </ModalContent>
    </Modal>
  );
}
