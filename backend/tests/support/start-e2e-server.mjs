// Lancé par e2e/playwright.config.js : base de données, migrations puis API.
import { execSync, spawn } from 'child_process';
import { mkdirSync, rmSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import EmbeddedPostgres from 'embedded-postgres';

const backendDir = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const { DATABASE_URL, E2E_EMBEDDED_PORT } = process.env;

if (!DATABASE_URL || !new URL(DATABASE_URL).pathname.toLowerCase().includes('test')) {
  throw new Error('Refus de démarrer : DATABASE_URL doit désigner une base de test.');
}

if (E2E_EMBEDDED_PORT) {
  const databaseDir = join(backendDir, 'node_modules', '.cache', 'pocketmoney-e2e-db');
  rmSync(databaseDir, { recursive: true, force: true });
  mkdirSync(dirname(databaseDir), { recursive: true });
  const { username, password, pathname } = new URL(DATABASE_URL);
  const database = new EmbeddedPostgres({
    databaseDir,
    user: username,
    password,
    port: Number(E2E_EMBEDDED_PORT),
    persistent: false,
    initdbFlags: ['--encoding=UTF8', '--locale=C'],
    onLog: () => undefined,
  });
  await database.initialise();
  await database.start();
  await database.createDatabase(pathname.slice(1));
}

execSync('npx prisma migrate deploy', { cwd: backendDir, stdio: 'inherit' });

const server = spawn('npx ts-node --transpile-only src/server.ts', {
  cwd: backendDir,
  stdio: 'inherit',
  shell: true,
});
server.on('exit', code => process.exit(code ?? 0));
