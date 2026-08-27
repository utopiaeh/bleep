import { browser } from 'wxt/browser';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { browserSyncStorage } from './storage-adapter';

function stubSyncStorage() {
  const data: Record<string, unknown> = {};
  Object.assign(browser, {
    storage: {
      ...browser.storage,
      sync: {
        get: vi.fn(async (keys: string | string[]) => {
          const list = Array.isArray(keys) ? keys : [keys];
          const result: Record<string, unknown> = {};
          for (const key of list) if (key in data) result[key] = data[key];
          return result;
        }),
        set: vi.fn(async (items: Record<string, unknown>) => {
          Object.assign(data, items);
        }),
        remove: vi.fn(async (keys: string | string[]) => {
          for (const key of Array.isArray(keys) ? keys : [keys]) delete data[key];
        }),
      },
    },
  });
  return data;
}

beforeEach(() => {
  stubSyncStorage();
});

describe('browserSyncStorage', () => {
  it('round-trips a short value', async () => {
    await browserSyncStorage.setItem('settings', '{"a":1}');
    expect(await browserSyncStorage.getItem('settings')).toBe('{"a":1}');
  });

  it('chunks a value larger than the per-item quota across multiple keys', async () => {
    const big = 'x'.repeat(20000);
    await browserSyncStorage.setItem('settings', big);
    expect(await browserSyncStorage.getItem('settings')).toBe(big);
    expect(browser.storage.sync.set).toHaveBeenCalled();
    const lastCallArgs = (browser.storage.sync.set as ReturnType<typeof vi.fn>).mock.calls.at(-1)![0];
    expect(Object.keys(lastCallArgs).length).toBeGreaterThan(1);
  });

  it('returns null for a key that was never set', async () => {
    expect(await browserSyncStorage.getItem('missing')).toBeNull();
  });

  it('removeItem clears every chunk, not just the first', async () => {
    await browserSyncStorage.setItem('settings', 'x'.repeat(20000));
    await browserSyncStorage.removeItem('settings');
    expect(await browserSyncStorage.getItem('settings')).toBeNull();
  });

  it('overwriting with a shorter value does not leave stale trailing chunks', async () => {
    const data = stubSyncStorage();
    await browserSyncStorage.setItem('settings', 'x'.repeat(20000));
    const chunkCountBefore = Object.keys(data).filter((k) => k.startsWith('settings__') && k !== 'settings__len').length;
    expect(chunkCountBefore).toBeGreaterThan(1);

    await browserSyncStorage.setItem('settings', 'short');
    expect(await browserSyncStorage.getItem('settings')).toBe('short');
    const chunkCountAfter = Object.keys(data).filter((k) => k.startsWith('settings__') && k !== 'settings__len').length;
    expect(chunkCountAfter).toBe(1);
  });

  it('migrates a pre-sync plain value from storage.local on first read', async () => {
    (browser.storage.local.get as unknown as ReturnType<typeof vi.fn>) = vi
      .fn()
      .mockResolvedValue({ settings: '{"legacy":true}' });

    expect(await browserSyncStorage.getItem('settings')).toBe('{"legacy":true}');
    expect(await browserSyncStorage.getItem('settings')).toBe('{"legacy":true}');
  });
});
