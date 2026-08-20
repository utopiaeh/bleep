import { useBrowserName } from '../../hooks/useBrowserName';
import { useTranslation } from '../../hooks/useTranslation';
import type { VisitedSite } from '../../utils/clearing';
import { DangerConfirmButton } from '../DangerConfirmButton';
import { FilterRow } from '../FilterRow';
import { SectionHeading } from '../SectionHeading';
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
  const browserName = useBrowserName();

  return (
    <div className="mt-4">
      <SectionHeading as="h3" title={t('visitedSites')} description={t('visitedSitesDescription')} />
      {browserName && (
        <p className="text-xs text-stone-500 mb-2">
          {t('visitedSitesContainerCaveat', { browser: browserName })}
        </p>
      )}

      <FilterRow value={filter} onChange={onFilterChange} placeholder={t('filterVisitedSitesPlaceholder')}>
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
      </FilterRow>

      <VisitedSiteList
        sites={sites}
        busyHostnames={busyHostnames}
        failedHostnames={failedHostnames}
        onClear={onClearSite}
      />
    </div>
  );
}
