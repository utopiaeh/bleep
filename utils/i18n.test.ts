import { afterEach, describe, expect, it, vi } from 'vitest';
import { detectBrowserLanguage, translate } from './i18n';

describe('detectBrowserLanguage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.each([
    ['ru-RU', 'ru'],
    ['ro-RO', 'ro'],
    ['uk-UA', 'uk'],
    ['en-US', 'en'],
    ['de-DE', 'en'],
  ] as const)('maps navigator.language %s to %s', (navigatorLanguage, expected) => {
    vi.stubGlobal('navigator', { language: navigatorLanguage });
    expect(detectBrowserLanguage()).toBe(expected);
  });
});

describe('translate', () => {
  it('returns the string for the requested language', () => {
    expect(translate('ru', 'tabHelp')).toBe('Справка');
    expect(translate('en', 'tabHelp')).toBe('Help');
  });

  it('interpolates variables into the template', () => {
    expect(translate('en', 'clearAllCount', { count: 5 })).toBe('Clear all (5)');
  });
});
