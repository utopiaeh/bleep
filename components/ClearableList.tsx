import type { ReactNode } from 'react';

interface ClearableListProps<T> {
  items: T[];
  keyOf: (item: T) => string | number | undefined;
  emptyLabel: string;
  renderRow: (item: T) => ReactNode;
  buttonLabel: (item: T) => string;
  buttonDisabled: (item: T) => boolean;
  onClear: (item: T) => void;
}

export function ClearableList<T>({
  items,
  keyOf,
  emptyLabel,
  renderRow,
  buttonLabel,
  buttonDisabled,
  onClear,
}: ClearableListProps<T>) {
  return (
    <ul className="divide-y divide-stone-200 rounded-md border border-stone-200 dark:divide-stone-700 dark:border-stone-700 max-h-80 overflow-y-auto">
      {items.length === 0 && (
        <li className="px-3 py-4 text-sm text-stone-500 text-center">{emptyLabel}</li>
      )}
      {items.map((item) => (
        <li key={keyOf(item)} className="flex items-center justify-between px-3 py-2 gap-3">
          {renderRow(item)}
          <button
            onClick={() => onClear(item)}
            disabled={buttonDisabled(item)}
            className="shrink-0 rounded-md border border-stone-300 hover:bg-stone-100 dark:border-stone-600 dark:hover:bg-stone-700 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 px-3 py-1 text-xs whitespace-nowrap"
          >
            {buttonLabel(item)}
          </button>
        </li>
      ))}
    </ul>
  );
}
