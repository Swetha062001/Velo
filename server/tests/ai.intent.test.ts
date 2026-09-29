import { describe, expect, it } from 'vitest';
import {
  applyContext,
  mergeIntents,
  normalizeIntent,
  parseIntentRules,
  signalCount,
  EMPTY_INTENT,
} from '../src/modules/ai/services/intent.js';

const catalog = {
  categories: ['running', 'training', 'basketball', 'lifestyle', 'slides'],
  colors: ['white', 'black', 'grey', 'blue', 'red', 'pink', 'beige', 'green', 'orange'],
};

describe('parseIntentRules', () => {
  it('extracts category, gender, colour and budget', () => {
    const i = parseIntentRules('White running shoes for men under ₹6,000', catalog);
    expect(i).toMatchObject({
      category: 'running',
      gender: 'men',
      colors: ['white'],
      maxPriceInr: 6000,
      minPriceInr: null,
    });
  });

  it('understands "5k", ranges, "around" and minimums', () => {
    expect(parseIntentRules('gym shoes below 5k', catalog).maxPriceInr).toBe(5000);
    expect(parseIntentRules('between 4000 and 7,000', catalog)).toMatchObject({
      minPriceInr: 4000,
      maxPriceInr: 7000,
    });
    expect(parseIntentRules('something around rs 5000', catalog)).toMatchObject({
      minPriceInr: 4000,
      maxPriceInr: 6000,
    });
    expect(parseIntentRules('premium runners over 8000', catalog).minPriceInr).toBe(8000);
  });

  it('checks women before men and maps colour synonyms', () => {
    const i = parseIntentRules("women's navy trainers size 7", catalog);
    expect(i).toMatchObject({ gender: 'women', colors: ['blue'], category: 'training', size: '7' });
  });

  it('infers gender from who the pair is for', () => {
    expect(parseIntentRules('gym shoes for my sister', catalog).gender).toBe('women');
    expect(parseIntentRules('a gift for my dad', catalog).gender).toBe('men');
  });

  it('keeps descriptive words as keywords, without stopwords or catalogue terms', () => {
    const i = parseIntentRules('I need comfortable everyday leather sneakers', catalog);
    expect(i.keywords).toEqual(['comfortable', 'everyday', 'leather']);
    expect(i.category).toBeNull();
  });

  it('ignores colours the catalogue does not stock', () => {
    expect(parseIntentRules('purple shoes', catalog).colors).toEqual([]);
  });
});

describe('normalizeIntent (model output is never trusted)', () => {
  it('drops unknown categories/colours, junk keywords and absurd prices', () => {
    const n = normalizeIntent(
      {
        keywords: ['Cushioned', 'DROP TABLE;', 'ok'],
        category: 'hiking',
        gender: 'men',
        colors: ['Navy', 'purple'],
        minPriceInr: -5,
        maxPriceInr: 99_999_999,
        size: 'UK 9',
      },
      catalog,
    );
    expect(n).toEqual({
      keywords: ['cushioned'],
      category: null,
      gender: 'men',
      colors: ['blue'],
      minPriceInr: null,
      maxPriceInr: null,
      size: '9',
    });
  });
});

describe('mergeIntents / signalCount / applyContext', () => {
  it('lets rule-extracted values win over the model', () => {
    const rules = { ...EMPTY_INTENT, maxPriceInr: 5000, colors: ['black'] };
    const model = { ...EMPTY_INTENT, maxPriceInr: 50000, colors: ['white'], category: 'running' };
    expect(mergeIntents(rules, model)).toMatchObject({
      maxPriceInr: 5000,
      colors: ['black'],
      category: 'running',
    });
  });

  it('ignores explicit constraints the model invents (gender, colours, budget, size)', () => {
    const model = {
      keywords: ['ankle'],
      category: 'basketball',
      gender: 'unisex' as const,
      colors: ['black', 'blue'],
      minPriceInr: null,
      maxPriceInr: 9000,
      size: '9',
    };
    expect(mergeIntents(EMPTY_INTENT, model)).toEqual({
      ...EMPTY_INTENT,
      keywords: ['ankle'],
      category: 'basketball',
    });
  });

  it('counts concrete constraints', () => {
    expect(signalCount(EMPTY_INTENT)).toBe(0);
    expect(signalCount(parseIntentRules('black running shoes under 6000', catalog))).toBe(3);
  });

  it('carries filters into short follow-ups and lowers the budget for "cheaper"', () => {
    const previous = { ...EMPTY_INTENT, category: 'running', maxPriceInr: 8000 };
    const next = applyContext(parseIntentRules('any cheaper?', catalog), previous, 'any cheaper?');
    expect(next).toMatchObject({ category: 'running', maxPriceInr: 6400 });

    const colour = applyContext(parseIntentRules('in black', catalog), previous, 'in black');
    expect(colour).toMatchObject({ category: 'running', colors: ['black'], maxPriceInr: 8000 });
  });

  it('treats a long new request as a fresh search', () => {
    const previous = { ...EMPTY_INTENT, category: 'running' };
    const msg = 'show me comfortable leather lifestyle sneakers for the office';
    expect(applyContext(parseIntentRules(msg, catalog), previous, msg).category).toBe('lifestyle');
  });
});
