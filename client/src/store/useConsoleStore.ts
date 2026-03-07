import { create } from 'zustand';

export interface ConsoleLogEntry {
  id: string;
  timestamp: number;
  method: string;
  url: string;
  status?: number;
  statusText?: string;
  duration?: number;
  requestHeaders: Record<string, string>;
  responseHeaders: Record<string, string>;
  requestBody?: string;
  responseBody?: string;
  error?: string;
  redirects?: string[];
  timing?: {
    dns: number;
    connect: number;
    tls: number;
    ttfb: number;
    download: number;
    total: number;
  };
}

interface ConsoleState {
  logs: ConsoleLogEntry[];
  addLog: (entry: ConsoleLogEntry) => void;
  clearLogs: () => void;
}

export const useConsoleStore = create<ConsoleState>((set) => ({
  logs: [],
  addLog: (entry) => set((s) => ({ logs: [entry, ...s.logs].slice(0, 200) })),
  clearLogs: () => set({ logs: [] }),
}));
