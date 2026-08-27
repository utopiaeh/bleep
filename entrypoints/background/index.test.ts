import { browser } from 'wxt/browser';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getMappingSettings, invalidateMappingSettingsCache, updateIcon } from './index';
import { readPersistedSettingsRaw } from '../../utils/storage-adapter';

vi.mock('../../utils/storage-adapter', () => ({
  readPersistedSettingsRaw: vi.fn(),
}));

const DEFAULT_ICON = { 16: 'icon/16.png', 32: 'icon/32.png', 48: 'icon/48.png', 96: 'icon/96.png', 128: 'icon/128.png' };
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

beforeEach(() => {
  invalidateMappingSettingsCache();
  vi.clearAllMocks();
  Object.assign(browser, {
    action: { setIcon: vi.fn().mockResolvedValue(undefined) },
  });
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
    (browser.action.setIcon as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('No tab with id: 1'));
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

  it('defaults to empty/false when nothing is persisted yet', async () => {
    (readPersistedSettingsRaw as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    expect(await getMappingSettings()).toEqual({ linkedOrigins: '', useOriginMappings: false });
  });
});
