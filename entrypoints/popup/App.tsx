import { useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import { DangerConfirmButton } from '../../components/DangerConfirmButton';
import { DataTypeGrid } from '../../components/DataTypeGrid';
import { BehaviorToggles } from '../../components/popup/BehaviorToggles';
import { StatusButton, type ClearStatus } from '../../components/StatusButton';
import { useReloadGuard } from '../../hooks/useReloadGuard';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../hooks/useTranslation';
import { recordClear } from '../../store/clearLog';
import { useSettingsStore } from '../../store/settings';
import {
  clearGlobal,
  clearLinkedOrigin,
  clearTabData,
  dedupeSitesByHostname,
  filterProtectedTargets,
  isProtectedSite,
  linkedOriginsFor,
  requestOriginPermission,
  siteScopedIds,
  tabCookieStoreId,
  tabDomain,
  tabOrigin,
} from '../../utils/clearing';
import { siteScopedDataTypes } from '../../utils/data-types';

const QUICK_TYPES = siteScopedDataTypes().filter((t) => t.quick);

export default function App() {
  useTheme();
  const t = useTranslation();
  const selectedTypesSite = useSettingsStore((s) => s.selectedTypesSite);
  const toggleTypeSite = useSettingsStore((s) => s.toggleTypeSite);
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
  const [activeTabDomain, setActiveTabDomain] = useState<string | null>(null);
  const { markReloading, isReloading } = useReloadGuard();

  useEffect(() => {
    browser.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
      setActiveTabId(tab?.id ?? null);
      setActiveTabDomain(tab ? tabDomain(tab) : null);
    });
  }, []);

  const isActiveTabProtected = activeTabDomain != null && isProtectedSite(protectedSites, activeTabDomain);

  async function handleClear() {
    setStatus('clearing');
    try {
      // Only fetch history (needed to resolve protected hostnames to real origins) if
      // there's actually something to exclude — most popup opens won't need this.
      let excludeOrigins: string[] = [];
      if (protectedSites.trim()) {
        const historyItems = await browser.history.search({ text: '', maxResults: 1000 });
        excludeOrigins = dedupeSitesByHostname(historyItems.map((item) => item.url))
          .filter((site) => isProtectedSite(protectedSites, site.hostname))
          .map((site) => site.origin);
      }
      await clearGlobal(selectedTypesGlobal, excludeOrigins);
      recordClear('(global)', selectedTypesGlobal);
      setStatus('done');
    } catch (err) {
      console.error('Bleep: global clear failed', err);
      setStatus('failed');
    }
    setTimeout(() => setStatus('idle'), 1500);
  }

  async function handleClearActiveTab() {
    if (isActiveTabProtected) return;
    setTabStatus('clearing');
    try {
      const granted = await requestOriginPermission();
      const [activeTab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (isReloading(activeTab?.id)) {
        setTabStatus('failed');
      } else {
        const ids = siteScopedIds(selectedTypesSite);
        const ok = granted && activeTab ? await clearTabData(activeTab, ids) : false;
        if (ok && activeTab) {
          let linkedTargets: string[] = [];
          if (useOriginMappings) {
            const origin = tabOrigin(activeTab);
            const cookieStoreId = tabCookieStoreId(activeTab);
            if (origin) {
              linkedTargets = filterProtectedTargets(linkedOriginsFor(linkedOrigins, origin), protectedSites);
              await Promise.all(
                linkedTargets.map((target) => clearLinkedOrigin(target, ids, cookieStoreId)),
              );
            }
          }
          recordClear(tabDomain(activeTab) ?? activeTab.url ?? '?', ids, linkedTargets);
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

      <div className="mt-3">
        <DangerConfirmButton
          status={status}
          idleLabel={t('clearAllSites')}
          confirmLabel={t('yesClearEverything')}
          onConfirm={handleClear}
        />
      </div>
      <p className="text-xs text-stone-500 mt-1">{t('allSitesHint')}</p>

      <button
        onClick={() => browser.runtime.openOptionsPage()}
        className="w-full mt-2 rounded-md border border-stone-300 hover:bg-stone-100 dark:border-stone-600 dark:hover:bg-stone-700 cursor-pointer py-2 text-sm"
      >
        {t('settings')}
      </button>
    </div>
  );
}
