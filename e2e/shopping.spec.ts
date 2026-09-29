import { expect, test } from '@playwright/test';
import { ADMIN, newCustomer, rupees, signIn } from './helpers.ts';

/**
 * The core journey: a guest browses, fills a bag, creates an account at checkout and orders;
 * an admin fulfils the order; the customer sees the new status.
 */
test('guest → bag → sign-up at checkout → order → admin ships → customer sees it', async ({
  page,
  browser,
}) => {
  const customer = newCustomer();

  // Browse the catalogue with a filter.
  await page.goto('/products?category=running');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  const firstProduct = page.locator('main a[href^="/products/"]').first();
  await firstProduct.click();
  await expect(page).toHaveURL(/\/products\/velo-/);
  // Wait for the product page itself (the previous page stays visible while it loads).
  await expect(page.getByRole('button', { name: 'Add to bag' })).toBeVisible();
  const productName = (await page.getByRole('heading', { level: 1 }).textContent())!.trim();

  // Adding without a size is blocked with an accessible error.
  await page.getByRole('button', { name: 'Add to bag' }).click();
  await expect(page.getByRole('alert')).toContainText(/select a size/i);

  // Pick the first available size and add it.
  await page.locator('input[name="size"]:not([disabled])').first().check({ force: true });
  await page.getByRole('button', { name: 'Add to bag' }).click();
  const drawer = page.getByRole('dialog', { name: /your bag/i });
  await expect(drawer).toBeVisible();
  await expect(drawer).toContainText(productName);
  await drawer.getByRole('link', { name: 'View bag' }).click();

  // Bag → checkout requires an account.
  await expect(page).toHaveURL('/cart');
  await page.getByRole('link', { name: 'Sign in to check out' }).click();
  await expect(page).toHaveURL(/\/login\?redirect=%2Fcheckout/);
  await page.getByRole('main').getByRole('link', { name: 'Create an account' }).click();
  await page.getByLabel('Full name').fill(customer.name);
  await page.getByLabel('Email').fill(customer.email);
  await page.getByLabel('Password', { exact: true }).fill(customer.password);
  await page.getByRole('button', { name: /create account/i }).click();

  // Back on checkout, with the guest bag merged into the new account.
  await expect(page).toHaveURL('/checkout');
  await expect(page.getByRole('heading', { name: 'Checkout' })).toBeVisible();
  await page.getByLabel('Full name').fill(customer.name);
  await page.getByLabel('Mobile number').fill('9876543210');
  await page.getByLabel('Address', { exact: true }).fill('12 MG Road');
  await page.getByLabel('City').fill('Pune');
  await page.getByLabel('State').selectOption('Maharashtra');
  await page.getByLabel('PIN code').fill('411001');
  await page.getByRole('button', { name: 'Save and use this address' }).click();
  await page.getByRole('button', { name: 'Continue to review' }).click();
  await expect(page.getByText(productName).first()).toBeVisible();
  await page.getByRole('button', { name: 'Continue to payment' }).click();

  const placeOrder = page.getByRole('button', { name: /place order/i });
  const total = rupees((await placeOrder.textContent())!);
  expect(total).toBeGreaterThan(0);
  await placeOrder.click();

  // Confirmation.
  await expect(page.getByRole('heading', { name: 'Thank you!' })).toBeVisible();
  const orderNumber = (await page
    .getByText(/^VELO-\d{4}-\d+$/)
    .first()
    .textContent())!.trim();

  // The header bag is empty again.
  await expect(page.getByRole('link', { name: 'Bag', exact: true })).toBeVisible();

  // Order history shows it as confirmed.
  await page.goto('/account/orders');
  const row = page.getByRole('link', { name: new RegExp(orderNumber) }).first();
  await expect(row).toBeVisible();
  await row.click();
  await expect(page.getByText('Confirmed').first()).toBeVisible();

  // An admin (separate session) fulfils it.
  const adminContext = await browser.newContext();
  const admin = await adminContext.newPage();
  await signIn(admin, ADMIN);
  await admin.goto(`/admin/orders/${orderNumber}`);
  await expect(admin.getByText(customer.email).first()).toBeVisible();
  await expect(admin.getByText(`₹${total.toLocaleString('en-IN')}`).first()).toBeVisible();
  await admin.getByRole('button', { name: 'Start processing' }).click();
  await admin.getByRole('button', { name: 'Mark shipped' }).click();
  await expect(admin.getByRole('button', { name: 'Mark delivered' })).toBeVisible();
  await adminContext.close();

  // The customer sees the new status.
  await page.reload();
  await expect(page.getByText('Shipped').first()).toBeVisible();
});
