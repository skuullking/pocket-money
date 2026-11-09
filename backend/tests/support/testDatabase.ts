export const EMBEDDED_PORT = 54329;
export const EMBEDDED_USER = 'postgres';
export const EMBEDDED_PASSWORD = 'postgres';
export const EMBEDDED_DATABASE = 'pocketmoney_test';

// Les tests vident toutes les tables : seule une base dont le nom contient
// « test » est acceptée, pour ne jamais pouvoir effacer une base réelle.
export const assertTestDatabase = (url: string): string => {
  if (!new URL(url).pathname.toLowerCase().includes('test')) {
    throw new Error('Refus de lancer les tests : le nom de la base doit contenir « test ».');
  }
  return url;
};

// TEST_DATABASE_URL pointe vers un serveur existant (la CI). Sinon, un Postgres
// jetable est lancé pour la durée des tests (voir globalSetup.ts).
export const usesEmbeddedDatabase = () => !process.env.TEST_DATABASE_URL;

export const testDatabaseUrl = (): string =>
  assertTestDatabase(
    process.env.TEST_DATABASE_URL ??
      // Pool fixe : les tests de concurrence se comportent pareil quel que soit le nombre de cœurs.
      `postgresql://${EMBEDDED_USER}:${EMBEDDED_PASSWORD}@localhost:${EMBEDDED_PORT}/${EMBEDDED_DATABASE}?connection_limit=20`,
  );
