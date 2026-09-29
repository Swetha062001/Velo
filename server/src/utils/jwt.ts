import jwt from 'jsonwebtoken';
import { JWT_AUDIENCE, JWT_ISSUER, SESSION_TTL_SECONDS } from '../config/auth.js';
import { env } from '../config/env.js';

export interface SessionClaims {
  /** User id. */
  sub: string;
  /** users.token_version at issue time — bumping it revokes the token. */
  tv: number;
}

export function signSessionToken(claims: SessionClaims) {
  return jwt.sign({ tv: claims.tv }, env.JWT_SECRET, {
    algorithm: 'HS256',
    subject: claims.sub,
    expiresIn: SESSION_TTL_SECONDS,
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  });
}

/** Returns the claims, or null for any invalid/expired/tampered token. */
export function verifySessionToken(token: string): SessionClaims | null {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET, {
      algorithms: ['HS256'], // pinned: rejects "alg: none" and algorithm-confusion tokens
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });
    if (typeof payload === 'string' || typeof payload.sub !== 'string') return null;
    if (typeof payload.tv !== 'number') return null;
    return { sub: payload.sub, tv: payload.tv };
  } catch {
    return null;
  }
}
