import { z } from 'zod';

const postgresUrl = z
  .string()
  .regex(/^postgres(ql)?:\/\/.+/, 'Must be a postgres:// connection string');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(5001),
  CORS_ORIGIN: z.url(),
  DATABASE_URL: postgresUrl,
  // Only needed for `npm run db:*:test` and the test suite.
  TEST_DATABASE_URL: postgresUrl.optional(),
  /** Where uploaded images are stored (relative to the server folder, or absolute). */
  UPLOAD_DIR: z.string().min(1).default('uploads'),
  /** Public origin of this API, used to build uploaded-image URLs. Defaults to localhost:PORT. */
  PUBLIC_SERVER_URL: z.url().optional(),
  /** AI assistant: 'ollama' (local open models), 'openai' (any OpenAI-compatible API) or 'mock'. */
  AI_PROVIDER: z.enum(['ollama', 'openai', 'mock']).default('mock'),
  /** Model name, e.g. qwen2.5:3b (Ollama) or a hosted model id. */
  AI_MODEL: z.string().min(1).optional(),
  /** Provider endpoint. Defaults: Ollama http://localhost:11434, OpenAI-compatible https://api.openai.com/v1 */
  AI_BASE_URL: z.url().optional(),
  /** Only for hosted OpenAI-compatible providers. Never sent to the browser. */
  AI_API_KEY: z.string().optional(),
  AI_TIMEOUT_MS: z.coerce.number().int().min(1000).max(120_000).default(30_000),
  JWT_SECRET: z
    .string()
    .min(32, 'Must be at least 32 characters — generate with: openssl rand -base64 48')
    .refine((s) => !s.startsWith('replace-with'), 'Replace the placeholder from .env.example'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration:');
  for (const issue of parsed.error.issues) {
    console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
  }
  console.error('Copy server/.env.example to server/.env and fill in the values.');
  process.exit(1);
}

export const env = {
  ...parsed.data,
  PUBLIC_SERVER_URL: (
    parsed.data.PUBLIC_SERVER_URL ?? `http://localhost:${parsed.data.PORT}`
  ).replace(/\/$/, ''),
};
export const isProduction = env.NODE_ENV === 'production';
