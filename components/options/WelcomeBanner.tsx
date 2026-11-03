import { useTranslation } from '../../hooks/useTranslation';

interface WelcomeBannerProps {
  onDismiss: () => void;
}

export function WelcomeBanner({ onDismiss }: WelcomeBannerProps) {
  const t = useTranslation();

  return (
    <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950">
      <h2 className="text-lg font-semibold mb-1">{t('welcomeTitle')}</h2>
      <p className="text-sm text-stone-600 dark:text-stone-300 mb-3">{t('welcomeText')}</p>
      <button
        onClick={onDismiss}
        type="button"
        className="rounded-md bg-blue-600 hover:bg-blue-500 text-white cursor-pointer px-3 py-1.5 text-xs font-medium whitespace-nowrap"
      >
        {t('welcomeDismiss')}
      </button>
    </div>
  );
}
