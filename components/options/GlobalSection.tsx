import type { Browser } from 'wxt/browser';
import { useTranslation } from '../../hooks/useTranslation';
import { DATA_TYPES, type DataTypeId } from '../../utils/data-types';
import { DangerConfirmButton } from '../DangerConfirmButton';
import { DataTypeGrid } from '../DataTypeGrid';
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
}: GlobalSectionProps) {
  const t = useTranslation();

  return (
    <section className="mb-8">
      <h2 className="text-sm uppercase tracking-wide text-stone-500 dark:text-stone-400 mb-2">
        {t('scopeGlobal')}
      </h2>
      <p className="text-xs text-stone-500 mb-2">{t('scopeGlobalDescription')}</p>
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
