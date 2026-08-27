import { useEffect, useMemo, useState } from 'react';
import { browser, type Browser } from 'wxt/browser';
import { DataTypeGrid } from '../../components/DataTypeGrid';
import { HelpPanel } from '../../components/HelpPanel';
import { OriginMappingsEditor } from '../../components/OriginMappingsEditor';
import { BackupSection } from '../../components/options/BackupSection';
import { ClearLogSection } from '../../components/options/ClearLogSection';
import { ErrorLogSection } from '../../components/options/ErrorLogSection';
import { GlobalSection } from '../../components/options/GlobalSection';
import { LanguageSection } from '../../components/options/LanguageSection';
import { ProtectedSitesSection } from '../../components/options/ProtectedSitesSection';
import { SettingsHeader, type OptionsTab } from '../../components/options/SettingsHeader';
import { SiteTabsSection } from '../../components/options/SiteTabsSection';
import { ThemeSection } from '../../components/options/ThemeSection';
import { VisitedSitesSection } from '../../components/options/VisitedSitesSection';
import { SectionHeading } from '../../components/SectionHeading';
import { type ClearStatus } from '../../components/StatusButton';
import { useReloadGuard } from '../../hooks/useReloadGuard';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../hooks/useTranslation';
import { recordClear } from '../../store/clearLog';
import { useSettingsStore } from '../../store/settings';
import { useStorageErrorStore } from '../../store/storageError';
import { isGeckoBased } from '../../utils/browser-info';
import { runClear } from '../../utils/clear-status';
import {
  clearGlobal,
  clearLinkedOrigin,
  clearTab,
  clearTabData,
  dedupeSitesByHostname,
  filterProtectedTargets,
  isProtectedSite,
  linkedOriginsFor,
  requestOriginPermission,
  siteScopedIds,
  tabCookieStoreId,
  tabHostname,
  tabOrigin,
  type VisitedSite,
} from '../../utils/clearing';
import { mapWithConcurrency } from '../../utils/concurrency';
import { siteScopedDataTypes } from '../../utils/data-types';
import { withItem, withoutItem } from '../../utils/set-helpers';

type Tab = Browser.tabs.Tab;

const SITE_TYPES = siteScopedDataTypes();
const VISITED_CLEAR_CONCURRENCY = 3;

export default function App() {
  useTheme();
  const t = useTranslation();
  const [activeTab, setActiveTab] = useState<OptionsTab>('perSite');
  const {
    selectedTypesGlobal,
    selectedTypesSite,
    toggleTypeGlobal,
    toggleTypeSite,
    autoReloadAfterClear,
    setAutoReloadAfterClear,
    linkedOrigins,
    setLinkedOrigins,
    useOriginMappings,
    setUseOriginMappings,
    protectedSites,
    setProtectedSites,
    theme,
    setTheme,
    language,
    setLanguage,
    resetSettings,
  } = useSettingsStore();

  const [tabs, setTabs] = useState<Tab[]>([]);
  const [siteFilter, setSiteFilter] = useState('');
  const [busyTabIds, setBusyTabIds] = useState<Set<number>>(new Set());
  const [failedTabIds, setFailedTabIds] = useState<Set<number>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<ClearStatus>('idle');
  const [history, setHistory] = useState<Browser.history.HistoryItem[]>([]);
  const [historyFilter, setHistoryFilter] = useState('');
  const [historyBulkStatus, setHistoryBulkStatus] = useState<ClearStatus>('idle');
  const [globalStatus, setGlobalStatus] = useState<ClearStatus>('idle');
  const [visitedHistory, setVisitedHistory] = useState<Browser.history.HistoryItem[]>([]);
  const [visitedSiteFilter, setVisitedSiteFilter] = useState('');
  const [busyVisitedHostnames, setBusyVisitedHostnames] = useState<Set<string>>(new Set());
  const [failedVisitedHostnames, setFailedVisitedHostnames] = useState<Set<string>>(new Set());
  const [visitedBulkStatus, setVisitedBulkStatus] = useState<ClearStatus>('idle');
  const [clearedHostnames, setClearedHostnames] = useState<Set<string>>(new Set());
  const { reloadingTabIds, markReloading, isReloading } = useReloadGuard();

  useEffect(() => {
    if (!isGeckoBased()) {
      browser.tabs.query({}).then(setTabs);
    }
  }, []);

  useEffect(() => {
    if (selectedTypesGlobal.includes('history')) {
      browser.history.search({ text: '', maxResults: 25 }).then(setHistory);
    }
  }, [selectedTypesGlobal]);

  useEffect(() => {
    browser.history.search({ text: '', maxResults: 1000 }).then(setVisitedHistory);
  }, []);

  const filteredTabs = useMemo(() => {
    const q = siteFilter.trim().toLowerCase();
    return tabs.filter((tab) => {
      const hostname = tabHostname(tab) ?? '';
      if (isProtectedSite(protectedSites, hostname)) return false;
      return !q || hostname.toLowerCase().includes(q);
    });
  }, [tabs, siteFilter, protectedSites]);

  const filteredHistory = useMemo(() => {
    const q = historyFilter.trim().toLowerCase();
    if (!q) return history;
    return history.filter((item) => (item.title ?? item.url ?? '').toLowerCase().includes(q));
  }, [history, historyFilter]);

  const allVisitedSites = useMemo(
    () => dedupeSitesByHostname(visitedHistory.map((item) => item.url)),
    [visitedHistory],
  );

  const visitedSites = useMemo(
    () =>
      allVisitedSites.filter(
        (site) => !clearedHostnames.has(site.hostname) && !isProtectedSite(protectedSites, site.hostname),
      ),
    [allVisitedSites, clearedHostnames, protectedSites],
  );

  const filteredVisitedSites = useMemo(() => {
    const q = visitedSiteFilter.trim().toLowerCase();
    if (!q) return visitedSites;
    return visitedSites.filter((site) => site.hostname.toLowerCase().includes(q));
  }, [visitedSites, visitedSiteFilter]);

  async function handleGlobalClear() {
    const excludeOrigins = allVisitedSites
      .filter((site) => isProtectedSite(protectedSites, site.hostname))
      .map((site) => site.origin);
    await runClear(setGlobalStatus, async () => {
      await clearGlobal(selectedTypesGlobal, excludeOrigins);
      recordClear('(global)', selectedTypesGlobal);
    });
  }

  async function handleSiteClear(tab: Tab) {
    if (tab.id == null || isReloading(tab.id)) return;
    if (isProtectedSite(protectedSites, tabHostname(tab) ?? '')) return;
    const tabId = tab.id;
    setBusyTabIds((s) => withItem(s, tabId));
    setFailedTabIds((s) => withoutItem(s, tabId));
    try {
      const ids = siteScopedIds(selectedTypesSite);
      const ok = await clearTab(tab, ids);
      if (!ok) setFailedTabIds((s) => withItem(s, tabId));
      else {
        const origin = tabOrigin(tab);
        let linkedTargets: string[] = [];
        if (useOriginMappings && origin) {
          linkedTargets = filterProtectedTargets(linkedOriginsFor(linkedOrigins, origin), protectedSites);
          await Promise.all(
            linkedTargets.map((target) => clearLinkedOrigin(target, ids, tabCookieStoreId(tab))),
          );
        }
        recordClear(tabHostname(tab) ?? origin ?? tab.url ?? '?', ids, linkedTargets);
        if (autoReloadAfterClear) {
          markReloading(tabId);
          browser.tabs.reload(tabId, { bypassCache: true });
        }
      }
    } catch (err) {
      console.error('Bleep: site clear failed', err);
      setFailedTabIds((s) => withItem(s, tabId));
    }
    setBusyTabIds((s) => withoutItem(s, tabId));
  }

  async function handleClearAllTabs() {
    const targets = filteredTabs.filter((t) => t.id != null && !isReloading(t.id));
    if (targets.length === 0) return;
    setBulkStatus('clearing');
    try {
      const granted = await requestOriginPermission();
      if (!granted) {
        setBulkStatus('failed');
        setTimeout(() => setBulkStatus('idle'), 1500);
        return;
      }
      const ids = siteScopedIds(selectedTypesSite);
      setBusyTabIds(new Set(targets.map((t) => t.id!)));
      const results = await Promise.allSettled(
        targets.map((tab) => clearTabData(tab, ids).then((ok) => ({ tab, ok }))),
      );
      const failed = new Set<number>();
      const clearedTabIds: number[] = [];
      const linkedTasks: Promise<unknown>[] = [];
      const seenLinkedClears = new Set<string>();
      const allLinkedTargets: string[] = [];
      for (const result of results) {
        if (result.status === 'rejected') continue;
        const { tab, ok } = result.value;
        if (!ok) {
          failed.add(tab.id!);
          continue;
        }
        clearedTabIds.push(tab.id!);
        if (!useOriginMappings) continue;
        const origin = tabOrigin(tab);
        if (!origin) continue;
        const storeId = tabCookieStoreId(tab);
        for (const target of filterProtectedTargets(linkedOriginsFor(linkedOrigins, origin), protectedSites)) {
          const key = `${storeId ?? ''}||${target}`;
          if (seenLinkedClears.has(key)) continue;
          seenLinkedClears.add(key);
          allLinkedTargets.push(target);
          linkedTasks.push(clearLinkedOrigin(target, ids, storeId));
        }
      }
      await Promise.all(linkedTasks);
      if (clearedTabIds.length > 0) {
        recordClear(t('clearLogBulkTabs', { count: clearedTabIds.length }), ids, allLinkedTargets);
      }
      if (autoReloadAfterClear) {
        for (const tabId of clearedTabIds) {
          markReloading(tabId);
          browser.tabs.reload(tabId, { bypassCache: true });
        }
      }
      setFailedTabIds(failed);
      setBulkStatus(failed.size === 0 ? 'done' : 'failed');
    } catch (err) {
      console.error('Bleep: clear-all-tabs failed', err);
      setBulkStatus('failed');
    }
    setBusyTabIds(new Set());
    setTimeout(() => setBulkStatus('idle'), 1500);
  }

  async function clearVisitedSite(site: VisitedSite): Promise<string[]> {
    const ids = siteScopedIds(selectedTypesSite);
    const openTab = (await browser.tabs.query({})).find((tab) => tabHostname(tab) === site.hostname);
    const cookieStoreId = openTab ? tabCookieStoreId(openTab) : undefined;

    if (openTab?.id != null) {
      await clearTabData(openTab, ids);
    } else {
      await clearLinkedOrigin(site.origin, ids);
    }

    let linkedTargets: string[] = [];
    if (useOriginMappings) {
      linkedTargets = filterProtectedTargets(linkedOriginsFor(linkedOrigins, site.origin), protectedSites);
      await Promise.all(linkedTargets.map((target) => clearLinkedOrigin(target, ids, cookieStoreId)));
    }
    return linkedTargets;
  }

  async function handleClearVisitedSite(site: VisitedSite) {
    if (isProtectedSite(protectedSites, site.hostname)) return;
    const { hostname } = site;
    setBusyVisitedHostnames((s) => withItem(s, hostname));
    setFailedVisitedHostnames((s) => withoutItem(s, hostname));
    try {
      const granted = await requestOriginPermission();
      if (!granted) throw new Error('permission denied');
      const linkedTargets = await clearVisitedSite(site);
      recordClear(hostname, siteScopedIds(selectedTypesSite), linkedTargets);
      setClearedHostnames((s) => withItem(s, hostname));
    } catch (err) {
      console.error('Bleep: visited site clear failed', err);
      setFailedVisitedHostnames((s) => withItem(s, hostname));
    }
    setBusyVisitedHostnames((s) => withoutItem(s, hostname));
  }

  async function handleClearAllVisitedSites() {
    const targets = filteredVisitedSites;
    if (targets.length === 0) return;
    setVisitedBulkStatus('clearing');
    try {
      const granted = await requestOriginPermission();
      if (!granted) {
        setVisitedBulkStatus('failed');
        setTimeout(() => setVisitedBulkStatus('idle'), 1500);
        return;
      }
      setBusyVisitedHostnames(new Set(targets.map((s) => s.hostname)));
      const results = await mapWithConcurrency(targets, VISITED_CLEAR_CONCURRENCY, async (site) => {
        try {
          const linkedTargets = await clearVisitedSite(site);
          return { site, ok: true, linkedTargets };
        } catch (err) {
          console.error('Bleep: visited site clear failed', site.hostname, err);
          return { site, ok: false, linkedTargets: [] as string[] };
        }
      });
      const failed = new Set<string>();
      const cleared = new Set<string>();
      const allLinkedTargets: string[] = [];
      for (const { site, ok, linkedTargets } of results) {
        if (ok) {
          cleared.add(site.hostname);
          allLinkedTargets.push(...linkedTargets);
        } else {
          failed.add(site.hostname);
        }
      }
      if (cleared.size > 0) {
        recordClear(
          t('clearLogBulkVisited', { count: cleared.size }),
          siteScopedIds(selectedTypesSite),
          allLinkedTargets,
        );
      }
      setClearedHostnames((s) => new Set([...s, ...cleared]));
      setFailedVisitedHostnames(failed);
      setVisitedBulkStatus(failed.size === 0 ? 'done' : 'failed');
    } catch (err) {
      console.error('Bleep: clear-all-visited-sites failed', err);
      setVisitedBulkStatus('failed');
    }
    setBusyVisitedHostnames(new Set());
    setTimeout(() => setVisitedBulkStatus('idle'), 1500);
  }

  async function handleDeleteHistoryItem(url: string) {
    await browser.history.deleteUrl({ url });
    setHistory((h) => h.filter((item) => item.url !== url));
  }

  async function handleClearAllHistory() {
    if (filteredHistory.length === 0) return;
    setHistoryBulkStatus('clearing');
    try {
      await Promise.all(
        filteredHistory.map((item) =>
          item.url ? browser.history.deleteUrl({ url: item.url }) : undefined,
        ),
      );
      const removed = new Set(filteredHistory.map((item) => item.url));
      setHistory((h) => h.filter((item) => !removed.has(item.url)));
      setHistoryBulkStatus('done');
    } catch (err) {
      console.error('Bleep: clear-all-history failed', err);
      setHistoryBulkStatus('failed');
    }
    setTimeout(() => setHistoryBulkStatus('idle'), 1500);
  }

  const storageError = useStorageErrorStore((s) => s.message);
  const clearStorageError = useStorageErrorStore((s) => s.clear);

  return (
    <div className="min-h-screen w-full bg-stone-50 dark:bg-stone-900">
      <div className="text-stone-900 dark:text-stone-100 p-8 max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <img src="/icon/48.png" alt="" className="w-8 h-8 shrink-0" />
          <h1 className="text-2xl font-semibold whitespace-nowrap">{t('settingsTitle')}</h1>
        </div>

        {storageError && (
          <div className="flex items-center justify-between gap-3 mb-4 rounded-md border border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950 px-3 py-2 text-sm text-red-700 dark:text-red-300">
            <span>{storageError}</span>
            <button type="button" onClick={clearStorageError} className="shrink-0 cursor-pointer underline">
              {t('remove')}
            </button>
          </div>
        )}

        <SettingsHeader activeTab={activeTab} onTabChange={setActiveTab} onReset={resetSettings} />

        {activeTab === 'general' && (
          <>
            <ThemeSection theme={theme} onChange={setTheme} />
            <LanguageSection language={language} onChange={setLanguage} />
            <hr className="border-stone-200 dark:border-stone-700 mb-3" />
            <BackupSection />
            <hr className="border-stone-200 dark:border-stone-700 mb-3" />
            <ClearLogSection />
            <ErrorLogSection />
          </>
        )}

        {activeTab === 'global' && (
          <GlobalSection
            selectedTypes={selectedTypesGlobal}
            onToggleType={toggleTypeGlobal}
            status={globalStatus}
            onClear={handleGlobalClear}
            showHistory={selectedTypesGlobal.includes('history')}
            history={filteredHistory}
            historyFilter={historyFilter}
            onHistoryFilterChange={setHistoryFilter}
            historyStatus={historyBulkStatus}
            onClearAllHistory={handleClearAllHistory}
            onDeleteHistoryItem={handleDeleteHistoryItem}
            hasProtectedSites={protectedSites.trim().length > 0}
          />
        )}

        {activeTab === 'perSite' && (
          <section className="mb-8">
            <SectionHeading title={t('scopePerSite')} description={t('scopePerSiteDescription')} />
            <DataTypeGrid types={SITE_TYPES} selected={selectedTypesSite} onToggle={toggleTypeSite} className="mb-3" />

            <hr className="border-stone-200 dark:border-stone-700 mb-3" />

            <div className="flex flex-col items-start gap-2 mb-3">
              <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoReloadAfterClear}
                  onChange={(e) => setAutoReloadAfterClear(e.target.checked)}
                  className="accent-blue-500 cursor-pointer"
                />
                {t('reloadTabAfterClearingPerSite')}
              </label>

              <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={useOriginMappings}
                  onChange={(e) => setUseOriginMappings(e.target.checked)}
                  className="accent-blue-500 cursor-pointer"
                />
                {t('useOriginMappings')}
              </label>
            </div>

            <div className="mb-3 max-w-xl">
              <OriginMappingsEditor value={linkedOrigins} onChange={setLinkedOrigins} />
            </div>

            <ProtectedSitesSection value={protectedSites} onChange={setProtectedSites} />

            <hr className="border-stone-200 dark:border-stone-700 mb-3" />

            {!isGeckoBased() && (
              <>
                <SiteTabsSection
                  filter={siteFilter}
                  onFilterChange={setSiteFilter}
                  status={bulkStatus}
                  onClearAll={handleClearAllTabs}
                  tabs={filteredTabs}
                  busyTabIds={busyTabIds}
                  failedTabIds={failedTabIds}
                  reloadingTabIds={reloadingTabIds}
                  onClearTab={handleSiteClear}
                />
                <hr className="border-stone-200 dark:border-stone-700 mb-3 mt-3" />
              </>
            )}

            <VisitedSitesSection
              filter={visitedSiteFilter}
              onFilterChange={setVisitedSiteFilter}
              sites={filteredVisitedSites}
              status={visitedBulkStatus}
              onClearAll={handleClearAllVisitedSites}
              busyHostnames={busyVisitedHostnames}
              failedHostnames={failedVisitedHostnames}
              onClearSite={handleClearVisitedSite}
            />
          </section>
        )}

        {activeTab === 'help' && <HelpPanel />}
      </div>
    </div>
  );
}
