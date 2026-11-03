import { beforeEach, describe, expect, it } from 'vitest';
import { browser } from 'wxt/browser';
import { recordClear, useClearLogStore } from './clearLog';

beforeEach(() => {
  useClearLogStore.setState({ entries: [] });
});

describe('logClear / recordClear', () => {
  it('adds an entry with the given fields', async () => {
    await recordClear('domain.com', ['cache', 'cookies'], ['auth.domain.com']);
    const [entry] = useClearLogStore.getState().entries;
    expect(entry).toMatchObject({
      hostname: 'domain.com',
      types: ['cache', 'cookies'],
      linkedTargets: ['auth.domain.com'],
    });
    expect(typeof entry!.timestamp).toBe('number');
    expect(typeof entry!.id).toBe('string');
  });

  it('newest entry goes first', async () => {
    await recordClear('first.com', ['cache']);
    await recordClear('second.com', ['cache']);
    const entries = useClearLogStore.getState().entries;
    expect(entries[0]!.hostname).toBe('second.com');
    expect(entries[1]!.hostname).toBe('first.com');
  });

  it('caps the log at 20 entries, dropping the oldest', async () => {
    for (let i = 0; i < 25; i++) await recordClear(`site${i}.com`, ['cache']);
    const entries = useClearLogStore.getState().entries;
    expect(entries).toHaveLength(20);
    expect(entries[0]!.hostname).toBe('site24.com');
    expect(entries.at(-1)!.hostname).toBe('site5.com');
  });
});

describe('clearLog', () => {
  it('empties the entries list', async () => {
    await recordClear('domain.com', ['cache']);
    useClearLogStore.getState().clearLog();
    expect(useClearLogStore.getState().entries).toEqual([]);
  });
});

describe('recordClear across contexts', () => {
  it('keeps entries another context saved since this one loaded', async () => {
    await browser.storage.local.set({
      'cache-cleaner-clear-log': JSON.stringify({
        state: {
          entries: [
            { id: 'x', timestamp: 1, hostname: 'from-popup.com', types: [], linkedTargets: [] },
          ],
        },
        version: 1,
      }),
    });

    await recordClear('from-background.com', ['cache']);

    expect(useClearLogStore.getState().entries.map((e) => e.hostname)).toEqual([
      'from-background.com',
      'from-popup.com',
    ]);
  });
});
