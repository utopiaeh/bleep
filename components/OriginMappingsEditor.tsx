import { useEffect, useRef, useState } from 'react';
import { useTranslation } from '../hooks/useTranslation';
import { isValidHost, parseOriginMappings } from '../utils/clearing';

interface Row {
  source: string;
  targets: string;
}

function rowsFromValue(value: string): Row[] {
  return parseOriginMappings(value).map((m) => ({
    source: m.source,
    targets: m.targets.join(', '),
  }));
}

function valueFromRows(rows: Row[]): string {
  return rows
    .filter((r) => r.source.trim() && r.targets.trim())
    .map((r) => `${r.source.trim()} => ${r.targets.trim().replace(/[\n,]+/g, ', ')}`)
    .join('\n');
}

function targetList(targets: string): string[] {
  return targets
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function sourceInvalid(row: Row): boolean {
  return row.source.trim() !== '' && !isValidHost(row.source);
}

function targetsInvalid(row: Row): boolean {
  return targetList(row.targets).some((target) => !isValidHost(target));
}

const TARGETS_MAX_HEIGHT_PX = 160;

function autoResize(el: HTMLTextAreaElement) {
  el.style.height = 'auto';
  el.style.height = `${Math.min(el.scrollHeight, TARGETS_MAX_HEIGHT_PX)}px`;
}

interface OriginMappingsEditorProps {
  value: string;
  onChange: (value: string) => void;
}

const EMPTY_ROW: Row = { source: '', targets: '' };

export function OriginMappingsEditor({ value, onChange }: OriginMappingsEditorProps) {
  const t = useTranslation();
  const [rows, setRows] = useState<Row[]>(() => rowsFromValue(value));
  const editedRef = useRef(false);

  useEffect(() => {
    if (!editedRef.current) setRows(rowsFromValue(value));
  }, [value]);

  function commit(next: Row[]) {
    editedRef.current = true;
    setRows(next);
    onChange(valueFromRows(next));
  }

  function updateRow(index: number, patch: Partial<Row>) {
    commit(rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function removeRow(index: number) {
    commit(rows.filter((_, i) => i !== index));
  }

  function addRow() {
    commit([...rows, { ...EMPTY_ROW }]);
  }

  return (
    <div>
      <label className="block text-sm mb-1">{t('linkedOrigin')}</label>
      <div className="space-y-2 mb-2">
        {rows.map((row, i) => (
          <div key={i} className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <input
                type="text"
                value={row.source}
                onChange={(e) => updateRow(i, { source: e.target.value })}
                placeholder={t('linkedOriginSourcePlaceholder')}
                maxLength={253}
                className="w-full min-w-0 rounded-md border border-stone-300 bg-stone-50 dark:border-stone-600 dark:bg-stone-800 px-3 py-1.5 text-sm placeholder:text-stone-500 focus:outline-none focus:border-blue-500"
              />
              {sourceInvalid(row) && (
                <p className="text-xs text-red-500 mt-1">{t('linkedOriginInvalidHint')}</p>
              )}
            </div>
            <span className="text-stone-500 text-sm shrink-0 mt-1.5">→</span>
            <div className="flex-1 min-w-0">
              <textarea
                value={row.targets}
                onChange={(e) => {
                  updateRow(i, { targets: e.target.value });
                  autoResize(e.target);
                }}
                ref={(el) => {
                  if (el) autoResize(el);
                }}
                placeholder={t('linkedOriginTargetPlaceholder')}
                maxLength={2000}
                rows={1}
                className="w-full min-w-0 rounded-md border border-stone-300 bg-stone-50 dark:border-stone-600 dark:bg-stone-800 px-3 py-1.5 text-sm placeholder:text-stone-500 focus:outline-none focus:border-blue-500 resize-y overflow-y-auto"
              />
              {targetsInvalid(row) && (
                <p className="text-xs text-red-500 mt-1">{t('linkedOriginInvalidHint')}</p>
              )}
            </div>
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
