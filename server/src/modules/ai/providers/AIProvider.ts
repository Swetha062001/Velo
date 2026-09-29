import type { ZodType } from 'zod';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GenerateJsonInput<T> {
  messages: ChatMessage[];
  /** The expected output shape; the provider constrains/validates against it. */
  schema: ZodType<T>;
  temperature?: number;
}

/**
 * The only thing the app knows about an AI model: "given messages, return JSON matching this
 * schema". Swapping Ollama for a hosted API (or a mock) is a configuration change.
 * Implementations must throw on failure — callers fall back to deterministic logic.
 */
export interface AIProvider {
  readonly name: string;
  readonly model: string;
  generateJson<T>(input: GenerateJsonInput<T>): Promise<T>;
}

export class AIProviderError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'AIProviderError';
  }
}

/** Extracts the first JSON object from model text (tolerates ```json fences / stray prose). */
export function parseJsonObject(text: string): unknown {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end <= start) throw new AIProviderError('Model returned no JSON object');
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch (err) {
    throw new AIProviderError('Model returned invalid JSON', { cause: err });
  }
}
