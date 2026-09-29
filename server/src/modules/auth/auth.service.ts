import { AppError } from '../../utils/AppError.js';
import { signSessionToken, verifySessionToken } from '../../utils/jwt.js';
import { hashPassword, verifyPassword } from '../../utils/password.js';
import { usersRepository } from '../users/users.repository.js';
import { toAuthUser, type AuthUser, type UserRow } from '../users/users.types.js';
import type { LoginInput, RegisterInput } from './auth.schemas.js';

const INVALID_CREDENTIALS = new AppError(401, 'INVALID_CREDENTIALS', 'Incorrect email or password');

// Compared against when an email is unknown, so "no such user" and "wrong password"
// take the same time and can't be told apart (prevents account enumeration by timing).
let dummyHash: Promise<string> | undefined;
const getDummyHash = () => (dummyHash ??= hashPassword('velo-timing-equaliser'));

function isUniqueViolation(err: unknown) {
  return (err as { code?: string })?.code === '23505';
}

export function issueSessionToken(user: Pick<UserRow, 'id' | 'token_version'>) {
  return signSessionToken({ sub: user.id, tv: user.token_version });
}

export const authService = {
  async register(input: RegisterInput) {
    const conflict = AppError.conflict('An account with this email already exists');
    if (await usersRepository.findByEmail(input.email)) throw conflict;

    try {
      const user = await usersRepository.create({
        name: input.name,
        email: input.email,
        passwordHash: await hashPassword(input.password),
      });
      return { user, token: issueSessionToken(user) };
    } catch (err) {
      if (isUniqueViolation(err)) throw conflict; // lost a race with a concurrent signup
      throw err;
    }
  },

  async login(input: LoginInput) {
    const user = await usersRepository.findByEmail(input.email);
    if (!user) {
      await verifyPassword(input.password, await getDummyHash());
      throw INVALID_CREDENTIALS;
    }
    if (!(await verifyPassword(input.password, user.password_hash))) throw INVALID_CREDENTIALS;

    return { user, token: issueSessionToken(user) };
  },

  /**
   * Turns a session token into the current user, or null. The user (and role) is always
   * re-read from the database, and the token is rejected if its token_version is stale.
   */
  async resolveSession(token: string): Promise<AuthUser | null> {
    const claims = verifySessionToken(token);
    if (!claims) return null;

    const user = await usersRepository.findById(claims.sub);
    if (!user || user.token_version !== claims.tv) return null;

    return toAuthUser(user);
  },
};
