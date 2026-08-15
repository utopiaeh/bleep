import { useTranslation } from '../../hooks/useTranslation';

interface BehaviorTogglesProps {
  autoReloadAfterClear: boolean;
  onAutoReloadChange: (value: boolean) => void;
  useOriginMappings: boolean;
  onUseOriginMappingsChange: (value: boolean) => void;
}

export function BehaviorToggles({
  autoReloadAfterClear,
  onAutoReloadChange,
  useOriginMappings,
  onUseOriginMappingsChange,
}: BehaviorTogglesProps) {
  const t = useTranslation();

  return (
    <>
      <label className="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400 mb-2 cursor-pointer">
        <input
          type="checkbox"
          checked={autoReloadAfterClear}
          onChange={(e) => onAutoReloadChange(e.target.checked)}
          className="accent-blue-500 cursor-pointer"
        />
        {t('reloadTabAfterClearing')}
      </label>

      <label className="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400 cursor-pointer">
        <input
          type="checkbox"
          checked={useOriginMappings}
          onChange={(e) => onUseOriginMappingsChange(e.target.checked)}
          className="accent-blue-500 cursor-pointer"
        />
        {t('useOriginMappings')}
      </label>
    </>
  );
}
