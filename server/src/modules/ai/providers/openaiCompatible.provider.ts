import { z } from 'zod';
import {
  AIProviderError,
  parseJsonObject,
  type AIProvider,
  type GenerateJsonInput,
} from './AIProvider.js';

/**
 * Any OpenAI-compatible Chat Completions API — Groq, OpenRouter (incl. free open models),
 * Together, LM Studio, vLLM… The JSON Schema is included in the instructions and JSON mode is
 * requested; the response is validated with Zod either way.
 */
export class OpenAICompatibleProvider implements AIProvider {
  readonly name = 'openai-compatible';

  constructor(
    readonly model: string,
    private readonly baseUrl: string,
    private readonly apiKey: string | undefined,
    private readonly timeoutMs: number,
  ) {}

  async generateJson<T>({ messages, schema, temperature = 0.2 }: GenerateJsonInput<T>): Promise<T> {
    const schemaHint = {
      role: 'system' as const,
      content: `Respond with a single JSON object matching this JSON Schema:\n${JSON.stringify(z.toJSONSchema(schema))}`,
    };

    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey && { Authorization: `Bearer ${this.apiKey}` }),
        },
        signal: AbortSignal.timeout(this.timeoutMs),
        body: JSON.stringify({
          model: this.model,
          messages: [...messages, schemaHint],
          temperature,
          response_format: { type: 'json_object' },
        }),
      });
    } catch (err) {
      throw new AIProviderError(`AI provider unreachable at ${this.baseUrl}`, { cause: err });
    }

    if (!res.ok) {
      // Never echo the API key; the body may contain a provider error message only.
      const detail = await res.text().catch(() => '');
      throw new AIProviderError(`AI provider error ${res.status}: ${detail.slice(0, 200)}`);
    }

    const body = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const parsed = schema.safeParse(parseJsonObject(body.choices?.[0]?.message?.content ?? ''));
    if (!parsed.success) throw new AIProviderError('AI output did not match the schema');
    return parsed.data;
  }
}
