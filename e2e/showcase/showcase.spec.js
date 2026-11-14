// Génère les captures du README et les images du GIF, à partir d'une famille de démo.
// Ne tourne pas avec la suite normale : `npm run showcase` (voir e2e/showcase/README.md).
import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { expect, test } from '@playwright/test';

const here = resolve(fileURLToPath(import.meta.url), '..');
const SHOTS = resolve(here, '../../docs/screenshots');
const FRAMES = resolve(here, '../test-results/showcase-frames');
const PROOF = readFileSync(resolve(here, 'proof.jpg'));

const DESKTOP = { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 };
const PHONE = { viewport: { width: 390, height: 780 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true };

test.describe.configure({ mode: 'serial' });
test.setTimeout(120_000);

const startDemo = async page => {
  await page.goto('/welcome');
  await page.getByRole('button', { name: 'Essayer la démo' }).click();
  await expect(page).toHaveURL(/\/parent$/);
};

const switchTo = async (page, name, path) => {
  await page.getByRole('region', { name: 'Mode démo' }).getByRole('button', { name }).click();
  await expect(page).toHaveURL(new RegExp(`${path}$`));
};

// Laisse les animations finir avant une capture (le solde compte 900 ms).
const settle = page => page.waitForTimeout(1200);

const shot = async (page, name, fullPage = false) => {
  await settle(page);
  await page.screenshot({ path: resolve(SHOTS, `${name}.png`), fullPage });
};

test('captures du README', async ({ browser }) => {
  mkdirSync(SHOTS, { recursive: true });

  const welcome = await browser.newPage(DESKTOP);
  await welcome.goto('/welcome');
  await shot(welcome, 'welcome-desktop');
  await welcome.close();

  const desk = await browser.newPage(DESKTOP);
  await startDemo(desk);
  await shot(desk, 'parent-dashboard-desktop');
  await desk.goto('/parent/inbox');
  await shot(desk, 'parent-inbox-desktop');
  await desk.goto('/parent/analytics');
  await shot(desk, 'parent-analytics-desktop');
  await desk.close();

  const phone = await browser.newPage(PHONE);
  await startDemo(phone);
  await switchTo(phone, 'Léa', '/child');
  await shot(phone, 'child-dashboard-mobile');
  await phone.goto('/child/goals');
  await shot(phone, 'child-goals-mobile');
  await phone.goto('/child/balance');
  await shot(phone, 'child-balance-mobile');
  await phone.close();
});

// Le GIF : l'enfant (à gauche) envoie une corvée, le parent (à droite) la reçoit en
// temps réel et l'approuve, le solde de l'enfant monte sans recharger la page.
test('images du GIF temps réel', async ({ browser }) => {
  mkdirSync(FRAMES, { recursive: true });
  const parentCtx = await browser.newContext(PHONE);
  const parent = await parentCtx.newPage();
  await startDemo(parent);

  // Même famille, autre navigateur : on reprend la session puis on passe sur Léa.
  const childCtx = await browser.newContext({ ...PHONE, storageState: await parentCtx.storageState() });
  const child = await childCtx.newPage();
  await child.goto('/parent');
  await switchTo(child, 'Léa', '/child');

  const frames = [];
  const capture = async (hold = 1) => {
    const [left, right] = await Promise.all([child.screenshot(), parent.screenshot()]);
    const index = frames.length;
    writeFileSync(resolve(FRAMES, `${index}-child.png`), left);
    writeFileSync(resolve(FRAMES, `${index}-parent.png`), right);
    frames.push({ index, hold });
  };
  const burst = async (count, hold = 1) => {
    for (let i = 0; i < count; i += 1) {
      await capture(hold);
      await child.waitForTimeout(150);
    }
  };

  await settle(child);
  await capture(6);

  await child.goto('/child/available-chores');
  await settle(child);
  await capture(4);

  await child.getByText('Faire la vaisselle').first().click();
  await expect(child).toHaveURL(/\/child\/submit-chore\//);
  const choreId = child.url().split('/').pop();
  await settle(child);
  await capture(3);

  await child
    .locator('input[type="file"]')
    .setInputFiles({ name: 'vaisselle.jpg', mimeType: 'image/jpeg', buffer: PROOF });
  await expect(child.getByAltText('Ma réussite')).toBeVisible();
  await child.getByPlaceholder(/J'ai tout rangé/).fill('Tout est propre et rangé !');
  await settle(child);
  await capture(4);

  await child.getByRole('button', { name: 'Envoyer à mes parents' }).locator('visible=true').first().click();
  await expect(child).toHaveURL(/\/child$/);
  // Le parent reçoit l'événement Socket.IO : toast et boîte « À valider » mise à jour.
  await expect(parent.getByText("Une corvée vient d'être soumise !")).toBeVisible();
  await burst(4, 2);

  await parent.goto(`/parent/chores/${choreId}`);
  await expect(parent.getByAltText('Preuve')).toBeVisible();
  await settle(parent);
  await capture(4);

  await parent.getByRole('button', { name: 'Approuver' }).locator('visible=true').first().click();
  await expect(child.getByText('Une de tes corvées a été validée !')).toBeVisible();
  await burst(4, 2);
  await child.waitForTimeout(800);
  await capture(10);

  writeFileSync(resolve(FRAMES, 'frames.json'), JSON.stringify(frames));
  await parentCtx.close();
  await childCtx.close();
});
