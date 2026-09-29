import { logger } from '../../../utils/logger.js';
import { toSummary } from '../../products/products.service.js';
import type { Gender, ProductSummary } from '../../products/products.types.js';
import { aiRepository, type CandidateFilters, type CandidateRow } from '../ai.repository.js';
import {
  intentPrompt,
  recommendationPrompt,
  type PromptCandidate,
} from '../prompts/assistant.prompts.js';
import type { AIProvider } from '../providers/index.js';
import {
  llmIntentSchema,
  llmRecommendationSchema,
  type AssistantRequest,
  type ShoppingIntent,
} from '../schemas/ai.schemas.js';
import {
  COLOR_SYNONYMS,
  applyContext,
  mergeIntents,
  normalizeIntent,
  parseIntentRules,
  signalCount,
  type CatalogVocabulary,
} from './intent.js';

const MAX_PICKS = 4;
const CANDIDATES_FOR_MODEL = 12;
const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

export type Relaxation = 'size' | 'colour' | 'category' | 'gender' | 'price';

export interface AssistantResponse {
  reply: string;
  recommendations: Array<{ product: ProductSummary; reason: string }>;
  appliedFilters: ShoppingIntent;
  /** Constraints dropped because nothing matched them all. */
  relaxed: Relaxation[];
  /** "ai" when the model chose the products; "rules" for the deterministic fallback. */
  source: 'ai' | 'rules';
  provider: string;
}

/* ── Vocabulary (cached briefly — changes only when admins edit the catalogue) ── */

let vocabCache: { at: number; value: CatalogVocabulary } | null = null;
async function vocabulary() {
  if (!vocabCache || Date.now() - vocabCache.at > 60_000) {
    vocabCache = { at: Date.now(), value: await aiRepository.vocabulary() };
  }
  return vocabCache.value;
}

/* ── Retrieval ─────────────────────────────────────────────────────────── */

const GENDERS: Record<NonNullable<ShoppingIntent['gender']>, Gender[]> = {
  men: ['MEN', 'UNISEX'],
  women: ['WOMEN', 'UNISEX'],
  unisex: ['UNISEX'],
};

function filtersFor(intent: ShoppingIntent): CandidateFilters {
  return {
    category: intent.category,
    genders: intent.gender ? GENDERS[intent.gender] : null,
    colors: intent.colors,
    minPricePaise: intent.minPriceInr !== null ? intent.minPriceInr * 100 : null,
    maxPricePaise: intent.maxPriceInr !== null ? intent.maxPriceInr * 100 : null,
    sizeLabel: intent.size ? `UK ${intent.size}` : null,
    limit: 40,
  };
}

/**
 * Strict first; if nothing matches, drop the least important constraint and retry
 * (size → colour → category → gender). The budget is only relaxed as a last resort,
 * and the reply says so.
 */
async function retrieve(intent: ShoppingIntent) {
  const steps: Array<[Relaxation, (f: CandidateFilters) => void]> = [
    ['size', (f) => (f.sizeLabel = null)],
    ['colour', (f) => (f.colors = [])],
    ['category', (f) => (f.category = null)],
    ['gender', (f) => (f.genders = null)],
    ['price', (f) => ((f.minPricePaise = null), (f.maxPricePaise = null))],
  ];
  const filters = filtersFor(intent);
  const relaxed: Relaxation[] = [];

  let rows = await aiRepository.findCandidates(filters);
  for (const [name, relax] of steps) {
    if (rows.length > 0) break;
    const before = JSON.stringify(filters);
    relax(filters);
    if (JSON.stringify(filters) === before) continue; // constraint wasn't set
    relaxed.push(name);
    rows = await aiRepository.findCandidates(filters);
  }
  return { rows, relaxed };
}

/** Deterministic relevance: keyword hits (tags > name > material/description), colour, category. */
function rank(rows: CandidateRow[], intent: ShoppingIntent) {
  const score = (r: CandidateRow) => {
    let s = r.is_featured ? 0.5 : 0;
    const name = `${r.name} ${r.colorway}`.toLowerCase();
    const body = `${r.material ?? ''} ${r.excerpt}`.toLowerCase();
    for (const k of intent.keywords) {
      if (r.tags.some((t) => t.includes(k))) s += 3;
      if (name.includes(k)) s += 2;
      if (body.includes(k)) s += 1;
    }
    if (intent.colors.includes(r.color)) s += 2;
    if (intent.category && r.category_slug === intent.category) s += 2;
    return s;
  };
  return rows
    .map((row) => ({ row, score: score(row) }))
    .sort((a, b) => b.score - a.score || a.row.price_paise - b.row.price_paise)
    .map((x) => x.row);
}

/* ── Reasons & replies built from database facts (safe to include prices) ── */

function factReason(r: CandidateRow, intent: ShoppingIntent) {
  const parts: string[] = [`${r.colorway} ${r.category_name.toLowerCase()} shoe`];
  const matched = intent.keywords.filter((k) => r.tags.some((t) => t.includes(k)));
  if (matched.length) parts.push(`great for ${matched.slice(0, 2).join(' & ')}`);
  if (r.material) parts.push(r.material.split(',')[0]!.toLowerCase());
  const price = inr.format(r.price_paise / 100);
  const budget =
    intent.maxPriceInr !== null ? ` — within your ${inr.format(intent.maxPriceInr)} budget` : '';
  return `${parts.join(', ')}. ${price}${budget}.`.replace(/^./, (c) => c.toUpperCase());
}

function describeFilters(intent: ShoppingIntent) {
  const bits = [
    intent.colors.length ? intent.colors.join(' / ') : null,
    intent.gender && intent.gender !== 'unisex' ? `${intent.gender}'s` : null,
    intent.category ? `${intent.category} shoes` : null,
  ].filter(Boolean);
  const price =
    intent.maxPriceInr !== null
      ? ` under ${inr.format(intent.maxPriceInr)}`
      : intent.minPriceInr !== null
        ? ` from ${inr.format(intent.minPriceInr)}`
        : '';
  return bits.length ? `${bits.join(' ')}${price}` : `you${price}`;
}

const RELAX_TEXT: Record<Relaxation, string> = {
  size: 'in that size',
  colour: 'in that colour',
  category: 'in that category',
  gender: 'for that fit',
  price: 'within that budget',
};

function templateReply(intent: ShoppingIntent, relaxed: Relaxation[], count: number) {
  const lead = relaxed.length
    ? `I couldn't find exact matches ${relaxed.map((r) => RELAX_TEXT[r]).join(' or ')}, so here are the closest options.`
    : `Here ${count === 1 ? 'is a pick' : `are ${count} picks`} for ${describeFilters(intent)}.`;
  return lead;
}

/**
 * Model text is display copy, so it is fact-checked before it reaches the shopper:
 * no prices or offers (it could get them wrong), no internal refs, no product names
 * that weren't picked, and — for a reason — no colour the product isn't.
 */
const PRICING_CLAIM =
  /₹|\brs\.?\s*\d|\binr\b|\d[\d,]{2,}\s*(?:rupees|\/-)|\bfree\b|\bdiscount|\boffer\b|\bsale\b|%/i;
const INTERNAL_REF = /\bP\d{1,2}\b/;

function colourWords(text: string, catalog: CatalogVocabulary) {
  const words = text.toLowerCase().match(/[a-z]+/g) ?? [];
  return words
    .map((w) => (catalog.colors.includes(w) ? w : COLOR_SYNONYMS[w]))
    .filter((c): c is string => Boolean(c));
}

function safeText(text: string, mentionableNames: string[], allNames: string[]) {
  if (!text || PRICING_CLAIM.test(text) || INTERNAL_REF.test(text)) return false;
  const lower = text.toLowerCase();
  return allNames.every((n) => mentionableNames.includes(n) || !lower.includes(n.toLowerCase()));
}

function safeReason(
  reason: string,
  row: CandidateRow,
  allNames: string[],
  catalog: CatalogVocabulary,
) {
  if (!safeText(reason, [row.name], allNames)) return false;
  const colourway = row.colorway.toLowerCase();
  return colourWords(reason, catalog).every((c) => c === row.color || colourway.includes(c));
}

/* ── Orchestration ─────────────────────────────────────────────────────── */

export async function runAssistant(
  input: AssistantRequest,
  provider: AIProvider,
): Promise<AssistantResponse> {
  const catalog = await vocabulary();

  // 1. Understand the request: rules first, the model only for vague phrasing.
  let intent = parseIntentRules(input.message, catalog);
  if (signalCount(intent) < 2) {
    try {
      const modelIntent = await provider.generateJson({
        messages: intentPrompt(input.message, input.history, catalog),
        schema: llmIntentSchema,
        temperature: 0,
      });
      intent = mergeIntents(intent, normalizeIntent(modelIntent, catalog));
    } catch (err) {
      logger.debug('AI intent unavailable, using rules', {
        provider: provider.name,
        err: String(err),
      });
    }
  }
  intent = applyContext(intent, input.context, input.message);

  // 2. Retrieve real, in-stock products (the model never touches the database).
  const { rows, relaxed } = await retrieve(intent);
  if (rows.length === 0) {
    return {
      reply:
        "I couldn't find anything in the catalogue for that. Try describing the style or use instead.",
      recommendations: [],
      appliedFilters: intent,
      relaxed,
      source: 'rules',
      provider: provider.name,
    };
  }
  const ranked = rank(rows, intent).slice(0, CANDIDATES_FOR_MODEL);
  const byRef = new Map(ranked.map((row, i) => [`P${i + 1}`, row]));

  // 3. Let the model choose from the numbered list — then verify every pick.
  let picks: Array<{ row: CandidateRow; reason: string }> = [];
  let reply = '';
  let source: AssistantResponse['source'] = 'rules';
  try {
    const candidates: PromptCandidate[] = [...byRef].map(([ref, r]) => ({
      ref,
      name: r.name,
      colorway: r.colorway,
      colour: r.color,
      category: r.category_name,
      gender: r.gender.toLowerCase(),
      priceInr: r.price_paise / 100,
      tags: r.tags,
      material: r.material,
      summary: r.excerpt,
    }));
    const out = await provider.generateJson({
      messages: recommendationPrompt(input.message, intent, candidates),
      schema: llmRecommendationSchema,
      temperature: 0.3,
    });

    const allNames = [...new Set(ranked.map((r) => r.name))];
    const seen = new Set<string>();
    for (const pick of out.picks) {
      const ref = pick.ref.trim().toUpperCase();
      const row = byRef.get(ref);
      if (!row || seen.has(ref)) continue; // unknown or duplicate → invented, drop it
      seen.add(ref);
      const reason = pick.reason.replace(/\s+/g, ' ').trim();
      picks.push({
        row,
        reason: safeReason(reason, row, allNames, catalog)
          ? reason.slice(0, 180)
          : factReason(row, intent),
      });
      if (picks.length === MAX_PICKS) break;
    }
    const text = out.reply.replace(/\s+/g, ' ').trim();
    if (picks.length) {
      source = 'ai';
      const picked = picks.map((p) => p.row.name);
      reply = safeText(text, picked, allNames) ? text.slice(0, 300) : '';
    }
  } catch (err) {
    logger.debug('AI recommendations unavailable, using ranking', {
      provider: provider.name,
      err: String(err),
    });
  }

  // 4. Deterministic fallback (no model, model failed, or it picked nothing valid).
  if (picks.length === 0) {
    picks = ranked.slice(0, MAX_PICKS).map((row) => ({ row, reason: factReason(row, intent) }));
  }
  if (!reply || relaxed.length) reply = templateReply(intent, relaxed, picks.length);

  return {
    reply,
    // Names, prices, images and stock come from the database row — never from the model.
    recommendations: picks.map(({ row, reason }) => ({ product: toSummary(row), reason })),
    appliedFilters: intent,
    relaxed,
    source,
    provider: provider.name,
  };
}

/** For tests: reset the vocabulary cache after catalogue changes. */
export function resetAssistantCache() {
  vocabCache = null;
}
