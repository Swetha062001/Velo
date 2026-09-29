import bcrypt from 'bcryptjs';

/** bcrypt work factor. 12 ≈ a few hundred ms per hash — slow for attackers, fine for logins. */
const SALT_ROUNDS = 12;

export function hashPassword(plain: string) {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}
