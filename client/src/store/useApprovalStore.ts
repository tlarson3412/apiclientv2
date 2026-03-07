import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ApprovalRule {
  id: string;
  name: string;
  type: 'method' | 'url-pattern' | 'header';
  value: string;
  enabled: boolean;
}

interface ApprovalState {
  rules: ApprovalRule[];
  approvalEnabled: boolean;
  addRule: (rule: Omit<ApprovalRule, 'id'>) => void;
  updateRule: (id: string, updates: Partial<ApprovalRule>) => void;
  deleteRule: (id: string) => void;
  toggleRule: (id: string) => void;
  setApprovalEnabled: (enabled: boolean) => void;
  checkRequiresApproval: (method: string, url: string, headers: Record<string, string>) => ApprovalRule | null;
}

export const useApprovalStore = create<ApprovalState>()(
  persist(
    (set, get) => ({
      rules: [
        { id: '1', name: 'Block DELETE requests', type: 'method', value: 'DELETE', enabled: true },
        { id: '2', name: 'Block production URLs', type: 'url-pattern', value: 'prod', enabled: false },
      ],
      approvalEnabled: false,
      addRule: (rule) => {
        const id = Math.random().toString(36).substring(2, 9);
        set((s) => ({ rules: [...s.rules, { ...rule, id }] }));
      },
      updateRule: (id, updates) => set((s) => ({
        rules: s.rules.map(r => r.id === id ? { ...r, ...updates } : r),
      })),
      deleteRule: (id) => set((s) => ({
        rules: s.rules.filter(r => r.id !== id),
      })),
      toggleRule: (id) => set((s) => ({
        rules: s.rules.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r),
      })),
      setApprovalEnabled: (enabled) => set({ approvalEnabled: enabled }),
      checkRequiresApproval: (method, url, headers) => {
        const state = get();
        if (!state.approvalEnabled) return null;
        for (const rule of state.rules) {
          if (!rule.enabled) continue;
          if (rule.type === 'method' && method.toUpperCase() === rule.value.toUpperCase()) return rule;
          if (rule.type === 'url-pattern' && url.toLowerCase().includes(rule.value.toLowerCase())) return rule;
          if (rule.type === 'header') {
            const [key, val] = rule.value.split(':').map(s => s.trim());
            if (headers[key] === val) return rule;
          }
        }
        return null;
      },
    }),
    { name: 'usbx-approval-rules' }
  )
);
