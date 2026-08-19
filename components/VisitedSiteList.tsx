import { useTranslation } from '../hooks/useTranslation';
import type { VisitedSite } from '../utils/clearing';

interface VisitedSiteListProps {
  sites: VisitedSite[];
  busyHostnames: Set<string>;
  failedHostnames: Set<string>;
  onClear: (site: VisitedSite) => void;
}

export function VisitedSiteList({ sites, busyHostnames, failedHostnames, onClear }: VisitedSiteListProps) {
  const t = useTranslation();

  return (
    <ul className="divide-y divide-stone-200 rounded-md border border-stone-200 dark:divide-stone-700 dark:border-stone-700 max-h-80 overflow-y-auto">
      {sites.length === 0 && (
        <li className="px-3 py-4 text-sm text-stone-500 text-center">{t('noMatchingSites')}</li>
      )}
      {sites.map((site) => {
        const busy = busyHostnames.has(site.hostname);
        return (
          <li key={site.hostname} className="flex items-center justify-between px-3 py-2 gap-3">
            <span className="text-sm truncate min-w-0">{site.hostname}</span>
            <button
              onClick={() => onClear(site)}
              disabled={busy}
              className="rounded-md border border-stone-300 hover:bg-stone-100 dark:border-stone-600 dark:hover:bg-stone-700 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 px-3 py-1 text-xs whitespace-nowrap"
            >
              {busy ? t('clearing') : failedHostnames.has(site.hostname) ? t('failed') : t('clear')}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
