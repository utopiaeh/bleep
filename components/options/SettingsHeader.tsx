import { useTranslation } from '../../hooks/useTranslation';
import type { TranslationKey } from '../../utils/i18n';

export type OptionsTab = 'general' | 'global' | 'perSite' | 'help';

const TAB_LABELS: Record<OptionsTab, TranslationKey> = {
  general: 'tabGeneral',
  global: 'scopeGlobal',
  perSite: 'scopePerSite',
  help: 'tabHelp',
};

interface SettingsHeaderProps {
  activeTab: OptionsTab;
  onTabChange: (tab: OptionsTab) => void;
  onReset: () => void;
}

export function SettingsHeader({ activeTab, onTabChange, onReset }: SettingsHeaderProps) {
  const t = useTranslation();

  return (
    <div className="flex items-center justify-between mb-6 border-b border-stone-200 dark:border-stone-700">
      <div className="flex gap-4">
        {(['perSite', 'global', 'general', 'help'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            className={`pb-2 text-sm cursor-pointer border-b-2 -mb-px whitespace-nowrap ${
              activeTab === tab
                ? 'border-blue-600 font-medium'
                : 'border-transparent text-stone-500 hover:text-stone-900 dark:hover:text-stone-100'
            }`}
          >
            {t(TAB_LABELS[tab])}
          </button>
        ))}
      </div>
      <button
        onClick={onReset}
        className="mb-2 rounded-md border border-stone-300 hover:bg-stone-100 dark:border-stone-600 dark:hover:bg-stone-700 cursor-pointer px-3 py-1.5 text-xs whitespace-nowrap"
      >
        {t('resetToDefaults')}
      </button>
    </div>
  );
}
