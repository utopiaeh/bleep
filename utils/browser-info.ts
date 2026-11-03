import { browser } from 'wxt/browser';

export function isGeckoBased(): boolean {
  return typeof (browser.runtime as { getBrowserInfo?: unknown }).getBrowserInfo === 'function';
}

export async function getBrowserName(): Promise<string> {
  const getBrowserInfo = (
    browser.runtime as { getBrowserInfo?: () => Promise<{ name: string; zen?: unknown }> }
  ).getBrowserInfo;
  if (!getBrowserInfo) return 'Firefox';
  try {
    const info = await getBrowserInfo();
    return info.zen ? 'Zen' : info.name;
  } catch {
    return 'Firefox';
  }
}

export const GITHUB_REPO_URL = 'https://github.com/utopiaeh/bleep';
const CHROME_REVIEW_URL =
  'https://chromewebstore.google.com/detail/dnihnhdbmgjfkdlkahlbbfhginfglomj/reviews';
const FIREFOX_REVIEW_URL = 'https://addons.mozilla.org/firefox/addon/bleep-cache-cleaner/reviews/';

export function storeReviewUrl(): string {
  return isGeckoBased() ? FIREFOX_REVIEW_URL : CHROME_REVIEW_URL;
}
