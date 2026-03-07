import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';

export interface Monitor {
  id: string;
  name: string;
  collectionId: string;
  intervalMinutes: number;
  enabled: boolean;
  lastRun?: number;
  lastStatus?: 'success' | 'failure' | 'running';
  lastResults?: { total: number; passed: number; failed: number };
  createdAt: number;
}

interface MonitorState {
  monitors: Monitor[];
  addMonitor: (monitor: Omit<Monitor, 'id' | 'createdAt'>) => void;
  updateMonitor: (id: string, updates: Partial<Monitor>) => void;
  deleteMonitor: (id: string) => void;
  toggleMonitor: (id: string) => void;
}

export const useMonitorStore = create<MonitorState>()(
  persist(
    (set) => ({
      monitors: [],
      addMonitor: (monitor) => set((s) => ({
        monitors: [...s.monitors, { ...monitor, id: uuidv4(), createdAt: Date.now() }],
      })),
      updateMonitor: (id, updates) => set((s) => ({
        monitors: s.monitors.map(m => m.id === id ? { ...m, ...updates } : m),
      })),
      deleteMonitor: (id) => set((s) => ({
        monitors: s.monitors.filter(m => m.id !== id),
      })),
      toggleMonitor: (id) => set((s) => ({
        monitors: s.monitors.map(m => m.id === id ? { ...m, enabled: !m.enabled } : m),
      })),
    }),
    { name: 'usbx-monitors' }
  )
);
