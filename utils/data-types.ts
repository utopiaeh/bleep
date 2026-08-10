export type DataTypeId =
  | 'cache'
  | 'cacheStorage'
  | 'cookies'
  | 'indexedDB'
  | 'localStorage'
  | 'serviceWorkers'
  | 'downloads'
  | 'formData'
  | 'history';

export interface DataTypeDef {
  id: DataTypeId;
  label: string;
  /** browser.browsingData.DataTypeSet key this maps to for global clearing */
  browsingDataKey: string;
  /** shown in the popup's quick-clear list */
  quick: boolean;
}

export const DATA_TYPES: DataTypeDef[] = [
  { id: 'cacheStorage', label: 'Cache Storage', browsingDataKey: 'cacheStorage', quick: true },
  { id: 'cache', label: 'HTTP Cache', browsingDataKey: 'cache', quick: true },
  { id: 'indexedDB', label: 'IndexedDB', browsingDataKey: 'indexedDB', quick: true },
  { id: 'localStorage', label: 'Local & Session Storage', browsingDataKey: 'localStorage', quick: true },
  { id: 'cookies', label: 'Cookies', browsingDataKey: 'cookies', quick: false },
  { id: 'serviceWorkers', label: 'Service Workers', browsingDataKey: 'serviceWorkers', quick: false },
  { id: 'history', label: 'History', browsingDataKey: 'history', quick: false },
  { id: 'downloads', label: 'Download History', browsingDataKey: 'downloads', quick: false },
  { id: 'formData', label: 'Form Data', browsingDataKey: 'formData', quick: false },
];
