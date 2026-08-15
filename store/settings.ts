import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { DataTypeId } from '../utils/data-types';
import type { Language } from '../utils/i18n';
import { browserLocalStorage } from '../utils/storage-adapter';

export type Theme = 'system' | 'light' | 'dark';

const DEFAULT_TYPES: DataTypeId[] = [
  'cacheStorage',
  'cache',
  'indexedDB',
  'localStorage',
  'sessionStorage',
];

export const DEFAULTS = {
  selectedTypesGlobal: [...DEFAULT_TYPES],
  selectedTypesSite: [...DEFAULT_TYPES],
  autoReloadAfterClear: true,
  linkedOrigins: '',
  useOriginMappings: true,
  theme: 'system' as Theme,
  language: 'auto' as Language,
};

interface SettingsState {
  selectedTypesGlobal: DataTypeId[];
  selectedTypesSite: DataTypeId[];
  autoReloadAfterClear: boolean;
  linkedOrigins: string;
  useOriginMappings: boolean;
  theme: Theme;
  language: Language;
  toggleTypeGlobal: (id: DataTypeId) => void;
  toggleTypeSite: (id: DataTypeId) => void;
  setAutoReloadAfterClear: (value: boolean) => void;
  setLinkedOrigins: (value: string) => void;
  setUseOriginMappings: (value: boolean) => void;
  setTheme: (theme: Theme) => void;
  setLanguage: (language: Language) => void;
  resetSettings: () => void;
}

function toggleIn(
  set: (partial: Partial<SettingsState>) => void,
  get: () => SettingsState,
  field: 'selectedTypesGlobal' | 'selectedTypesSite',
  id: DataTypeId,
) {
  const current = get()[field];
  set({ [field]: current.includes(id) ? current.filter((t) => t !== id) : [...current, id] });
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      ...DEFAULTS,
      toggleTypeGlobal: (id) => toggleIn(set, get, 'selectedTypesGlobal', id),
      toggleTypeSite: (id) => toggleIn(set, get, 'selectedTypesSite', id),
      setAutoReloadAfterClear: (value) => set({ autoReloadAfterClear: value }),
      setLinkedOrigins: (value) => set({ linkedOrigins: value }),
      setUseOriginMappings: (value) => set({ useOriginMappings: value }),
      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => set({ language }),
      resetSettings: () => set(DEFAULTS),
    }),
    {
      name: 'cache-cleaner-settings',
      storage: createJSONStorage(() => browserLocalStorage),
    },
  ),
);
