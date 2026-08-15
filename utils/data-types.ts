import { isGeckoBased } from './browser-info';

export type DataTypeId =
  | 'cache'
  | 'cacheStorage'
  | 'cookies'
  | 'indexedDB'
  | 'localStorage'
  | 'sessionStorage'
  | 'serviceWorkers'
  | 'downloads'
  | 'formData'
  | 'history';

export interface DataTypeDef {
  id: DataTypeId;
  browsingDataKey: string;
  quick: boolean;
  siteScoped: boolean;
}

export const DATA_TYPES: DataTypeDef[] = [
  { id: 'cacheStorage', browsingDataKey: 'cacheStorage', quick: true, siteScoped: true },
  { id: 'cache', browsingDataKey: 'cache', quick: true, siteScoped: true },
  { id: 'indexedDB', browsingDataKey: 'indexedDB', quick: true, siteScoped: true },
  { id: 'localStorage', browsingDataKey: 'localStorage', quick: true, siteScoped: true },
  { id: 'sessionStorage', browsingDataKey: 'localStorage', quick: true, siteScoped: true },
  { id: 'cookies', browsingDataKey: 'cookies', quick: true, siteScoped: true },
  { id: 'serviceWorkers', browsingDataKey: 'serviceWorkers', quick: true, siteScoped: true },
  { id: 'history', browsingDataKey: 'history', quick: false, siteScoped: false },
  { id: 'downloads', browsingDataKey: 'downloads', quick: false, siteScoped: false },
  { id: 'formData', browsingDataKey: 'formData', quick: false, siteScoped: false },
];

/** Types actually usable for a per-site clear on the current browser — excludes
 * HTTP Cache on Firefox, which has no per-site clearing API at all (see
 * clearInMainWorld in utils/clearing.ts). */
export function siteScopedDataTypes(): DataTypeDef[] {
  return DATA_TYPES.filter((type) => type.siteScoped && !(type.id === 'cache' && isGeckoBased()));
}
