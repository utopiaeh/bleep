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

// Device-specific activity, not a preference — kept in local storage rather than the
// synced settings store so it doesn't consume the sync quota or show up on other
// machines as "stuff that happened somewhere else".
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
    },
  ),
);

export function recordClear(hostname: string, types: DataTypeId[], linkedTargets: string[] = []): void {
  useClearLogStore.getState().logClear({ timestamp: Date.now(), hostname, types, linkedTargets });
}
