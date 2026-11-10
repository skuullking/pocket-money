import {
  expect,
  INVITE_CODE,
  loginAsChild,
  loginAsParent,
  PASSWORD,
  test,
  toast,
  visibleButton,
} from '../support/fixtures.js';

test.describe('authentification', () => {
  test('un parent se connecte et reste connecté après rechargement', async ({ page }) => {
    await loginAsParent(page);
    await expect(page.getByText('Trésor Familial')).toBeVisible();
    await page.reload();
    await expect(page).toHaveURL(/\/parent$/);
    await expect(page.getByText('Trésor Familial')).toBeVisible();
  });

  test('le JWT reste hors de portée de JavaScript', async ({ page }) => {
    await loginAsParent(page);
    expect(await page.evaluate(() => document.cookie)).not.toContain('pm_session');
    const stored = await page.evaluate(() => JSON.stringify(localStorage));
    expect(stored).not.toContain('eyJ');
    const cookie = (await page.context().cookies()).find(c => c.name === 'pm_session');
    expect(cookie.httpOnly).toBe(true);
  });

  test('un enfant se connecte avec son prénom et le code famille', async ({ page }) => {
    await loginAsChild(page, 'Alice');
  });

  test('un mauvais mot de passe affiche une erreur', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('ex: sarah@gmail.com').fill('sarah@dupont.fr');
    await page.getByPlaceholder('••••••••').fill('mauvais-mdp');
    await page.getByRole('button', { name: 'Me connecter' }).click();
    await expect(toast(page, 'Identifiants invalides')).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test("un visiteur est renvoyé vers l'accueil", async ({ page }) => {
    await page.goto('/parent/chores');
    await expect(page).toHaveURL(/\/welcome$/);
  });

  test("un enfant ne peut pas ouvrir l'espace parent", async ({ page }) => {
    await loginAsChild(page, 'Bob');
    await page.goto('/parent/settings');
    await expect(page).toHaveURL(/\/child$/);
  });

  test("un parent ne peut pas ouvrir l'espace enfant", async ({ page }) => {
    await loginAsParent(page);
    await page.goto('/child/goals');
    await expect(page).toHaveURL(/\/parent$/);
  });

  test('la déconnexion termine la session', async ({ page }) => {
    await loginAsChild(page, 'Alice');
    await page.goto('/child/profile');
    await visibleButton(page, 'Quitter PocketMoney').click();
    await expect(page).toHaveURL(/\/welcome$/);
    await page.goto('/child');
    await expect(page).toHaveURL(/\/welcome$/);
  });

  test("l'accès rapide pré-remplit sans connecter (UI-3)", async ({ page }) => {
    await loginAsParent(page);
    await page.waitForFunction(() => localStorage.getItem('pocketmoney_cached_family_members')?.includes('Alice'));
    await page.context().clearCookies();
    await page.goto('/welcome');
    await page.getByText('Alice', { exact: true }).click();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByPlaceholder('ex: sarah@gmail.com')).toHaveValue('Alice');
    await expect(page.getByPlaceholder('ABCD12')).toHaveValue(INVITE_CODE);
    await expect(page.getByPlaceholder('••••••••')).toHaveValue('');
  });
});

test.describe('inscription', () => {
  test('un parent crée une famille avec ses règles', async ({ page }) => {
    await page.goto('/signup');
    await page.getByText('Parent : Créer une famille').click();
    await page.getByPlaceholder('Sarah Dupont').fill('Marc Martin');
    await page.getByPlaceholder('votre@email.com').fill(`marc-${Date.now()}@example.test`);
    await page.getByPlaceholder('••••••••').fill(PASSWORD);
    await page.getByPlaceholder('ex: Les Dupont').fill('Les Martin');
    await page.locator('label', { hasText: "J'accepte les" }).locator('div').first().click();
    await page.getByText("Je suis titulaire de l'autorité parentale").click();
    await page.getByRole('button', { name: 'Suivant : Configurer les règles' }).click();
    await page.getByRole('button', { name: 'Créer ma famille' }).click();
    await expect(page).toHaveURL(/\/parent$/);
    await expect(page.getByText('Trésor Familial')).toBeVisible();
  });

  test('un enfant rejoint une famille avec le code', async ({ page }) => {
    await page.goto('/signup');
    await page.getByText('Enfant : Créer mon compte').click();
    await page.getByPlaceholder('Alice').fill('Zoé');
    await page.getByPlaceholder('8').fill('9');
    await page.getByPlaceholder('••••••••').fill(PASSWORD);
    await page.getByPlaceholder('ABCD12').fill(INVITE_CODE);
    await page.getByRole('button', { name: 'Créer mon compte' }).click();
    await expect(page).toHaveURL(/\/child$/);
  });

  test('un prénom déjà pris dans la famille est refusé', async ({ page }) => {
    await page.goto('/signup');
    await page.getByText('Enfant : Créer mon compte').click();
    await page.getByPlaceholder('Alice').fill('Alice');
    await page.getByPlaceholder('8').fill('9');
    await page.getByPlaceholder('••••••••').fill(PASSWORD);
    await page.getByPlaceholder('ABCD12').fill(INVITE_CODE);
    await page.getByRole('button', { name: 'Créer mon compte' }).click();
    await expect(toast(page, 'déjà utilisé')).toBeVisible();
  });
});
