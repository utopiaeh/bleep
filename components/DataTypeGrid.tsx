import { useTranslation } from '../hooks/useTranslation';
import type { DataTypeDef, DataTypeId } from '../utils/data-types';
import type { TranslationKey } from '../utils/i18n';

interface DataTypeGridProps {
  types: DataTypeDef[];
  selected: DataTypeId[];
  onToggle: (id: DataTypeId) => void;
  columns?: 1 | 2;
  className?: string;
}

export function DataTypeGrid({ types, selected, onToggle, columns = 2, className = '' }: DataTypeGridProps) {
  const t = useTranslation();

  return (
    <ul className={`grid ${columns === 2 ? 'grid-cols-2' : 'grid-cols-1'} gap-1 ${className}`}>
      {types.map((type) => (
        <li key={type.id}>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
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
}
