import type { Browser } from 'wxt/browser';
import { useBrowserName } from '../../hooks/useBrowserName';
import { useTranslation } from '../../hooks/useTranslation';
import { DATA_TYPES, type DataTypeId } from '../../utils/data-types';
import { DangerConfirmButton } from '../DangerConfirmButton';
import { DataTypeGrid } from '../DataTypeGrid';
import { SectionHeading } from '../SectionHeading';
import { type ClearStatus } from '../StatusButton';
import { HistorySection } from './HistorySection';

interface GlobalSectionProps {
  selectedTypes: DataTypeId[];
  onToggleType: (id: DataTypeId) => void;
  status: ClearStatus;
  onClear: () => void;
  showHistory: boolean;
  history: Browser.history.HistoryItem[];
  historyFilter: string;
  onHistoryFilterChange: (value: string) => void;
  historyStatus: ClearStatus;
  onClearAllHistory: () => void;
  onDeleteHistoryItem: (url: string) => void;
  hasProtectedSites: boolean;
}

export function GlobalSection({
  selectedTypes,
  onToggleType,
  status,
  onClear,
  showHistory,
  history,
  historyFilter,
  onHistoryFilterChange,
  historyStatus,
  onClearAllHistory,
  onDeleteHistoryItem,
  hasProtectedSites,
}: GlobalSectionProps) {
  const t = useTranslation();
  const browserName = useBrowserName();

  return (
    <section className="mb-8">
      <SectionHeading title={t('scopeGlobal')} description={t('scopeGlobalDescription')} />
      <DataTypeGrid types={DATA_TYPES} selected={selectedTypes} onToggle={onToggleType} className="mb-2" />
      <p className="text-xs text-stone-500 mb-3">{t('storageKeyShareNote')}</p>
      <div className="max-w-xs">
        <DangerConfirmButton
          status={status}
          idleLabel={t('clearAllSites')}
          confirmLabel={t('yesClearEverything')}
          onConfirm={onClear}
        />
      </div>
      {hasProtectedSites && (
        <p className="text-xs text-stone-500 mt-2">
          {browserName
            ? t('protectedSitesGlobalNoteFirefox', { browser: browserName })
            : t('protectedSitesGlobalNoteChrome')}
        </p>
      )}

      {showHistory && (
        <HistorySection
          items={history}
          filter={historyFilter}
          onFilterChange={onHistoryFilterChange}
          status={historyStatus}
          onClearAll={onClearAllHistory}
          onDelete={onDeleteHistoryItem}
        />
      )}
    </section>
  );
}
