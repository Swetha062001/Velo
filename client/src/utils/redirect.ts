import { paths } from '../routes/paths.ts';
import type { Role } from '../types/user.ts';

/**
 * Returns a safe in-app path from a `?redirect=` value, or the fallback.
 * Rejects absolute and protocol-relative URLs (`https://evil.com`, `//evil.com`, `/\evil.com`)
 * so the sign-in page can't be abused as an open redirect.
 */
export function safeRedirect(value: string | null, fallback: string = paths.account) {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) {
    return fallback;
  }
  if (value.startsWith(paths.login) || value.startsWith(paths.register)) return fallback;
  return value;
}

/** Sign-in URL that returns the user to `from` afterwards. */
export function loginUrl(from: string) {
  return `${paths.login}?redirect=${encodeURIComponent(from)}`;
}

/** Where to go after signing in when no specific page was requested. */
export function homeFor(role: Role | undefined) {
  return role === 'ADMIN' ? paths.admin : paths.account;
}
