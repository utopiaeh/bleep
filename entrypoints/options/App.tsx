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
import { DEFAULTS, useSettingsStore, type Theme } from '../../store/settings';
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
import { DATA_TYPES, type DataTypeId } from '../../utils/data-types';

type Tab = Browser.tabs.Tab;

const SITE_TYPES = DATA_TYPES.filter((type) => type.siteScoped && !(type.id === 'cache' && isGeckoBased()));

function sameIds(a: DataTypeId[], b: DataTypeId[]): boolean {
  return [...a].sort().join(',') === [...b].sort().join(',');
}

export default function App() {
  useTheme();
  const t = useTranslation();
  const {
    selectedTypesGlobal,
    selectedTypesSite,
    autoReloadAfterClear,
    theme,
    language,
    setSelectedTypesGlobal,
    setSelectedTypesSite,
    setAutoReloadAfterClear,
    setTheme,
    setLanguage,
  } = useSettingsStore();

  const [draftTheme, setDraftTheme] = useState<Theme>(() => useSettingsStore.getState().theme);
  const [draftLanguage, setDraftLanguage] = useState<Language>(() => useSettingsStore.getState().language);
  const [draftAutoReload, setDraftAutoReload] = useState(
    () => useSettingsStore.getState().autoReloadAfterClear,
  );
  const [draftGlobal, setDraftGlobal] = useState<DataTypeId[]>(
    () => useSettingsStore.getState().selectedTypesGlobal,
  );
  const [draftSite, setDraftSite] = useState<DataTypeId[]>(() => useSettingsStore.getState().selectedTypesSite);
  // The popup writes selectedTypesSite directly (no save gate there). Until this
  // page's Site selection is touched, show the live value instead of a stale
  // snapshot — once touched, the draft takes over until saved or reset.
  const [siteTouched, setSiteTouched] = useState(false);
  const effectiveSite = siteTouched ? draftSite : selectedTypesSite;
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');

  const isDirty =
    draftTheme !== theme ||
    draftLanguage !== language ||
    draftAutoReload !== autoReloadAfterClear ||
    !sameIds(draftGlobal, selectedTypesGlobal) ||
    !sameIds(effectiveSite, selectedTypesSite);

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

  function toggleDraftGlobal(id: DataTypeId) {
    setDraftGlobal((current) => (current.includes(id) ? current.filter((t) => t !== id) : [...current, id]));
  }

  function toggleDraftSite(id: DataTypeId) {
    setDraftSite((current) => {
      const base = siteTouched ? current : effectiveSite;
      return base.includes(id) ? base.filter((t) => t !== id) : [...base, id];
    });
    setSiteTouched(true);
  }

  function handleSave() {
    setTheme(draftTheme);
    setLanguage(draftLanguage);
    setAutoReloadAfterClear(draftAutoReload);
    setSelectedTypesGlobal(draftGlobal);
    setSelectedTypesSite(effectiveSite);
    setSiteTouched(false);
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 1500);
  }

  function handleResetDraft() {
    setDraftTheme(DEFAULTS.theme);
    setDraftLanguage(DEFAULTS.language);
    setDraftAutoReload(DEFAULTS.autoReloadAfterClear);
    setDraftGlobal(DEFAULTS.selectedTypesGlobal);
    setDraftSite(DEFAULTS.selectedTypesSite);
    setSiteTouched(true);
  }

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
    <div className="min-h-screen w-full bg-white dark:bg-neutral-950">
      <div className="text-neutral-900 dark:text-neutral-100 p-8 max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <img src="/icon/48.png" alt="" className="w-8 h-8 shrink-0" />
          <h1 className="text-2xl font-semibold whitespace-nowrap">{t('settingsTitle')}</h1>
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
                  checked={draftTheme === value}
                  onChange={() => setDraftTheme(value)}
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
            value={draftLanguage}
            onChange={(e) => setDraftLanguage(e.target.value as Language)}
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
            {t('scopeGlobal')}
          </h2>
          <p className="text-xs text-neutral-500 mb-2">{t('scopeGlobalDescription')}</p>
          <DataTypeGrid types={DATA_TYPES} selected={draftGlobal} onToggle={toggleDraftGlobal} className="mb-2" />
          <p className="text-xs text-neutral-500 mb-3">{t('storageKeyShareNote')}</p>
          <div className="max-w-xs">
            <DangerConfirmButton
              status={globalStatus}
              idleLabel={t('clearAllSites')}
              confirmLabel={t('yesClearEverything')}
              onConfirm={handleGlobalClear}
            />
          </div>
        </section>

        <hr className="border-neutral-200 dark:border-neutral-800 mb-8" />

        <section className="mb-8">
          <h2 className="text-sm uppercase tracking-wide text-neutral-500 dark:text-neutral-400 mb-2">
            {t('scopePerSite')}
          </h2>
          <p className="text-xs text-neutral-500 mb-2">{t('scopePerSiteDescription')}</p>
          <DataTypeGrid types={SITE_TYPES} selected={effectiveSite} onToggle={toggleDraftSite} className="mb-3" />

          <label className="flex items-center gap-2 text-sm cursor-pointer mb-3">
            <input
              type="checkbox"
              checked={draftAutoReload}
              onChange={(e) => setDraftAutoReload(e.target.checked)}
              className="accent-blue-500 cursor-pointer"
            />
            {t('reloadTabAfterClearingPerSite')}
          </label>

          {!isGeckoBased() && (
            <div>
              <p className="text-xs text-neutral-500 mb-2">{t('openTabsOnly')}</p>

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

        {selectedTypesGlobal.includes('history') && (
          <section className="mb-8">
            <h2 className="text-sm uppercase tracking-wide text-neutral-500 dark:text-neutral-400 mb-2">
              {t('recentHistory')}
            </h2>
            <HistoryList items={history} onDelete={handleDeleteHistoryItem} />
          </section>
        )}

        <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800 flex justify-end gap-2">
          <button
            onClick={handleResetDraft}
            className="rounded-md border border-neutral-300 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800 cursor-pointer px-3 py-1.5 text-xs"
          >
            {t('resetToDefaults')}
          </button>
          <button
            onClick={handleSave}
            disabled={!isDirty}
            className="rounded-md bg-blue-600 hover:bg-blue-500 text-white cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 px-3 py-1.5 text-xs font-medium"
          >
            {saveStatus === 'saved' ? t('saved') : t('save')}
          </button>
        </div>
      </div>
    </div>
  );
}
