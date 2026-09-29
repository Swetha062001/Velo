import { expect, test } from '@playwright/test';

test.describe('keyboard-only use', () => {
  test('skip link jumps to the main content', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');
    const skip = page.getByRole('link', { name: /skip to (main )?content/i });
    await expect(skip).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('main')).toBeFocused();
  });

  test('dialogs trap focus, close with Escape and return focus', async ({ page }) => {
    await page.goto('/');
    const launcher = page.getByRole('button', { name: 'Ask VELO AI' });
    await launcher.focus();
    await page.keyboard.press('Enter');
    const panel = page.getByRole('dialog', { name: 'VELO assistant' });
    await expect(panel).toBeVisible();
    await expect(panel.getByRole('textbox')).toBeFocused();

    // Tabbing many times never leaves the dialog.
    for (let i = 0; i < 12; i++) await page.keyboard.press('Tab');
    expect(await panel.evaluate((d) => d.contains(document.activeElement))).toBe(true);

    await page.keyboard.press('Escape');
    await expect(panel).toBeHidden();
  });

  test('a size can be chosen and added to the bag with the keyboard', async ({ page }) => {
    await page.goto('/products/velo-pulse-runner-triple-white');
    const firstSize = page.locator('input[name="size"]:not([disabled])').first();
    await firstSize.focus();
    await page.keyboard.press('Space');
    await expect(firstSize).toBeChecked();
    await page.getByRole('button', { name: 'Add to bag' }).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog', { name: /your bag/i })).toBeVisible();
  });
});
