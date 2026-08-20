import { useTranslation } from '../../hooks/useTranslation';

interface ProtectedSitesSectionProps {
  value: string;
  onChange: (value: string) => void;
}

export function ProtectedSitesSection({ value, onChange }: ProtectedSitesSectionProps) {
  const t = useTranslation();

  return (
    <div className="mb-3 max-w-xl">
      <label className="block text-sm mb-1">{t('protectedSites')}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t('protectedSitesPlaceholder')}
        rows={2}
        className="w-full rounded-md border border-stone-300 bg-stone-50 dark:border-stone-600 dark:bg-stone-800 px-3 py-1.5 text-sm placeholder:text-stone-500 focus:outline-none focus:border-blue-500 resize-y"
      />
      <p className="text-xs text-stone-500 mt-2">{t('protectedSitesHint')}</p>
    </div>
  );
}
