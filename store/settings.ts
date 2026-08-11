import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { siteScopedIds } from '../utils/clearing';
import type { DataTypeId } from '../utils/data-types';
import { browserLocalStorage } from '../utils/storage-adapter';

export type ScopeMode = 'global' | 'site';

interface SettingsState {
  selectedTypes: DataTypeId[];
  scopeMode: ScopeMode;
  autoReloadAfterClear: boolean;
  toggleType: (id: DataTypeId) => void;
  setScopeMode: (mode: ScopeMode) => void;
  setAutoReloadAfterClear: (value: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      selectedTypes: ['cacheStorage', 'cache', 'indexedDB', 'localStorage', 'sessionStorage'],
      scopeMode: 'site',
      autoReloadAfterClear: false,
      toggleType: (id) => {
        const current = get().selectedTypes;
        set({
          selectedTypes: current.includes(id) ? current.filter((t) => t !== id) : [...current, id],
        });
      },
      setScopeMode: (mode) =>
        set({
          scopeMode: mode,
          selectedTypes: mode === 'site' ? siteScopedIds(get().selectedTypes) : get().selectedTypes,
        }),
      setAutoReloadAfterClear: (value) => set({ autoReloadAfterClear: value }),
    }),
    {
      name: 'cache-cleaner-settings',
      storage: createJSONStorage(() => browserLocalStorage),
    },
  ),
);
