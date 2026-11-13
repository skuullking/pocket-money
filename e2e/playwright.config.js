import { defineConfig, devices } from '@playwright/test';
import { API_PORT, API_URL, DATABASE_URL, EMBEDDED_PORT, WEB_PORT, WEB_URL } from './support/env.js';

const { CI } = process.env;
// Dans node_modules : le build de test n'écrase pas frontend/dist.
const OUT_DIR = 'node_modules/.e2e-dist';

export default defineConfig({
  testDir: './tests',
  // Tous les tests partagent une base réinitialisée avant chacun d'eux.
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!CI,
  retries: 0,
  timeout: 45_000,
  expect: { timeout: 8_000 },
  reporter: CI ? [['github'], ['html', { open: 'never' }]] : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: WEB_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' } },
  ],
  webServer: [
    {
      command: 'node tests/support/start-e2e-server.mjs',
      cwd: '../backend',
      url: `${API_URL}/health`,
      timeout: 180_000,
      reuseExistingServer: false,
      stdout: 'ignore',
      env: {
        DATABASE_URL,
        E2E_EMBEDDED_PORT: EMBEDDED_PORT,
        JWT_SECRET: 'e2e-only-secret',
        CLIENT_URL: WEB_URL,
        PORT: String(API_PORT),
        RESEND_API_KEY: '',
        DEMO_ENABLED: 'true',
        // Chaque test de démo en crée une ou plusieurs depuis la même IP.
        DEMO_RATE_LIMIT: '1000',
      },
    },
    {
      // Le build de production, pas le serveur de dev : c'est ce qui sera déployé.
      command: `npx vite build --outDir ${OUT_DIR} && npx vite preview --outDir ${OUT_DIR} --port ${WEB_PORT} --strictPort`,
      cwd: '../frontend',
      url: WEB_URL,
      timeout: 180_000,
      reuseExistingServer: false,
      stdout: 'ignore',
      env: { VITE_API_URL: API_URL },
    },
  ],
});
