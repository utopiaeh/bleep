import { useEffect, useMemo, useState } from 'react';
import { browser, type Browser } from 'wxt/browser';
import { useSettingsStore } from '../../store/settings';
import {
  clearGlobal,
  clearTab,
  clearTabData,
  requestOriginPermission,
  siteScopedIds,
} from '../../utils/clearing';
import { DATA_TYPES } from '../../utils/data-types';

type Tab = Browser.tabs.Tab;
type HistoryItem = Browser.history.HistoryItem;

export default function App() {
  const {
    selectedTypes,
    toggleType,
    scopeMode,
    setScopeMode,
    autoReloadAfterClear,
    setAutoReloadAfterClear,
  } = useSettingsStore();
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [siteFilter, setSiteFilter] = useState('');
  const [busyTabIds, setBusyTabIds] = useState<Set<number>>(new Set());
  const [failedTabIds, setFailedTabIds] = useState<Set<number>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<'idle' | 'clearing' | 'done' | 'failed'>('idle');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [globalStatus, setGlobalStatus] = useState<'idle' | 'clearing' | 'done' | 'failed'>('idle');

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
    return tabs.filter((tab) => `${tab.title ?? ''} ${tab.url ?? ''}`.toLowerCase().includes(q));
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
    if (tab.id == null) return;
    setBusyTabIds((s) => new Set(s).add(tab.id!));
    setFailedTabIds((s) => {
      const next = new Set(s);
      next.delete(tab.id!);
      return next;
    });
    try {
      const ok = await clearTab(tab, siteScopedIds(selectedTypes));
      if (!ok) setFailedTabIds((s) => new Set(s).add(tab.id!));
      else if (autoReloadAfterClear) browser.tabs.reload(tab.id);
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
    const targets = filteredTabs.filter((t) => t.id != null);
    if (targets.length === 0) return;
    setBulkStatus('clearing');
    try {
      // Permission request must be the first await, directly off the click's user gesture.
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
        else if (autoReloadAfterClear) browser.tabs.reload(tab.id!);
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
    <div className="min-h-screen w-full bg-neutral-950">
      <div className="text-neutral-100 p-8 max-w-3xl mx-auto">
        <h1 className="text-2xl font-semibold mb-6">Cache Cleaner — Full Control</h1>

        <section className="mb-8">
          <h2 className="text-sm uppercase tracking-wide text-neutral-400 mb-2">Behavior</h2>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={autoReloadAfterClear}
              onChange={(e) => setAutoReloadAfterClear(e.target.checked)}
              className="accent-blue-500"
            />
            Reload tab after clearing (per-site only)
          </label>
        </section>

        <section className="mb-8">
          <h2 className="text-sm uppercase tracking-wide text-neutral-400 mb-2">Data types</h2>
          <div className="grid grid-cols-2 gap-2">
            {DATA_TYPES.map((t) => {
              const disabledBySite = scopeMode === 'site' && !t.siteScoped;
              return (
                <label
                  key={t.id}
                  className={`flex items-center gap-2 text-sm ${disabledBySite ? 'text-neutral-500' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={selectedTypes.includes(t.id)}
                    onChange={() => toggleType(t.id)}
                    disabled={disabledBySite}
                    className="accent-blue-500"
                  />
                  {t.label}
                  {disabledBySite && <span className="text-xs">(global only)</span>}
                </label>
              );
            })}
          </div>
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
          <h2 className="text-sm uppercase tracking-wide text-neutral-400 mb-2">Scope</h2>
          <div className="flex gap-6 mb-4">
            <label className="flex items-start gap-2 text-sm max-w-xs">
              <input
                type="radio"
                className="mt-0.5"
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
            <label className="flex items-start gap-2 text-sm max-w-xs">
              <input
                type="radio"
                className="mt-0.5"
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
            <button
              onClick={handleGlobalClear}
              disabled={globalStatus === 'clearing'}
              className="rounded-md bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-4 py-2 text-sm font-medium"
            >
              {globalStatus === 'clearing'
                ? 'Clearing…'
                : globalStatus === 'done'
                  ? 'Cleared ✓'
                  : globalStatus === 'failed'
                    ? 'Failed'
                    : 'Clear all sites'}
            </button>
          ) : (
            <div>
              <p className="text-xs text-neutral-500 mb-2">
                Only open tabs can be targeted. Firefox clears via the page itself, so unreachable
                (backgrounded/discarded) tabs may not fully clear.
              </p>

              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={siteFilter}
                  onChange={(e) => setSiteFilter(e.target.value)}
                  placeholder="Filter open tabs by title or URL…"
                  className="flex-1 rounded-md border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-sm placeholder:text-neutral-500 focus:outline-none focus:border-blue-500"
                />
                <button
                  onClick={handleClearAllTabs}
                  disabled={bulkStatus === 'clearing' || filteredTabs.length === 0}
                  className="rounded-md bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-3 py-1.5 text-xs font-medium whitespace-nowrap"
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

              <ul className="divide-y divide-neutral-800 rounded-md border border-neutral-800 max-h-80 overflow-y-auto">
                {filteredTabs.length === 0 && (
                  <li className="px-3 py-4 text-sm text-neutral-500 text-center">
                    No matching tabs.
                  </li>
                )}
                {filteredTabs.map((tab) => (
                  <li key={tab.id} className="flex items-center justify-between px-3 py-2">
                    <span className="text-sm truncate max-w-md">{tab.title ?? tab.url}</span>
                    <button
                      onClick={() => handleSiteClear(tab)}
                      disabled={tab.id != null && busyTabIds.has(tab.id)}
                      className="rounded-md border border-neutral-700 hover:bg-neutral-800 disabled:opacity-50 px-3 py-1 text-xs whitespace-nowrap"
                    >
                      {tab.id != null && busyTabIds.has(tab.id)
                        ? 'Clearing…'
                        : tab.id != null && failedTabIds.has(tab.id)
                          ? 'Failed'
                          : 'Clear'}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {selectedTypes.includes('history') && (
          <section>
            <h2 className="text-sm uppercase tracking-wide text-neutral-400 mb-2">
              Recent history
            </h2>
            <ul className="divide-y divide-neutral-800 rounded-md border border-neutral-800">
              {history.map((item) => (
                <li key={item.id} className="flex items-center justify-between px-3 py-2">
                  <span className="text-sm truncate max-w-md">{item.title || item.url}</span>
                  <button
                    onClick={() => item.url && handleDeleteHistoryItem(item.url)}
                    className="rounded-md border border-neutral-700 hover:bg-neutral-800 px-3 py-1 text-xs"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
