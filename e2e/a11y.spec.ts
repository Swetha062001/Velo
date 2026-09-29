import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

/** Automated WCAG 2.1 A/AA scan (axe-core). Fails on serious or critical violations. */
const PAGES = [
  ['home', '/'],
  ['catalogue', '/products'],
  ['product', '/products/velo-aero-one-ember-orange'],
  ['bag', '/cart'],
  ['sign in', '/login'],
  ['register', '/register'],
  ['not found', '/no-such-page'],
] as const;

for (const theme of ['light', 'dark'] as const) {
  test.describe(`accessibility — ${theme} theme`, () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript((t) => localStorage.setItem('velo-theme', t), theme);
    });

    for (const [name, path] of PAGES) {
      test(name, async ({ page }) => {
        await page.goto(path);
        await page.waitForLoadState('networkidle');
        const { violations } = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
          .analyze();
        const serious = violations
          .filter((v) => v.impact === 'serious' || v.impact === 'critical')
          .map(
            (v) =>
              `${v.id}: ${v.help} (${v.nodes
                .map((n) => n.target.join(' '))
                .slice(0, 3)
                .join(', ')})`,
          );
        expect(serious).toEqual([]);
      });
    }
  });
}
