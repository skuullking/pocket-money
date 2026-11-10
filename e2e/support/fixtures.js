import { execSync } from 'child_process';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { test as base, expect } from '@playwright/test';
import { API_URL, DATABASE_URL } from './env.js';

const backendDir = resolve(fileURLToPath(import.meta.url), '../../../backend');

// La base est remise à l'état du seed avant chaque test.
const reseed = () => {
  execSync('npx ts-node --transpile-only prisma/seed.ts', {
    cwd: backendDir,
    env: { ...process.env, DATABASE_URL },
    stdio: 'pipe',
  });
};

export const PASSWORD = 'password123';
export const INVITE_CODE = 'DUPONT2024';
export const ALICE_START = 45.5;
export const BOB_START = 23;

// Réponses 4xx attendues (session absente…), et refus déjà montrés dans un toast
// que les écrans journalisent aussi.
const EXPECTED_CONSOLE_ERRORS = /Failed to load resource|^(Login|Signup|Submission) failed/;

export const test = base.extend({
  // Chaque test échoue s'il laisse une erreur dans la console du navigateur.
  page: async ({ page }, use) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => {
      if (message.type() === 'error' && !EXPECTED_CONSOLE_ERRORS.test(message.text())) {
        errors.push(message.text());
      }
    });
    reseed();
    await use(page);
    expect(errors, 'erreurs dans la console du navigateur').toEqual([]);
  },
});

export { expect };

export const loginAsParent = async page => {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Parent', exact: true }).click();
  await page.getByPlaceholder('ex: sarah@gmail.com').fill('sarah@dupont.fr');
  await page.getByPlaceholder('••••••••').fill(PASSWORD);
  await page.getByRole('button', { name: 'Me connecter' }).click();
  await expect(page).toHaveURL(/\/parent$/);
};

export const loginAsChild = async (page, name) => {
  await page.goto('/login');
  await page.getByPlaceholder('Alice').fill(name);
  await page.getByPlaceholder('ABCD12').fill(INVITE_CODE);
  await page.getByPlaceholder('••••••••').fill(PASSWORD);
  await page.getByRole('button', { name: 'Me connecter' }).click();
  await expect(page).toHaveURL(/\/child$/);
};

export const switchToParent = async page => {
  await page.context().clearCookies();
  await loginAsParent(page);
};

const apiGet = async (page, path) => {
  const response = await page.request.get(`${API_URL}${path}`);
  expect(response.ok(), `GET ${path}`).toBe(true);
  return response.json();
};

export const apiPost = async (page, path, data) => {
  const response = await page.request.post(`${API_URL}${path}`, { data });
  expect(response.ok(), `POST ${path}`).toBe(true);
  return response.json();
};

// Le solde en base, pas celui affiché : l'argent doit réellement avoir bougé.
export const myBalance = async page => (await apiGet(page, '/auth/me')).user.balance;

export const childBalance = async (page, childId) => {
  const { children } = await apiGet(page, '/family/children');
  return children.find(child => child.id === childId).balance;
};

export const myTransactions = async page => (await apiGet(page, '/transactions')).transactions;

export const visibleButton = (page, name) =>
  page.getByRole('button', { name, exact: false }).locator('visible=true').first();

export const toast = (page, text) => page.locator('.fixed.top-8').filter({ hasText: text });
