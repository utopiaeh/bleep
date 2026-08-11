import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { siteScopedIds } from '../utils/clearing';
import type { DataTypeId } from '../utils/data-types';
import { browserLocalStorage } from '../utils/storage-adapter';

export type ScopeMode = 'global' | 'site';
export type Theme = 'system' | 'light' | 'dark';

const DEFAULTS = {
  selectedTypes: ['cacheStorage', 'cache', 'indexedDB', 'localStorage', 'sessionStorage'] as DataTypeId[],
  scopeMode: 'site' as ScopeMode,
  autoReloadAfterClear: true,
  theme: 'system' as Theme,
};

interface SettingsState {
  selectedTypes: DataTypeId[];
  scopeMode: ScopeMode;
  autoReloadAfterClear: boolean;
  theme: Theme;
  toggleType: (id: DataTypeId) => void;
  setScopeMode: (mode: ScopeMode) => void;
  setAutoReloadAfterClear: (value: boolean) => void;
  setTheme: (theme: Theme) => void;
  resetSettings: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      ...DEFAULTS,
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
      setTheme: (theme) => set({ theme }),
      resetSettings: () => set(DEFAULTS),
    }),
    {
      name: 'cache-cleaner-settings',
      storage: createJSONStorage(() => browserLocalStorage),
    },
  ),
);
