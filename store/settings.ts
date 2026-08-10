import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { DataTypeId } from '../utils/data-types';
import { browserLocalStorage } from '../utils/storage-adapter';

export type ScopeMode = 'global' | 'site';

interface SettingsState {
  selectedTypes: DataTypeId[];
  scopeMode: ScopeMode;
  toggleType: (id: DataTypeId) => void;
  setScopeMode: (mode: ScopeMode) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      selectedTypes: ['cacheStorage', 'cache', 'indexedDB', 'localStorage'],
      scopeMode: 'global',
      toggleType: (id) => {
        const current = get().selectedTypes;
        set({
          selectedTypes: current.includes(id)
            ? current.filter((t) => t !== id)
            : [...current, id],
        });
      },
      setScopeMode: (mode) => set({ scopeMode: mode }),
    }),
    {
      name: 'cache-cleaner-settings',
      storage: createJSONStorage(() => browserLocalStorage),
    },
  ),
);
