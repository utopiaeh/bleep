import { useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import { DangerConfirmButton } from '../../components/DangerConfirmButton';
import { DataTypeGrid } from '../../components/DataTypeGrid';
import { BehaviorToggles } from '../../components/popup/BehaviorToggles';
import { StatusButton, type ClearStatus } from '../../components/StatusButton';
import { useBrowserName } from '../../hooks/useBrowserName';
import { useReloadGuard } from '../../hooks/useReloadGuard';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../hooks/useTranslation';
import { recordClear } from '../../store/clearLog';
import { useSettingsStore } from '../../store/settings';
import { GITHUB_REPO_URL, storeReviewUrl } from '../../utils/browser-info';
import { runClear } from '../../utils/clear-status';
import {
  allowedSiteIds,
  clearGlobal,
  clearSiteWithLinked,
  isProtectedSite,
  protectedExcludeOrigins,
  requestOriginPermission,
  siteScopedIds,
  tabHostname,
} from '../../utils/clearing';
import { siteScopedDataTypes } from '../../utils/data-types';
import { flashClearResult } from '../../utils/flash';

const QUICK_TYPES = siteScopedDataTypes().filter((t) => t.quick);
const FOOTER_BUTTON =
  'rounded-md border border-stone-300 hover:bg-stone-100 dark:border-stone-600 dark:hover:bg-stone-700 cursor-pointer';

export default function App() {
  useTheme();
  const t = useTranslation();
  const browserName = useBrowserName();
  const selectedTypesSite = useSettingsStore((s) => s.selectedTypesSite);
  const toggleTypeSite = useSettingsStore((s) => s.toggleTypeSite);
  const setTypesSite = useSettingsStore((s) => s.setTypesSite);
  const selectedTypesGlobal = useSettingsStore((s) => s.selectedTypesGlobal);
  const autoReloadAfterClear = useSettingsStore((s) => s.autoReloadAfterClear);
  const setAutoReloadAfterClear = useSettingsStore((s) => s.setAutoReloadAfterClear);
  const linkedOrigins = useSettingsStore((s) => s.linkedOrigins);
  const useOriginMappings = useSettingsStore((s) => s.useOriginMappings);
  const setUseOriginMappings = useSettingsStore((s) => s.setUseOriginMappings);
  const protectedSites = useSettingsStore((s) => s.protectedSites);
  const [status, setStatus] = useState<ClearStatus>('idle');
  const [tabStatus, setTabStatus] = useState<ClearStatus>('idle');
  const [activeTabId, setActiveTabId] = useState<number | null>(null);
  const [activeTabHostname, setActiveTabHostname] = useState<string | null>(null);
  const { markReloading, isReloading } = useReloadGuard();

  useEffect(() => {
    browser.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
      setActiveTabId(tab?.id ?? null);
      setActiveTabHostname(tab ? tabHostname(tab) : null);
    });
  }, []);

  const cookiesKept =
    activeTabHostname != null &&
    selectedTypesSite.includes('cookies') &&
    allowedSiteIds(activeTabHostname, ['cookies'], protectedSites)?.length === 0;
  const isActiveTabProtected =
    activeTabHostname != null && isProtectedSite(protectedSites, activeTabHostname);

  async function handleClear() {
    let ok = false;
    await runClear(setStatus, async () => {
      await clearGlobal(selectedTypesGlobal, await protectedExcludeOrigins(protectedSites));
      recordClear('(global)', selectedTypesGlobal);
      ok = true;
    });
    flashClearResult(ok, activeTabId ?? undefined);
  }

  async function handleClearActiveTab() {
    if (isActiveTabProtected) return;
    setTabStatus('clearing');
    let ok = false;
    try {
      const granted = await requestOriginPermission();
      const [activeTab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (isReloading(activeTab?.id)) {
        setTabStatus('failed');
      } else {
        const ids = siteScopedIds(selectedTypesSite);
        const linkedTargets =
          granted && activeTab
            ? await clearSiteWithLinked(activeTab, ids, {
                useOriginMappings,
                linkedOrigins,
                protectedSites,
              })
            : null;
        ok = linkedTargets != null;
        if (linkedTargets && activeTab) {
          recordClear(tabHostname(activeTab) ?? activeTab.url ?? '?', ids, linkedTargets);
        }
        setTabStatus(ok ? 'done' : 'failed');
        if (ok && autoReloadAfterClear && activeTab?.id != null) {
          markReloading(activeTab.id);
          browser.tabs.reload(activeTab.id, { bypassCache: true });
        }
      }
    } catch (err) {
      console.error('Bleep: active tab clear failed', err);
      setTabStatus('failed');
    }
    flashClearResult(ok, activeTabId ?? undefined);
    setTimeout(() => setTabStatus('idle'), 1500);
  }

  return (
    <div className="w-86 p-4 bg-stone-50 text-stone-900 dark:bg-stone-800 dark:text-stone-100">
      <div className="flex items-center gap-2 mb-3">
        <img src="/icon/48.png" alt="" className="w-6 h-6" />
        <h1 className="text-lg font-semibold">{t('popupTitle')}</h1>
      </div>

      <DataTypeGrid
        types={QUICK_TYPES}
        selected={selectedTypesSite}
        onToggle={toggleTypeSite}
        onSetAll={setTypesSite}
        className="mb-3"
      />

      <hr className="border-stone-200 dark:border-stone-700 mb-3" />

      <BehaviorToggles
        autoReloadAfterClear={autoReloadAfterClear}
        onAutoReloadChange={setAutoReloadAfterClear}
        useOriginMappings={useOriginMappings}
        onUseOriginMappingsChange={setUseOriginMappings}
      />

      <hr className="border-stone-200 dark:border-stone-700 my-3" />

      <StatusButton
        status={isReloading(activeTabId) ? 'clearing' : tabStatus}
        onClick={handleClearActiveTab}
        disabled={isReloading(activeTabId) || isActiveTabProtected}
        idleLabel={isActiveTabProtected ? t('protectedSiteLabel') : t('clearActiveTabOnly')}
        clearingLabel={isReloading(activeTabId) ? t('reloading') : t('clearing')}
        failedLabel={t('failedOrDenied')}
      />
      <p className="text-xs text-stone-500 mt-1">
        {isActiveTabProtected ? t('protectedSiteHint') : t('activeTabHint')}
      </p>
      {cookiesKept && (
        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">{t('cookiesKeptHint')}</p>
      )}

      <div className="mt-3">
        <DangerConfirmButton
          status={status}
          idleLabel={t('clearAllSites')}
          confirmLabel={t('yesClearEverything')}
          onConfirm={handleClear}
        />
      </div>
      <p className="text-xs text-stone-500 mt-1">{t('allSitesHint')}</p>
      {protectedSites.trim() && (
        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
          {browserName
            ? t('protectedSitesGlobalNoteFirefox', { browser: browserName })
            : t('protectedSitesGlobalNoteChrome')}
        </p>
      )}

      <div className="flex gap-2 mt-2">
        <button
          onClick={() => browser.runtime.openOptionsPage()}
          className={`flex-1 py-2 text-sm ${FOOTER_BUTTON}`}
        >
          {t('settings')}
        </button>
        <a
          href={GITHUB_REPO_URL}
          target="_blank"
          rel="noreferrer"
          title={t('githubRepoLink')}
          aria-label={t('githubRepoLink')}
          className={`px-2.5 flex items-center ${FOOTER_BUTTON}`}
        >
          <svg viewBox="0 0 16 16" className="w-4 h-4" fill="currentColor" aria-hidden="true">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
          </svg>
        </a>
        <a
          href={storeReviewUrl()}
          target="_blank"
          rel="noreferrer"
          title={t('helpReviewLink')}
          aria-label={t('helpReviewLink')}
          className={`px-2.5 flex items-center ${FOOTER_BUTTON}`}
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor" aria-hidden="true">
            <path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
          </svg>
        </a>
      </div>
    </div>
  );
}
