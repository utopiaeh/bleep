import { useEffect, useMemo, useState } from 'react';
import { browser, type Browser } from 'wxt/browser';
import { DangerConfirmButton } from '../../components/DangerConfirmButton';
import { DataTypeGrid } from '../../components/DataTypeGrid';
import { HistoryList } from '../../components/HistoryList';
import { type ClearStatus } from '../../components/StatusButton';
import { TabClearList } from '../../components/TabClearList';
import { useReloadGuard } from '../../hooks/useReloadGuard';
import { useTheme } from '../../hooks/useTheme';
import { useSettingsStore } from '../../store/settings';
import { isGeckoBased } from '../../utils/browser-info';
import {
  clearGlobal,
  clearTab,
  clearTabData,
  requestOriginPermission,
  siteScopedIds,
  tabDomain,
} from '../../utils/clearing';
import { DATA_TYPES } from '../../utils/data-types';

type Tab = Browser.tabs.Tab;

export default function App() {
  useTheme();
  const {
    selectedTypes,
    toggleType,
    scopeMode,
    setScopeMode,
    autoReloadAfterClear,
    setAutoReloadAfterClear,
    theme,
    setTheme,
    resetSettings,
  } = useSettingsStore();
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [siteFilter, setSiteFilter] = useState('');
  const [busyTabIds, setBusyTabIds] = useState<Set<number>>(new Set());
  const [failedTabIds, setFailedTabIds] = useState<Set<number>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<ClearStatus>('idle');
  const [history, setHistory] = useState<Browser.history.HistoryItem[]>([]);
  const [globalStatus, setGlobalStatus] = useState<ClearStatus>('idle');
  const { reloadingTabIds, markReloading, isReloading } = useReloadGuard();

  useEffect(() => {
    if (scopeMode === 'site') {
      browser.tabs.query({}).then(setTabs);
    }
  }, [scopeMode]);

  useEffect(() => {
    if (selectedTypes.includes('history')) {
      browser.history.search({ text: '', maxResults: 25 }).then(setHistory);
    }
  }, [selectedTypes]);

  const filteredTabs = useMemo(() => {
    const q = siteFilter.trim().toLowerCase();
    if (!q) return tabs;
    return tabs.filter((tab) => (tabDomain(tab) ?? '').toLowerCase().includes(q));
  }, [tabs, siteFilter]);

  async function handleGlobalClear() {
    setGlobalStatus('clearing');
    try {
      await clearGlobal(selectedTypes);
      setGlobalStatus('done');
    } catch (err) {
      console.error('Cache Cleaner: global clear failed', err);
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
      const ok = await clearTab(tab, siteScopedIds(selectedTypes));
      if (!ok) setFailedTabIds((s) => new Set(s).add(tab.id!));
      else if (autoReloadAfterClear) {
        markReloading(tab.id);
        browser.tabs.reload(tab.id);
      }
    } catch (err) {
      console.error('Cache Cleaner: site clear failed', err);
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
      const ids = siteScopedIds(selectedTypes);
      setBusyTabIds(new Set(targets.map((t) => t.id!)));
      const results = await Promise.allSettled(
        targets.map((tab) => clearTabData(tab, ids).then((ok) => ({ tab, ok }))),
      );
      const failed = new Set<number>();
      for (const result of results) {
        if (result.status === 'rejected') continue;
        const { tab, ok } = result.value;
        if (!ok) failed.add(tab.id!);
        else if (autoReloadAfterClear) {
          markReloading(tab.id!);
          browser.tabs.reload(tab.id!);
        }
      }
      setFailedTabIds(failed);
      setBulkStatus(failed.size === 0 ? 'done' : 'failed');
    } catch (err) {
      console.error('Cache Cleaner: clear-all-tabs failed', err);
      setBulkStatus('failed');
    }
    setBusyTabIds(new Set());
    setTimeout(() => setBulkStatus('idle'), 1500);
  }

  async function handleDeleteHistoryItem(url: string) {
    await browser.history.deleteUrl({ url });
    setHistory((h) => h.filter((item) => item.url !== url));
  }

  return (
    <div className="min-h-screen w-full bg-white dark:bg-neutral-950">
      <div className="text-neutral-900 dark:text-neutral-100 p-8 max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">Cache Cleaner — Settings</h1>
          <button
            onClick={resetSettings}
            className="rounded-md border border-neutral-300 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800 cursor-pointer px-3 py-1.5 text-xs"
          >
            Reset to defaults
          </button>
        </div>

        <section className="mb-8">
          <h2 className="text-sm uppercase tracking-wide text-neutral-500 dark:text-neutral-400 mb-2">
            Theme
          </h2>
          <div className="flex gap-4">
            {(['system', 'light', 'dark'] as const).map((t) => (
              <label key={t} className="flex items-center gap-2 text-sm cursor-pointer capitalize">
                <input
                  type="radio"
                  checked={theme === t}
                  onChange={() => setTheme(t)}
                  className="cursor-pointer"
                />
                {t}
              </label>
            ))}
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-sm uppercase tracking-wide text-neutral-500 dark:text-neutral-400 mb-2">
            Behavior
          </h2>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={autoReloadAfterClear}
              onChange={(e) => setAutoReloadAfterClear(e.target.checked)}
              className="accent-blue-500 cursor-pointer"
            />
            Reload tab after clearing (per-site only)
          </label>
        </section>

        <section className="mb-8">
          <h2 className="text-sm uppercase tracking-wide text-neutral-500 dark:text-neutral-400 mb-2">Data types</h2>
          <DataTypeGrid
            types={DATA_TYPES}
            selected={selectedTypes}
            onToggle={toggleType}
            isDisabled={(t) => scopeMode === 'site' && !t.siteScoped}
            renderBadge={(t) =>
              scopeMode === 'site' && !t.siteScoped ? <span className="text-xs">(global only)</span> : null
            }
          />
          {scopeMode === 'site' && (
            <p className="text-xs text-neutral-500 mt-2">
              History, Download History, and Form Data can't be scoped to one site — they only clear
              in Global mode.
            </p>
          )}
          {scopeMode === 'global' && (
            <p className="text-xs text-neutral-500 mt-2">
              Local Storage and Session Storage share one browser API in Global mode — checking
              either one clears both.
            </p>
          )}
        </section>

        <section className="mb-8">
          <h2 className="text-sm uppercase tracking-wide text-neutral-500 dark:text-neutral-400 mb-2">Scope</h2>
          <div className="flex gap-6 mb-4">
            <label className="flex items-start gap-2 text-sm max-w-xs cursor-pointer">
              <input
                type="radio"
                className="mt-0.5 cursor-pointer"
                checked={scopeMode === 'global'}
                onChange={() => setScopeMode('global')}
              />
              <span>
                <span className="block font-medium">Global</span>
                <span className="block text-xs text-neutral-500">
                  Clears the checked types for every site you've visited, not just the one you're
                  on. No extra permission needed.
                </span>
              </span>
            </label>
            <label className="flex items-start gap-2 text-sm max-w-xs cursor-pointer">
              <input
                type="radio"
                className="mt-0.5 cursor-pointer"
                checked={scopeMode === 'site'}
                onChange={() => setScopeMode('site')}
              />
              <span>
                <span className="block font-medium">Per site / domain</span>
                <span className="block text-xs text-neutral-500">
                  Pick one open tab below; only that site's data is cleared, everything else is
                  untouched. Asks for one-time site permission the first time you clear.
                </span>
              </span>
            </label>
          </div>

          {scopeMode === 'global' ? (
            <div className="max-w-xs">
              <DangerConfirmButton
                status={globalStatus}
                idleLabel="Clear all sites"
                confirmLabel="Yes, clear everything"
                onConfirm={handleGlobalClear}
              />
            </div>
          ) : (
            <div>
              <p className="text-xs text-neutral-500 mb-2">
                Only open tabs can be targeted.
                {isGeckoBased() &&
                  ' This browser clears via the page itself, so unreachable (backgrounded/discarded) tabs may not fully clear.'}
              </p>

              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={siteFilter}
                  onChange={(e) => setSiteFilter(e.target.value)}
                  placeholder="Filter open tabs by domain…"
                  className="flex-1 rounded-md border border-neutral-300 bg-white dark:border-neutral-700 dark:bg-neutral-900 px-3 py-1.5 text-sm placeholder:text-neutral-500 focus:outline-none focus:border-blue-500"
                />
                <button
                  onClick={handleClearAllTabs}
                  disabled={bulkStatus === 'clearing' || filteredTabs.length === 0}
                  className="rounded-md bg-blue-600 hover:bg-blue-500 text-white cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 px-3 py-1.5 text-xs font-medium whitespace-nowrap"
                >
                  {bulkStatus === 'clearing'
                    ? 'Clearing…'
                    : bulkStatus === 'done'
                      ? 'Cleared ✓'
                      : bulkStatus === 'failed'
                        ? 'Some failed'
                        : `Clear all (${filteredTabs.length})`}
                </button>
              </div>

              <TabClearList
                tabs={filteredTabs}
                busyTabIds={busyTabIds}
                failedTabIds={failedTabIds}
                reloadingTabIds={reloadingTabIds}
                onClear={handleSiteClear}
              />
            </div>
          )}
        </section>

        {selectedTypes.includes('history') && (
          <section>
            <h2 className="text-sm uppercase tracking-wide text-neutral-500 dark:text-neutral-400 mb-2">Recent history</h2>
            <HistoryList items={history} onDelete={handleDeleteHistoryItem} />
          </section>
        )}
      </div>
    </div>
  );
}
