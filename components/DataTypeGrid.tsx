import { useTranslation } from '../hooks/useTranslation';
import type { DataTypeDef, DataTypeId } from '../utils/data-types';
import type { TranslationKey } from '../utils/i18n';
import { replaceVisible } from '../utils/set-helpers';
import { PRESETS } from '../utils/settings-defaults';

interface DataTypeGridProps {
  types: DataTypeDef[];
  selected: DataTypeId[];
  onToggle: (id: DataTypeId) => void;
  onSetAll: (ids: DataTypeId[]) => void;
  columns?: 1 | 2;
  className?: string;
}

export function DataTypeGrid({
  types,
  selected,
  onToggle,
  onSetAll,
  columns = 2,
  className = '',
}: DataTypeGridProps) {
  const t = useTranslation();

  const shown = new Set(types.map((type) => type.id));
  const selectedShown = selected
    .filter((id) => shown.has(id))
    .sort()
    .join();

  const grid = (
    <ul className={`grid ${columns === 2 ? 'grid-cols-2' : 'grid-cols-1'} gap-1`}>
      {types.map((type) => (
        <li key={type.id}>
          <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={selected.includes(type.id)}
              onChange={() => onToggle(type.id)}
              className="accent-blue-500 cursor-pointer"
            />
            {t(`dt_${type.id}` as TranslationKey)}
          </label>
        </li>
      ))}
    </ul>
  );

  return (
    <div className={className}>
      <div className="flex flex-wrap gap-1 mb-2" role="group" aria-label={t('presetsLabel')}>
        {(Object.keys(PRESETS) as (keyof typeof PRESETS)[]).map((key) => {
          const ids = PRESETS[key].filter((id) => shown.has(id));
          const active = [...ids].sort().join() === selectedShown;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSetAll(replaceVisible(selected, shown, ids))}
              aria-pressed={active}
              className={`px-2 py-0.5 text-xs rounded-md border cursor-pointer ${
                active
                  ? 'border-blue-600 bg-blue-600 text-white'
                  : 'border-stone-300 hover:bg-stone-100 dark:border-stone-600 dark:hover:bg-stone-700'
              }`}
            >
              {t(key)}
            </button>
          );
        })}
      </div>
      {grid}
    </div>
  );
}
