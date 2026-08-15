import { useTranslation } from '../../hooks/useTranslation';
import type { Language } from '../../utils/i18n';

interface LanguageSectionProps {
  language: Language;
  onChange: (language: Language) => void;
}

export function LanguageSection({ language, onChange }: LanguageSectionProps) {
  const t = useTranslation();

  return (
    <section className="mb-8">
      <h2 className="text-sm uppercase tracking-wide text-stone-500 dark:text-stone-400 mb-2">{t('language')}</h2>
      <select
        value={language}
        onChange={(e) => onChange(e.target.value as Language)}
        className="rounded-md border border-stone-300 bg-stone-50 dark:border-stone-600 dark:bg-stone-800 px-3 py-1.5 text-sm cursor-pointer focus:outline-none focus:border-blue-500"
      >
        <option value="auto">{t('languageAuto')}</option>
        <option value="en">{t('languageEnglish')}</option>
        <option value="ru">{t('languageRussian')}</option>
        <option value="ro">{t('languageRomanian')}</option>
        <option value="uk">{t('languageUkrainian')}</option>
      </select>
    </section>
  );
}
