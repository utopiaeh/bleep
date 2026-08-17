import { browser } from 'wxt/browser';
import { afterEach, describe, expect, it } from 'vitest';
import { siteScopedDataTypes } from './data-types';

afterEach(() => {
  delete (browser.runtime as { getBrowserInfo?: unknown }).getBrowserInfo;
});

describe('siteScopedDataTypes', () => {
  it('includes HTTP Cache on non-Firefox browsers', () => {
    const ids = siteScopedDataTypes().map((d) => d.id);
    expect(ids).toContain('cache');
  });

  it('excludes HTTP Cache on Firefox (no per-site clearing API)', () => {
    (browser.runtime as { getBrowserInfo?: unknown }).getBrowserInfo = () => {};
    const ids = siteScopedDataTypes().map((d) => d.id);
    expect(ids).not.toContain('cache');
    expect(ids).toContain('cookies');
  });

  it('never includes global-only types', () => {
    const ids = siteScopedDataTypes().map((d) => d.id);
    expect(ids).not.toContain('history');
    expect(ids).not.toContain('downloads');
    expect(ids).not.toContain('formData');
  });
});
