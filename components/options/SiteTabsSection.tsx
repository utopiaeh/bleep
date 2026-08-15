import type { Browser } from 'wxt/browser';
import { useTranslation } from '../../hooks/useTranslation';
import { type ClearStatus } from '../StatusButton';
import { TabClearList } from '../TabClearList';
import { clearAllLabel } from '../../utils/clear-status';

interface SiteTabsSectionProps {
  filter: string;
  onFilterChange: (value: string) => void;
  status: ClearStatus;
  onClearAll: () => void;
  tabs: Browser.tabs.Tab[];
  busyTabIds: Set<number>;
  failedTabIds: Set<number>;
  reloadingTabIds: Set<number>;
  onClearTab: (tab: Browser.tabs.Tab) => void;
}

export function SiteTabsSection({
  filter,
  onFilterChange,
  status,
  onClearAll,
  tabs,
  busyTabIds,
  failedTabIds,
  reloadingTabIds,
  onClearTab,
}: SiteTabsSectionProps) {
  const t = useTranslation();

  return (
    <div>
      <p className="text-xs text-stone-500 mb-2">{t('openTabsOnly')}</p>

      <div className="flex gap-2 mb-2">
        <input
          type="text"
          value={filter}
          onChange={(e) => onFilterChange(e.target.value)}
          placeholder={t('filterTabsPlaceholder')}
          className="flex-1 rounded-md border border-stone-300 bg-stone-50 dark:border-stone-600 dark:bg-stone-800 px-3 py-1.5 text-sm placeholder:text-stone-500 focus:outline-none focus:border-blue-500"
        />
        <button
          onClick={onClearAll}
          disabled={status === 'clearing' || tabs.length === 0}
          className="rounded-md bg-blue-600 hover:bg-blue-500 text-white cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 px-3 py-1.5 text-xs font-medium whitespace-nowrap"
        >
          {clearAllLabel(t, status, tabs.length)}
        </button>
      </div>

      <TabClearList
        tabs={tabs}
        busyTabIds={busyTabIds}
        failedTabIds={failedTabIds}
        reloadingTabIds={reloadingTabIds}
        onClear={onClearTab}
      />
    </div>
  );
}
