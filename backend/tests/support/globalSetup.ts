import { execSync } from 'child_process';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';
import EmbeddedPostgres from 'embedded-postgres';
import {
  EMBEDDED_DATABASE,
  EMBEDDED_PASSWORD,
  EMBEDDED_PORT,
  EMBEDDED_USER,
  testDatabaseUrl,
  usesEmbeddedDatabase,
} from './testDatabase';

const startEmbeddedDatabase = async () => {
  const databaseDir = mkdtempSync(join(tmpdir(), 'pocketmoney-test-'));
  const server = new EmbeddedPostgres({
    databaseDir,
    user: EMBEDDED_USER,
    password: EMBEDDED_PASSWORD,
    port: EMBEDDED_PORT,
    persistent: false,
    initdbFlags: ['--encoding=UTF8', '--locale=C'],
    onLog: () => undefined,
  });
  await server.initialise();
  await server.start();
  await server.createDatabase(EMBEDDED_DATABASE);
  return async () => {
    await server.stop();
    rmSync(databaseDir, { recursive: true, force: true });
  };
};

export default async function setup() {
  const stop = usesEmbeddedDatabase() ? await startEmbeddedDatabase() : undefined;
  // Applique les vraies migrations : le schéma testé est celui de la production.
  execSync('npx prisma migrate deploy', {
    cwd: resolve(__dirname, '../..'),
    env: { ...process.env, DATABASE_URL: testDatabaseUrl() },
    stdio: 'pipe',
  });
  return stop;
}
