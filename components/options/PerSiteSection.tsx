import type { Browser } from 'wxt/browser';
import { useTranslation } from '../../hooks/useTranslation';
import { isGeckoBased } from '../../utils/browser-info';
import type { DataTypeDef, DataTypeId } from '../../utils/data-types';
import type { VisitedSite } from '../../utils/clearing';
import { DataTypeGrid } from '../DataTypeGrid';
import { OriginMappingsEditor } from '../OriginMappingsEditor';
import { type ClearStatus } from '../StatusButton';
import { ProtectedSitesSection } from './ProtectedSitesSection';
import { SiteTabsSection } from './SiteTabsSection';
import { VisitedSitesSection } from './VisitedSitesSection';

interface PerSiteSectionProps {
  types: DataTypeDef[];
  selectedTypes: DataTypeId[];
  onToggleType: (id: DataTypeId) => void;
  autoReloadAfterClear: boolean;
  onAutoReloadChange: (value: boolean) => void;
  useOriginMappings: boolean;
  onUseOriginMappingsChange: (value: boolean) => void;
  linkedOrigins: string;
  onLinkedOriginsChange: (value: string) => void;
  protectedSites: string;
  onProtectedSitesChange: (value: string) => void;
  siteFilter: string;
  onSiteFilterChange: (value: string) => void;
  bulkStatus: ClearStatus;
  onClearAllTabs: () => void;
  tabs: Browser.tabs.Tab[];
  busyTabIds: Set<number>;
  failedTabIds: Set<number>;
  reloadingTabIds: Set<number>;
  onClearTab: (tab: Browser.tabs.Tab) => void;
  visitedSiteFilter: string;
  onVisitedSiteFilterChange: (value: string) => void;
  visitedSites: VisitedSite[];
  visitedBulkStatus: ClearStatus;
  onClearAllVisitedSites: () => void;
  busyVisitedHostnames: Set<string>;
  failedVisitedHostnames: Set<string>;
  onClearVisitedSite: (site: VisitedSite) => void;
}

export function PerSiteSection({
  types,
  selectedTypes,
  onToggleType,
  autoReloadAfterClear,
  onAutoReloadChange,
  useOriginMappings,
  onUseOriginMappingsChange,
  linkedOrigins,
  onLinkedOriginsChange,
  protectedSites,
  onProtectedSitesChange,
  siteFilter,
  onSiteFilterChange,
  bulkStatus,
  onClearAllTabs,
  tabs,
  busyTabIds,
  failedTabIds,
  reloadingTabIds,
  onClearTab,
  visitedSiteFilter,
  onVisitedSiteFilterChange,
  visitedSites,
  visitedBulkStatus,
  onClearAllVisitedSites,
  busyVisitedHostnames,
  failedVisitedHostnames,
  onClearVisitedSite,
}: PerSiteSectionProps) {
  const t = useTranslation();

  return (
    <section className="mb-8">
      <h2 className="text-sm uppercase tracking-wide text-stone-500 dark:text-stone-400 mb-2">
        {t('scopePerSite')}
      </h2>
      <p className="text-xs text-stone-500 mb-2">{t('scopePerSiteDescription')}</p>
      <DataTypeGrid types={types} selected={selectedTypes} onToggle={onToggleType} className="mb-3" />

      <hr className="border-stone-200 dark:border-stone-700 mb-3" />

      <div className="flex flex-col gap-2 mb-3">
        <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={autoReloadAfterClear}
            onChange={(e) => onAutoReloadChange(e.target.checked)}
            className="accent-blue-500 cursor-pointer"
          />
          {t('reloadTabAfterClearingPerSite')}
        </label>

        <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={useOriginMappings}
            onChange={(e) => onUseOriginMappingsChange(e.target.checked)}
            className="accent-blue-500 cursor-pointer"
          />
          {t('useOriginMappings')}
        </label>
      </div>

      <div className="mb-3 max-w-xl">
        <OriginMappingsEditor value={linkedOrigins} onChange={onLinkedOriginsChange} />
      </div>

      <ProtectedSitesSection value={protectedSites} onChange={onProtectedSitesChange} />

      <hr className="border-stone-200 dark:border-stone-700 mb-3" />

      {!isGeckoBased() && (
        <>
          <SiteTabsSection
            filter={siteFilter}
            onFilterChange={onSiteFilterChange}
            status={bulkStatus}
            onClearAll={onClearAllTabs}
            tabs={tabs}
            busyTabIds={busyTabIds}
            failedTabIds={failedTabIds}
            reloadingTabIds={reloadingTabIds}
            onClearTab={onClearTab}
          />
          <hr className="border-stone-200 dark:border-stone-700 mb-3 mt-3" />
        </>
      )}

      <VisitedSitesSection
        filter={visitedSiteFilter}
        onFilterChange={onVisitedSiteFilterChange}
        sites={visitedSites}
        status={visitedBulkStatus}
        onClearAll={onClearAllVisitedSites}
        busyHostnames={busyVisitedHostnames}
        failedHostnames={failedVisitedHostnames}
        onClearSite={onClearVisitedSite}
      />
    </section>
  );
}
