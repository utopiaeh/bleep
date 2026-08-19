import { describe, expect, it } from 'vitest';
import { mapWithConcurrency } from './concurrency';

describe('mapWithConcurrency', () => {
  it('returns results in the original order regardless of completion order', async () => {
    const items = [30, 10, 20];
    const result = await mapWithConcurrency(items, 3, (ms) => new Promise((r) => setTimeout(() => r(ms), ms)));
    expect(result).toEqual([30, 10, 20]);
  });

  it('never runs more than `limit` at once', async () => {
    let active = 0;
    let maxActive = 0;
    const items = Array.from({ length: 10 }, (_, i) => i);

    await mapWithConcurrency(items, 3, async (i) => {
      active++;
      maxActive = Math.max(maxActive, active);
      await new Promise((r) => setTimeout(r, 1));
      active--;
      return i;
    });

    expect(maxActive).toBeLessThanOrEqual(3);
  });

  it('processes every item exactly once', async () => {
    const seen: number[] = [];
    await mapWithConcurrency([1, 2, 3, 4, 5], 2, async (i) => {
      seen.push(i);
      return i;
    });
    expect(seen.sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it('handles an empty list', async () => {
    expect(await mapWithConcurrency([], 5, async (i) => i)).toEqual([]);
  });

  it('handles a limit larger than the item count', async () => {
    expect(await mapWithConcurrency([1, 2], 10, async (i) => i * 2)).toEqual([2, 4]);
  });
});
