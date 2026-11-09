import { expect, test } from '../support/fixtures.js';

test.describe('pages légales', () => {
  test("l'accueil mène à la confidentialité et aux conditions", async ({ page }) => {
    await page.goto('/welcome');
    await page.getByRole('link', { name: 'Confidentialité' }).click();
    await expect(page).toHaveURL(/\/privacy$/);
    await expect(page.getByRole('heading', { name: 'Données traitées' })).toBeVisible();

    await page.goto('/welcome');
    await page.getByRole('link', { name: "Conditions d'utilisation" }).click();
    await expect(page).toHaveURL(/\/terms$/);
    await expect(page.getByRole('heading', { name: 'Pas de service financier' })).toBeVisible();
  });
});
