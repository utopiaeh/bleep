import { useState } from 'react';
import { useTranslation } from '../hooks/useTranslation';
import { parseOriginMappings } from '../utils/clearing';

interface Row {
  source: string;
  targets: string;
}

function rowsFromValue(value: string): Row[] {
  return parseOriginMappings(value).map((m) => ({ source: m.source, targets: m.targets.join(', ') }));
}

function valueFromRows(rows: Row[]): string {
  return rows
    .filter((r) => r.source.trim() && r.targets.trim())
    .map((r) => `${r.source.trim()} => ${r.targets.trim()}`)
    .join('\n');
}

interface OriginMappingsEditorProps {
  value: string;
  onChange: (value: string) => void;
}

const EMPTY_ROW: Row = { source: '', targets: '' };

export function OriginMappingsEditor({ value, onChange }: OriginMappingsEditorProps) {
  const t = useTranslation();
  // Local state owns the editing session — this is the only editor of linkedOrigins
  // (the popup never writes it), so there's no external change to sync back in. That
  // also means a half-typed row (e.g. source filled, target still empty) stays visible
  // instead of vanishing — only fully-blank rows get dropped, and only on save.
  const [rows, setRows] = useState<Row[]>(() => {
    const parsed = rowsFromValue(value);
    return parsed.length > 0 ? parsed : [{ ...EMPTY_ROW }];
  });

  function commit(next: Row[]) {
    setRows(next);
    onChange(valueFromRows(next));
  }

  function updateRow(index: number, patch: Partial<Row>) {
    commit(rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function removeRow(index: number) {
    const next = rows.filter((_, i) => i !== index);
    commit(next.length > 0 ? next : [{ ...EMPTY_ROW }]);
  }

  function addRow() {
    commit([...rows, { ...EMPTY_ROW }]);
  }

  return (
    <div>
      <label className="block text-sm mb-1">{t('linkedOrigin')}</label>
      <div className="space-y-2 mb-2">
        {rows.map((row, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="text"
              value={row.source}
              onChange={(e) => updateRow(i, { source: e.target.value })}
              placeholder={t('linkedOriginSourcePlaceholder')}
              className="flex-1 min-w-0 rounded-md border border-stone-300 bg-stone-50 dark:border-stone-600 dark:bg-stone-800 px-3 py-1.5 text-sm placeholder:text-stone-500 focus:outline-none focus:border-blue-500"
            />
            <span className="text-stone-500 text-sm shrink-0">→</span>
            <input
              type="text"
              value={row.targets}
              onChange={(e) => updateRow(i, { targets: e.target.value })}
              placeholder={t('linkedOriginTargetPlaceholder')}
              className="flex-1 min-w-0 rounded-md border border-stone-300 bg-stone-50 dark:border-stone-600 dark:bg-stone-800 px-3 py-1.5 text-sm placeholder:text-stone-500 focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={() => removeRow(i)}
              aria-label={t('remove')}
              className="shrink-0 rounded-md border border-stone-300 hover:bg-stone-100 dark:border-stone-600 dark:hover:bg-stone-700 cursor-pointer px-2.5 py-1.5 text-sm"
            >
              −
            </button>
          </div>
        ))}
      </div>
      <button
        onClick={addRow}
        className="rounded-md border border-stone-300 hover:bg-stone-100 dark:border-stone-600 dark:hover:bg-stone-700 cursor-pointer px-3 py-1.5 text-xs"
      >
        {t('addMapping')}
      </button>
      <p className="text-xs text-stone-500 mt-2">{t('linkedOriginHint')}</p>
    </div>
  );
}
