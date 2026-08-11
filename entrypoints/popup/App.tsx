import { useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import { DangerConfirmButton } from '../../components/DangerConfirmButton';
import { DataTypeGrid } from '../../components/DataTypeGrid';
import { StatusButton, type ClearStatus } from '../../components/StatusButton';
import { useReloadGuard } from '../../hooks/useReloadGuard';
import { useTheme } from '../../hooks/useTheme';
import { useSettingsStore } from '../../store/settings';
import { clearGlobal, clearTabData, requestOriginPermission, siteScopedIds } from '../../utils/clearing';
import { DATA_TYPES } from '../../utils/data-types';

const QUICK_TYPES = DATA_TYPES.filter((t) => t.quick);

export default function App() {
  useTheme();
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
      console.error('Cache Cleaner: global clear failed', err);
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
          granted && activeTab ? await clearTabData(activeTab, siteScopedIds(selectedTypes)) : false;
        setTabStatus(ok ? 'done' : 'failed');
        if (ok && autoReloadAfterClear && activeTab?.id != null) {
          markReloading(activeTab.id);
          browser.tabs.reload(activeTab.id);
        }
      }
    } catch (err) {
      console.error('Cache Cleaner: active tab clear failed', err);
      setTabStatus('failed');
    }
    setTimeout(() => setTabStatus('idle'), 1500);
  }

  return (
    <div className="w-80 p-4 bg-white text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100">
      <h1 className="text-lg font-semibold mb-3">Cache Cleaner</h1>

      <DataTypeGrid types={QUICK_TYPES} selected={selectedTypes} onToggle={toggleType} className="mb-3" />

      <hr className="border-neutral-200 dark:border-neutral-800 mb-3" />

      <label className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400 mb-3 cursor-pointer">
        <input
          type="checkbox"
          checked={autoReloadAfterClear}
          onChange={(e) => setAutoReloadAfterClear(e.target.checked)}
          className="accent-blue-500 cursor-pointer"
        />
        Reload tab after clearing
      </label>

      <StatusButton
        status={isReloading(activeTabId) ? 'clearing' : tabStatus}
        onClick={handleClearActiveTab}
        disabled={isReloading(activeTabId)}
        idleLabel="Clear active tab only"
        clearingLabel={isReloading(activeTabId) ? 'Reloading…' : 'Clearing…'}
        failedLabel="Failed / denied"
      />
      <p className="text-xs text-neutral-500 mt-1">Only the site open in this tab is affected.</p>

      <div className="mt-3">
        <DangerConfirmButton
          status={status}
          idleLabel="Clear all sites"
          confirmLabel="Yes, clear everything"
          onConfirm={handleClear}
        />
      </div>
      <p className="text-xs text-neutral-500 mt-1">Applies to every site, not just this tab.</p>

      <button
        onClick={() => browser.runtime.openOptionsPage()}
        className="w-full mt-2 rounded-md border border-neutral-300 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800 cursor-pointer py-2 text-sm"
      >
        Settings
      </button>
    </div>
  );
}
