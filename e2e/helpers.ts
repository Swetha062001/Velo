import { expect, type Page } from '@playwright/test';

export const ADMIN = { email: 'admin@velo.local', password: 'VeloAdmin#2026' };
export const CUSTOMER = { email: 'user@velo.local', password: 'VeloUser#2026' };

export async function signIn(page: Page, { email, password }: { email: string; password: string }) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).not.toHaveURL(/\/login/);
}

/** Unique throwaway account details for a fresh customer. */
export function newCustomer() {
  const id = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  return { name: 'Priya Sharma', email: `priya.${id}@example.test`, password: 'runFast42' };
}

export const rupees = (text: string) => Number(text.replace(/[^\d]/g, ''));
