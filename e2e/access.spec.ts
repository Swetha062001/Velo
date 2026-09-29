import { expect, test } from '@playwright/test';
import { CUSTOMER, signIn } from './helpers.ts';

test.describe('access control in the browser', () => {
  test('guests are sent to sign-in and returned afterwards', async ({ page }) => {
    await page.goto('/account/orders');
    await expect(page).toHaveURL(/\/login\?redirect=%2Faccount%2Forders/);
    await page.getByLabel('Email').fill(CUSTOMER.email);
    await page.getByLabel('Password', { exact: true }).fill(CUSTOMER.password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL('/account/orders');
  });

  test('customers get a 403 page on admin routes, and the API refuses too', async ({ page }) => {
    await signIn(page, CUSTOMER);
    await page.goto('/admin/products');
    await expect(
      page.getByRole('heading', { name: 'This area is for admins only.' }),
    ).toBeVisible();
    const status = await page.evaluate(async () => {
      const res = await fetch('http://localhost:5002/api/v1/admin/stats', {
        credentials: 'include',
      });
      return res.status;
    });
    expect(status).toBe(403);
  });

  test('the sign-in page cannot redirect off-site', async ({ page }) => {
    // '/\t/evil.example' becomes '//evil.example' once the browser strips the tab.
    for (const target of [
      '//evil.example',
      '/\t/evil.example',
      '/\\evil.example',
      'https://evil.example',
    ]) {
      await page.context().clearCookies();
      await page.goto(`/login?redirect=${encodeURIComponent(target)}`);
      await page.getByLabel('Email').fill(CUSTOMER.email);
      await page.getByLabel('Password', { exact: true }).fill(CUSTOMER.password);
      await page.getByRole('button', { name: 'Sign in' }).click();
      await expect(page).toHaveURL(/^http:\/\/localhost:5174\/account/);
    }
  });

  test('the session cookie is httpOnly (not readable by page scripts)', async ({ page }) => {
    await signIn(page, CUSTOMER);
    expect(await page.evaluate(() => document.cookie)).not.toContain('velo_session');
    const cookie = (await page.context().cookies()).find((c) => c.name === 'velo_session');
    expect(cookie).toMatchObject({ httpOnly: true, sameSite: 'Lax' });
  });
});
