import type { Browser } from 'wxt/browser';
import { useTranslation } from '../hooks/useTranslation';

interface HistoryListProps {
  items: Browser.history.HistoryItem[];
  onDelete: (url: string) => void;
}

export function HistoryList({ items, onDelete }: HistoryListProps) {
  const t = useTranslation();

  return (
    <ul className="divide-y divide-stone-200 rounded-md border border-stone-200 dark:divide-stone-700 dark:border-stone-700 max-h-80 overflow-y-auto">
      {items.map((item) => (
        <li key={item.id} className="flex items-center justify-between px-3 py-2">
          <span className="text-sm truncate max-w-md">{item.title || item.url}</span>
          <button
            onClick={() => item.url && onDelete(item.url)}
            className="rounded-md border border-stone-300 hover:bg-stone-100 dark:border-stone-600 dark:hover:bg-stone-700 cursor-pointer px-3 py-1 text-xs"
          >
            {t('remove')}
          </button>
        </li>
      ))}
    </ul>
  );
}
