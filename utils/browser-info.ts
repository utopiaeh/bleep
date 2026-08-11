import { browser } from 'wxt/browser';

export function isGeckoBased(): boolean {
  return typeof (browser.runtime as { getBrowserInfo?: unknown }).getBrowserInfo === 'function';
}
