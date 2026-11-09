import AxeBuilder from '@axe-core/playwright';
import { expect, loginAsChild, loginAsParent, test } from '../support/fixtures.js';

const WCAG_AA = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

const PUBLIC_PAGES = ['/welcome', '/login', '/signup', '/forgot-password'];

const PARENT_PAGES = [
  '/parent',
  '/parent/chores',
  '/parent/chores/new',
  '/parent/chores/chore-2',
  '/parent/children',
  '/parent/children/user-alice/settings',
  '/parent/rules',
  '/parent/rules/history',
  '/parent/analytics',
  '/parent/settings',
  '/parent/expenses',
];

const CHILD_PAGES = [
  '/child',
  '/child/available-chores',
  '/child/submit-chore/chore-1',
  '/child/my-chores',
  '/child/balance',
  '/child/goals',
  '/child/profile',
  '/child/expenses',
];

const summarize = violations =>
  violations.flatMap(v => v.nodes.map(n => `${v.id}: ${n.target.join(' ')} ${n.any?.[0]?.message ?? ''}`));

const scan = async (page, paths, theme) => {
  const found = [];
  for (const path of paths) {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    const { violations } = await new AxeBuilder({ page }).withTags(WCAG_AA).analyze();
    found.push(...summarize(violations).map(line => `[${theme}] ${path} ${line}`));
  }
  expect(found).toEqual([]);
};

for (const theme of ['light', 'dark']) {
  test.describe(`accessibilité WCAG AA, thème ${theme}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.addInitScript(value => localStorage.setItem('theme', value), theme);
    });

    test('pages publiques', async ({ page }) => {
      await scan(page, PUBLIC_PAGES, theme);
    });

    test('espace parent', async ({ page }) => {
      await loginAsParent(page);
      await scan(page, PARENT_PAGES, theme);
    });

    test('espace enfant', async ({ page }) => {
      await loginAsChild(page, 'Alice');
      await scan(page, CHILD_PAGES, theme);
    });
  });
}

test('une fenêtre modale garde le focus et se ferme avec Échap', async ({ page }) => {
  await loginAsParent(page);
  await page.goto('/parent/settings');
  const opener = page.getByRole('button', { name: 'Supprimer la famille' });
  await opener.click();
  const dialog = page.getByRole('dialog', { name: 'Supprimer la famille' });
  await expect(dialog).toBeVisible();
  for (let i = 0; i < 6; i += 1) {
    await page.keyboard.press('Tab');
    expect(await dialog.evaluate(node => node.contains(document.activeElement))).toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(opener).toBeFocused();
});
