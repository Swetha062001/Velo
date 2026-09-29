import { expect, test } from '@playwright/test';
import { rupees } from './helpers.ts';

test('AI assistant (smart search mode) recommends real products within budget', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Ask VELO AI' }).click();
  const panel = page.getByRole('dialog', { name: 'VELO assistant' });
  await expect(panel.getByText('Smart search mode')).toBeVisible();

  await panel.getByRole('button', { name: 'Running shoes under ₹6,000' }).click();
  const cards = panel.locator('[role="log"] a[href^="/products/"]');
  await expect(cards.first()).toBeVisible();
  for (const text of await cards.allTextContents()) {
    const price = rupees(text.match(/₹[\d,]+/)![0]);
    expect(price).toBeLessThanOrEqual(6000);
  }
  await expect(panel.getByRole('link', { name: /see all matches/i })).toHaveAttribute(
    'href',
    '/products?category=running&maxPrice=6000',
  );
});
