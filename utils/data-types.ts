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
  label: string;
  browsingDataKey: string;
  quick: boolean;
  siteScoped: boolean;
}

export const DATA_TYPES: DataTypeDef[] = [
  {
    id: 'cacheStorage',
    label: 'Cache Storage',
    browsingDataKey: 'cacheStorage',
    quick: true,
    siteScoped: true,
  },
  { id: 'cache', label: 'HTTP Cache', browsingDataKey: 'cache', quick: true, siteScoped: true },
  {
    id: 'indexedDB',
    label: 'IndexedDB',
    browsingDataKey: 'indexedDB',
    quick: true,
    siteScoped: true,
  },
  {
    id: 'localStorage',
    label: 'Local Storage',
    browsingDataKey: 'localStorage',
    quick: true,
    siteScoped: true,
  },
  {
    id: 'sessionStorage',
    label: 'Session Storage',
    browsingDataKey: 'localStorage',
    quick: true,
    siteScoped: true,
  },
  { id: 'cookies', label: 'Cookies', browsingDataKey: 'cookies', quick: true, siteScoped: true },
  {
    id: 'serviceWorkers',
    label: 'Service Workers',
    browsingDataKey: 'serviceWorkers',
    quick: true,
    siteScoped: true,
  },
  { id: 'history', label: 'History', browsingDataKey: 'history', quick: false, siteScoped: false },
  {
    id: 'downloads',
    label: 'Download History',
    browsingDataKey: 'downloads',
    quick: false,
    siteScoped: false,
  },
  {
    id: 'formData',
    label: 'Form Data',
    browsingDataKey: 'formData',
    quick: false,
    siteScoped: false,
  },
];
