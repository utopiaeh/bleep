import { useEffect, useMemo, useState } from 'react';
import { browser, type Browser } from 'wxt/browser';
import { DangerConfirmButton } from '../../components/DangerConfirmButton';
import { DataTypeGrid } from '../../components/DataTypeGrid';
import { HelpPanel } from '../../components/HelpPanel';
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

const SITE_TYPES = DATA_TYPES.filter(
  (type) => type.siteScoped && !(type.id === 'cache' && isGeckoBased()),
);

export default function App() {
  useTheme();
  const t = useTranslation();
  const [activeTab, setActiveTab] = useState<'settings' | 'help'>('settings');
  const {
    selectedTypesGlobal,
    selectedTypesSite,
    toggleTypeGlobal,
    toggleTypeSite,
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
    if (!isGeckoBased()) {
      browser.tabs.query({}).then(setTabs);
    }
  }, []);

  useEffect(() => {
    if (selectedTypesGlobal.includes('history')) {
      browser.history.search({ text: '', maxResults: 25 }).then(setHistory);
    }
  }, [selectedTypesGlobal]);

  const filteredTabs = useMemo(() => {
    const q = siteFilter.trim().toLowerCase();
    if (!q) return tabs;
    return tabs.filter((tab) => (tabDomain(tab) ?? '').toLowerCase().includes(q));
  }, [tabs, siteFilter]);

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
      else if (autoReloadAfterClear) {
        markReloading(tab.id);
        browser.tabs.reload(tab.id, { bypassCache: true });
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
      for (const result of results) {
        if (result.status === 'rejected') continue;
        const { tab, ok } = result.value;
        if (!ok) failed.add(tab.id!);
        else if (autoReloadAfterClear) {
          markReloading(tab.id!);
          browser.tabs.reload(tab.id!, { bypassCache: true });
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
    <div className="min-h-screen w-full bg-stone-50 dark:bg-stone-900">
      <div className="text-stone-900 dark:text-stone-100 p-8 max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <img src="/icon/48.png" alt="" className="w-8 h-8 shrink-0" />
          <h1 className="text-2xl font-semibold whitespace-nowrap">{t('settingsTitle')}</h1>
        </div>

        <div className="flex gap-4 mb-6 border-b border-stone-200 dark:border-stone-700">
          {(['settings', 'help'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-2 text-sm cursor-pointer border-b-2 -mb-px ${
                activeTab === tab
                  ? 'border-blue-600 font-medium'
                  : 'border-transparent text-stone-500 hover:text-stone-900 dark:hover:text-stone-100'
              }`}
            >
              {tab === 'settings' ? t('tabSettings') : t('tabHelp')}
            </button>
          ))}
        </div>

        {activeTab === 'help' && <HelpPanel />}

        {activeTab === 'settings' && (
          <>
            <section className="mb-8">
              <h2 className="text-sm uppercase tracking-wide text-stone-500 dark:text-stone-400 mb-2">
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
              <h2 className="text-sm uppercase tracking-wide text-stone-500 dark:text-stone-400 mb-2">
                {t('language')}
              </h2>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as Language)}
                className="rounded-md border border-stone-300 bg-stone-50 dark:border-stone-600 dark:bg-stone-800 px-3 py-1.5 text-sm cursor-pointer focus:outline-none focus:border-blue-500"
              >
                <option value="auto">{t('languageAuto')}</option>
                <option value="en">{t('languageEnglish')}</option>
                <option value="ru">{t('languageRussian')}</option>
                <option value="ro">{t('languageRomanian')}</option>
                <option value="uk">{t('languageUkrainian')}</option>
              </select>
            </section>

            <section className="mb-8">
              <h2 className="text-sm uppercase tracking-wide text-stone-500 dark:text-stone-400 mb-2">
                {t('scopeGlobal')}
              </h2>
              <p className="text-xs text-stone-500 mb-2">{t('scopeGlobalDescription')}</p>
              <DataTypeGrid
                types={DATA_TYPES}
                selected={selectedTypesGlobal}
                onToggle={toggleTypeGlobal}
                className="mb-2"
              />
              <p className="text-xs text-stone-500 mb-3">{t('storageKeyShareNote')}</p>
              <div className="max-w-xs">
                <DangerConfirmButton
                  status={globalStatus}
                  idleLabel={t('clearAllSites')}
                  confirmLabel={t('yesClearEverything')}
                  onConfirm={handleGlobalClear}
                />
              </div>
            </section>

            <hr className="border-stone-200 dark:border-stone-700 mb-8" />

            <section className="mb-8">
              <h2 className="text-sm uppercase tracking-wide text-stone-500 dark:text-stone-400 mb-2">
                {t('scopePerSite')}
              </h2>
              <p className="text-xs text-stone-500 mb-2">{t('scopePerSiteDescription')}</p>
              <DataTypeGrid
                types={SITE_TYPES}
                selected={selectedTypesSite}
                onToggle={toggleTypeSite}
                className="mb-3"
              />

              <label className="flex items-center gap-2 text-sm cursor-pointer mb-3">
                <input
                  type="checkbox"
                  checked={autoReloadAfterClear}
                  onChange={(e) => setAutoReloadAfterClear(e.target.checked)}
                  className="accent-blue-500 cursor-pointer"
                />
                {t('reloadTabAfterClearingPerSite')}
              </label>

              {!isGeckoBased() && (
                <div>
                  <p className="text-xs text-stone-500 mb-2">{t('openTabsOnly')}</p>

                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={siteFilter}
                      onChange={(e) => setSiteFilter(e.target.value)}
                      placeholder={t('filterTabsPlaceholder')}
                      className="flex-1 rounded-md border border-stone-300 bg-stone-50 dark:border-stone-600 dark:bg-stone-800 px-3 py-1.5 text-sm placeholder:text-stone-500 focus:outline-none focus:border-blue-500"
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

            {selectedTypesGlobal.includes('history') && (
              <section className="mb-8">
                <h2 className="text-sm uppercase tracking-wide text-stone-500 dark:text-stone-400 mb-2">
                  {t('recentHistory')}
                </h2>
                <HistoryList items={history} onDelete={handleDeleteHistoryItem} />
              </section>
            )}

            <div className="pt-4 border-t border-stone-200 dark:border-stone-700 flex justify-end">
              <button
                onClick={resetSettings}
                className="rounded-md border border-stone-300 hover:bg-stone-100 dark:border-stone-600 dark:hover:bg-stone-700 cursor-pointer px-3 py-1.5 text-xs"
              >
                {t('resetToDefaults')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
