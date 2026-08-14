import type { Browser } from 'wxt/browser';
import { useTranslation } from '../hooks/useTranslation';
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
  const t = useTranslation();

  return (
    <ul className="divide-y divide-stone-200 rounded-md border border-stone-200 dark:divide-stone-700 dark:border-stone-700 max-h-80 overflow-y-auto">
      {tabs.length === 0 && (
        <li className="px-3 py-4 text-sm text-stone-500 text-center">{t('noMatchingTabs')}</li>
      )}
      {tabs.map((tab) => {
        const busy = tab.id != null && busyTabIds.has(tab.id);
        const reloading = tab.id != null && reloadingTabIds?.has(tab.id);
        return (
          <li key={tab.id} className="flex items-center justify-between px-3 py-2 gap-3">
            <span className="min-w-0">
              {tabDomain(tab) && (
                <span className="block text-xs text-stone-500 truncate">[{tabDomain(tab)}]</span>
              )}
              <span className="block text-sm truncate">{tab.title ?? tab.url}</span>
            </span>
            <button
              onClick={() => onClear(tab)}
              disabled={busy || reloading}
              className="rounded-md border border-stone-300 hover:bg-stone-100 dark:border-stone-600 dark:hover:bg-stone-700 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 px-3 py-1 text-xs whitespace-nowrap"
            >
              {busy
                ? t('clearing')
                : reloading
                  ? t('reloading')
                  : tab.id != null && failedTabIds.has(tab.id)
                    ? t('failed')
                    : t('clear')}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
