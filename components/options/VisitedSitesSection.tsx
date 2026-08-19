import { useTranslation } from '../../hooks/useTranslation';
import type { VisitedSite } from '../../utils/clearing';
import { DangerConfirmButton } from '../DangerConfirmButton';
import { type ClearStatus } from '../StatusButton';
import { VisitedSiteList } from '../VisitedSiteList';

interface VisitedSitesSectionProps {
  filter: string;
  onFilterChange: (value: string) => void;
  sites: VisitedSite[];
  status: ClearStatus;
  onClearAll: () => void;
  busyHostnames: Set<string>;
  failedHostnames: Set<string>;
  onClearSite: (site: VisitedSite) => void;
}

export function VisitedSitesSection({
  filter,
  onFilterChange,
  sites,
  status,
  onClearAll,
  busyHostnames,
  failedHostnames,
  onClearSite,
}: VisitedSitesSectionProps) {
  const t = useTranslation();

  return (
    <div className="mt-4">
      <h3 className="text-sm uppercase tracking-wide text-stone-500 dark:text-stone-400 mb-2">
        {t('visitedSites')}
      </h3>
      <p className="text-xs text-stone-500 mb-2">{t('visitedSitesDescription')}</p>

      <div className="flex gap-2 mb-2">
        <input
          type="text"
          value={filter}
          onChange={(e) => onFilterChange(e.target.value)}
          placeholder={t('filterVisitedSitesPlaceholder')}
          className="flex-1 rounded-md border border-stone-300 bg-stone-50 dark:border-stone-600 dark:bg-stone-800 px-3 py-1.5 text-sm placeholder:text-stone-500 focus:outline-none focus:border-blue-500"
        />
        <div className="shrink-0">
          <DangerConfirmButton
            status={status}
            idleLabel={t('clearAllCount', { count: sites.length })}
            confirmLabel={t('yesClearAllVisited')}
            onConfirm={onClearAll}
            disabled={sites.length === 0}
            size="compact"
          />
        </div>
      </div>

      <VisitedSiteList
        sites={sites}
        busyHostnames={busyHostnames}
        failedHostnames={failedHostnames}
        onClear={onClearSite}
      />
    </div>
  );
}
