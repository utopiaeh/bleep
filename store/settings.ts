import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { DataTypeId } from '../utils/data-types';
import type { Language } from '../utils/i18n';
import { browserLocalStorage } from '../utils/storage-adapter';

export type Theme = 'system' | 'light' | 'dark';

const DEFAULT_TYPES: DataTypeId[] = ['cacheStorage', 'cache', 'indexedDB', 'localStorage', 'sessionStorage'];

export const DEFAULTS = {
  selectedTypesGlobal: DEFAULT_TYPES,
  selectedTypesSite: DEFAULT_TYPES,
  autoReloadAfterClear: true,
  theme: 'system' as Theme,
  language: 'auto' as Language,
};

interface SettingsState {
  selectedTypesGlobal: DataTypeId[];
  selectedTypesSite: DataTypeId[];
  autoReloadAfterClear: boolean;
  theme: Theme;
  language: Language;
  toggleTypeSite: (id: DataTypeId) => void;
  setSelectedTypesGlobal: (ids: DataTypeId[]) => void;
  setSelectedTypesSite: (ids: DataTypeId[]) => void;
  setAutoReloadAfterClear: (value: boolean) => void;
  setTheme: (theme: Theme) => void;
  setLanguage: (language: Language) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      ...DEFAULTS,
      toggleTypeSite: (id) => {
        const current = get().selectedTypesSite;
        set({
          selectedTypesSite: current.includes(id) ? current.filter((t) => t !== id) : [...current, id],
        });
      },
      setSelectedTypesGlobal: (ids) => set({ selectedTypesGlobal: ids }),
      setSelectedTypesSite: (ids) => set({ selectedTypesSite: ids }),
      setAutoReloadAfterClear: (value) => set({ autoReloadAfterClear: value }),
      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => set({ language }),
    }),
    {
      name: 'cache-cleaner-settings',
      storage: createJSONStorage(() => browserLocalStorage),
    },
  ),
);
