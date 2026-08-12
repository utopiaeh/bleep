import { useEffect, useMemo, useState } from 'react';
import { browser, type Browser } from 'wxt/browser';
import { DangerConfirmButton } from '../../components/DangerConfirmButton';
import { DataTypeGrid } from '../../components/DataTypeGrid';
import { HistoryList } from '../../components/HistoryList';
import { type ClearStatus } from '../../components/StatusButton';
import { TabClearList } from '../../components/TabClearList';
import { useReloadGuard } from '../../hooks/useReloadGuard';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../hooks/useTranslation';
import { useSettingsStore } from '../../store/settings';
import { isGeckoBased } from '../../utils/browser-info';
import type { Language } from '../../utils/i18n';
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
  const t = useTranslation();
  const {
    selectedTypes,
    toggleType,
    scopeMode,
    setScopeMode,
    autoReloadAfterClear,
    setAutoReloadAfterClear,
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
      const ok = await clearTab(tab, siteScopedIds(selectedTypes));
      if (!ok) setFailedTabIds((s) => new Set(s).add(tab.id!));
      else if (autoReloadAfterClear) {
        markReloading(tab.id);
        browser.tabs.reload(tab.id);
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
      console.error('Bleep: clear-all-tabs failed', err);
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
          <div className="flex items-center gap-3">
            <img src="/icon/48.png" alt="" className="w-8 h-8" />
            <h1 className="text-2xl font-semibold">{t('settingsTitle')}</h1>
          </div>
          <button
            onClick={resetSettings}
            className="rounded-md border border-neutral-300 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800 cursor-pointer px-3 py-1.5 text-xs"
          >
            {t('resetToDefaults')}
          </button>
        </div>

        <section className="mb-8">
          <h2 className="text-sm uppercase tracking-wide text-neutral-500 dark:text-neutral-400 mb-2">
            {t('theme')}
          </h2>
          <div className="flex gap-4">
            {(
              [
                ['system', t('themeSystem')],
                ['light', t('themeLight')],
                ['dark', t('themeDark')],
              ] as const
            ).map(([value, label]) => (
              <label key={value} className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="radio"
                  checked={theme === value}
                  onChange={() => setTheme(value)}
                  className="cursor-pointer"
                />
                {label}
              </label>
            ))}
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-sm uppercase tracking-wide text-neutral-500 dark:text-neutral-400 mb-2">
            {t('language')}
          </h2>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as Language)}
            className="rounded-md border border-neutral-300 bg-white dark:border-neutral-700 dark:bg-neutral-900 px-3 py-1.5 text-sm cursor-pointer focus:outline-none focus:border-blue-500"
          >
            <option value="auto">{t('languageAuto')}</option>
            <option value="en">{t('languageEnglish')}</option>
            <option value="ru">{t('languageRussian')}</option>
            <option value="ro">{t('languageRomanian')}</option>
            <option value="uk">{t('languageUkrainian')}</option>
          </select>
        </section>

        <section className="mb-8">
          <h2 className="text-sm uppercase tracking-wide text-neutral-500 dark:text-neutral-400 mb-2">
            {t('behavior')}
          </h2>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={autoReloadAfterClear}
              onChange={(e) => setAutoReloadAfterClear(e.target.checked)}
              className="accent-blue-500 cursor-pointer"
            />
            {t('reloadTabAfterClearingPerSite')}
          </label>
        </section>

        <section className="mb-8">
          <h2 className="text-sm uppercase tracking-wide text-neutral-500 dark:text-neutral-400 mb-2">
            {t('dataTypes')}
          </h2>
          <DataTypeGrid
            types={DATA_TYPES}
            selected={selectedTypes}
            onToggle={toggleType}
            isDisabled={(type) => scopeMode === 'site' && !type.siteScoped}
            renderBadge={(type) =>
              scopeMode === 'site' && !type.siteScoped ? (
                <span className="text-xs">{t('globalOnly')}</span>
              ) : null
            }
          />
          {scopeMode === 'site' && <p className="text-xs text-neutral-500 mt-2">{t('siteScopeNote')}</p>}
          {scopeMode === 'global' && (
            <p className="text-xs text-neutral-500 mt-2">{t('storageKeyShareNote')}</p>
          )}
        </section>

        <section className="mb-8">
          <h2 className="text-sm uppercase tracking-wide text-neutral-500 dark:text-neutral-400 mb-2">
            {t('scope')}
          </h2>
          <div className="flex gap-6 mb-4">
            <label className="flex items-start gap-2 text-sm max-w-xs cursor-pointer">
              <input
                type="radio"
                className="mt-0.5 cursor-pointer"
                checked={scopeMode === 'global'}
                onChange={() => setScopeMode('global')}
              />
              <span>
                <span className="block font-medium">{t('scopeGlobal')}</span>
                <span className="block text-xs text-neutral-500">{t('scopeGlobalDescription')}</span>
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
                <span className="block font-medium">{t('scopePerSite')}</span>
                <span className="block text-xs text-neutral-500">{t('scopePerSiteDescription')}</span>
              </span>
            </label>
          </div>

          {scopeMode === 'global' ? (
            <div className="max-w-xs">
              <DangerConfirmButton
                status={globalStatus}
                idleLabel={t('clearAllSites')}
                confirmLabel={t('yesClearEverything')}
                onConfirm={handleGlobalClear}
              />
            </div>
          ) : (
            <div>
              <p className="text-xs text-neutral-500 mb-2">
                {t('openTabsOnly')}
                {isGeckoBased() && t('geckoClearNote')}
              </p>

              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={siteFilter}
                  onChange={(e) => setSiteFilter(e.target.value)}
                  placeholder={t('filterTabsPlaceholder')}
                  className="flex-1 rounded-md border border-neutral-300 bg-white dark:border-neutral-700 dark:bg-neutral-900 px-3 py-1.5 text-sm placeholder:text-neutral-500 focus:outline-none focus:border-blue-500"
                />
                <button
                  onClick={handleClearAllTabs}
                  disabled={bulkStatus === 'clearing' || filteredTabs.length === 0}
                  className="rounded-md bg-blue-600 hover:bg-blue-500 text-white cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 px-3 py-1.5 text-xs font-medium whitespace-nowrap"
                >
                  {bulkStatus === 'clearing'
                    ? t('clearing')
                    : bulkStatus === 'done'
                      ? t('cleared')
                      : bulkStatus === 'failed'
                        ? t('someFailed')
                        : t('clearAllCount', { count: filteredTabs.length })}
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
            <h2 className="text-sm uppercase tracking-wide text-neutral-500 dark:text-neutral-400 mb-2">
              {t('recentHistory')}
            </h2>
            <HistoryList items={history} onDelete={handleDeleteHistoryItem} />
          </section>
        )}
      </div>
    </div>
  );
}
