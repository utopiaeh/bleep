import type { DataTypeId } from './data-types';
import type { Language } from './i18n';

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
  protectedSites: '',
  theme: 'system' as Theme,
  language: 'auto' as Language,
};
