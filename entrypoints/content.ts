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
    dbs.map((db) => (db.name ? new Promise((res) => {
      const req = indexedDB.deleteDatabase(db.name!);
      req.onsuccess = req.onerror = req.onblocked = () => res(undefined);
    }) : Promise.resolve())),
  );
}

function clearLocalAndSessionStorage() {
  localStorage.clear();
  sessionStorage.clear();
}

function clearCookies() {
  // ponytail: page-context cookie clear only reaches non-HttpOnly cookies for this origin's current path/domain.
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
  localStorage: clearLocalAndSessionStorage,
  cookies: clearCookies,
  serviceWorkers: clearServiceWorkers,
  cache: () => {}, // HTTP cache isn't reachable from page JS; global mode handles it via browsingData.
  history: () => {},
  downloads: () => {},
  formData: () => {},
};

export default defineContentScript({
  matches: [],
  registration: 'runtime',
  async main() {
    browser.runtime.onMessage.addListener(async (message) => {
      if (message?.type !== 'clear-site-storage') return;
      const ids: DataTypeId[] = message.ids ?? [];
      await Promise.all(ids.map((id) => HANDLERS[id]?.()));
      return { ok: true };
    });
  },
});
