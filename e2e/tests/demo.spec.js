import { expect, test } from '../support/fixtures.js';

test.describe('démo', () => {
  test('lance une famille de démo et passe du parent à un enfant', async ({ page }) => {
    await page.goto('/welcome');
    await page.getByRole('button', { name: 'Essayer la démo' }).click();
    await expect(page).toHaveURL(/\/parent$/);

    const bar = page.getByRole('region', { name: 'Mode démo' });
    await expect(bar).toBeVisible();
    await expect(bar.getByRole('button', { name: 'Camille' })).toHaveAttribute('aria-pressed', 'true');

    await bar.getByRole('button', { name: 'Léa' }).click();
    await expect(page).toHaveURL(/\/child$/);
    await expect(bar.getByRole('button', { name: 'Léa' })).toHaveAttribute('aria-pressed', 'true');

    await bar.getByRole('button', { name: 'Camille' }).click();
    await expect(page).toHaveURL(/\/parent$/);
  });

  test('un vrai compte ne voit pas le bandeau de démo', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: 'Parent', exact: true }).click();
    await page.getByPlaceholder('ex: sarah@gmail.com').fill('sarah@dupont.fr');
    await page.getByPlaceholder('••••••••').fill('password123');
    await page.getByRole('button', { name: 'Me connecter' }).click();
    await expect(page).toHaveURL(/\/parent$/);
    await expect(page.getByRole('region', { name: 'Mode démo' })).toHaveCount(0);
  });
});
