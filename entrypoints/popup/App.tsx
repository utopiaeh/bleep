import { useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import { DangerConfirmButton } from '../../components/DangerConfirmButton';
import { DataTypeGrid } from '../../components/DataTypeGrid';
import { StatusButton, type ClearStatus } from '../../components/StatusButton';
import { useReloadGuard } from '../../hooks/useReloadGuard';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../hooks/useTranslation';
import { useSettingsStore } from '../../store/settings';
import {
  clearGlobal,
  clearTabData,
  requestOriginPermission,
  siteScopedIds,
} from '../../utils/clearing';
import { DATA_TYPES } from '../../utils/data-types';

const QUICK_TYPES = DATA_TYPES.filter((t) => t.quick);

export default function App() {
  useTheme();
  const t = useTranslation();
  const selectedTypes = useSettingsStore((s) => s.selectedTypes);
  const toggleType = useSettingsStore((s) => s.toggleType);
  const autoReloadAfterClear = useSettingsStore((s) => s.autoReloadAfterClear);
  const setAutoReloadAfterClear = useSettingsStore((s) => s.setAutoReloadAfterClear);
  const [status, setStatus] = useState<ClearStatus>('idle');
  const [tabStatus, setTabStatus] = useState<ClearStatus>('idle');
  const [activeTabId, setActiveTabId] = useState<number | null>(null);
  const { markReloading, isReloading } = useReloadGuard();

  useEffect(() => {
    browser.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
      setActiveTabId(tab?.id ?? null);
    });
  }, []);

  async function handleClear() {
    setStatus('clearing');
    try {
      await clearGlobal(selectedTypes);
      setStatus('done');
    } catch (err) {
      console.error('Bleep: global clear failed', err);
      setStatus('failed');
    }
    setTimeout(() => setStatus('idle'), 1500);
  }

  async function handleClearActiveTab() {
    setTabStatus('clearing');
    try {
      const granted = await requestOriginPermission();
      const [activeTab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (isReloading(activeTab?.id)) {
        setTabStatus('failed');
      } else {
        const ok =
          granted && activeTab
            ? await clearTabData(activeTab, siteScopedIds(selectedTypes))
            : false;
        setTabStatus(ok ? 'done' : 'failed');
        if (ok && autoReloadAfterClear && activeTab?.id != null) {
          markReloading(activeTab.id);
          browser.tabs.reload(activeTab.id);
        }
      }
    } catch (err) {
      console.error('Bleep: active tab clear failed', err);
      setTabStatus('failed');
    }
    setTimeout(() => setTabStatus('idle'), 1500);
  }

  return (
    <div className="w-86 p-4 bg-white text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100">
      <div className="flex items-center gap-2 mb-3">
        <img src="/icon/48.png" alt="" className="w-6 h-6" />
        <h1 className="text-lg font-semibold">{t('popupTitle')}</h1>
      </div>

      <DataTypeGrid
        types={QUICK_TYPES}
        selected={selectedTypes}
        onToggle={toggleType}
        className="mb-3"
      />

      <hr className="border-neutral-200 dark:border-neutral-800 mb-3" />

      <label className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400 mb-3 cursor-pointer">
        <input
          type="checkbox"
          checked={autoReloadAfterClear}
          onChange={(e) => setAutoReloadAfterClear(e.target.checked)}
          className="accent-blue-500 cursor-pointer"
        />
        {t('reloadTabAfterClearing')}
      </label>

      <StatusButton
        status={isReloading(activeTabId) ? 'clearing' : tabStatus}
        onClick={handleClearActiveTab}
        disabled={isReloading(activeTabId)}
        idleLabel={t('clearActiveTabOnly')}
        clearingLabel={isReloading(activeTabId) ? t('reloading') : t('clearing')}
        failedLabel={t('failedOrDenied')}
      />
      <p className="text-xs text-neutral-500 mt-1">{t('activeTabHint')}</p>

      <div className="mt-3">
        <DangerConfirmButton
          status={status}
          idleLabel={t('clearAllSites')}
          confirmLabel={t('yesClearEverything')}
          onConfirm={handleClear}
        />
      </div>
      <p className="text-xs text-neutral-500 mt-1">{t('allSitesHint')}</p>

      <button
        onClick={() => browser.runtime.openOptionsPage()}
        className="w-full mt-2 rounded-md border border-neutral-300 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800 cursor-pointer py-2 text-sm"
      >
        {t('settings')}
      </button>
    </div>
  );
}
