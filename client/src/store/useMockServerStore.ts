import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';

export interface MockEndpoint {
  id: string;
  method: string;
  path: string;
  statusCode: number;
  responseHeaders: Record<string, string>;
  responseBody: string;
  delay: number;
  enabled: boolean;
  description?: string;
}

interface MockServerState {
  endpoints: MockEndpoint[];
  isRunning: boolean;
  port: number;
  addEndpoint: (endpoint: Omit<MockEndpoint, 'id'>) => void;
  updateEndpoint: (id: string, updates: Partial<MockEndpoint>) => void;
  deleteEndpoint: (id: string) => void;
  toggleEndpoint: (id: string) => void;
  setRunning: (running: boolean) => void;
  clearEndpoints: () => void;
}

export const useMockServerStore = create<MockServerState>()(
  persist(
    (set) => ({
      endpoints: [],
      isRunning: false,
      port: 3001,
      addEndpoint: (endpoint) => set((s) => ({
        endpoints: [...s.endpoints, { ...endpoint, id: uuidv4() }],
      })),
      updateEndpoint: (id, updates) => set((s) => ({
        endpoints: s.endpoints.map(e => e.id === id ? { ...e, ...updates } : e),
      })),
      deleteEndpoint: (id) => set((s) => ({
        endpoints: s.endpoints.filter(e => e.id !== id),
      })),
      toggleEndpoint: (id) => set((s) => ({
        endpoints: s.endpoints.map(e => e.id === id ? { ...e, enabled: !e.enabled } : e),
      })),
      setRunning: (running) => set({ isRunning: running }),
      clearEndpoints: () => set({ endpoints: [] }),
    }),
    { name: 'usbx-mock-server' }
  )
);
