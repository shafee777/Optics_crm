import { spawnSync } from 'node:child_process';
import { mkdirSync, existsSync, renameSync } from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import pg from 'pg';
dotenv.config();
const [command, argument, targetDatabase] = process.argv.slice(2);
if (!process.env.DATABASE_URL) throw new Error('Configure DATABASE_URL before backup or restore.');
const url = new URL(process.env.DATABASE_URL);
if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) throw new Error('This utility only supports a local PostgreSQL server.');
const env = { ...process.env, PGHOST: url.hostname.replace(/^\[|\]$/g, ''), PGPORT: url.port || '5432', PGUSER: decodeURIComponent(url.username), PGPASSWORD: decodeURIComponent(url.password), PGDATABASE: decodeURIComponent(url.pathname.slice(1)) };
function run(tool, args, overrides = {}) {
  const executable = process.env.PG_BIN ? path.join(process.env.PG_BIN, tool + (process.platform === 'win32' ? '.exe' : '')) : tool;
  const result = spawnSync(executable, args, { env: { ...env, ...overrides }, stdio: 'inherit', shell: false });
  if (result.error || result.status !== 0) throw new Error(tool + ' failed. Install PostgreSQL command-line tools and set PG_BIN.');
}
if (command === 'backup') {
  const directory = path.resolve(argument || 'backups'); mkdirSync(directory, { recursive: true });
  const destination = path.join(directory, 'optics-' + new Date().toISOString().replace(/[:.]/g, '-') + '.dump');
  run('pg_dump', ['--format=custom', '--file', destination + '.partial', '--no-password']);
  run('pg_restore', ['--list', destination + '.partial']);
  renameSync(destination + '.partial', destination);
  console.log('Verified archive written to ' + destination);
} else if (command === 'restore') {
  if (!argument || !existsSync(argument) || !/^[a-z][a-z0-9_]{0,62}$/.test(targetDatabase || '')) throw new Error('Usage: npm run db:restore -- backup.dump NEW_DATABASE_NAME');
  if (targetDatabase === env.PGDATABASE) throw new Error('Restore requires a NEW database; the active database is never overwritten.');
  run('pg_restore', ['--list', path.resolve(argument)]);
  const client = new pg.Client({ connectionString: url.toString() });
  await client.connect();
  try { await client.query('CREATE DATABASE "' + targetDatabase + '"'); } finally { await client.end(); }
  run('pg_restore', ['--exit-on-error', '--single-transaction', '--no-owner', '--no-acl', '--dbname', targetDatabase, path.resolve(argument)], { PGDATABASE: targetDatabase });
  console.log('Restored to ' + targetDatabase + '. Verify it before updating DATABASE_URL and restarting the app.');
} else {
  throw new Error('Use backup [DIRECTORY] or restore ARCHIVE NEW_DATABASE_NAME');
}
