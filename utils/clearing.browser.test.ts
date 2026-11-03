import { browser } from 'wxt/browser';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearGlobal,
  clearLinkedOrigin,
  clearSiteViaBrowsingData,
  clearSiteWithLinked,
  clearTabData,
  allowedSiteIds,
  getSupportedKeys,
  protectedExcludeOrigins,
  requestOriginPermission,
} from './clearing';

function stubBrowserApis() {
  Object.assign(browser, {
    browsingData: {
      settings: vi
        .fn()
        .mockResolvedValue({ dataToRemove: { cache: true, cookies: true, indexedDB: true } }),
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

  it('passes excludeOrigins through on Chrome', async () => {
    await clearGlobal(['cache', 'cookies'], ['https://protected.com']);
    expect(browser.browsingData.remove).toHaveBeenCalledWith(
      { since: 0, excludeOrigins: ['https://protected.com'] },
      { cache: true, cookies: true },
    );
  });

  it('leaves history-type data alone while sites are protected', async () => {
    (browser.browsingData.settings as ReturnType<typeof vi.fn>).mockResolvedValue({
      dataToRemove: { cache: true, cookies: true, history: true, downloads: true },
    });
    await clearGlobal(['cache', 'history', 'downloads'], ['https://protected.com']);
    expect(browser.browsingData.remove).toHaveBeenCalledTimes(1);
    expect(browser.browsingData.remove).toHaveBeenCalledWith(
      { since: 0, excludeOrigins: ['https://protected.com'] },
      { cache: true },
    );
  });

  it('omits excludeOrigins entirely when the list is empty', async () => {
    await clearGlobal(['cache', 'cookies'], []);
    expect(browser.browsingData.remove).toHaveBeenCalledWith(
      { since: 0 },
      { cache: true, cookies: true },
    );
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

describe('clearTabData (Chrome path)', () => {
  it('clears the tab origin via browsingData', async () => {
    const ok = await clearTabData({ id: 1, url: 'https://domain.com' }, ['cache'], '');
    expect(ok).toBe(true);
    expect(browser.browsingData.remove).toHaveBeenCalledWith(
      { since: 0, origins: ['https://domain.com'] },
      { cache: true },
    );
  });
});

describe('clearLinkedOrigin (Chrome path)', () => {
  it('clears the linked origin directly via browsingData', async () => {
    await clearLinkedOrigin('https://auth.domain.com', ['cache'], '');
    expect(browser.browsingData.remove).toHaveBeenCalledWith(
      { since: 0, origins: ['https://auth.domain.com'] },
      { cache: true },
    );
  });

  it('does nothing when none of the requested ids are site-scoped', async () => {
    await clearLinkedOrigin('https://auth.domain.com', ['history'], '');
    expect(browser.browsingData.remove).not.toHaveBeenCalled();
  });
});

describe('protectedExcludeOrigins', () => {
  it('searches all of history and always includes the protected hosts themselves', async () => {
    const search = vi
      .fn()
      .mockResolvedValue([{ url: 'https://www.bank.com/a' }, { url: 'https://other.com/' }]);
    Object.assign(browser, { history: { search } });

    const origins = await protectedExcludeOrigins('bank.com\nnever-visited.org');

    expect(search).toHaveBeenCalledWith(expect.objectContaining({ startTime: 0 }));
    expect(origins.sort()).toEqual(
      [
        'http://bank.com',
        'http://never-visited.org',
        'https://bank.com',
        'https://never-visited.org',
        'https://www.bank.com',
      ].sort(),
    );
  });

  it('excludes every port and scheme a protected host was visited on', async () => {
    Object.assign(browser, {
      history: {
        search: vi
          .fn()
          .mockResolvedValue([
            { url: 'http://localhost:3000/' },
            { url: 'http://localhost:5173/app' },
            { url: 'https://localhost:8443/' },
          ]),
      },
    });
    const origins = await protectedExcludeOrigins('localhost');
    expect(origins).toEqual(
      expect.arrayContaining([
        'http://localhost:3000',
        'http://localhost:5173',
        'https://localhost:8443',
      ]),
    );
  });

  it('skips the history lookup when nothing is protected', async () => {
    const search = vi.fn();
    Object.assign(browser, { history: { search } });
    expect(await protectedExcludeOrigins('  ')).toEqual([]);
    expect(search).not.toHaveBeenCalled();
  });
});

describe('clearSiteWithLinked', () => {
  const opts = {
    useOriginMappings: true,
    linkedOrigins: 'domain.com => auth.domain.com, bank.com',
    protectedSites: 'bank.com',
  };

  it('clears the tab and its linked origins, skipping protected ones', async () => {
    const linked = await clearSiteWithLinked(
      { id: 1, url: 'https://domain.com/app' },
      ['cache'],
      opts,
    );

    expect(linked).toEqual(['https://auth.domain.com']);
    const origins = (browser.browsingData.remove as ReturnType<typeof vi.fn>).mock.calls.map(
      ([options]) => (options as { origins?: string[] }).origins,
    );
    expect(origins).toEqual([['https://domain.com'], ['https://auth.domain.com']]);
  });

  it('ignores mappings when they are turned off', async () => {
    const linked = await clearSiteWithLinked({ id: 1, url: 'https://domain.com' }, ['cache'], {
      ...opts,
      useOriginMappings: false,
    });
    expect(linked).toEqual([]);
    expect(browser.browsingData.remove).toHaveBeenCalledTimes(1);
  });

  it('returns null when the tab has no clearable origin', async () => {
    expect(
      await clearSiteWithLinked({ id: 1, url: 'chrome://settings' }, ['cache'], opts),
    ).toBeNull();
    expect(browser.browsingData.remove).not.toHaveBeenCalled();
  });
});

describe('protected sites are never touched by per-site clears', () => {
  it('refuses a protected site and its subdomains', async () => {
    expect(allowedSiteIds('https://www.bank.com', ['cache'], 'bank.com')).toBeNull();
    expect(
      await clearTabData({ id: 1, url: 'https://www.bank.com/login' }, ['cache'], 'bank.com'),
    ).toBe(false);
    await clearLinkedOrigin('https://bank.com', ['cache'], 'bank.com');
    expect(browser.browsingData.remove).not.toHaveBeenCalled();
  });

  it('keeps cookies when a protected site shares the parent domain', () => {
    expect(
      allowedSiteIds('https://app.example.com', ['cache', 'cookies'], 'bank.example.com'),
    ).toEqual(['cache']);
    expect(allowedSiteIds('https://shop.example.co.uk', ['cookies'], 'bank.example.co.uk')).toEqual(
      [],
    );
    expect(allowedSiteIds('https://example.org', ['cookies'], 'example.com')).toEqual(['cookies']);
  });

  it('the shared tab clear skips protected sites even if the UI forgot to check', async () => {
    const linked = await clearSiteWithLinked({ id: 1, url: 'https://bank.com' }, ['cache'], {
      useOriginMappings: false,
      linkedOrigins: '',
      protectedSites: 'bank.com',
    });
    expect(linked).toBeNull();
    expect(browser.browsingData.remove).not.toHaveBeenCalled();
  });
});
