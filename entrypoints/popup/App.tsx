import { useEffect, useRef, useState } from 'react';
import { browser } from 'wxt/browser';
import { useSettingsStore } from '../../store/settings';
import {
  clearGlobal,
  clearTabData,
  requestOriginPermission,
  siteScopedIds,
} from '../../utils/clearing';
import { DATA_TYPES } from '../../utils/data-types';

const QUICK_TYPES = DATA_TYPES.filter((t) => t.quick);

type Status = 'idle' | 'clearing' | 'done' | 'failed';

export default function App() {
  const selectedTypes = useSettingsStore((s) => s.selectedTypes);
  const toggleType = useSettingsStore((s) => s.toggleType);
  const autoReloadAfterClear = useSettingsStore((s) => s.autoReloadAfterClear);
  const setAutoReloadAfterClear = useSettingsStore((s) => s.setAutoReloadAfterClear);
  const [status, setStatus] = useState<Status>('idle');
  const [tabStatus, setTabStatus] = useState<Status>('idle');
  const [reloadingTabId, setReloadingTabId] = useState<number | null>(null);
  const reloadingTabIdRef = useRef<number | null>(null);

  useEffect(() => {
    reloadingTabIdRef.current = reloadingTabId;
  }, [reloadingTabId]);

  useEffect(() => {
    function onUpdated(tabId: number, changeInfo: { status?: string }) {
      if (tabId === reloadingTabIdRef.current && changeInfo.status === 'complete') {
        setReloadingTabId(null);
      }
    }
    browser.tabs.onUpdated.addListener(onUpdated);
    return () => browser.tabs.onUpdated.removeListener(onUpdated);
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
      if (activeTab?.id != null && activeTab.id === reloadingTabIdRef.current) {
        setTabStatus('failed');
      } else {
        const ok =
          granted && activeTab
            ? await clearTabData(activeTab, siteScopedIds(selectedTypes))
            : false;
        setTabStatus(ok ? 'done' : 'failed');
        if (ok && autoReloadAfterClear && activeTab?.id != null) {
          setReloadingTabId(activeTab.id);
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
    <div className="w-80 p-4 bg-neutral-900 text-neutral-100">
      <h1 className="text-lg font-semibold mb-3">Cache Cleaner</h1>

      <ul className="grid grid-cols-2 gap-1 mb-3">
        {QUICK_TYPES.map((t) => (
          <li key={t.id}>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={selectedTypes.includes(t.id)}
                onChange={() => toggleType(t.id)}
                className="accent-blue-500"
              />
              {t.label}
            </label>
          </li>
        ))}
      </ul>

      <hr className="border-neutral-800 mb-3" />

      <label className="flex items-center gap-2 text-xs text-neutral-400 mb-3">
        <input
          type="checkbox"
          checked={autoReloadAfterClear}
          onChange={(e) => setAutoReloadAfterClear(e.target.checked)}
          className="accent-blue-500"
        />
        Reload tab after clearing
      </label>

      <button
        onClick={handleClearActiveTab}
        disabled={tabStatus === 'clearing' || reloadingTabId != null}
        className="w-full rounded-md bg-blue-600 hover:bg-blue-500 disabled:opacity-50 py-2 text-sm font-medium"
      >
        {tabStatus === 'clearing'
          ? 'Clearing…'
          : reloadingTabId != null
            ? 'Reloading…'
            : tabStatus === 'done'
              ? 'Cleared ✓'
              : tabStatus === 'failed'
                ? 'Failed / denied'
                : 'Clear active tab only'}
      </button>
      <p className="text-xs text-neutral-500 mt-1">
        Only the site open in this tab is affected. Asks for one-time site permission on first use.
      </p>

      <button
        onClick={handleClear}
        disabled={status === 'clearing'}
        className="w-full mt-3 rounded-md border border-neutral-700 hover:bg-neutral-800 disabled:opacity-50 py-2 text-sm"
      >
        {status === 'clearing'
          ? 'Clearing…'
          : status === 'done'
            ? 'Cleared ✓'
            : status === 'failed'
              ? 'Failed'
              : 'Clear all sites'}
      </button>
      <p className="text-xs text-neutral-500 mt-1">
        Applies to every site, not just this tab. No extra permission needed.
      </p>

      <button
        onClick={() => browser.runtime.openOptionsPage()}
        className="w-full mt-2 rounded-md border border-neutral-700 hover:bg-neutral-800 py-2 text-sm"
      >
        Full control…
      </button>
    </div>
  );
}
