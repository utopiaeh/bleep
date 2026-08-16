import { describe, expect, it } from 'vitest';
import { clearAllLabel } from './clear-status';
import type { TranslationKey } from './i18n';

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
