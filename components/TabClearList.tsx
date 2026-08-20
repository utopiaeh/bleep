import type { Browser } from 'wxt/browser';
import { useTranslation } from '../hooks/useTranslation';
import { tabHostname } from '../utils/clearing';
import { ClearableList } from './ClearableList';

interface TabClearListProps {
  tabs: Browser.tabs.Tab[];
  busyTabIds: Set<number>;
  failedTabIds: Set<number>;
  reloadingTabIds?: Set<number>;
  onClear: (tab: Browser.tabs.Tab) => void;
}

export function TabClearList({ tabs, busyTabIds, failedTabIds, reloadingTabIds, onClear }: TabClearListProps) {
  const t = useTranslation();

  return (
    <ClearableList
      items={tabs}
      keyOf={(tab) => tab.id}
      emptyLabel={t('noMatchingTabs')}
      renderRow={(tab) => (
        <span className="min-w-0">
          {tabHostname(tab) && (
            <span className="block text-xs text-stone-500 truncate">[{tabHostname(tab)}]</span>
          )}
          <span className="block text-sm truncate">{tab.title ?? tab.url}</span>
        </span>
      )}
      buttonLabel={(tab) => {
        if (tab.id != null && busyTabIds.has(tab.id)) return t('clearing');
        if (tab.id != null && reloadingTabIds?.has(tab.id)) return t('reloading');
        if (tab.id != null && failedTabIds.has(tab.id)) return t('failed');
        return t('clear');
      }}
      buttonDisabled={(tab) =>
        (tab.id != null && busyTabIds.has(tab.id)) || (tab.id != null && (reloadingTabIds?.has(tab.id) ?? false))
      }
      onClear={onClear}
    />
  );
}
