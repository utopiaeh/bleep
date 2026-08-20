import type { Browser } from 'wxt/browser';
import { useTranslation } from '../../hooks/useTranslation';
import { clearAllLabel } from '../../utils/clear-status';
import { FilterRow } from '../FilterRow';
import { HistoryList } from '../HistoryList';
import { SectionHeading } from '../SectionHeading';
import { type ClearStatus } from '../StatusButton';

interface HistorySectionProps {
  items: Browser.history.HistoryItem[];
  filter: string;
  onFilterChange: (value: string) => void;
  status: ClearStatus;
  onClearAll: () => void;
  onDelete: (url: string) => void;
}

export function HistorySection({ items, filter, onFilterChange, status, onClearAll, onDelete }: HistorySectionProps) {
  const t = useTranslation();

  return (
    <div className="mt-4">
      <SectionHeading as="h3" title={t('recentHistory')} />
      <FilterRow value={filter} onChange={onFilterChange} placeholder={t('filterHistoryPlaceholder')}>
        <button
          onClick={onClearAll}
          disabled={status === 'clearing' || items.length === 0}
          className="rounded-md bg-blue-600 hover:bg-blue-500 text-white cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 px-3 py-1.5 text-xs font-medium whitespace-nowrap"
        >
          {clearAllLabel(t, status, items.length)}
        </button>
      </FilterRow>
      <HistoryList items={items} onDelete={onDelete} />
    </div>
  );
}
