import { useTranslation } from '../../hooks/useTranslation';
import type { Theme } from '../../store/settings';

interface ThemeSectionProps {
  theme: Theme;
  onChange: (theme: Theme) => void;
}

export function ThemeSection({ theme, onChange }: ThemeSectionProps) {
  const t = useTranslation();

  return (
    <section className="mb-8">
      <h2 className="text-sm uppercase tracking-wide text-stone-500 dark:text-stone-400 mb-2">{t('theme')}</h2>
      <div className="flex gap-4">
        {(
          [
            ['system', t('themeSystem')],
            ['light', t('themeLight')],
            ['dark', t('themeDark')],
          ] as const
        ).map(([value, label]) => (
          <label key={value} className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="radio"
              checked={theme === value}
              onChange={() => onChange(value)}
              className="cursor-pointer"
            />
            {label}
          </label>
        ))}
      </div>
    </section>
  );
}
