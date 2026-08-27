import { useTranslation } from '../hooks/useTranslation';
import { isGeckoBased } from '../utils/browser-info';
import type { TranslationKey } from '../utils/i18n';

const GITHUB_ISSUES_URL = 'https://github.com/utopiaeh/bleep/issues';
const CHROME_REVIEW_URL = 'https://chromewebstore.google.com/detail/dnihnhdbmgjfkdlkahlbbfhginfglomj/reviews';
const FIREFOX_REVIEW_URL = 'https://addons.mozilla.org/en-US/firefox/addon/bleep-cache-cleaner/reviews/';

const ITEMS: Array<{ title: TranslationKey; text: TranslationKey }> = [
  { title: 'helpPopupTitle', text: 'helpPopupText' },
  { title: 'helpScopeTitle', text: 'helpScopeText' },
  { title: 'helpTypesTitle', text: 'helpTypesText' },
  { title: 'helpReloadTitle', text: 'helpReloadText' },
  { title: 'helpMappingsTitle', text: 'helpMappingsText' },
];

export function HelpPanel() {
  const t = useTranslation();

  return (
    <div className="max-w-2xl">
      <h2 className="text-lg font-semibold mb-4">{t('helpTitle')}</h2>
      <ul className="space-y-4">
        {ITEMS.map(({ title, text }) => (
          <li key={title}>
            <p className="text-sm font-medium mb-0.5">{t(title)}</p>
            <p className="text-sm text-stone-500">{t(text)}</p>
          </li>
        ))}
        <li>
          <p className="text-sm font-medium mb-0.5">{t('helpFeedbackTitle')}</p>
          <p className="text-sm text-stone-500">
            {t('helpFeedbackText')}{' '}
            <a
              href={GITHUB_ISSUES_URL}
              target="_blank"
              rel="noreferrer"
              className="text-blue-600 hover:underline"
            >
              {t('helpFeedbackLink')}
            </a>
          </p>
          <p className="text-sm text-stone-500 mt-1">
            {t('helpReviewText')}{' '}
            <a
              href={isGeckoBased() ? FIREFOX_REVIEW_URL : CHROME_REVIEW_URL}
              target="_blank"
              rel="noreferrer"
              className="text-blue-600 hover:underline"
            >
              {t('helpReviewLink')}
            </a>
          </p>
        </li>
      </ul>
    </div>
  );
}
