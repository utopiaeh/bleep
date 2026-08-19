import { useEffect, useMemo, useState } from 'react';
import { browser, type Browser } from 'wxt/browser';
import { HelpPanel } from '../../components/HelpPanel';
import { GlobalSection } from '../../components/options/GlobalSection';
import { LanguageSection } from '../../components/options/LanguageSection';
import { PerSiteSection } from '../../components/options/PerSiteSection';
import { SettingsHeader, type OptionsTab } from '../../components/options/SettingsHeader';
import { ThemeSection } from '../../components/options/ThemeSection';
import { type ClearStatus } from '../../components/StatusButton';
import { useReloadGuard } from '../../hooks/useReloadGuard';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../hooks/useTranslation';
import { useSettingsStore } from '../../store/settings';
import { isGeckoBased } from '../../utils/browser-info';
import {
  clearGlobal,
  clearLinkedOrigin,
  clearTab,
  clearTabData,
  dedupeSitesByHostname,
  linkedOriginsFor,
  requestOriginPermission,
  siteScopedIds,
  tabCookieStoreId,
  tabDomain,
  tabOrigin,
  type VisitedSite,
} from '../../utils/clearing';
import { mapWithConcurrency } from '../../utils/concurrency';
import { siteScopedDataTypes } from '../../utils/data-types';

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
    if (!q) return tabs;
    return tabs.filter((tab) => (tabDomain(tab) ?? '').toLowerCase().includes(q));
  }, [tabs, siteFilter]);

  const filteredHistory = useMemo(() => {
    const q = historyFilter.trim().toLowerCase();
    if (!q) return history;
    return history.filter((item) => (item.title ?? item.url ?? '').toLowerCase().includes(q));
  }, [history, historyFilter]);

  const visitedSites = useMemo(
    () =>
      dedupeSitesByHostname(visitedHistory.map((item) => item.url)).filter(
        (site) => !clearedHostnames.has(site.hostname),
      ),
    [visitedHistory, clearedHostnames],
  );

  const filteredVisitedSites = useMemo(() => {
    const q = visitedSiteFilter.trim().toLowerCase();
    if (!q) return visitedSites;
    return visitedSites.filter((site) => site.hostname.toLowerCase().includes(q));
  }, [visitedSites, visitedSiteFilter]);

  async function handleGlobalClear() {
    setGlobalStatus('clearing');
    try {
      await clearGlobal(selectedTypesGlobal);
      setGlobalStatus('done');
    } catch (err) {
      console.error('Bleep: global clear failed', err);
      setGlobalStatus('failed');
    }
    setTimeout(() => setGlobalStatus('idle'), 1500);
  }

  async function handleSiteClear(tab: Tab) {
    if (tab.id == null || isReloading(tab.id)) return;
    setBusyTabIds((s) => new Set(s).add(tab.id!));
    setFailedTabIds((s) => {
      const next = new Set(s);
      next.delete(tab.id!);
      return next;
    });
    try {
      const ids = siteScopedIds(selectedTypesSite);
      const ok = await clearTab(tab, ids);
      if (!ok) setFailedTabIds((s) => new Set(s).add(tab.id!));
      else {
        const origin = tabOrigin(tab);
        if (useOriginMappings && origin) {
          await Promise.all(
            linkedOriginsFor(linkedOrigins, origin).map((target) =>
              clearLinkedOrigin(target, ids, tabCookieStoreId(tab)),
            ),
          );
        }
        if (autoReloadAfterClear) {
          markReloading(tab.id);
          browser.tabs.reload(tab.id, { bypassCache: true });
        }
      }
    } catch (err) {
      console.error('Bleep: site clear failed', err);
      setFailedTabIds((s) => new Set(s).add(tab.id!));
    }
    setBusyTabIds((s) => {
      const next = new Set(s);
      next.delete(tab.id!);
      return next;
    });
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
        for (const target of linkedOriginsFor(linkedOrigins, origin)) {
          const key = `${storeId ?? ''}||${target}`;
          if (seenLinkedClears.has(key)) continue;
          seenLinkedClears.add(key);
          linkedTasks.push(clearLinkedOrigin(target, ids, storeId));
        }
      }
      await Promise.all(linkedTasks);
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

  async function clearVisitedSite(site: VisitedSite): Promise<boolean> {
    const ids = siteScopedIds(selectedTypesSite);
    await clearLinkedOrigin(site.origin, ids);
    if (useOriginMappings) {
      await Promise.all(
        linkedOriginsFor(linkedOrigins, site.origin).map((target) =>
          clearLinkedOrigin(target, ids),
        ),
      );
    }
    return true;
  }

  async function handleClearVisitedSite(site: VisitedSite) {
    setBusyVisitedHostnames((s) => new Set(s).add(site.hostname));
    setFailedVisitedHostnames((s) => {
      const next = new Set(s);
      next.delete(site.hostname);
      return next;
    });
    try {
      const granted = await requestOriginPermission();
      if (!granted) throw new Error('permission denied');
      await clearVisitedSite(site);
      setClearedHostnames((s) => new Set(s).add(site.hostname));
    } catch (err) {
      console.error('Bleep: visited site clear failed', err);
      setFailedVisitedHostnames((s) => new Set(s).add(site.hostname));
    }
    setBusyVisitedHostnames((s) => {
      const next = new Set(s);
      next.delete(site.hostname);
      return next;
    });
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
          await clearVisitedSite(site);
          return { site, ok: true };
        } catch (err) {
          console.error('Bleep: visited site clear failed', site.hostname, err);
          return { site, ok: false };
        }
      });
      const failed = new Set<string>();
      const cleared = new Set<string>();
      for (const { site, ok } of results) {
        if (ok) cleared.add(site.hostname);
        else failed.add(site.hostname);
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

  return (
    <div className="min-h-screen w-full bg-stone-50 dark:bg-stone-900">
      <div className="text-stone-900 dark:text-stone-100 p-8 max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <img src="/icon/48.png" alt="" className="w-8 h-8 shrink-0" />
          <h1 className="text-2xl font-semibold whitespace-nowrap">{t('settingsTitle')}</h1>
        </div>

        <SettingsHeader activeTab={activeTab} onTabChange={setActiveTab} onReset={resetSettings} />

        {activeTab === 'general' && (
          <>
            <ThemeSection theme={theme} onChange={setTheme} />
            <LanguageSection language={language} onChange={setLanguage} />
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
          />
        )}

        {activeTab === 'perSite' && (
          <PerSiteSection
            types={SITE_TYPES}
            selectedTypes={selectedTypesSite}
            onToggleType={toggleTypeSite}
            autoReloadAfterClear={autoReloadAfterClear}
            onAutoReloadChange={setAutoReloadAfterClear}
            useOriginMappings={useOriginMappings}
            onUseOriginMappingsChange={setUseOriginMappings}
            linkedOrigins={linkedOrigins}
            onLinkedOriginsChange={setLinkedOrigins}
            siteFilter={siteFilter}
            onSiteFilterChange={setSiteFilter}
            bulkStatus={bulkStatus}
            onClearAllTabs={handleClearAllTabs}
            tabs={filteredTabs}
            busyTabIds={busyTabIds}
            failedTabIds={failedTabIds}
            reloadingTabIds={reloadingTabIds}
            onClearTab={handleSiteClear}
            visitedSiteFilter={visitedSiteFilter}
            onVisitedSiteFilterChange={setVisitedSiteFilter}
            visitedSites={filteredVisitedSites}
            visitedBulkStatus={visitedBulkStatus}
            onClearAllVisitedSites={handleClearAllVisitedSites}
            busyVisitedHostnames={busyVisitedHostnames}
            failedVisitedHostnames={failedVisitedHostnames}
            onClearVisitedSite={handleClearVisitedSite}
          />
        )}

        {activeTab === 'help' && <HelpPanel />}
      </div>
    </div>
  );
}
