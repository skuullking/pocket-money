import { expect, loginAsChild, loginAsParent, test, visibleButton } from '../support/fixtures.js';

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

const overflow = page =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

const expectNoOverflow = async (page, paths) => {
  for (const path of paths) {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    expect(await overflow(page), `débordement horizontal sur ${path}`).toBeLessThanOrEqual(0);
  }
};

const LANDSCAPE = { width: 844, height: 390 };

test.describe('mise en page', () => {
  test('aucun débordement horizontal, espace parent', async ({ page }) => {
    await loginAsParent(page);
    await expectNoOverflow(page, PARENT_PAGES);
  });

  test('aucun débordement horizontal, espace enfant', async ({ page }) => {
    await loginAsChild(page, 'Alice');
    await expectNoOverflow(page, CHILD_PAGES);
  });

  test('aucun débordement en paysage', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'concerne le mobile');
    await page.setViewportSize(LANDSCAPE);
    await loginAsParent(page);
    await expectNoOverflow(page, PARENT_PAGES);
  });

  test('les pages publiques ne débordent pas', async ({ page }) => {
    await expectNoOverflow(page, ['/welcome', '/login', '/signup', '/forgot-password', '/reset-password']);
  });

  test("le titre mobile n'est pas tronqué (LAYOUT-1)", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'concerne le mobile');
    await loginAsParent(page);
    for (const [path, title] of [
      ['/parent', 'Tableau de Bord'],
      ['/parent/chores', 'Mes Corvées'],
    ]) {
      await page.goto(path);
      const heading = page.getByRole('heading', { name: title }).locator('visible=true').first();
      await expect(heading).toBeVisible();
      const truncated = await heading.evaluate(el => el.scrollWidth > el.clientWidth);
      expect(truncated, `titre tronqué sur ${path}`).toBe(false);
    }
  });

  test("le bouton d'une modale haute reste atteignable (MODAL-1)", async ({ page }) => {
    await loginAsChild(page, 'Alice');
    await page.goto('/child/expenses');
    await visibleButton(page, 'Demander').click();
    await expect(page.getByRole('button', { name: 'Envoyer la demande' })).toBeInViewport();
  });

  test("« Ajouter un enfant » mène au code d'invitation (UI-1)", async ({ page }) => {
    await loginAsParent(page);
    await page.goto('/parent/children');
    await page.getByRole('button', { name: /Ajouter un enfant/ }).click();
    await expect(page).toHaveURL(/\/parent\/settings$/);
    await expect(page.getByText('DUPONT2024')).toBeVisible();
  });
});
