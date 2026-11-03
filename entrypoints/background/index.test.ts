import { browser, type Browser } from 'wxt/browser';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearActiveSite,
  requestSiteAccess,
  flashResult,
  getMappingSettings,
  invalidateMappingSettingsCache,
  updateIcon,
} from './index';
import { readPersistedSettingsRaw } from '../../utils/storage-adapter';

vi.mock('../../utils/storage-adapter', () => ({
  readPersistedSettingsRaw: vi.fn(),
}));

const DEFAULT_ICON = {
  16: 'icon/16.png',
  32: 'icon/32.png',
  48: 'icon/48.png',
  96: 'icon/96.png',
  128: 'icon/128.png',
};
const LINKED_ICON = {
  16: 'icon/16-linked.png',
  32: 'icon/32-linked.png',
  48: 'icon/48-linked.png',
  96: 'icon/96-linked.png',
  128: 'icon/128-linked.png',
};

function mockPersisted(linkedOrigins: string, useOriginMappings: boolean) {
  (readPersistedSettingsRaw as ReturnType<typeof vi.fn>).mockResolvedValue({
    state: { linkedOrigins, useOriginMappings },
  });
}

function fakeTab(fields: Pick<Browser.tabs.Tab, 'id' | 'url'>): Browser.tabs.Tab {
  return {
    index: 0,
    active: true,
    pinned: false,
    highlighted: false,
    incognito: false,
    ...fields,
  } as Browser.tabs.Tab;
}

function stubCanvas() {
  const ctx = {
    drawImage: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    getImageData: vi.fn(() => 'pixels'),
  };
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ blob: () => Promise.resolve('blob') }));
  vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue('bitmap'));
  vi.stubGlobal(
    'OffscreenCanvas',
    class {
      getContext() {
        return ctx;
      }
    },
  );
}

beforeEach(() => {
  stubCanvas();
  invalidateMappingSettingsCache();
  vi.clearAllMocks();
  Object.assign(browser, {
    action: {
      setIcon: vi.fn().mockResolvedValue(undefined),
      openPopup: vi.fn().mockResolvedValue(undefined),
    },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('updateIcon', () => {
  it('sets the default icon when the tab has no url', async () => {
    await updateIcon(1, undefined);
    expect(browser.action.setIcon).toHaveBeenCalledWith({ tabId: 1, path: DEFAULT_ICON });
  });

  it('sets the linked icon when the origin matches a mapping', async () => {
    mockPersisted('domain.com => auth.domain.com', true);
    await updateIcon(1, 'https://domain.com');
    expect(browser.action.setIcon).toHaveBeenCalledWith({ tabId: 1, path: LINKED_ICON });
  });

  it('sets the default icon when the origin has no mapping', async () => {
    mockPersisted('other.com => auth.other.com', true);
    await updateIcon(1, 'https://domain.com');
    expect(browser.action.setIcon).toHaveBeenCalledWith({ tabId: 1, path: DEFAULT_ICON });
  });

  it('sets the default icon when useOriginMappings is off, even if a mapping would match', async () => {
    mockPersisted('domain.com => auth.domain.com', false);
    await updateIcon(1, 'https://domain.com');
    expect(browser.action.setIcon).toHaveBeenCalledWith({ tabId: 1, path: DEFAULT_ICON });
  });

  it('does not throw when setIcon rejects (e.g. the tab already closed)', async () => {
    (browser.action.setIcon as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('No tab with id: 1'),
    );
    await expect(updateIcon(1, undefined)).resolves.toBeUndefined();
  });

  it('drops a stale update superseded by a newer call for the same tab', async () => {
    mockPersisted('domain.com => auth.domain.com', true);

    const stale = updateIcon(1, 'https://domain.com');
    const fresh = updateIcon(1, 'https://other.com');
    await Promise.all([stale, fresh]);

    expect(browser.action.setIcon).toHaveBeenCalledTimes(1);
    expect(browser.action.setIcon).toHaveBeenCalledWith({ tabId: 1, path: DEFAULT_ICON });
  });

  it('tracks tabs independently — updating one tab does not drop another', async () => {
    mockPersisted('domain.com => auth.domain.com', true);
    await Promise.all([updateIcon(1, 'https://domain.com'), updateIcon(2, 'https://other.com')]);

    expect(browser.action.setIcon).toHaveBeenCalledWith({ tabId: 1, path: LINKED_ICON });
    expect(browser.action.setIcon).toHaveBeenCalledWith({ tabId: 2, path: DEFAULT_ICON });
  });
});

describe('getMappingSettings caching', () => {
  it('only reads persisted settings once across repeated calls', async () => {
    mockPersisted('domain.com => auth.domain.com', true);
    await getMappingSettings();
    await getMappingSettings();
    expect(readPersistedSettingsRaw).toHaveBeenCalledTimes(1);
  });

  it('re-reads after invalidateMappingSettingsCache()', async () => {
    mockPersisted('domain.com => auth.domain.com', true);
    await getMappingSettings();
    invalidateMappingSettingsCache();
    await getMappingSettings();
    expect(readPersistedSettingsRaw).toHaveBeenCalledTimes(2);
  });

  it('falls back to the app defaults when nothing is persisted yet', async () => {
    (readPersistedSettingsRaw as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    expect(await getMappingSettings()).toMatchObject({
      linkedOrigins: '',
      useOriginMappings: true,
    });
  });
});

describe('flashResult', () => {
  it('shows a dot icon, then restores the normal icon', async () => {
    vi.useFakeTimers();
    Object.assign(browser.tabs, { get: vi.fn().mockResolvedValue({ url: undefined }) });

    await flashResult(true, 7);
    expect(browser.action.setIcon).toHaveBeenCalledWith({
      tabId: 7,
      imageData: { 16: 'pixels', 32: 'pixels' },
    });

    await updateIcon(7, undefined);
    expect(browser.action.setIcon).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(2000);
    expect(browser.action.setIcon).toHaveBeenLastCalledWith({ tabId: 7, path: DEFAULT_ICON });

    vi.useRealTimers();
  });
});

describe('clearActiveSite', () => {
  it('refuses protected sites and flashes a failure', async () => {
    (readPersistedSettingsRaw as ReturnType<typeof vi.fn>).mockResolvedValue({
      state: { protectedSites: 'bank.com' },
    });
    Object.assign(browser, { browsingData: { remove: vi.fn(), settings: vi.fn() } });

    await clearActiveSite(
      fakeTab({ id: 3, url: 'https://www.bank.com/login' }),
      Promise.resolve(true),
    );

    expect(browser.browsingData.remove).not.toHaveBeenCalled();
    expect(browser.action.setIcon).toHaveBeenCalledWith(expect.objectContaining({ tabId: 3 }));
  });

  it('opens the popup when site access was refused', async () => {
    (readPersistedSettingsRaw as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await clearActiveSite(fakeTab({ id: 4, url: 'https://example.com' }), Promise.resolve(false));

    expect(browser.action.setIcon).toHaveBeenCalledWith(expect.objectContaining({ tabId: 4 }));
    expect(browser.action.openPopup).toHaveBeenCalled();
  });
});

describe('requestSiteAccess', () => {
  it('resolves false instead of throwing when the browser refuses the prompt', async () => {
    Object.assign(browser, {
      permissions: { request: vi.fn().mockRejectedValue(new Error('no user gesture')) },
    });
    await expect(requestSiteAccess()).resolves.toBe(false);
  });
});

describe('background startup without the context menu API', () => {
  it('still registers the other listeners', async () => {
    const onCommand = vi.fn();
    Object.assign(browser, {
      contextMenus: undefined,
      menus: undefined,
      commands: { onCommand: { addListener: onCommand } },
    });
    const { default: background } = await import('./index');
    expect(() => background.main()).not.toThrow();
    expect(onCommand).toHaveBeenCalled();
  });
});
