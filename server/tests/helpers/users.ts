import { randomUUID } from 'node:crypto';
import type { Express } from 'express';
import request from 'supertest';
import { usersRepository } from '../../src/modules/users/users.repository.js';
import { hashPassword } from '../../src/utils/password.js';

export const TEST_PASSWORD = 'runFast42';
let passwordHash: Promise<string> | undefined;

/**
 * Creates a customer directly in the database and returns a signed-in agent.
 * Bypasses /auth/register so suites that need many users don't trip the real sign-up
 * rate limit (and reuses one bcrypt hash, keeping tests fast).
 */
export async function signedInShopper(app: Express, name = 'Test Shopper') {
  passwordHash ??= hashPassword(TEST_PASSWORD);
  const email = `shopper.${randomUUID()}@example.test`;
  await usersRepository.create({ name, email, passwordHash: await passwordHash });

  const agent = request.agent(app);
  await agent.post('/api/v1/auth/login').send({ email, password: TEST_PASSWORD }).expect(200);
  return agent;
}
