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

export async function clearGlobal(ids: DataTypeId[], excludeOrigins: string[] = []): Promise<void> {
  const supported = await getSupportedKeys();
  const dataToRemove = toRemovalOptions(ids, supported);
  if (Object.keys(dataToRemove).length === 0) return;
  const options: Record<string, unknown> = { since: 0 };
  if (!import.meta.env.FIREFOX && excludeOrigins.length > 0) {
    options.excludeOrigins = excludeOrigins;
  }
  await browser.browsingData.remove(options as Parameters<typeof browser.browsingData.remove>[0], dataToRemove);
}

export function siteScopedIds(ids: DataTypeId[]): DataTypeId[] {
  const scoped = new Set(DATA_TYPES.filter((d) => d.siteScoped).map((d) => d.id));
  return ids.filter((id) => scoped.has(id));
}

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
    sessionStorage() {
      sessionStorage.clear();
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

const NATIVE_HOSTNAME_KEYS: Partial<Record<DataTypeId, string>> = {
  indexedDB: 'indexedDB',
  localStorage: 'localStorage',
  serviceWorkers: 'serviceWorkers',
};

async function clearHostnameScopedNative(hostname: string, ids: DataTypeId[]): Promise<void> {
  const dataToRemove: Record<string, boolean> = {};
  for (const id of ids) {
    const key = NATIVE_HOSTNAME_KEYS[id];
    if (key) dataToRemove[key] = true;
  }
  if (Object.keys(dataToRemove).length === 0) return;
  await browser.browsingData.remove(
    { hostnames: [hostname] } as Parameters<typeof browser.browsingData.remove>[0],
    dataToRemove,
  );
}

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
  const scriptIds = scoped.filter((id) => id === 'cacheStorage' || id === 'sessionStorage');

  const tasks: Promise<unknown>[] = [];
  if (scriptIds.length > 0) {
    tasks.push(withTimeout(runContentScriptClear(tabId, scriptIds), 15000));
  }
  if (scoped.includes('cookies')) {
    tasks.push(withTimeout(clearCookiesForOrigin(origin, cookieStoreId), 15000));
  }
  if (scoped.some((id) => id in NATIVE_HOSTNAME_KEYS)) {
    tasks.push(withTimeout(clearHostnameScopedNative(new URL(origin).hostname, scoped), 15000));
  }
  await Promise.all(tasks);
}

export async function requestOriginPermission(): Promise<boolean> {
  return browser.permissions.request({ origins: ['*://*/*'] });
}

async function clearCookiesForOrigin(origin: string, storeId?: string): Promise<void> {
  const options = { url: origin, storeId, partitionKey: {} } as Parameters<typeof browser.cookies.getAll>[0];
  const cookies = await browser.cookies
    .getAll(options)
    .catch(() => browser.cookies.getAll({ url: origin, storeId } as Parameters<typeof browser.cookies.getAll>[0]));

  await Promise.all(
    cookies.map((cookie) =>
      browser.cookies.remove({
        url: origin,
        name: cookie.name,
        storeId: cookie.storeId,
        ...(cookie.partitionKey ? { partitionKey: cookie.partitionKey } : {}),
      } as Parameters<typeof browser.cookies.remove>[0]),
    ),
  );
}

function withScheme(s: string): string {
  return /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(s) ? s : `https://${s}`;
}

function normalizeTargetOrigin(input: string): string {
  const trimmed = input.trim();
  try {
    return new URL(withScheme(trimmed)).origin;
  } catch {
    return trimmed.replace(/\/$/, '');
  }
}

function extractHostname(input: string): string {
  const trimmed = input.trim();
  try {
    return new URL(withScheme(trimmed)).hostname.toLowerCase();
  } catch {
    return trimmed.toLowerCase();
  }
}

const DOMAIN_RE = /^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;

export function isValidHost(input: string): boolean {
  const host = extractHostname(input);
  if (!host) return false;
  return host === 'localhost' || DOMAIN_RE.test(host);
}

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
        targets: targetsPart.split(',').map(normalizeTargetOrigin).filter(Boolean),
      };
    })
    .filter((m) => m.source && m.targets.length > 0);
}

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

function parseHostList(raw: string): string[] {
  return raw
    .split('\n')
    .map((line) => extractHostname(line))
    .filter(Boolean);
}

export function isProtectedSite(raw: string, hostname: string): boolean {
  const host = hostname.toLowerCase();
  return parseHostList(raw).some((protectedHost) => host === protectedHost || host.endsWith(`.${protectedHost}`));
}

export function filterProtectedTargets(targets: string[], protectedRaw: string): string[] {
  if (!protectedRaw.trim()) return targets;
  return targets.filter((target) => !isProtectedSite(protectedRaw, extractHostname(target)));
}

function waitForTabComplete(tabId: number, ms: number): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      browser.tabs.onUpdated.removeListener(onUpdated);
      reject(new Error(`Timed out after ${ms}ms`));
    }, ms);

    function onUpdated(id: number, info: { status?: string }) {
      if (id === tabId && info.status === 'complete') {
        clearTimeout(timer);
        browser.tabs.onUpdated.removeListener(onUpdated);
        resolve();
      }
    }
    browser.tabs.onUpdated.addListener(onUpdated);
  });
}

export async function clearLinkedOrigin(
  origin: string,
  ids: DataTypeId[],
  cookieStoreId?: string,
): Promise<void> {
  const scoped = siteScopedIds(ids);
  if (scoped.length === 0) return;

  if (import.meta.env.FIREFOX) {
    const scriptIds = scoped.filter((id) => id === 'cacheStorage' || id === 'sessionStorage');
    let scriptError: unknown;
    if (scriptIds.length > 0) {
      try {
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
      } catch (err) {
        scriptError = err;
      }
    }

    const tasks: Promise<unknown>[] = [];
    if (scoped.includes('cookies')) {
      tasks.push(withTimeout(clearCookiesForOrigin(origin, cookieStoreId), 15000));
    }
    if (scoped.some((id) => id in NATIVE_HOSTNAME_KEYS)) {
      tasks.push(withTimeout(clearHostnameScopedNative(new URL(origin).hostname, scoped), 15000));
    }
    await Promise.all(tasks);

    if (scriptError) throw scriptError;
  } else {
    await clearSiteViaBrowsingData(origin, ids);
  }
}

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

export function tabHostname(tab: { url?: string }): string | null {
  if (!tab.url) return null;
  try {
    return new URL(tab.url).hostname;
  } catch {
    return null;
  }
}

export interface VisitedSite {
  hostname: string;
  origin: string;
}

export function dedupeSitesByHostname(urls: Array<string | undefined>): VisitedSite[] {
  const seen = new Map<string, string>();
  for (const url of urls) {
    if (!url) continue;
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') continue;
      if (!seen.has(parsed.hostname)) seen.set(parsed.hostname, parsed.origin);
    } catch {
      continue;
    }
  }
  return Array.from(seen, ([hostname, origin]) => ({ hostname, origin }));
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
