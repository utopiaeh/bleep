import { useRef, useState } from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import { useSettingsStore } from '../../store/settings';
import { exportSettingsJson, parseImportedSettings } from '../../utils/settings-transfer';

export function BackupSection() {
  const t = useTranslation();
  const settings = useSettingsStore();
  const [importError, setImportError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleExport() {
    const json = exportSettingsJson(settings);
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bleep-settings.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const data = parseImportedSettings(await file.text());
      settings.importSettings(data);
      setImportError(false);
    } catch (err) {
      console.error('Bleep: settings import failed', err);
      setImportError(true);
    }
  }

  return (
    <div className="mb-3 max-w-xl">
      <label className="block text-sm mb-1">{t('backupTitle')}</label>
      <p className="text-xs text-stone-500 mb-2">{t('backupHint')}</p>
      <div className="flex gap-2">
        <button
          onClick={handleExport}
          className="rounded-md border border-stone-300 hover:bg-stone-100 dark:border-stone-600 dark:hover:bg-stone-700 cursor-pointer px-3 py-1.5 text-xs"
        >
          {t('exportSettings')}
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="rounded-md border border-stone-300 hover:bg-stone-100 dark:border-stone-600 dark:hover:bg-stone-700 cursor-pointer px-3 py-1.5 text-xs"
        >
          {t('importSettings')}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={handleImportFile}
        />
      </div>
      {importError && <p className="text-xs text-red-500 mt-1">{t('importInvalidFile')}</p>}
    </div>
  );
}
