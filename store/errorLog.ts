import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { browserLocalStorage } from '../utils/storage-adapter';

export interface ErrorLogEntry {
  id: string;
  timestamp: number;
  message: string;
}

const MAX_ERROR_LOG_ENTRIES = 30;

interface ErrorLogState {
  entries: ErrorLogEntry[];
  logError: (message: string) => void;
  clearErrors: () => void;
}

export const useErrorLogStore = create<ErrorLogState>()(
  persist(
    (set, get) => ({
      entries: [],
      logError: (message) => {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        set({ entries: [{ id, timestamp: Date.now(), message }, ...get().entries].slice(0, MAX_ERROR_LOG_ENTRIES) });
      },
      clearErrors: () => set({ entries: [] }),
    }),
    {
      name: 'cache-cleaner-error-log',
      storage: createJSONStorage(() => browserLocalStorage),
      version: 1,
      migrate: (persisted) => persisted as ErrorLogState,
      merge: (persisted, current) => ({
        ...current,
        entries: Array.isArray((persisted as Partial<ErrorLogState> | null)?.entries)
          ? (persisted as ErrorLogState).entries
          : current.entries,
      }),
    },
  ),
);
