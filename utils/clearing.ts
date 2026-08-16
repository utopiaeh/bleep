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

/** Chrome/Chromium: browsingData's `origins` param scopes removal to one site. On Firefox it does not work. */
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
  // Duplicated from the module-level withTimeout: this function is serialized and
  // injected into the page by scripting.executeScript, so it can't close over
  // anything outside itself.
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

async function clearIndexedDBForHostname(hostname: string): Promise<void> {
  await browser.browsingData.remove(
    { hostnames: [hostname] } as Parameters<typeof browser.browsingData.remove>[0],
    { indexedDB: true },
  );
}

/** allFrames: an auth widget commonly lives in an iframe on a different origin than
 * the top page — its storage is otherwise unreachable here. */
async function runContentScriptClear(tabId: number, scriptIds: DataTypeId[]): Promise<void> {
  const injections = await browser.scripting.executeScript({
    target: { tabId, allFrames: true },
    world: 'MAIN',
    func: clearInMainWorld,
    args: [scriptIds],
  });
  for (const injection of injections) {
    const failed = injection?.result?.failed;
    if (failed && Object.keys(failed).length > 0) {
      console.error('Bleep: some data types failed to clear', failed);
    }
  }
}

async function clearSiteViaContentScript(
  tabId: number,
  origin: string,
  ids: DataTypeId[],
  cookieStoreId?: string,
): Promise<void> {
  const scoped = siteScopedIds(ids);
  const scriptIds = scoped.filter((id) => id !== 'cookies' && id !== 'indexedDB');

  const tasks: Promise<unknown>[] = [];
  if (scriptIds.length > 0) {
    tasks.push(withTimeout(runContentScriptClear(tabId, scriptIds), 15000));
  }
  if (scoped.includes('cookies')) {
    tasks.push(withTimeout(clearCookiesForOrigin(origin, cookieStoreId), 15000));
  }
  if (scoped.includes('indexedDB')) {
    tasks.push(withTimeout(clearIndexedDBForHostname(new URL(origin).hostname), 15000));
  }
  await Promise.all(tasks);
}

export async function requestOriginPermission(): Promise<boolean> {
  return browser.permissions.request({ origins: ['*://*/*'] });
}

/** document.cookie can't see HttpOnly cookies; the privileged cookies API can.
 * Firefox's Total Cookie Protection also partitions third-party cookies (e.g. an
 * SSO/silent-renew iframe from another domain) by top-level site — those live in a
 * separate jar getAll() won't return without an explicit partitionKey, so a plain
 * getAll() here would silently miss a still-alive session cookie set that way. */
async function clearCookiesForOrigin(origin: string, storeId?: string): Promise<void> {
  const base = { url: origin, storeId } as Parameters<typeof browser.cookies.getAll>[0];
  const partitioned = {
    ...base,
    partitionKey: { topLevelSite: origin },
  } as Parameters<typeof browser.cookies.getAll>[0];

  const [unpartitioned, fromPartition] = await Promise.all([
    browser.cookies.getAll(base),
    browser.cookies.getAll(partitioned).catch(() => []),
  ]);

  await Promise.all(
    [...unpartitioned, ...fromPartition].map((cookie) =>
      browser.cookies.remove({
        url: origin,
        name: cookie.name,
        storeId: cookie.storeId,
        ...(cookie.partitionKey ? { partitionKey: cookie.partitionKey } : {}),
      } as Parameters<typeof browser.cookies.remove>[0]),
    ),
  );
}

/** Adds https:// if no scheme is present, so plain "domain.com" parses the same as
 * "https://domain.com". */
function withScheme(s: string): string {
  return /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(s) ? s : `https://${s}`;
}

/** A target needs to be a real origin for the clearing calls; accepts scheme-less
 * input and strips any path/query the user pastes along with it. */
function normalizeTargetOrigin(input: string): string {
  const trimmed = input.trim();
  try {
    return new URL(withScheme(trimmed)).origin;
  } catch {
    return trimmed.replace(/\/$/, '');
  }
}

/** Ignores scheme and path — only the hostname matters for matching a mapping. */
function extractHostname(input: string): string {
  const trimmed = input.trim();
  try {
    return new URL(withScheme(trimmed)).hostname.toLowerCase();
  } catch {
    return trimmed.toLowerCase();
  }
}

const DOMAIN_RE = /^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;

/** Loose check for "does this look like a domain" (e.g. rejects "asdasd"), used for
 * inline validation hints only — matching itself (linkedOriginsFor) doesn't call this. */
export function isValidHost(input: string): boolean {
  const host = extractHostname(input);
  if (!host) return false;
  return host === 'localhost' || DOMAIN_RE.test(host);
}

/** One mapping per line: `source => target1, target2`. Lines with no `=>` (or an
 * empty source/target) are ignored. `source` is kept as typed (matching extracts
 * its hostname on demand); targets are normalized to full origins up front since
 * they're passed straight to the clearing calls. */
export interface OriginMapping {
  source: string;
  targets: string[];
}

export function parseOriginMappings(raw: string): OriginMapping[] {
  return raw
    .split('\n')
    .map((line) => {
      const [sourcePart, targetsPart = ''] = line.split('=>');
      return {
        source: (sourcePart ?? '').trim(),
        targets: targetsPart
          .split(',')
          .map(normalizeTargetOrigin)
          .filter(Boolean),
      };
    })
    .filter((m) => m.source && m.targets.length > 0);
}

/** Matches regardless of scheme or path, and treats the mapping's source as covering
 * its own subdomains too — e.g. a source of "domain.com" also matches
 * "sso.domain.com". A site with no matching mapping gets none. A mapping with an
 * invalid-looking source or any invalid-looking target is skipped entirely — the
 * editor shows these as errors instead of silently acting on them. */
export function linkedOriginsFor(raw: string, activeOrigin: string): string[] {
  const activeHost = extractHostname(activeOrigin);
  return parseOriginMappings(raw)
    .filter((m) => isValidHost(m.source) && m.targets.every(isValidHost))
    .filter((m) => {
      const sourceHost = extractHostname(m.source);
      return activeHost === sourceHost || activeHost.endsWith(`.${sourceHost}`);
    })
    .flatMap((m) => m.targets);
}

function waitForTabComplete(tabId: number, ms: number): Promise<void> {
  return withTimeout(
    new Promise<void>((resolve) => {
      function onUpdated(id: number, info: { status?: string }) {
        if (id === tabId && info.status === 'complete') {
          browser.tabs.onUpdated.removeListener(onUpdated);
          resolve();
        }
      }
      browser.tabs.onUpdated.addListener(onUpdated);
    }),
    ms,
  );
}

/** Clears an origin with no open tab of its own — e.g. an SSO/auth domain a site
 * silently talks to (see clearCookiesForOrigin's partition note: this is exactly the
 * shape of "session survives clearing the site itself" cases). Chrome can scope
 * browsingData.remove to it directly with no tab needed. On Firefox, cookies and
 * IndexedDB go through the same native calls used for the active tab (no tab
 * required for either); the remaining storage types have no such native path, so a
 * background tab is opened briefly to run the same content-script clear, then closed.
 * ponytail: that background tab flashes in the tab strip for a moment — acceptable
 * given this only runs on an explicit clear click. */
export async function clearLinkedOrigin(
  origin: string,
  ids: DataTypeId[],
  cookieStoreId?: string,
): Promise<void> {
  const scoped = siteScopedIds(ids);
  if (scoped.length === 0) return;

  if (import.meta.env.FIREFOX) {
    const tasks: Promise<unknown>[] = [];
    if (scoped.includes('cookies')) {
      tasks.push(clearCookiesForOrigin(origin, cookieStoreId));
    }
    if (scoped.includes('indexedDB')) {
      tasks.push(clearIndexedDBForHostname(new URL(origin).hostname));
    }
    const scriptIds = scoped.filter((id) => id !== 'cookies' && id !== 'indexedDB');
    if (scriptIds.length > 0) {
      tasks.push(
        (async () => {
          const tab = await browser.tabs.create({
            url: origin,
            active: false,
            ...(cookieStoreId ? { cookieStoreId } : {}),
          } as Parameters<typeof browser.tabs.create>[0]);
          try {
            if (tab.id != null) {
              await waitForTabComplete(tab.id, 10000).catch(() => {});
              await withTimeout(runContentScriptClear(tab.id, scriptIds), 15000);
            }
          } finally {
            if (tab.id != null) await browser.tabs.remove(tab.id).catch(() => {});
          }
        })(),
      );
    }
    await Promise.all(tasks);
  } else {
    await clearSiteViaBrowsingData(origin, ids);
  }
}

/** Firefox-only field, absent from the shared cross-browser Tab type. */
export function tabCookieStoreId(tab: object): string | undefined {
  return (tab as { cookieStoreId?: string }).cookieStoreId;
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
