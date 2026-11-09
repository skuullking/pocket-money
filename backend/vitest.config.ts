import { defineConfig } from 'vitest/config';
import { testDatabaseUrl } from './tests/support/testDatabase';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    globalSetup: ['tests/support/globalSetup.ts'],
    // Tous les fichiers partagent une base vidée entre chaque test.
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 60_000,
    env: {
      DATABASE_URL: testDatabaseUrl(),
      JWT_SECRET: 'test-only-secret',
      CLIENT_URL: 'http://localhost:5173',
      APP_TIMEZONE: 'Europe/Paris',
      // Aucun email réel ne doit partir pendant les tests.
      RESEND_API_KEY: '',
      // Empêche server.ts d'ouvrir un port à l'import : supertest utilise `app` directement.
      VERCEL: '1',
      // Permet de simuler une IP par requête, sans quoi les rate limiters
      // bloqueraient la suite (voir nextIp dans helpers.ts).
      TRUST_PROXY_HOPS: '1',
    },
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      reporter: ['text-summary', 'html'],
    },
  },
});
