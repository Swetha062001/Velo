import { z } from 'zod';
import {
  AIProviderError,
  parseJsonObject,
  type AIProvider,
  type GenerateJsonInput,
} from './AIProvider.js';

/**
 * Local open models via Ollama (https://ollama.com): free, private, no API key.
 * Uses the native /api/chat endpoint with `format: <JSON Schema>` (structured outputs), so the
 * model's decoding is constrained to the schema; the result is still validated with Zod.
 */
export class OllamaProvider implements AIProvider {
  readonly name = 'ollama';

  constructor(
    readonly model: string,
    private readonly baseUrl: string,
    private readonly timeoutMs: number,
  ) {}

  async generateJson<T>({ messages, schema, temperature = 0.2 }: GenerateJsonInput<T>): Promise<T> {
    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(this.timeoutMs),
        body: JSON.stringify({
          model: this.model,
          messages,
          stream: false,
          format: z.toJSONSchema(schema),
          options: { temperature },
        }),
      });
    } catch (err) {
      throw new AIProviderError(`Ollama unreachable at ${this.baseUrl}`, { cause: err });
    }

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new AIProviderError(`Ollama error ${res.status}: ${detail.slice(0, 200)}`);
    }

    const body = (await res.json()) as { message?: { content?: string } };
    const parsed = schema.safeParse(parseJsonObject(body.message?.content ?? ''));
    if (!parsed.success) throw new AIProviderError('Ollama output did not match the schema');
    return parsed.data;
  }
}
