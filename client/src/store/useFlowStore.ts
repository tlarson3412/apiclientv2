import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';

export interface FlowStep {
  id: string;
  requestId: string;
  extractVariable?: string;
  extractPath?: string;
  injectInto?: string;
  order: number;
}

export interface Flow {
  id: string;
  name: string;
  steps: FlowStep[];
  createdAt: number;
}

interface FlowState {
  flows: Flow[];
  addFlow: (name: string) => void;
  deleteFlow: (id: string) => void;
  addStep: (flowId: string, requestId: string) => void;
  removeStep: (flowId: string, stepId: string) => void;
  updateStep: (flowId: string, stepId: string, updates: Partial<FlowStep>) => void;
  reorderSteps: (flowId: string, steps: FlowStep[]) => void;
}

export const useFlowStore = create<FlowState>()(
  persist(
    (set, get) => ({
      flows: [],
      addFlow: (name) => set((s) => ({
        flows: [...s.flows, { id: uuidv4(), name, steps: [], createdAt: Date.now() }],
      })),
      deleteFlow: (id) => set((s) => ({
        flows: s.flows.filter(f => f.id !== id),
      })),
      addStep: (flowId, requestId) => set((s) => ({
        flows: s.flows.map(f => f.id === flowId ? {
          ...f,
          steps: [...f.steps, { id: uuidv4(), requestId, order: f.steps.length }],
        } : f),
      })),
      removeStep: (flowId, stepId) => set((s) => ({
        flows: s.flows.map(f => f.id === flowId ? {
          ...f,
          steps: f.steps.filter(st => st.id !== stepId).map((st, i) => ({ ...st, order: i })),
        } : f),
      })),
      updateStep: (flowId, stepId, updates) => set((s) => ({
        flows: s.flows.map(f => f.id === flowId ? {
          ...f,
          steps: f.steps.map(st => st.id === stepId ? { ...st, ...updates } : st),
        } : f),
      })),
      reorderSteps: (flowId, steps) => set((s) => ({
        flows: s.flows.map(f => f.id === flowId ? { ...f, steps } : f),
      })),
    }),
    { name: 'usbx-flows' }
  )
);
