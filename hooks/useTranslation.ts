import { useSettingsStore } from '../store/settings';
import { detectBrowserLanguage, translate, type TranslationKey } from '../utils/i18n';

export function useTranslation() {
  const language = useSettingsStore((s) => s.language);
  const resolved = language === 'auto' ? detectBrowserLanguage() : language;
  return (key: TranslationKey, vars?: Record<string, string | number>) => translate(resolved, key, vars);
}
