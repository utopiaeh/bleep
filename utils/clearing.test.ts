import { describe, expect, it } from 'vitest';
import { siteScopedIds } from './clearing';

describe('siteScopedIds', () => {
  it('keeps only origin-scoped types, drops history/downloads/formData', () => {
    const result = siteScopedIds(['cache', 'history', 'downloads', 'formData', 'cookies']);
    expect(result).toEqual(['cache', 'cookies']);
  });

  it('returns empty when nothing is site-scoped', () => {
    expect(siteScopedIds(['history', 'downloads'])).toEqual([]);
  });
});
