import type { Browser } from 'wxt/browser';
import { useTranslation } from '../../hooks/useTranslation';
import { clearAllLabel } from '../../utils/clear-status';
import { FilterRow } from '../FilterRow';
import { type ClearStatus } from '../StatusButton';
import { TabClearList } from '../TabClearList';

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

      <FilterRow value={filter} onChange={onFilterChange} placeholder={t('filterTabsPlaceholder')}>
        <button
          onClick={onClearAll}
          disabled={status === 'clearing' || tabs.length === 0}
          className="rounded-md bg-blue-600 hover:bg-blue-500 text-white cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 px-3 py-1.5 text-xs font-medium whitespace-nowrap"
        >
          {clearAllLabel(t, status, tabs.length)}
        </button>
      </FilterRow>

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
