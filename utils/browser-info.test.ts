import { browser } from 'wxt/browser';
import { afterEach, describe, expect, it } from 'vitest';
import { getBrowserName, isGeckoBased } from './browser-info';

afterEach(() => {
  delete (browser.runtime as { getBrowserInfo?: unknown }).getBrowserInfo;
});

describe('isGeckoBased', () => {
  it('is false when getBrowserInfo is absent (Chromium-family browsers)', () => {
    expect(isGeckoBased()).toBe(false);
  });

  it('is true when getBrowserInfo exists (any Gecko-based browser)', () => {
    (browser.runtime as { getBrowserInfo?: unknown }).getBrowserInfo = () => {};
    expect(isGeckoBased()).toBe(true);
  });
});

describe('getBrowserName', () => {
  it('returns the self-reported name from getBrowserInfo (e.g. a fork with no name override)', async () => {
    (browser.runtime as { getBrowserInfo?: () => Promise<{ name: string }> }).getBrowserInfo = async () => ({
      name: 'Firefox',
    });
    expect(await getBrowserName()).toBe('Firefox');
  });

  it('overrides to "Zen" when the info object has Zen\'s own marker field, since Zen self-reports name: "Firefox"', async () => {
    (
      browser.runtime as { getBrowserInfo?: () => Promise<{ name: string; zen?: unknown }> }
    ).getBrowserInfo = async () => ({ name: 'Firefox', zen: { version: '1.21.15b' } });
    expect(await getBrowserName()).toBe('Zen');
  });

  it('falls back to "Firefox" when getBrowserInfo is absent', async () => {
    expect(await getBrowserName()).toBe('Firefox');
  });

  it('falls back to "Firefox" when getBrowserInfo rejects', async () => {
    (browser.runtime as { getBrowserInfo?: () => Promise<{ name: string }> }).getBrowserInfo = async () => {
      throw new Error('boom');
    };
    expect(await getBrowserName()).toBe('Firefox');
  });
});
