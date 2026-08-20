import { describe, expect, it } from 'vitest';
import { withItem, withoutItem } from './set-helpers';

describe('withItem', () => {
  it('returns a new set with the item added', () => {
    const original = new Set([1, 2]);
    const result = withItem(original, 3);
    expect(result).toEqual(new Set([1, 2, 3]));
    expect(original).toEqual(new Set([1, 2]));
  });

  it('is a no-op value-wise when the item is already present', () => {
    expect(withItem(new Set([1]), 1)).toEqual(new Set([1]));
  });
});

describe('withoutItem', () => {
  it('returns a new set with the item removed', () => {
    const original = new Set([1, 2, 3]);
    const result = withoutItem(original, 2);
    expect(result).toEqual(new Set([1, 3]));
    expect(original).toEqual(new Set([1, 2, 3]));
  });

  it('is a no-op when the item is absent', () => {
    expect(withoutItem(new Set([1]), 2)).toEqual(new Set([1]));
  });
});
