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

export const env = parsed.data;
export const isProduction = env.NODE_ENV === 'production';
