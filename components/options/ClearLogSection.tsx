import { useTranslation } from '../../hooks/useTranslation';
import { useClearLogStore } from '../../store/clearLog';
import type { TranslationKey } from '../../utils/i18n';

export function ClearLogSection() {
  const t = useTranslation();
  const entries = useClearLogStore((s) => s.entries);
  const clearLog = useClearLogStore((s) => s.clearLog);

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm uppercase tracking-wide text-stone-500 dark:text-stone-400">
          {t('clearLogTitle')}
        </h3>
        {entries.length > 0 && (
          <button
            onClick={clearLog}
            className="text-xs text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 cursor-pointer underline"
          >
            {t('clearLogClear')}
          </button>
        )}
      </div>
      {entries.length === 0 ? (
        <p className="text-xs text-stone-500">{t('clearLogEmpty')}</p>
      ) : (
        <ul className="divide-y divide-stone-200 rounded-md border border-stone-200 dark:divide-stone-700 dark:border-stone-700 max-h-60 overflow-y-auto">
          {entries.map((entry) => (
            <li key={entry.id} className="px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm truncate">{entry.hostname}</span>
                <span className="text-xs text-stone-500 shrink-0">
                  {new Date(entry.timestamp).toLocaleString()}
                </span>
              </div>
              <p className="text-xs text-stone-500 truncate">
                {entry.types.map((id) => t(`dt_${id}` as TranslationKey)).join(', ')}
                {entry.linkedTargets.length > 0 &&
                  ` + ${t('clearLogLinkedCount', { count: entry.linkedTargets.length })}`}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
