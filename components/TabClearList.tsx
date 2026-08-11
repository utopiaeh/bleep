import type { Browser } from 'wxt/browser';
import { tabDomain } from '../utils/clearing';

interface TabClearListProps {
  tabs: Browser.tabs.Tab[];
  busyTabIds: Set<number>;
  failedTabIds: Set<number>;
  reloadingTabIds?: Set<number>;
  onClear: (tab: Browser.tabs.Tab) => void;
}

export function TabClearList({
  tabs,
  busyTabIds,
  failedTabIds,
  reloadingTabIds,
  onClear,
}: TabClearListProps) {
  return (
    <ul className="divide-y divide-neutral-200 rounded-md border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800 max-h-80 overflow-y-auto">
      {tabs.length === 0 && (
        <li className="px-3 py-4 text-sm text-neutral-500 text-center">No matching tabs.</li>
      )}
      {tabs.map((tab) => {
        const busy = tab.id != null && busyTabIds.has(tab.id);
        const reloading = tab.id != null && reloadingTabIds?.has(tab.id);
        return (
          <li key={tab.id} className="flex items-center justify-between px-3 py-2 gap-3">
            <span className="min-w-0">
              {tabDomain(tab) && (
                <span className="block text-xs text-neutral-500 truncate">[{tabDomain(tab)}]</span>
              )}
              <span className="block text-sm truncate">{tab.title ?? tab.url}</span>
            </span>
            <button
              onClick={() => onClear(tab)}
              disabled={busy || reloading}
              className="rounded-md border border-neutral-300 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 px-3 py-1 text-xs whitespace-nowrap"
            >
              {busy
                ? 'Clearing…'
                : reloading
                  ? 'Reloading…'
                  : tab.id != null && failedTabIds.has(tab.id)
                    ? 'Failed'
                    : 'Clear'}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
