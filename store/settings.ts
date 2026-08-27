import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { DataTypeId } from '../utils/data-types';
import type { Language } from '../utils/i18n';
import { DEFAULTS, type Theme } from '../utils/settings-defaults';
import { sanitizeSettings } from '../utils/settings-transfer';
import { browserSyncStorage } from '../utils/storage-adapter';

export type { Theme };
export { DEFAULTS };

interface SettingsState {
  selectedTypesGlobal: DataTypeId[];
  selectedTypesSite: DataTypeId[];
  autoReloadAfterClear: boolean;
  linkedOrigins: string;
  useOriginMappings: boolean;
  protectedSites: string;
  theme: Theme;
  language: Language;
  toggleTypeGlobal: (id: DataTypeId) => void;
  toggleTypeSite: (id: DataTypeId) => void;
  setAutoReloadAfterClear: (value: boolean) => void;
  setLinkedOrigins: (value: string) => void;
  setUseOriginMappings: (value: boolean) => void;
  setProtectedSites: (value: string) => void;
  setTheme: (theme: Theme) => void;
  setLanguage: (language: Language) => void;
  resetSettings: () => void;
  importSettings: (data: Partial<typeof DEFAULTS>) => void;
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

export function mergeSettings(persisted: unknown, current: SettingsState): SettingsState {
  return { ...current, ...sanitizeSettings(persisted) };
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
      setProtectedSites: (value) => set({ protectedSites: value }),
      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => set({ language }),
      resetSettings: () => set(DEFAULTS),
      importSettings: (data) => set(data),
    }),
    {
      name: 'cache-cleaner-settings',
      storage: createJSONStorage(() => browserSyncStorage),
      version: 1,
      migrate: (persisted) => persisted as SettingsState,
      merge: mergeSettings,
    },
  ),
);
