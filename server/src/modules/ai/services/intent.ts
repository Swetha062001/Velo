import type { ShoppingIntent } from '../schemas/ai.schemas.js';

export interface CatalogVocabulary {
  categories: string[]; // slugs
  colors: string[]; // colour families
}

export const EMPTY_INTENT: ShoppingIntent = {
  keywords: [],
  category: null,
  gender: null,
  colors: [],
  minPriceInr: null,
  maxPriceInr: null,
  size: null,
};

/** Words that map to a category slug. Deliberately conservative: "everyday" stays a keyword. */
const CATEGORY_WORDS: Record<string, string[]> = {
  running: ['run', 'running', 'runner', 'runners', 'jog', 'jogging', 'marathon', 'race'],
  training: ['gym', 'training', 'trainer', 'trainers', 'workout', 'crossfit', 'lifting', 'hiit'],
  basketball: ['basketball', 'hoops', 'court'],
  lifestyle: ['lifestyle', 'streetwear'],
  slides: ['slide', 'slides', 'sandal', 'sandals', 'flipflop', 'flipflops', 'slipper', 'slippers'],
};

export const COLOR_SYNONYMS: Record<string, string> = {
  gray: 'grey',
  silver: 'grey',
  charcoal: 'grey',
  navy: 'blue',
  cream: 'beige',
  offwhite: 'white',
  ivory: 'white',
  tan: 'brown',
  camel: 'brown',
  maroon: 'red',
  burgundy: 'red',
  olive: 'green',
  lime: 'green',
  rose: 'pink',
};

const STOPWORDS = new Set(
  `a an the and or for to of in on with without my me i im i'm want need looking look some any
   something shoe shoes sneaker sneakers pair pairs please show find get buy under below less than
   over above within upto up max budget around about between cost costs price priced rs inr size uk
   use using wear wearing good nice best great like would could should can you have has that this
   men mens women womens ladies male female man woman boys girls unisex color colour
   cheap cheaper affordable is are be it its more much very really just also than
   who what which goes go going gift present give ignore previous instructions sister brother
   wife husband girlfriend boyfriend mom mum mother dad father son daughter friend she him her`
    .split(/\s+/)
    .filter(Boolean),
);

const REFINEMENT_CUES =
  /\b(cheaper|instead|also|what about|how about|any other|another|less expensive|more affordable|in (?:a )?(?:different|other) colou?r)\b/i;

/** "5,000" / "5k" / "5.5k" → 5000 / 5500. */
function toRupees(raw: string, k?: string) {
  const n = Number(raw.replace(/,/g, ''));
  if (!Number.isFinite(n)) return null;
  return Math.round(k ? n * 1000 : n);
}

const AMOUNT = String.raw`(?:rs\.?|inr|₹)?\s*([\d][\d,]*(?:\.\d+)?)\s*(k)?\b`;

function parsePrice(text: string) {
  const range = new RegExp(String.raw`between\s*${AMOUNT}\s*(?:and|to|-)\s*${AMOUNT}`, 'i').exec(
    text,
  );
  if (range) {
    const a = toRupees(range[1]!, range[2]);
    const b = toRupees(range[3]!, range[4]);
    if (a !== null && b !== null) return { min: Math.min(a, b), max: Math.max(a, b) };
  }
  const max = new RegExp(
    String.raw`(?:under|below|less than|within|up ?to|max(?:imum)?|budget(?: of| is)?|not more than|cheaper than|<)\s*${AMOUNT}`,
    'i',
  ).exec(text);
  const min = new RegExp(
    String.raw`(?:over|above|more than|at least|min(?:imum)?|from|>)\s*${AMOUNT}`,
    'i',
  ).exec(text);
  const around = new RegExp(
    String.raw`(?:around|about|approx(?:imately)?|roughly)\s*${AMOUNT}`,
    'i',
  ).exec(text);

  const result = { min: null as number | null, max: null as number | null };
  if (max) result.max = toRupees(max[1]!, max[2]);
  if (min) result.min = toRupees(min[1]!, min[2]);
  if (around && result.max === null && result.min === null) {
    const v = toRupees(around[1]!, around[2]);
    if (v !== null) Object.assign(result, { min: Math.round(v * 0.8), max: Math.round(v * 1.2) });
  }
  return result;
}

/**
 * Deterministic extraction of the unambiguous parts of a request (price, colour, category,
 * gender, size). Small models are unreliable with numbers, so these rules take precedence
 * over the model's reading of the same message.
 */
export function parseIntentRules(message: string, catalog: CatalogVocabulary): ShoppingIntent {
  const text = message.toLowerCase();
  const words = text.replace(/[’']/g, '').match(/[a-z]+(?:-[a-z]+)?/g) ?? [];
  const intent: ShoppingIntent = { ...EMPTY_INTENT, keywords: [], colors: [] };

  const price = parsePrice(text);
  intent.minPriceInr = price.min;
  intent.maxPriceInr = price.max;

  if (
    /\b(women|womens|ladies|female|woman|girls?|her|she|sister|wife|girlfriend|mom|mum|mother|daughter)\b/.test(
      text.replace(/[’']/g, ''),
    )
  )
    intent.gender = 'women';
  else if (
    /\b(men|mens|male|man|boys?|him|he|brother|husband|boyfriend|dad|father|son)\b/.test(
      text.replace(/[’']/g, ''),
    )
  )
    intent.gender = 'men';

  const size = /\b(?:size|uk)\s*(\d{1,2}(?:\.5)?)\b/.exec(text);
  if (size) intent.size = size[1]!;

  const used = new Set<string>();
  for (const word of words) {
    const bare = word.replace(/-/g, '');
    const color = catalog.colors.includes(bare) ? bare : COLOR_SYNONYMS[bare];
    if (color && catalog.colors.includes(color)) {
      if (!intent.colors.includes(color)) intent.colors.push(color);
      used.add(word);
      continue;
    }
    for (const [slug, synonyms] of Object.entries(CATEGORY_WORDS)) {
      if (catalog.categories.includes(slug) && synonyms.includes(bare)) {
        intent.category ??= slug;
        used.add(word);
      }
    }
  }

  intent.keywords = [
    ...new Set(words.filter((w) => w.length >= 3 && !used.has(w) && !STOPWORDS.has(w))),
  ].slice(0, 6);
  return intent;
}

/** Keeps only values that exist in the catalogue; clamps prices to sane numbers. */
export function normalizeIntent(raw: ShoppingIntent, catalog: CatalogVocabulary): ShoppingIntent {
  const price = (v: number | null) => (v !== null && v > 0 && v < 1_000_000 ? Math.round(v) : null);
  const category = raw.category?.toLowerCase().trim() ?? null;
  const colors = raw.colors
    .map((c) => c.toLowerCase().trim())
    .map((c) => COLOR_SYNONYMS[c] ?? c)
    .filter((c) => catalog.colors.includes(c));
  const size = raw.size?.replace(/[^\d.]/g, '') || null;

  return {
    keywords: [
      ...new Set(
        raw.keywords.map((k) => k.toLowerCase().trim()).filter((k) => /^[a-z-]{3,30}$/.test(k)),
      ),
    ].slice(0, 6),
    category: category && catalog.categories.includes(category) ? category : null,
    gender: raw.gender,
    colors: [...new Set(colors)].slice(0, 4),
    minPriceInr: price(raw.minPriceInr),
    maxPriceInr: price(raw.maxPriceInr),
    size: size && /^\d{1,2}(\.5)?$/.test(size) ? size : null,
  };
}

/**
 * The model only fills the fuzzy parts (category, descriptive keywords). Explicit constraints —
 * gender, colour, budget, size — come from the shopper's own words via the rules: small models
 * tend to invent them (e.g. adding "unisex" or a list of colours nobody asked for).
 */
export function mergeIntents(rules: ShoppingIntent, model: ShoppingIntent): ShoppingIntent {
  return {
    ...rules,
    keywords: [...new Set([...rules.keywords, ...model.keywords])].slice(0, 6),
    category: rules.category ?? model.category,
  };
}

/** Number of concrete constraints found (used to decide whether the model is needed). */
export function signalCount(intent: ShoppingIntent) {
  return (
    (intent.category ? 1 : 0) +
    (intent.gender ? 1 : 0) +
    (intent.colors.length ? 1 : 0) +
    (intent.minPriceInr !== null || intent.maxPriceInr !== null ? 1 : 0) +
    (intent.size ? 1 : 0)
  );
}

/**
 * Follow-ups ("any cheaper?", "what about in black") keep the previous filters for anything
 * the new message doesn't mention.
 */
export function applyContext(
  intent: ShoppingIntent,
  previous: Partial<ShoppingIntent> | undefined,
  message: string,
): ShoppingIntent {
  if (!previous) return intent;
  const isFollowUp = REFINEMENT_CUES.test(message) || message.trim().split(/\s+/).length <= 5;
  if (!isFollowUp) return intent;

  const merged: ShoppingIntent = {
    keywords: intent.keywords.length ? intent.keywords : (previous.keywords ?? []),
    category: intent.category ?? previous.category ?? null,
    gender: intent.gender ?? previous.gender ?? null,
    colors: intent.colors.length ? intent.colors : (previous.colors ?? []),
    minPriceInr: intent.minPriceInr ?? previous.minPriceInr ?? null,
    maxPriceInr: intent.maxPriceInr ?? previous.maxPriceInr ?? null,
    size: intent.size ?? previous.size ?? null,
  };

  // "cheaper" without a number: lower the ceiling by ~20%.
  if (/\bcheaper|less expensive|more affordable\b/i.test(message) && intent.maxPriceInr === null) {
    const base = previous.maxPriceInr ?? null;
    merged.maxPriceInr = base ? Math.round(base * 0.8) : merged.maxPriceInr;
  }
  return merged;
}
