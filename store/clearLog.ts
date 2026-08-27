import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { DataTypeId } from '../utils/data-types';
import { browserLocalStorage } from '../utils/storage-adapter';

export interface ClearLogEntry {
  id: string;
  timestamp: number;
  hostname: string;
  types: DataTypeId[];
  linkedTargets: string[];
}

const MAX_LOG_ENTRIES = 20;

interface ClearLogState {
  entries: ClearLogEntry[];
  logClear: (entry: Omit<ClearLogEntry, 'id'>) => void;
  clearLog: () => void;
}

export const useClearLogStore = create<ClearLogState>()(
  persist(
    (set, get) => ({
      entries: [],
      logClear: (entry) => {
        const id = `${entry.timestamp}-${Math.random().toString(36).slice(2)}`;
        set({ entries: [{ ...entry, id }, ...get().entries].slice(0, MAX_LOG_ENTRIES) });
      },
      clearLog: () => set({ entries: [] }),
    }),
    {
      name: 'cache-cleaner-clear-log',
      storage: createJSONStorage(() => browserLocalStorage),
      version: 1,
      migrate: (persisted) => persisted as ClearLogState,
      merge: (persisted, current) => ({
        ...current,
        entries: Array.isArray((persisted as Partial<ClearLogState> | null)?.entries)
          ? (persisted as ClearLogState).entries
          : current.entries,
      }),
    },
  ),
);

export function recordClear(hostname: string, types: DataTypeId[], linkedTargets: string[] = []): void {
  useClearLogStore.getState().logClear({ timestamp: Date.now(), hostname, types, linkedTargets });
}
