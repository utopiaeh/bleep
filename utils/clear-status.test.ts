import { describe, expect, it, vi } from 'vitest';
import { clearAllLabel, runClear } from './clear-status';
import type { TranslationKey } from './i18n';
import type { ClearStatus } from '../components/StatusButton';

const t = (key: TranslationKey, vars?: Record<string, string | number>) =>
  vars ? `${key}:${JSON.stringify(vars)}` : key;

describe('clearAllLabel', () => {
  it('shows the clearing label while in progress', () => {
    expect(clearAllLabel(t, 'clearing', 3)).toBe('clearing');
  });

  it('shows the done label once finished', () => {
    expect(clearAllLabel(t, 'done', 3)).toBe('cleared');
  });

  it('shows the failure label on failure', () => {
    expect(clearAllLabel(t, 'failed', 3)).toBe('someFailed');
  });

  it('shows the count when idle', () => {
    expect(clearAllLabel(t, 'idle', 3)).toBe('clearAllCount:{"count":3}');
  });
});

describe('runClear', () => {
  it('transitions clearing -> done -> idle on success', async () => {
    vi.useFakeTimers();
    const statuses: ClearStatus[] = [];
    const setStatus = (s: ClearStatus) => statuses.push(s);

    const promise = runClear(setStatus, async () => {});
    expect(statuses).toEqual(['clearing']);
    await promise;
    expect(statuses).toEqual(['clearing', 'done']);

    vi.advanceTimersByTime(1500);
    expect(statuses).toEqual(['clearing', 'done', 'idle']);
    vi.useRealTimers();
  });

  it('transitions clearing -> failed -> idle when fn throws', async () => {
    vi.useFakeTimers();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const statuses: ClearStatus[] = [];
    const setStatus = (s: ClearStatus) => statuses.push(s);

    await runClear(setStatus, async () => {
      throw new Error('boom');
    });
    expect(statuses).toEqual(['clearing', 'failed']);

    vi.advanceTimersByTime(1500);
    expect(statuses).toEqual(['clearing', 'failed', 'idle']);
    vi.useRealTimers();
    vi.restoreAllMocks();
  });
});
