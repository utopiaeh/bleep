import type { Browser } from 'wxt/browser';
import { useTranslation } from '../../hooks/useTranslation';
import { HistoryList } from '../HistoryList';
import { type ClearStatus } from '../StatusButton';
import { clearAllLabel } from '../../utils/clear-status';

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
      <h3 className="text-sm uppercase tracking-wide text-stone-500 dark:text-stone-400 mb-2">
        {t('recentHistory')}
      </h3>
      <div className="flex gap-2 mb-2">
        <input
          type="text"
          value={filter}
          onChange={(e) => onFilterChange(e.target.value)}
          placeholder={t('filterHistoryPlaceholder')}
          className="flex-1 rounded-md border border-stone-300 bg-stone-50 dark:border-stone-600 dark:bg-stone-800 px-3 py-1.5 text-sm placeholder:text-stone-500 focus:outline-none focus:border-blue-500"
        />
        <button
          onClick={onClearAll}
          disabled={status === 'clearing' || items.length === 0}
          className="rounded-md bg-blue-600 hover:bg-blue-500 text-white cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 px-3 py-1.5 text-xs font-medium whitespace-nowrap"
        >
          {clearAllLabel(t, status, items.length)}
        </button>
      </div>
      <HistoryList items={items} onDelete={onDelete} />
    </div>
  );
}
