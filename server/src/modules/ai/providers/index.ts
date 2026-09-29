import { env } from '../../../config/env.js';
import type { AIProvider } from './AIProvider.js';
import { MockProvider } from './mock.provider.js';
import { OllamaProvider } from './ollama.provider.js';
import { OpenAICompatibleProvider } from './openaiCompatible.provider.js';

export type { AIProvider, ChatMessage, GenerateJsonInput } from './AIProvider.js';
export { AIProviderError } from './AIProvider.js';

/** Builds the configured provider. Adding a vendor = one new class + one case here. */
export function createAIProvider(): AIProvider {
  const timeout = env.AI_TIMEOUT_MS;
  switch (env.AI_PROVIDER) {
    case 'ollama':
      return new OllamaProvider(
        env.AI_MODEL ?? 'qwen2.5:3b',
        (env.AI_BASE_URL ?? 'http://localhost:11434').replace(/\/$/, ''),
        timeout,
      );
    case 'openai':
      return new OpenAICompatibleProvider(
        env.AI_MODEL ?? 'gpt-4o-mini',
        (env.AI_BASE_URL ?? 'https://api.openai.com/v1').replace(/\/$/, ''),
        env.AI_API_KEY,
        timeout,
      );
    default:
      return new MockProvider();
  }
}
