import { useErrorLogStore } from '../../store/errorLog';

export function ErrorLogSection() {
  const entries = useErrorLogStore((s) => s.entries);
  const clearErrors = useErrorLogStore((s) => s.clearErrors);

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm uppercase tracking-wide text-stone-500 dark:text-stone-400">Error log</h3>
        {entries.length > 0 && (
          <button
            onClick={clearErrors}
            className="text-xs text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 cursor-pointer underline"
          >
            Clear
          </button>
        )}
      </div>
      {entries.length === 0 ? (
        <p className="text-xs text-stone-500">Nothing logged.</p>
      ) : (
        <ul className="divide-y divide-stone-200 rounded-md border border-stone-200 dark:divide-stone-700 dark:border-stone-700 max-h-60 overflow-y-auto">
          {entries.map((entry) => (
            <li key={entry.id} className="px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-red-600 dark:text-red-400 truncate">{entry.message}</span>
                <span className="text-xs text-stone-500 shrink-0">
                  {new Date(entry.timestamp).toLocaleString()}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
