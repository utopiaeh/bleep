import type { Browser } from 'wxt/browser';
import { useTranslation } from '../hooks/useTranslation';
import { ClearableList } from './ClearableList';

interface HistoryListProps {
  items: Browser.history.HistoryItem[];
  onDelete: (url: string) => void;
}

export function HistoryList({ items, onDelete }: HistoryListProps) {
  const t = useTranslation();

  return (
    <ClearableList
      items={items}
      keyOf={(item) => item.id}
      emptyLabel={t('noMatchingHistory')}
      renderRow={(item) => <span className="text-sm truncate max-w-md">{item.title || item.url}</span>}
      buttonLabel={() => t('remove')}
      buttonDisabled={() => false}
      onClear={(item) => item.url && onDelete(item.url)}
    />
  );
}
