import { paths } from '../routes/paths.ts';
import type { Role } from '../types/user.ts';

const SENTINEL_ORIGIN = 'http://velo.invalid';

/**
 * Returns a safe in-app path from a `?redirect=` value, or the fallback.
 * The value is parsed the way the browser will parse it (which strips tabs/newlines and treats
 * `\` as `/`), and must stay on our origin — so `https://evil.com`, `//evil.com`, `/\evil.com`
 * and `/\t/evil.com` are all rejected and the sign-in page can't be used as an open redirect.
 */
export function safeRedirect(value: string | null, fallback: string = paths.account) {
  if (!value || !value.startsWith('/')) return fallback;

  let url: URL;
  try {
    url = new URL(value, SENTINEL_ORIGIN);
  } catch {
    return fallback;
  }
  if (url.origin !== SENTINEL_ORIGIN) return fallback;

  const path = url.pathname + url.search + url.hash;
  if (path.startsWith(paths.login) || path.startsWith(paths.register)) return fallback;
  return path;
}

/** Sign-in URL that returns the user to `from` afterwards. */
export function loginUrl(from: string) {
  return `${paths.login}?redirect=${encodeURIComponent(from)}`;
}

/** Where to go after signing in when no specific page was requested. */
export function homeFor(role: Role | undefined) {
  return role === 'ADMIN' ? paths.admin : paths.account;
}
