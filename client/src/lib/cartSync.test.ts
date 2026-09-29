import { describe, expect, it } from 'vitest';
import { describeMerge } from './cartSync.ts';

describe('describeMerge', () => {
  it('is null when everything moved as-is', () => {
    expect(describeMerge({ reduced: 0, unavailable: 0, cartFull: 0 })).toBeNull();
  });

  it('describes each kind of change, with correct plurals', () => {
    expect(describeMerge({ reduced: 1, unavailable: 0, cartFull: 0 })).toBe(
      "We added your saved bag, but 1 quantity was lowered to what's in stock (max 10 per item).",
    );
    const all = describeMerge({ reduced: 2, unavailable: 3, cartFull: 1 })!;
    expect(all).toContain('2 quantities were lowered');
    expect(all).toContain('3 items are no longer available');
    expect(all).toContain("1 item didn't fit");
  });
});
