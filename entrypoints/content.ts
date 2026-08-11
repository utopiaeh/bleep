import type { DataTypeId } from '../utils/data-types';

async function clearCacheStorage() {
  if (!('caches' in self)) return;
  const keys = await caches.keys();
  await Promise.all(keys.map((key) => caches.delete(key)));
}

async function clearIndexedDb() {
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
}

function clearLocalStorage() {
  localStorage.clear();
}

function clearSessionStorage() {
  sessionStorage.clear();
}

function clearCookies() {
  for (const cookie of document.cookie.split(';')) {
    const name = cookie.split('=')[0]?.trim();
    if (!name) continue;
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`;
  }
}

async function clearServiceWorkers() {
  if (!('serviceWorker' in navigator)) return;
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.map((r) => r.unregister()));
}

const HANDLERS: Record<DataTypeId, () => Promise<void> | void> = {
  cacheStorage: clearCacheStorage,
  indexedDB: clearIndexedDb,
  localStorage: clearLocalStorage,
  sessionStorage: clearSessionStorage,
  cookies: clearCookies,
  serviceWorkers: clearServiceWorkers,
  cache: () => {},
  history: () => {},
  downloads: () => {},
  formData: () => {},
};

declare global {
  interface Window {
    __cacheCleanerRegistered?: boolean;
  }
}

export default defineContentScript({
  matches: [],
  registration: 'runtime',
  async main() {
    if (window.__cacheCleanerRegistered) return;
    window.__cacheCleanerRegistered = true;

    browser.runtime.onMessage.addListener(async (message) => {
      if (message?.type !== 'clear-site-storage') return;
      const ids: DataTypeId[] = message.ids ?? [];
      await Promise.all(ids.map((id) => HANDLERS[id]?.()));
      return { ok: true };
    });
  },
});
