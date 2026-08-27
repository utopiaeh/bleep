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
