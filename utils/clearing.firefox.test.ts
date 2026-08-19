import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { browser } from 'wxt/browser';
import { clearLinkedOrigin, clearTabData } from './clearing';

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
  it('clears cookies and IndexedDB natively, and cache via a background tab', async () => {
    await clearLinkedOrigin('https://auth.domain.com', ['cache', 'cookies', 'indexedDB']);

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
      { indexedDB: true },
    );
  });

  it('closes the background tab before clearing cookies/IndexedDB, so a page reload cannot repopulate them after the wipe', async () => {
    await clearLinkedOrigin('https://auth.domain.com', ['cache', 'cookies', 'indexedDB']);

    const tabRemoveIndex = calls.indexOf('tabs.remove');
    const cookiesIndex = calls.indexOf('cookies.getAll');
    const indexedDbIndex = calls.indexOf('browsingData.remove');

    expect(tabRemoveIndex).toBeGreaterThanOrEqual(0);
    expect(tabRemoveIndex).toBeLessThan(cookiesIndex);
    expect(tabRemoveIndex).toBeLessThan(indexedDbIndex);
  });

  it('passes the cookieStoreId (Firefox container) through to the background tab', async () => {
    await clearLinkedOrigin('https://auth.domain.com', ['cache'], 'firefox-container-1');
    expect(browser.tabs.create).toHaveBeenCalledWith(
      expect.objectContaining({ cookieStoreId: 'firefox-container-1' }),
    );
  });

  it('skips opening a tab entirely when only cookies/IndexedDB are requested', async () => {
    await clearLinkedOrigin('https://auth.domain.com', ['cookies', 'indexedDB']);
    expect(browser.tabs.create).not.toHaveBeenCalled();
    expect(browser.cookies.getAll).toHaveBeenCalled();
    expect(browser.browsingData.remove).toHaveBeenCalled();
  });

  it('still clears cookies/IndexedDB even if the background-tab step fails, then rethrows', async () => {
    (browser.scripting.executeScript as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('boom'),
    );

    await expect(
      clearLinkedOrigin('https://auth.domain.com', ['cache', 'cookies', 'indexedDB']),
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
      'cache',
      'cookies',
      'indexedDB',
    ]);

    expect(ok).toBe(true);
    expect(browser.tabs.create).not.toHaveBeenCalled();
    expect(browser.scripting.executeScript).toHaveBeenCalledWith(
      expect.objectContaining({ target: { tabId: 42, allFrames: true } }),
    );
    expect(browser.cookies.getAll).toHaveBeenCalled();
    expect(browser.browsingData.remove).toHaveBeenCalledWith(
      { hostnames: ['domain.com'] },
      { indexedDB: true },
    );
  });

  it('returns false without touching any browser API when the tab has no url', async () => {
    const ok = await clearTabData({ id: 42 }, ['cache']);
    expect(ok).toBe(false);
    expect(browser.scripting.executeScript).not.toHaveBeenCalled();
  });
});
