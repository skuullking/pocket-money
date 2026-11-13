// Captures du README et GIF temps réel, hors de la suite de tests : npm run showcase.
import { defineConfig } from '@playwright/test';
import base from './playwright.config.js';

export default defineConfig({
  ...base,
  testDir: './showcase',
  reporter: [['list']],
  projects: [{ name: 'showcase' }],
});
