import type { ReactNode } from 'react';
import type { DataTypeDef, DataTypeId } from '../utils/data-types';

interface DataTypeGridProps {
  types: DataTypeDef[];
  selected: DataTypeId[];
  onToggle: (id: DataTypeId) => void;
  isDisabled?: (t: DataTypeDef) => boolean;
  renderBadge?: (t: DataTypeDef) => ReactNode;
  columns?: 1 | 2;
  className?: string;
}

export function DataTypeGrid({
  types,
  selected,
  onToggle,
  isDisabled,
  renderBadge,
  columns = 2,
  className = '',
}: DataTypeGridProps) {
  return (
    <ul className={`grid ${columns === 2 ? 'grid-cols-2' : 'grid-cols-1'} gap-1 ${className}`}>
      {types.map((t) => {
        const disabled = isDisabled?.(t) ?? false;
        return (
          <li key={t.id}>
            <label
              className={`flex items-center gap-2 text-sm ${disabled ? 'text-neutral-500 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <input
                type="checkbox"
                checked={selected.includes(t.id)}
                onChange={() => onToggle(t.id)}
                disabled={disabled}
                className={`accent-blue-500 ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
              />
              {t.label}
              {renderBadge?.(t)}
            </label>
          </li>
        );
      })}
    </ul>
  );
}
