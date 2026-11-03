import { browser } from 'wxt/browser';
import { DATA_TYPES, type DataTypeId } from './data-types';
import type { ExportableSettings } from './settings-transfer';

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
  const remove = (options: Record<string, unknown>, types: DataTypeId[]) => {
    const dataToRemove = toRemovalOptions(types, supported);
    if (Object.keys(dataToRemove).length === 0) return Promise.resolve();
    return browser.browsingData.remove(
      options as Parameters<typeof browser.browsingData.remove>[0],
      dataToRemove,
    );
  };

  if (import.meta.env.FIREFOX || excludeOrigins.length === 0) {
    await remove({ since: 0 }, ids);
    return;
  }
  // History, Downloads and Form Data can't be filtered by site, so they're left alone while any
  // site is protected rather than touching the protected sites' entries.
  await remove({ since: 0, excludeOrigins }, siteScopedIds(ids));
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

async function clearInMainWorld(
  ids: string[],
  protectedHosts: string[],
): Promise<{ failed: Record<string, string> }> {
  // Runs in every frame of the page (and after any redirect), so each frame checks its own host:
  // a protected site embedded in, or redirected to from, the cleared page is left alone.
  const host = location.hostname.toLowerCase();
  if (protectedHosts.some((p) => host === p || host.endsWith(`.${p}`))) return { failed: {} };

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

async function runContentScriptClear(
  tabId: number,
  scriptIds: DataTypeId[],
  protectedSites: string,
): Promise<void> {
  const injections = await browser.scripting.executeScript({
    target: { tabId, allFrames: true },
    world: 'MAIN',
    func: clearInMainWorld,
    args: [scriptIds, parseHostList(protectedSites)],
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
  protectedSites: string,
  cookieStoreId?: string,
): Promise<void> {
  const scoped = siteScopedIds(ids);
  const scriptIds = scoped.filter((id) => id === 'cacheStorage' || id === 'sessionStorage');

  const tasks: Promise<unknown>[] = [];
  if (scriptIds.length > 0) {
    tasks.push(withTimeout(runContentScriptClear(tabId, scriptIds, protectedSites), 15000));
  }
  if (scoped.includes('cookies')) {
    tasks.push(withTimeout(clearCookiesForOrigin(origin, protectedSites, cookieStoreId), 15000));
  }
  if (scoped.some((id) => id in NATIVE_HOSTNAME_KEYS)) {
    tasks.push(withTimeout(clearHostnameScopedNative(new URL(origin).hostname, scoped), 15000));
  }
  await Promise.all(tasks);
}

export async function requestOriginPermission(): Promise<boolean> {
  return browser.permissions.request({ origins: ['*://*/*'] });
}

async function clearCookiesForOrigin(
  origin: string,
  protectedSites: string,
  storeId?: string,
): Promise<void> {
  const options = { url: origin, storeId, partitionKey: {} } as Parameters<
    typeof browser.cookies.getAll
  >[0];
  const cookies = await browser.cookies
    .getAll(options)
    .catch(() =>
      browser.cookies.getAll({ url: origin, storeId } as Parameters<
        typeof browser.cookies.getAll
      >[0]),
    );

  // Cookies an embed stored inside a protected site's partition belong to that protected site.
  const outsideProtected = cookies.filter((cookie) => {
    const topLevel = (cookie as { partitionKey?: { topLevelSite?: string } }).partitionKey
      ?.topLevelSite;
    return !topLevel || !isProtectedSite(protectedSites, extractHostname(topLevel));
  });

  await Promise.all(
    outsideProtected.map((cookie) =>
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
  return parseHostList(raw).some(
    (protectedHost) => host === protectedHost || host.endsWith(`.${protectedHost}`),
  );
}

export async function protectedExcludeOrigins(protectedRaw: string): Promise<string[]> {
  const hosts = parseHostList(protectedRaw);
  if (hosts.length === 0 || import.meta.env.FIREFOX) return [];
  const origins = new Set(hosts.flatMap((host) => [`https://${host}`, `http://${host}`]));
  // startTime: 0 — history.search otherwise only looks back 24 hours.
  const items = await browser.history.search({ text: '', startTime: 0, maxResults: 100000 });
  for (const item of items) {
    const origin = item.url ? tabOrigin(item) : null;
    if (origin && isProtectedSite(protectedRaw, extractHostname(origin))) origins.add(origin);
  }
  return [...origins];
}

const MULTI_PART_SUFFIX = /^(co|com|net|org|gov|edu|ac)\.[a-z]{2}$/;

// ponytail: approximates the registrable domain (example.com, example.co.uk); use a public-suffix
// list if a protected site on an unusual suffix gets its cookies cleared.
function parentDomain(host: string): string {
  const labels = host.split('.');
  const lastTwo = labels.slice(-2).join('.');
  return MULTI_PART_SUFFIX.test(lastTwo) ? labels.slice(-3).join('.') : lastTwo;
}

// Every per-site clear goes through this, so protected sites stay untouched whoever the caller is.
// Cookies are dropped too when a protected site shares the parent domain: both Chrome
// (origins: [...]) and Firefox (cookies sent to the URL) clear parent-domain cookies.
export function allowedSiteIds(
  origin: string,
  ids: DataTypeId[],
  protectedRaw: string,
): DataTypeId[] | null {
  const host = extractHostname(origin);
  if (isProtectedSite(protectedRaw, host)) return null;
  const protectedHosts = parseHostList(protectedRaw);
  const parent = parentDomain(host);
  let allowed = ids;
  if (protectedHosts.some((p) => parentDomain(p) === parent)) {
    allowed = allowed.filter((id) => id !== 'cookies');
  }
  // Firefox's browsingData `hostnames` filter may also cover subdomains, so when a protected site
  // sits under this host, skip the types that go through it.
  if (import.meta.env.FIREFOX && protectedHosts.some((p) => p.endsWith(`.${host}`))) {
    allowed = allowed.filter((id) => !(id in NATIVE_HOSTNAME_KEYS));
  }
  return allowed;
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
  requestedIds: DataTypeId[],
  protectedSites: string,
  cookieStoreId?: string,
): Promise<void> {
  const ids = allowedSiteIds(origin, requestedIds, protectedSites);
  if (!ids) return;
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
            await withTimeout(runContentScriptClear(tab.id, scriptIds, protectedSites), 15000);
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
      tasks.push(withTimeout(clearCookiesForOrigin(origin, protectedSites, cookieStoreId), 15000));
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
    const { origin } = new URL(tab.url);
    return origin === 'null' ? null : origin;
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
  requestedIds: DataTypeId[],
  protectedSites: string,
): Promise<boolean> {
  const origin = tabOrigin(tab);
  if (!origin || tab.id == null) return false;
  const ids = allowedSiteIds(origin, requestedIds, protectedSites);
  if (!ids) return false;

  if (import.meta.env.FIREFOX) {
    await clearSiteViaContentScript(tab.id, origin, ids, protectedSites, tab.cookieStoreId);
  } else {
    await clearSiteViaBrowsingData(origin, ids);
  }
  return true;
}

export type SiteClearOptions = Pick<
  ExportableSettings,
  'useOriginMappings' | 'linkedOrigins' | 'protectedSites'
>;

export async function clearMappedTargets(
  origin: string,
  ids: DataTypeId[],
  opts: SiteClearOptions,
  cookieStoreId?: string,
): Promise<string[]> {
  if (!opts.useOriginMappings) return [];
  const targets = filterProtectedTargets(
    linkedOriginsFor(opts.linkedOrigins, origin),
    opts.protectedSites,
  );
  await Promise.all(
    targets.map((target) => clearLinkedOrigin(target, ids, opts.protectedSites, cookieStoreId)),
  );
  return targets;
}

export async function clearSiteWithLinked(
  tab: { id?: number; url?: string },
  ids: DataTypeId[],
  opts: SiteClearOptions,
): Promise<string[] | null> {
  const ok = await clearTabData(tab, ids, opts.protectedSites);
  if (!ok) return null;
  const origin = tabOrigin(tab);
  return origin ? clearMappedTargets(origin, ids, opts, tabCookieStoreId(tab)) : [];
}
