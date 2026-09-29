import { describe, expect, it } from 'vitest';
import type { AssistantReply } from '../../types/assistant.ts';
import { effectiveFilters } from './effectiveFilters.ts';

const reply = (
  over: Partial<AssistantReply['appliedFilters']>,
  relaxed: AssistantReply['relaxed'] = [],
) =>
  ({
    appliedFilters: {
      keywords: [],
      category: null,
      gender: null,
      colors: [],
      minPriceInr: null,
      maxPriceInr: null,
      size: null,
      ...over,
    },
    relaxed,
  }) as unknown as AssistantReply;

describe('effectiveFilters', () => {
  it('builds chips and a catalogue URL from the applied filters', () => {
    expect(
      effectiveFilters(
        reply({ category: 'running', colors: ['black'], maxPriceInr: 6000, size: '9' }),
      ),
    ).toEqual({
      chips: ['running', 'black', 'UK 9', 'under ₹6,000'],
      url: '/products?category=running&color=black&size=9&maxPrice=6000',
    });
  });

  it('leaves out anything the server had to relax', () => {
    const { chips, url } = effectiveFilters(
      reply({ category: 'basketball', colors: ['orange'] }, ['colour']),
    );
    expect(chips).toEqual(['basketball']);
    expect(url).toBe('/products?category=basketball');
  });

  it('links to the full catalogue with no filters', () => {
    expect(effectiveFilters(reply({ keywords: ['comfy'] }))).toEqual({
      chips: [],
      url: '/products',
    });
  });
});
