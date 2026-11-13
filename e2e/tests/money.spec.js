import {
  ALICE_START,
  apiPost,
  BOB_START,
  childBalance,
  expect,
  loginAsChild,
  loginAsParent,
  myBalance,
  myTransactions,
  switchToParent,
  test,
  toast,
  visibleButton,
} from '../support/fixtures.js';

const ALICE = 'user-alice';

// PNG de 1×1 pixel : passe réellement par la compression canvas du navigateur.
const PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

const fundingCard = (page, title) =>
  page.locator('article').filter({ has: page.getByRole('heading', { name: title }) });

const euros = amount => `${amount.toFixed(2).replace('.', ',')} €`;

const moveCoins = async (page, opener, confirm, amount) => {
  await fundingCard(page, 'Vacances à la mer').getByRole('button', { name: opener }).click();
  await page.getByLabel('Autre montant (€)').fill(amount);
  await page.getByRole('button', { name: confirm }).click();
};
const addCoins = (page, amount) => moveCoins(page, 'Ajouter des pièces', /^Mettre de côté/, amount);
const takeCoins = (page, amount) => moveCoins(page, 'Retirer', /^Reprendre/, amount);

test.describe('corvées', () => {
  test("approuver crédite le solde de l'enfant", async ({ page }) => {
    await loginAsParent(page);
    await page.goto('/parent/chores/chore-2');
    await visibleButton(page, 'Approuver').click();
    await expect(page).toHaveURL(/\/parent\/chores$/);
    await expect(toast(page, 'Corvée validée')).toBeVisible();
    expect(await childBalance(page, ALICE)).toBe(ALICE_START + 5);
  });

  test('refuser ne crédite rien', async ({ page }) => {
    await loginAsParent(page);
    await page.goto('/parent/chores/chore-2');
    await visibleButton(page, 'Refuser').click();
    await page.getByRole('textbox').fill('Il reste de la poussière');
    await visibleButton(page, 'Confirmer le refus').click();
    await expect(toast(page, 'Corvée refusée')).toBeVisible();
    expect(await childBalance(page, ALICE)).toBe(ALICE_START);
  });

  test('parcours complet : soumission avec photo, puis approbation', async ({ page }) => {
    await loginAsChild(page, 'Alice');
    await page.goto('/child/submit-chore/chore-1');
    await expect(visibleButton(page, 'Envoyer à mes parents')).toBeDisabled();
    await page
      .locator('input[type="file"]')
      .setInputFiles({ name: 'preuve.png', mimeType: 'image/png', buffer: PIXEL });
    await expect(page.getByAltText('Ma réussite')).toBeVisible();
    await page.getByPlaceholder(/J'ai tout rangé/).fill('Tout est propre');
    await visibleButton(page, 'Envoyer à mes parents').click();
    await expect(page).toHaveURL(/\/child$/);

    await switchToParent(page);
    await page.goto('/parent/chores/chore-1');
    await expect(page.getByAltText('Preuve')).toBeVisible();
    await expect(page.getByText('Tout est propre')).toBeVisible();
    await visibleButton(page, 'Approuver').click();
    await expect(toast(page, 'Corvée validée')).toBeVisible();
    expect(await childBalance(page, ALICE)).toBe(ALICE_START + 3);
  });

  test('un parent crée, modifie puis supprime une corvée (UI-2)', async ({ page }) => {
    await loginAsParent(page);
    const { chore } = await apiPost(page, '/chores', {
      title: 'À modifier',
      reward: 2,
      assigneeId: ALICE,
      deadline: '2030-01-01',
    });

    await page.goto(`/parent/chores/${chore.id}`);
    await visibleButton(page, 'Modifier la tâche').click();
    await expect(page).toHaveURL(new RegExp(`/parent/chores/${chore.id}/edit$`));
    const title = page.locator('input[value="À modifier"]');
    await title.fill('Modifiée');
    await visibleButton(page, 'Enregistrer').click();
    await expect(toast(page, 'Corvée mise à jour')).toBeVisible();

    await page.goto(`/parent/chores/${chore.id}`);
    await expect(page.getByRole('heading', { name: 'Modifiée' })).toBeVisible();
    await visibleButton(page, 'Supprimer la corvée').click();
    await page.getByRole('dialog').getByRole('button', { name: 'Supprimer' }).click();
    await expect(toast(page, 'Corvée supprimée')).toBeVisible();
    await page.goto(`/parent/chores/${chore.id}`);
    await expect(page.getByText('Corvée introuvable')).toBeVisible();
  });
});

test('une corvée refusée se refait et finit par être payée', async ({ page }) => {
  await loginAsParent(page);
  await page.goto('/parent/chores/chore-2');
  await visibleButton(page, 'Refuser').click();
  await page.getByRole('textbox').fill('Encore un effort');
  await visibleButton(page, 'Confirmer le refus').click();
  await expect(toast(page, 'Corvée refusée')).toBeVisible();

  await page.context().clearCookies();
  await loginAsChild(page, 'Alice');
  await page.goto('/child/available-chores');
  await expect(page.getByText('Encore un effort')).toBeVisible();
  await page.getByRole('link', { name: 'Réessayer' }).click();
  await page.locator('input[type="file"]').setInputFiles({ name: 'preuve.png', mimeType: 'image/png', buffer: PIXEL });
  await expect(page.getByAltText('Ma réussite')).toBeVisible();
  await visibleButton(page, 'Envoyer à mes parents').click();
  await expect(page).toHaveURL(/\/child$/);

  await switchToParent(page);
  await page.goto('/parent/inbox');
  await visibleButton(page, 'Approuver et payer').click();
  await expect(toast(page, 'Corvée validée')).toBeVisible();
  expect(await childBalance(page, ALICE)).toBe(ALICE_START + 5);
});

test.describe('plancher du solde (MONEY-1)', () => {
  test('une sanction énorme laisse le solde à 0, jamais en dessous', async ({ page }) => {
    await loginAsParent(page);
    await apiPost(page, '/rules', { title: 'QA Big Fine', amount: 999 });
    await page.goto('/parent/children');
    await page.reload();

    // Cible Alice par son nom : l'API ne garantit pas l'ordre des enfants.
    await page.locator('article', { hasText: 'Alice' }).getByRole('button', { name: 'Sanction' }).click();
    await page.getByRole('button', { name: /QA Big Fine/ }).click();
    await page.getByRole('button', { name: /Appliquer/ }).click();

    await expect(toast(page, 'plafonnée à 0€')).toBeVisible();
    expect(await childBalance(page, ALICE)).toBe(0);
  });
});

test.describe('objectifs', () => {
  test('épargner puis retirer ramène le solde à sa valeur de départ', async ({ page }) => {
    await loginAsChild(page, 'Bob');
    await page.goto('/child/goals');

    await addCoins(page, '5');
    await expect(toast(page, 'Argent ajouté')).toBeVisible();
    expect(await myBalance(page)).toBe(BOB_START - 5);

    await takeCoins(page, '5');
    await expect(toast(page, 'Argent retiré')).toBeVisible();
    expect(await myBalance(page)).toBe(BOB_START);
  });

  test('le tableau de bord affiche le nouveau solde sans recharger la page', async ({ page }) => {
    await loginAsChild(page, 'Bob');
    await page.goto('/child/goals');

    await addCoins(page, '5');
    await expect(toast(page, 'Argent ajouté')).toBeVisible();

    // Navigation interne : un page.goto rechargerait l'application et masquerait le problème.
    await page.evaluate(() => {
      window.history.pushState({}, '', '/child');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    await expect(page.getByText(euros(BOB_START - 5)).first()).toBeVisible();
  });

  for (const answer of ['-5', '0']) {
    test(`la saisie « ${answer} » est refusée sans toucher au solde (MONEY-3)`, async ({ page }) => {
      await loginAsChild(page, 'Bob');
      await page.goto('/child/goals');
      await addCoins(page, answer);
      await expect(toast(page, 'Entre un montant positif')).toBeVisible();
      expect(await myBalance(page)).toBe(BOB_START);
    });
  }

  test('épargner plus que le solde est refusé', async ({ page }) => {
    await loginAsChild(page, 'Bob');
    await page.goto('/child/goals');
    await addCoins(page, '1000');
    await expect(toast(page, 'Solde insuffisant')).toBeVisible();
    expect(await myBalance(page)).toBe(BOB_START);
  });

  test("un enfant ne voit pas l'objectif personnel d'un autre (MONEY-2)", async ({ page }) => {
    await loginAsChild(page, 'Bob');
    await page.goto('/child/goals');
    await expect(page.getByRole('heading', { name: 'Vacances à la mer' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Nouveau vélo' })).toHaveCount(0);
  });
});

test.describe('dépenses (FEATURE-1)', () => {
  const requestExpense = async (page, title, amount) => {
    await page.goto('/child/expenses');
    await visibleButton(page, 'Demander').click();
    await page.getByPlaceholder('ex: Livre Harry Potter').fill(title);
    await page.locator('input[type="number"]').fill(String(amount));
    await page.getByRole('button', { name: 'Envoyer la demande' }).click();
    await expect(toast(page, 'Demande envoyée')).toBeVisible();
  };

  test('une demande approuvée débite le solde', async ({ page }) => {
    await loginAsChild(page, 'Alice');
    await requestExpense(page, 'Stylo magique', 10);
    expect(await myBalance(page)).toBe(ALICE_START);

    await switchToParent(page);
    await page.goto('/parent/expenses');
    const row = page
      .locator('div')
      .filter({ hasText: /^Stylo magique/ })
      .last();
    await expect(row).toBeVisible();
    await page.locator('article', { hasText: 'Stylo magique' }).getByRole('button', { name: 'Approuver' }).click();
    await page.getByRole('button', { name: /^Approuver\s10/ }).click();
    await expect(toast(page, 'Dépense approuvée')).toBeVisible();
    expect(await childBalance(page, ALICE)).toBe(ALICE_START - 10);
  });

  test('le plafond par demande est appliqué', async ({ page }) => {
    await loginAsChild(page, 'Alice');
    await page.goto('/child/expenses');
    await visibleButton(page, 'Demander').click();
    await page.getByPlaceholder('ex: Livre Harry Potter').fill('Trop cher');
    await page.locator('input[type="number"]').fill('51');
    await page.getByRole('button', { name: 'Envoyer la demande' }).click();
    await expect(toast(page, 'maximum autorisé')).toBeVisible();
  });
});

test("l'historique de l'enfant reflète les mouvements", async ({ page }) => {
  await loginAsChild(page, 'Alice');
  await page.goto('/child/balance');
  await expect(page.getByText(euros(ALICE_START))).toBeVisible();
  const transactions = await myTransactions(page);
  await expect(page.getByText(transactions[0].description)).toBeVisible();
});

test('un objectif déjà acheté ne peut plus bouger (MONEY-7)', async ({ page }) => {
  await loginAsChild(page, 'Bob');
  await page.goto('/child/goals');
  const card = fundingCard(page, 'Console de jeux');
  await expect(card.getByRole('button', { name: 'Ajouter des pièces' })).toBeDisabled();
  await expect(card.getByRole('button', { name: 'Retirer' })).toBeDisabled();
});
