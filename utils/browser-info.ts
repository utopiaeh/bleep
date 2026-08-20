import { browser } from 'wxt/browser';

export function isGeckoBased(): boolean {
  return typeof (browser.runtime as { getBrowserInfo?: unknown }).getBrowserInfo === 'function';
}

/** The actual browser's self-reported name (e.g. "Firefox", "Zen", "LibreWolf") for
 * Gecko-based forks — only call after isGeckoBased() confirms getBrowserInfo exists.
 * Chromium-family browsers don't implement this API at all. */
export async function getBrowserName(): Promise<string> {
  const getBrowserInfo = (browser.runtime as { getBrowserInfo?: () => Promise<{ name: string }> })
    .getBrowserInfo;
  if (!getBrowserInfo) return 'Firefox';
  try {
    return (await getBrowserInfo()).name;
  } catch {
    return 'Firefox';
  }
}
