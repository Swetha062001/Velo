import { describe, expect, it } from 'vitest';
import { homeFor, loginUrl, safeRedirect } from './redirect.ts';

describe('safeRedirect (open-redirect protection)', () => {
  it.each(['/account', '/products?category=running', '/checkout', '/admin/orders/VL-1'])(
    'allows in-app path %s',
    (path) => expect(safeRedirect(path)).toBe(path),
  );

  it.each([
    null,
    '',
    'https://evil.example',
    'javascript:alert(1)',
    '//evil.example',
    '/\\evil.example',
    '/\t/evil.example', // browsers strip tabs/newlines: becomes //evil.example
    '/\n/evil.example',
    '/\\/evil.example',
    '\\\\evil.example',
    '/login?redirect=/admin',
    '/register',
  ])('rejects %j', (value) => expect(safeRedirect(value, '/fallback')).toBe('/fallback'));
});

describe('loginUrl / homeFor', () => {
  it('encodes the return path', () => {
    expect(loginUrl('/checkout?step=2')).toBe('/login?redirect=%2Fcheckout%3Fstep%3D2');
  });

  it('sends admins to the dashboard and customers to their account', () => {
    expect(homeFor('ADMIN')).toBe('/admin');
    expect(homeFor('USER')).toBe('/account');
    expect(homeFor(undefined)).toBe('/account');
  });
});
