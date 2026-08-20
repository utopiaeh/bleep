import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { browser } from 'wxt/browser';
import { clearGlobal, clearLinkedOrigin, clearTabData } from './clearing';

beforeEach(() => {
  vi.stubEnv('FIREFOX', 'true');
});

afterEach(() => {
  vi.unstubAllEnvs();
});
let onUpdatedListeners: Array<(tabId: number, info: { status?: string }) => void>;
let nextTabId: number;
let calls: string[];

function stubBrowserApis() {
  onUpdatedListeners = [];
  nextTabId = 1;
  calls = [];

  Object.assign(browser, {
    tabs: {
      create: vi.fn(async (props: { url: string }) => {
        const tab = { id: nextTabId++, url: props.url };
        calls.push('tabs.create');
        setTimeout(() => onUpdatedListeners.forEach((fn) => fn(tab.id, { status: 'complete' })), 0);
        return tab;
      }),
      remove: vi.fn(async () => {
        calls.push('tabs.remove');
      }),
      onUpdated: {
        addListener: (fn: (tabId: number, info: { status?: string }) => void) => {
          onUpdatedListeners.push(fn);
        },
        removeListener: (fn: (tabId: number, info: { status?: string }) => void) => {
          onUpdatedListeners = onUpdatedListeners.filter((l) => l !== fn);
        },
      },
    },
    scripting: {
      executeScript: vi.fn(async () => {
        calls.push('scripting.executeScript');
        return [{ result: { failed: {} } }];
      }),
    },
    cookies: {
      getAll: vi.fn(async () => {
        calls.push('cookies.getAll');
        return [];
      }),
      remove: vi.fn().mockResolvedValue(undefined),
    },
    browsingData: {
      remove: vi.fn(async () => {
        calls.push('browsingData.remove');
      }),
      settings: vi.fn().mockResolvedValue({ dataToRemove: {} }),
    },
  });
}

beforeEach(() => {
  stubBrowserApis();
});

describe('clearLinkedOrigin (Firefox path)', () => {
  const NATIVE_IDS = ['cookies', 'indexedDB', 'localStorage', 'serviceWorkers'] as const;

  it('clears cookies/indexedDB/localStorage/serviceWorkers natively, and cacheStorage via a background tab', async () => {
    await clearLinkedOrigin('https://auth.domain.com', ['cacheStorage', ...NATIVE_IDS]);

    expect(browser.tabs.create).toHaveBeenCalledWith(
      expect.objectContaining({ url: 'https://auth.domain.com', active: false }),
    );
    expect(browser.scripting.executeScript).toHaveBeenCalledWith(
      expect.objectContaining({ target: expect.objectContaining({ allFrames: true }) }),
    );
    expect(browser.tabs.remove).toHaveBeenCalled();
    expect(browser.cookies.getAll).toHaveBeenCalled();
    expect(browser.browsingData.remove).toHaveBeenCalledWith(
      { hostnames: ['auth.domain.com'] },
      { indexedDB: true, localStorage: true, serviceWorkers: true },
    );
  });

  it('never needs a tab for HTTP Cache — Firefox has no per-site API for it at all', async () => {
    await clearLinkedOrigin('https://auth.domain.com', ['cache', 'cookies']);
    expect(browser.tabs.create).not.toHaveBeenCalled();
  });

  it('closes the background tab before clearing cookies/indexedDB/localStorage/serviceWorkers, so a page reload cannot repopulate them after the wipe', async () => {
    await clearLinkedOrigin('https://auth.domain.com', ['cacheStorage', ...NATIVE_IDS]);

    const tabRemoveIndex = calls.indexOf('tabs.remove');
    const cookiesIndex = calls.indexOf('cookies.getAll');
    const nativeIndex = calls.indexOf('browsingData.remove');

    expect(tabRemoveIndex).toBeGreaterThanOrEqual(0);
    expect(tabRemoveIndex).toBeLessThan(cookiesIndex);
    expect(tabRemoveIndex).toBeLessThan(nativeIndex);
  });

  it('passes the cookieStoreId (Firefox container) through to the background tab', async () => {
    await clearLinkedOrigin('https://auth.domain.com', ['cacheStorage'], 'firefox-container-1');
    expect(browser.tabs.create).toHaveBeenCalledWith(
      expect.objectContaining({ cookieStoreId: 'firefox-container-1' }),
    );
  });

  it('skips opening a tab entirely when only natively-scopeable types are requested', async () => {
    await clearLinkedOrigin('https://auth.domain.com', [...NATIVE_IDS]);
    expect(browser.tabs.create).not.toHaveBeenCalled();
    expect(browser.cookies.getAll).toHaveBeenCalled();
    expect(browser.browsingData.remove).toHaveBeenCalledWith(
      { hostnames: ['auth.domain.com'] },
      { indexedDB: true, localStorage: true, serviceWorkers: true },
    );
  });

  it('still clears cookies/indexedDB even if the background-tab step fails, then rethrows', async () => {
    (browser.scripting.executeScript as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('boom'));

    await expect(
      clearLinkedOrigin('https://auth.domain.com', ['cacheStorage', ...NATIVE_IDS]),
    ).rejects.toThrow('boom');

    expect(browser.tabs.remove).toHaveBeenCalled();
    expect(browser.cookies.getAll).toHaveBeenCalled();
    expect(browser.browsingData.remove).toHaveBeenCalled();
  });

  it('does nothing when none of the requested ids are site-scoped', async () => {
    await clearLinkedOrigin('https://auth.domain.com', ['history']);
    expect(browser.tabs.create).not.toHaveBeenCalled();
    expect(browser.cookies.getAll).not.toHaveBeenCalled();
    expect(browser.browsingData.remove).not.toHaveBeenCalled();
  });
});

describe('clearTabData (Firefox path)', () => {
  it('clears an already-open tab via the content script, no navigation needed', async () => {
    const ok = await clearTabData({ id: 42, url: 'https://domain.com' }, [
      'cacheStorage',
      'cookies',
      'indexedDB',
      'localStorage',
      'serviceWorkers',
    ]);

    expect(ok).toBe(true);
    expect(browser.tabs.create).not.toHaveBeenCalled();
    expect(browser.scripting.executeScript).toHaveBeenCalledWith(
      expect.objectContaining({ target: { tabId: 42, allFrames: true } }),
    );
    expect(browser.cookies.getAll).toHaveBeenCalled();
    expect(browser.browsingData.remove).toHaveBeenCalledWith(
      { hostnames: ['domain.com'] },
      { indexedDB: true, localStorage: true, serviceWorkers: true },
    );
  });

  it('returns false without touching any browser API when the tab has no url', async () => {
    const ok = await clearTabData({ id: 42 }, ['cacheStorage']);
    expect(ok).toBe(false);
    expect(browser.scripting.executeScript).not.toHaveBeenCalled();
  });
});

describe('clearGlobal (Firefox path)', () => {
  it('ignores excludeOrigins — Firefox has no such option, so Global stays all-or-nothing', async () => {
    (browser.browsingData.settings as ReturnType<typeof vi.fn>).mockResolvedValue({
      dataToRemove: { cache: true },
    });
    await clearGlobal(['cache'], ['https://protected.com']);
    expect(browser.browsingData.remove).toHaveBeenCalledWith({ since: 0 }, { cache: true });
  });
});

describe('clearCookiesForOrigin (via clearTabData, Firefox path)', () => {
  it('fetches every partition in one call using an empty partitionKey', async () => {
    await clearTabData({ id: 42, url: 'https://domain.com' }, ['cookies']);
    expect(browser.cookies.getAll).toHaveBeenCalledTimes(1);
    expect(browser.cookies.getAll).toHaveBeenCalledWith(
      expect.objectContaining({ url: 'https://domain.com', partitionKey: {} }),
    );
  });

  it('falls back to an unpartitioned-only call if the partitioned getAll rejects', async () => {
    (browser.cookies.getAll as ReturnType<typeof vi.fn>)
      .mockRejectedValueOnce(new Error('partitionKey unsupported'))
      .mockResolvedValueOnce([]);

    const ok = await clearTabData({ id: 42, url: 'https://domain.com' }, ['cookies']);

    expect(ok).toBe(true);
    expect(browser.cookies.getAll).toHaveBeenCalledTimes(2);
    expect(browser.cookies.getAll).toHaveBeenLastCalledWith(
      expect.objectContaining({ url: 'https://domain.com' }),
    );
  });
});
