import type { ProductSummary } from './catalog.ts';

export interface ShoppingIntent {
  keywords: string[];
  category: string | null;
  gender: 'men' | 'women' | 'unisex' | null;
  colors: string[];
  minPriceInr: number | null;
  maxPriceInr: number | null;
  size: string | null;
}

export type Relaxation = 'size' | 'colour' | 'category' | 'gender' | 'price';

export interface AssistantReply {
  reply: string;
  recommendations: Array<{ product: ProductSummary; reason: string }>;
  appliedFilters: ShoppingIntent;
  relaxed: Relaxation[];
  source: 'ai' | 'rules';
  provider: string;
}

export interface AssistantStatus {
  provider: string;
  model: string;
  available: boolean;
}

export interface AssistantTurn {
  role: 'user' | 'assistant';
  content: string;
}
