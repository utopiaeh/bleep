import { browser } from 'wxt/browser';

export function isGeckoBased(): boolean {
  return typeof (browser.runtime as { getBrowserInfo?: unknown }).getBrowserInfo === 'function';
}

/** The actual browser's self-reported name (e.g. "Firefox", "Zen", "LibreWolf") for
 * Gecko-based forks — only call after isGeckoBased() confirms getBrowserInfo exists.
 * Chromium-family browsers don't implement this API at all.
 *
 * Some forks pass the Gecko app identity through unchanged, so `name` alone isn't
 * reliable — Zen self-reports `name: "Firefox"` but adds its own `zen: {version}`
 * field to the same object (verified live: Zen 1.21.15b on Firefox 154 base), which
 * we use to override the name. Other forks (LibreWolf, Waterfox, etc.) aren't known
 * to add a similar marker, so they fall through to whatever they self-report. */
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
