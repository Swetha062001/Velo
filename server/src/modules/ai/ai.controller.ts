import type { Request, Response } from 'express';
import { env } from '../../config/env.js';
import { ok } from '../../utils/respond.js';
import { createAIProvider, type AIProvider } from './providers/index.js';
import type { AssistantRequest } from './schemas/ai.schemas.js';
import { runAssistant } from './services/assistant.service.js';

let provider: AIProvider = createAIProvider();

/** Test hook: swap the provider (e.g. a fake that returns crafted output). */
export function setAIProvider(next: AIProvider) {
  provider = next;
}

async function isAvailable(): Promise<boolean> {
  if (provider.name === 'mock') return false;
  if (provider.name !== 'ollama') return true; // hosted: assume reachable; failures fall back
  try {
    const base = (env.AI_BASE_URL ?? 'http://localhost:11434').replace(/\/$/, '');
    const res = await fetch(`${base}/api/tags`, { signal: AbortSignal.timeout(1500) });
    if (!res.ok) return false;
    const { models = [] } = (await res.json()) as { models?: Array<{ name: string }> };
    return models.some((m) => m.name === provider.model || m.name.startsWith(`${provider.model}:`));
  } catch {
    return false;
  }
}

export const aiController = {
  async assistant(req: Request<unknown, unknown, AssistantRequest>, res: Response) {
    ok(res, await runAssistant(req.body, provider));
  },

  /** Lets the UI say "Powered by qwen2.5:3b (local)" vs "Smart search mode". */
  async status(_req: Request, res: Response) {
    ok(res, { provider: provider.name, model: provider.model, available: await isAvailable() });
  },
};
