import { browser } from 'wxt/browser';
import { DATA_TYPES, type DataTypeId } from './data-types';

function toRemovalOptions(ids: DataTypeId[], supported: Set<string>) {
  const options: Record<string, boolean> = {};
  for (const id of ids) {
    const def = DATA_TYPES.find((d) => d.id === id);
    if (def && supported.has(def.browsingDataKey)) options[def.browsingDataKey] = true;
  }
  return options;
}

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
  const scoped = new Set(DATA_TYPES.filter((d) => d.siteScoped).map((d) => d.id));
  return ids.filter((id) => scoped.has(id));
}

/** Chrome/Chromium: browsingData's `origins` param scopes removal to one site. On Firefox it do not work*/
export async function clearSiteViaBrowsingData(origin: string, ids: DataTypeId[]): Promise<void> {
  const supported = await getSupportedKeys();
  const dataToRemove = toRemovalOptions(siteScopedIds(ids), supported);
  if (Object.keys(dataToRemove).length === 0) return;
  await browser.browsingData.remove({ since: 0, origins: [origin] }, dataToRemove);
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out after ${ms}ms`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

async function clearInMainWorld(ids: string[]): Promise<{ failed: Record<string, string> }> {
  function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms);
      promise.then(
        (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        (err) => {
          clearTimeout(timer);
          reject(err);
        },
      );
    });
  }

  const handlers: Record<string, () => Promise<void> | void> = {
    async cacheStorage() {
      if (!('caches' in self)) return;
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    },
    async indexedDB() {
      if (!indexedDB.databases) return;
      const dbs = await indexedDB.databases();
      await Promise.all(
        dbs.map((db) =>
          db.name
            ? new Promise((res) => {
                const req = indexedDB.deleteDatabase(db.name!);
                req.onsuccess = req.onerror = req.onblocked = () => res(undefined);
              })
            : Promise.resolve(),
        ),
      );
    },
    localStorage() {
      localStorage.clear();
    },
    sessionStorage() {
      sessionStorage.clear();
    },
    cookies() {
      for (const cookie of document.cookie.split(';')) {
        const name = cookie.split('=')[0]?.trim();
        if (!name) continue;
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`;
      }
    },
    async serviceWorkers() {
      if (!('serviceWorker' in navigator)) return;
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((r) => r.unregister()));
    },
  };

  const results = await Promise.allSettled(
    ids.map(async (id) => {
      await withTimeout(Promise.resolve(handlers[id]?.()), 8000);
      return id;
    }),
  );
  const failed: Record<string, string> = {};
  results.forEach((result, i) => {
    if (result.status === 'rejected') failed[ids[i]!] = String(result.reason);
  });
  return { failed };
}

export async function clearSiteViaContentScript(tabId: number, ids: DataTypeId[]): Promise<void> {
  await withTimeout(
    (async () => {
      const [injection] = await browser.scripting.executeScript({
        target: { tabId },
        world: 'MAIN',
        func: clearInMainWorld,
        args: [siteScopedIds(ids)],
      });
      const failed = injection?.result?.failed;
      if (failed && Object.keys(failed).length > 0) {
        console.error('Cache Cleaner: some data types failed to clear', failed);
      }
    })(),
    15000,
  );
}

export async function requestOriginPermission(): Promise<boolean> {
  return browser.permissions.request({ origins: ['*://*/*'] });
}

export function tabOrigin(tab: { url?: string }): string | null {
  if (!tab.url) return null;
  try {
    return new URL(tab.url).origin;
  } catch {
    return null;
  }
}

export function tabDomain(tab: { url?: string }): string | null {
  if (!tab.url) return null;
  try {
    return new URL(tab.url).hostname;
  } catch {
    return null;
  }
}

export async function clearTabData(
  tab: { id?: number; url?: string },
  ids: DataTypeId[],
): Promise<boolean> {
  const origin = tabOrigin(tab);
  if (!origin || tab.id == null) return false;

  if (import.meta.env.FIREFOX) {
    await clearSiteViaContentScript(tab.id, ids);
  } else {
    await clearSiteViaBrowsingData(origin, ids);
  }
  return true;
}

export async function clearTab(
  tab: { id?: number; url?: string },
  ids: DataTypeId[],
): Promise<boolean> {
  const granted = await requestOriginPermission();
  if (!granted) return false;
  return clearTabData(tab, ids);
}
