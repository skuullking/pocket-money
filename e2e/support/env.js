export const API_PORT = 3101;
export const WEB_PORT = 5273;
export const API_URL = `http://localhost:${API_PORT}/api`;
export const WEB_URL = `http://localhost:${WEB_PORT}`;

// TEST_DATABASE_URL pointe vers un serveur existant (la CI). Sinon, l'API lance un Postgres jetable.
export const EMBEDDED_PORT = process.env.TEST_DATABASE_URL ? '' : '54330';
export const DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? `postgresql://postgres:postgres@localhost:${EMBEDDED_PORT}/pocketmoney_e2e_test`;

if (!new URL(DATABASE_URL).pathname.toLowerCase().includes('test')) {
  throw new Error('Refus de lancer les tests : le nom de la base doit contenir « test ».');
}
