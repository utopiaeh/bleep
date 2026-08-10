import { browser } from 'wxt/browser';
import { DATA_TYPES, type DataTypeId } from './data-types';

/** browsingData keys that are meaningful per-origin (not history/downloads/formData). */
const SITE_SCOPED_KEYS: DataTypeId[] = [
  'cache',
  'cacheStorage',
  'cookies',
  'indexedDB',
  'localStorage',
  'serviceWorkers',
];

function toRemovalOptions(ids: DataTypeId[], supported: Set<string>) {
  const options: Record<string, boolean> = {};
  for (const id of ids) {
    const def = DATA_TYPES.find((d) => d.id === id);
    if (def && supported.has(def.browsingDataKey)) options[def.browsingDataKey] = true;
  }
  return options;
}

/** Feature-detect which browsingData keys this browser actually supports. */
export async function getSupportedKeys(): Promise<Set<string>> {
  const settings = await browser.browsingData.settings();
  return new Set(Object.keys(settings.dataToRemove));
}

export async function clearGlobal(ids: DataTypeId[]): Promise<void> {
  const supported = await getSupportedKeys();
  const dataToRemove = toRemovalOptions(ids, supported);
  if (Object.keys(dataToRemove).length === 0) return;
  await browser.browsingData.remove({ since: 0 }, dataToRemove);
}

export function siteScopedIds(ids: DataTypeId[]): DataTypeId[] {
  return ids.filter((id) => SITE_SCOPED_KEYS.includes(id));
}

/** Chrome/Chromium: browsingData supports origin-scoped removal directly. */
export async function clearSiteViaBrowsingData(origin: string, ids: DataTypeId[]): Promise<void> {
  const supported = await getSupportedKeys();
  const dataToRemove = toRemovalOptions(siteScopedIds(ids), supported);
  if (Object.keys(dataToRemove).length === 0) return;
  await browser.browsingData.remove({ since: 0, origins: [origin] }, dataToRemove);
}

/** Firefox: no origin-scoped browsingData, fall back to content-script injection on an open tab. */
export async function clearSiteViaContentScript(tabId: number, ids: DataTypeId[]): Promise<void> {
  await browser.scripting.executeScript({
    target: { tabId },
    files: ['/content-scripts/content.js'],
  });
  await browser.tabs.sendMessage(tabId, {
    type: 'clear-site-storage',
    ids: siteScopedIds(ids),
  });
}

export async function requestOriginPermission(origin: string): Promise<boolean> {
  return browser.permissions.request({ origins: [`${origin}/*`] });
}
