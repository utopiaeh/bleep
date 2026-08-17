import { browser } from 'wxt/browser';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearGlobal,
  clearLinkedOrigin,
  clearSiteViaBrowsingData,
  clearTab,
  getSupportedKeys,
  requestOriginPermission,
} from './clearing';

// fake-browser (wxt/testing) doesn't implement browsingData/cookies/permissions —
// stub them directly on the shared fake `browser` object per test.
function stubBrowserApis() {
  Object.assign(browser, {
    browsingData: {
      settings: vi.fn().mockResolvedValue({ dataToRemove: { cache: true, cookies: true, indexedDB: true } }),
      remove: vi.fn().mockResolvedValue(undefined),
    },
    permissions: {
      request: vi.fn().mockResolvedValue(true),
    },
  });
}

beforeEach(() => {
  stubBrowserApis();
});

describe('getSupportedKeys', () => {
  it('returns the keys the browser reports as removable', async () => {
    const keys = await getSupportedKeys();
    expect(keys).toEqual(new Set(['cache', 'cookies', 'indexedDB']));
  });
});

describe('clearGlobal', () => {
  it('calls browsingData.remove with only the supported, requested keys', async () => {
    await clearGlobal(['cache', 'cookies', 'history']);
    expect(browser.browsingData.remove).toHaveBeenCalledWith(
      { since: 0 },
      { cache: true, cookies: true },
    );
  });

  it('skips the remove call entirely when nothing requested is supported', async () => {
    await clearGlobal(['history', 'downloads']);
    expect(browser.browsingData.remove).not.toHaveBeenCalled();
  });
});

describe('clearSiteViaBrowsingData', () => {
  it('scopes removal to the given origin and drops non-site-scoped ids', async () => {
    await clearSiteViaBrowsingData('https://domain.com', ['cache', 'cookies', 'history']);
    expect(browser.browsingData.remove).toHaveBeenCalledWith(
      { since: 0, origins: ['https://domain.com'] },
      { cache: true, cookies: true },
    );
  });
});

describe('requestOriginPermission', () => {
  it('requests the broad host permission', async () => {
    await requestOriginPermission();
    expect(browser.permissions.request).toHaveBeenCalledWith({ origins: ['*://*/*'] });
  });

  it('reflects a denial from the browser', async () => {
    (browser.permissions.request as ReturnType<typeof vi.fn>).mockResolvedValue(false);
    expect(await requestOriginPermission()).toBe(false);
  });
});

describe('clearTab', () => {
  it('does not attempt to clear when permission is denied', async () => {
    (browser.permissions.request as ReturnType<typeof vi.fn>).mockResolvedValue(false);
    const ok = await clearTab({ id: 1, url: 'https://domain.com' }, ['cache']);
    expect(ok).toBe(false);
    expect(browser.browsingData.remove).not.toHaveBeenCalled();
  });

  it('clears via browsingData once permission is granted (Chrome path)', async () => {
    const ok = await clearTab({ id: 1, url: 'https://domain.com' }, ['cache']);
    expect(ok).toBe(true);
    expect(browser.browsingData.remove).toHaveBeenCalledWith(
      { since: 0, origins: ['https://domain.com'] },
      { cache: true },
    );
  });
});

describe('clearLinkedOrigin (Chrome path)', () => {
  it('clears the linked origin directly via browsingData', async () => {
    await clearLinkedOrigin('https://auth.domain.com', ['cache']);
    expect(browser.browsingData.remove).toHaveBeenCalledWith(
      { since: 0, origins: ['https://auth.domain.com'] },
      { cache: true },
    );
  });

  it('does nothing when none of the requested ids are site-scoped', async () => {
    await clearLinkedOrigin('https://auth.domain.com', ['history']);
    expect(browser.browsingData.remove).not.toHaveBeenCalled();
  });
});
