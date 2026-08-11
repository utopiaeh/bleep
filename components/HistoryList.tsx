import type { Browser } from 'wxt/browser';

interface HistoryListProps {
  items: Browser.history.HistoryItem[];
  onDelete: (url: string) => void;
}

export function HistoryList({ items, onDelete }: HistoryListProps) {
  return (
    <ul className="divide-y divide-neutral-800 rounded-md border border-neutral-800">
      {items.map((item) => (
        <li key={item.id} className="flex items-center justify-between px-3 py-2">
          <span className="text-sm truncate max-w-md">{item.title || item.url}</span>
          <button
            onClick={() => item.url && onDelete(item.url)}
            className="rounded-md border border-neutral-700 hover:bg-neutral-800 cursor-pointer px-3 py-1 text-xs"
          >
            Remove
          </button>
        </li>
      ))}
    </ul>
  );
}
