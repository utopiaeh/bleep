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

export async function clearSiteViaContentScript(
  tabId: number,
  origin: string,
  ids: DataTypeId[],
  cookieStoreId?: string,
): Promise<void> {
  const scoped = siteScopedIds(ids);
  const scriptIds = scoped.filter((id) => id !== 'cookies');

  const tasks: Promise<unknown>[] = [];
  if (scriptIds.length > 0) {
    tasks.push(
      withTimeout(
        (async () => {
          const [injection] = await browser.scripting.executeScript({
            target: { tabId },
            world: 'MAIN',
            func: clearInMainWorld,
            args: [scriptIds],
          });
          const failed = injection?.result?.failed;
          if (failed && Object.keys(failed).length > 0) {
            console.error('Bleep: some data types failed to clear', failed);
          }
        })(),
        15000,
      ),
    );
  }
  if (scoped.includes('cookies')) {
    tasks.push(withTimeout(clearCookiesForOrigin(origin, cookieStoreId), 15000));
  }
  await Promise.all(tasks);
}

export async function requestOriginPermission(): Promise<boolean> {
  return browser.permissions.request({ origins: ['*://*/*'] });
}

/** document.cookie can't see HttpOnly cookies; the privileged cookies API can. */
async function clearCookiesForOrigin(origin: string, storeId?: string): Promise<void> {
  const cookies = await browser.cookies.getAll({ url: origin, storeId });
  await Promise.all(
    cookies.map((cookie) => browser.cookies.remove({ url: origin, name: cookie.name, storeId: cookie.storeId })),
  );
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
  tab: { id?: number; url?: string; cookieStoreId?: string },
  ids: DataTypeId[],
): Promise<boolean> {
  const origin = tabOrigin(tab);
  if (!origin || tab.id == null) return false;

  if (import.meta.env.FIREFOX) {
    await clearSiteViaContentScript(tab.id, origin, ids, tab.cookieStoreId);
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
