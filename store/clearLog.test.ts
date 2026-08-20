import { beforeEach, describe, expect, it } from 'vitest';
import { recordClear, useClearLogStore } from './clearLog';

beforeEach(() => {
  useClearLogStore.setState({ entries: [] });
});

describe('logClear / recordClear', () => {
  it('adds an entry with the given fields', () => {
    recordClear('domain.com', ['cache', 'cookies'], ['auth.domain.com']);
    const [entry] = useClearLogStore.getState().entries;
    expect(entry).toMatchObject({
      hostname: 'domain.com',
      types: ['cache', 'cookies'],
      linkedTargets: ['auth.domain.com'],
    });
    expect(typeof entry!.timestamp).toBe('number');
    expect(typeof entry!.id).toBe('string');
  });

  it('newest entry goes first', () => {
    recordClear('first.com', ['cache']);
    recordClear('second.com', ['cache']);
    const entries = useClearLogStore.getState().entries;
    expect(entries[0]!.hostname).toBe('second.com');
    expect(entries[1]!.hostname).toBe('first.com');
  });

  it('caps the log at 20 entries, dropping the oldest', () => {
    for (let i = 0; i < 25; i++) recordClear(`site${i}.com`, ['cache']);
    const entries = useClearLogStore.getState().entries;
    expect(entries).toHaveLength(20);
    expect(entries[0]!.hostname).toBe('site24.com');
    expect(entries.at(-1)!.hostname).toBe('site5.com');
  });
});

describe('clearLog', () => {
  it('empties the entries list', () => {
    recordClear('domain.com', ['cache']);
    useClearLogStore.getState().clearLog();
    expect(useClearLogStore.getState().entries).toEqual([]);
  });
});
