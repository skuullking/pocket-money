// Parcours de QA_TEST_PLAN.md qu'aucune autre suite ne couvre.
import { readFileSync } from 'fs';
import { expect, INVITE_CODE, loginAsChild, loginAsParent, PASSWORD, test, toast } from '../support/fixtures.js';

const signupParent = async (page, choice, email) => {
  await page.goto('/signup');
  await page.getByText(choice).click();
  await page.getByPlaceholder('Sarah Dupont').fill('Paul Dupont');
  await page.getByPlaceholder('votre@email.com').fill(email);
  await page.getByPlaceholder('••••••••').fill(PASSWORD);
};

const acceptBoxes = async page => {
  await page.locator('label', { hasText: "J'accepte les" }).locator('div').first().click();
  await page.getByText("Je suis titulaire de l'autorité parentale").click();
};

test.describe('plan QA, inscription et comptes', () => {
  test('sans les deux cases, inscription parent refusée', async ({ page }) => {
    await signupParent(page, 'Parent, famille existante', 'refus@dupont.fr');
    await page.getByPlaceholder('ABCD12').fill(INVITE_CODE);
    await page.getByRole('button', { name: 'Créer mon compte' }).click();
    await expect(toast(page, 'Coche les deux cases')).toBeVisible();
    await expect(page).toHaveURL(/\/signup$/);
  });

  test('un parent rejoint une famille, puis supprime son compte', async ({ page }) => {
    await signupParent(page, 'Parent, famille existante', 'paul@dupont.fr');
    await page.getByPlaceholder('ABCD12').fill(INVITE_CODE);
    await acceptBoxes(page);
    await page.getByRole('button', { name: 'Créer mon compte' }).click();
    await expect(page).toHaveURL(/\/parent$/);

    await page.goto('/parent/settings');
    await page.getByRole('button', { name: 'Supprimer mon compte' }).click();
    const dialog = page.getByRole('dialog', { name: 'Supprimer mon compte' });
    await dialog.getByLabel('Confirme avec ton mot de passe').fill(PASSWORD);
    await dialog.getByRole('button', { name: 'Supprimer mon compte' }).click();
    await expect(page).toHaveURL(/\/welcome$/);
  });

  test('le dernier parent ne peut pas supprimer son seul compte', async ({ page }) => {
    await loginAsParent(page);
    await page.goto('/parent/settings');
    await page.getByRole('button', { name: 'Supprimer mon compte' }).click();
    const dialog = page.getByRole('dialog', { name: 'Supprimer mon compte' });
    await dialog.getByLabel('Confirme avec ton mot de passe').fill(PASSWORD);
    await dialog.getByRole('button', { name: 'Supprimer mon compte' }).click();
    await expect(toast(page, 'seul parent')).toBeVisible();
  });

  test('un enfant se déconnecte depuis son profil', async ({ page }) => {
    await loginAsChild(page, 'Alice');
    await page.goto('/child/profile');
    await page.getByRole('button', { name: 'Quitter PocketMoney' }).click();
    await expect(page).toHaveURL(/\/welcome$/);
    await page.goto('/child');
    await expect(page).toHaveURL(/\/welcome$/);
  });

  test('le parent change le mot de passe de son enfant', async ({ page }) => {
    await loginAsParent(page);
    await page.goto('/parent/children/user-alice/settings');
    await page.getByLabel('Nouveau mot de passe').fill('nouveau-secret');
    await page.getByLabel('Confirmer le mot de passe').fill('nouveau-secret');
    await page.getByRole('button', { name: 'Changer le mot de passe' }).click();
    await expect(toast(page, 'Mot de passe modifié')).toBeVisible();

    await page.context().clearCookies();
    await page.goto('/login');
    await page.getByPlaceholder('Alice').fill('Alice');
    await page.getByPlaceholder('ABCD12').fill(INVITE_CODE);
    await page.getByPlaceholder('••••••••').fill('nouveau-secret');
    await page.getByRole('button', { name: 'Me connecter' }).click();
    await expect(page).toHaveURL(/\/child$/);
  });

  test('le parent exporte les données, sans mot de passe', async ({ page }) => {
    await loginAsParent(page);
    await page.goto('/parent/settings');
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Exporter les données de la famille' }).click(),
    ]);
    const content = readFileSync(await download.path(), 'utf8');
    expect(JSON.parse(content).family.users.length).toBeGreaterThan(1);
    expect(content).not.toContain('"password"');
  });
});

test.describe('plan QA, espace parent', () => {
  test('la recherche filtre les corvées', async ({ page }) => {
    await loginAsParent(page);
    await page.goto('/parent/chores');
    const cards = page.locator('main section a');
    await expect(cards.first()).toBeVisible();
    await page.getByPlaceholder('Rechercher une corvée').fill('zzzz-aucun-resultat');
    await expect(cards).toHaveCount(0);
  });

  test('une règle se crée, se modifie et se supprime', async ({ page }) => {
    await loginAsParent(page);
    await page.goto('/parent/rules');
    await page.getByRole('button', { name: 'Ajouter une règle' }).click();
    await page.getByLabel('Motif').fill('Règle QA');
    await page.getByLabel('Montant (€)').fill('3');
    await page.getByRole('button', { name: 'Enregistrer' }).click();
    await expect(page.getByText('Règle QA')).toBeVisible();

    await page.getByRole('button', { name: 'Modifier Règle QA' }).click();
    await page.getByLabel('Motif').fill('Règle QA modifiée');
    await page.getByRole('button', { name: 'Enregistrer' }).click();
    await expect(page.getByText('Règle QA modifiée')).toBeVisible();

    await page.getByRole('button', { name: 'Supprimer Règle QA modifiée' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Supprimer' }).click();
    await expect(page.getByText('Règle QA modifiée')).toBeHidden();
  });

  test('statistiques, paramètres et ajout d’un enfant', async ({ page }) => {
    await loginAsParent(page);
    await page.goto('/parent/analytics');
    await expect(page.getByRole('heading', { name: 'Comparaison entre enfants' })).toBeVisible();

    await page.goto('/parent/settings');
    await expect(page.getByText(INVITE_CODE)).toBeVisible();

    await page.goto('/parent/children');
    await expect(page.getByRole('heading', { name: 'Ajouter un enfant' })).toBeVisible();
    await expect(page.getByText(INVITE_CODE)).toBeVisible();
  });

  test('une famille sans enfant ne peut pas créer de corvée', async ({ page, isMobile }) => {
    test.skip(isMobile, "Évite de dépasser la limite d'inscriptions par IP, le rendu est couvert par layout.spec.");
    await signupParent(page, 'Parent, nouvelle famille', 'solo@dupont.fr');
    await page.getByPlaceholder('ex: Les Dupont').fill('Les Solo');
    await acceptBoxes(page);
    await page.getByRole('button', { name: 'Suivant : Configurer les règles' }).click();
    await page.getByRole('button', { name: 'Créer ma famille' }).click();
    await expect(page).toHaveURL(/\/parent$/);
    await page.goto('/parent/chores/new');
    await expect(page.getByRole('heading', { name: "Ajoutez d'abord un enfant" })).toBeVisible();
  });
});

test.describe('plan QA, espace enfant', () => {
  for (const [path, heading] of [
    ['/child/available-chores', 'Mes quêtes'],
    ['/child/my-chores', 'Mes quêtes'],
    ['/child/balance', 'Mon Trésor'],
    ['/child/goals', 'Mes rêves'],
    ['/child/profile', 'Alice'],
  ]) {
    test(`${path} affiche ${heading}`, async ({ page }) => {
      await loginAsChild(page, 'Alice');
      await page.goto(path);
      await expect(page.getByRole('heading', { name: heading }).locator('visible=true').first()).toBeVisible();
    });
  }
});
