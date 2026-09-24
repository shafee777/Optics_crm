const fs = require('node:fs/promises');
const path = require('node:path');
const net = require('node:net');
const { spawn, execFile } = require('node:child_process');
const { promisify } = require('node:util');
const { Client } = require('pg');
const exec = promisify(execFile);
const exists = async p => fs.access(p).then(() => true, () => false);
async function freePort(preferred = 0) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(preferred, '127.0.0.1', () => { const port = server.address().port; server.close(() => resolve(port)); });
  });
}
class LocalDatabase {
  constructor({ dataRoot, pgRoot, migrations, config }) {
    Object.assign(this, { dataRoot, pgRoot, migrations, config });
    this.cluster = path.join(dataRoot, 'postgres');
    this.backups = path.join(dataRoot, 'backups');
    this.started = false;
  }
  connection(database = this.config.database) {
    return { host: '127.0.0.1', port: this.port, user: 'optics_admin', password: this.config.password, database, connectionTimeoutMillis: 10000 };
  }
  url(database = this.config.database) {
    return 'postgresql://optics_admin:' + encodeURIComponent(this.config.password) + '@127.0.0.1:' + this.port + '/' + database;
  }
  async tool(name, args, database = this.config.database) {
    return exec(path.join(this.pgRoot, 'bin', name + '.exe'), args, { windowsHide: true, timeout: 180000, maxBuffer: 8 * 1024 * 1024,
      env: { ...process.env, PGHOST: '127.0.0.1', PGPORT: String(this.port || 5432), PGUSER: 'optics_admin', PGPASSWORD: this.config.password, PGDATABASE: database } });
  }
  async client(database, operation) {
    const client = new Client(this.connection(database));
    await client.connect();
    try { return await operation(client); } finally { await client.end(); }
  }
  async start() {
    await fs.mkdir(this.dataRoot, { recursive: true });
    await fs.mkdir(this.backups, { recursive: true });
    if (!await exists(path.join(this.cluster, 'PG_VERSION'))) {
      const passwordFile = path.join(this.dataRoot, 'init-password.tmp');
      await fs.writeFile(passwordFile, this.config.password, { mode: 0o600 });
      try { await this.tool('initdb', ['-D', this.cluster, '-U', 'optics_admin', '--pwfile=' + passwordFile, '--auth-host=scram-sha-256', '--auth-local=scram-sha-256', '--encoding=UTF8', '--locale=C']); }
      finally { await fs.unlink(passwordFile).catch(() => {}); }
    }
    const major = (await fs.readFile(path.join(this.cluster, 'PG_VERSION'), 'utf8')).trim();
    if (major !== '16') throw new Error('This installation requires a PostgreSQL 16 data folder. Restore a backup into a fresh folder to upgrade.');
    // Reconnect only to this exact cluster after an interrupted app shutdown.
    let alreadyRunning = false;
    try { await this.tool('pg_ctl', ['-D', this.cluster, 'status']); alreadyRunning = true; } catch {}
    if (alreadyRunning) {
      const pidFile = await fs.readFile(path.join(this.cluster, 'postmaster.pid'), 'utf8');
      this.port = Number(pidFile.split(/\r?\n/)[3]);
      await this.client('postgres', async client => {
        const result = await client.query('SHOW data_directory');
        if (path.resolve(result.rows[0].data_directory).toLowerCase() !== path.resolve(this.cluster).toLowerCase()) throw new Error('Database directory mismatch');
      });
      this.started = true;
    } else {
    this.port = await freePort();
    const logFile = await fs.open(path.join(this.dataRoot, 'postgres.log'), 'a');
    this.postgres = spawn(path.join(this.pgRoot, 'bin', 'postgres.exe'), ['-D', this.cluster, '-h', '127.0.0.1', '-p', String(this.port)], { windowsHide: true, stdio: ['ignore', logFile.fd, logFile.fd] });
    let startupError;
    this.postgres.once('error', error => { startupError = error; });
    this.postgres.once('exit', code => { startupError = new Error('PostgreSQL exited with code ' + code + '. See postgres.log.'); });
    await logFile.close();
    for (let attempt = 0; attempt < 100; attempt++) {
      if (startupError) throw startupError;
      try { await this.client('postgres', c => c.query('SELECT 1')); this.started = true; break; } catch {}
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    if (!this.started) throw new Error('PostgreSQL did not become ready. See postgres.log.');
    }
    await this.client('postgres', async client => {
      const result = await client.query('SELECT 1 FROM pg_database WHERE datname=$1', [this.config.database]);
      if (!result.rowCount) await client.query('CREATE DATABASE "' + this.checkedName(this.config.database) + '"');
    });
    const pending = await this.pending();
    if (await this.hasOwner() && (pending.length || !await this.hasBackupToday())) await this.backup();
    await this.migrate();
  }
  checkedName(name) {
    if (!/^[a-z][a-z0-9_]{0,62}$/.test(name)) throw new Error('Invalid database name');
    return name;
  }
  async pending(database = this.config.database) {
    const files = (await fs.readdir(this.migrations)).filter(f => f.endsWith('.sql')).sort();
    return this.client(database, async client => {
      const table = await client.query("SELECT to_regclass('public.schema_migrations') AS name");
      const applied = table.rows[0].name ? (await client.query('SELECT name FROM schema_migrations')).rows.map(row => row.name) : [];
      if (applied.some(name => !files.includes(name))) throw new Error('This database needs a newer app version. Install the matching version before opening it.');
      return files.filter(name => !applied.includes(name));
    });
  }
  async migrate(database = this.config.database) {
    const files = await this.pending(database);
    await this.client(database, async client => {
      await client.query('SELECT pg_advisory_lock(904125)');
      try {
        await client.query('CREATE TABLE IF NOT EXISTS schema_migrations(id SERIAL PRIMARY KEY, name VARCHAR(255) NOT NULL UNIQUE, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())');
        for (const name of files) {
          await client.query('BEGIN');
          try {
            await client.query(await fs.readFile(path.join(this.migrations, name), 'utf8'));
            await client.query('INSERT INTO schema_migrations(name) VALUES($1)', [name]);
            await client.query('COMMIT');
          } catch (error) { await client.query('ROLLBACK'); throw error; }
        }
      } finally { await client.query('SELECT pg_advisory_unlock(904125)'); }
    });
  }
  async hasOwner(database = this.config.database) {
    return this.client(database, async client => {
      const table = await client.query("SELECT to_regclass('public.users') AS name");
      return Boolean(table.rows[0].name && (await client.query("SELECT 1 FROM users WHERE role='OWNER' AND active=true LIMIT 1")).rowCount);
    });
  }
  async hasBackupToday() {
    return (await fs.readdir(this.backups)).some(name => name.startsWith('optics-' + new Date().toISOString().slice(0, 10)) && name.endsWith('.dump'));
  }
  async backup(destination) {
    const file = destination || path.join(this.backups, 'optics-' + new Date().toISOString().replace(/[:.]/g, '-') + '.dump');
    if (await exists(file) || await exists(file + '.partial')) throw new Error('Choose a new backup filename to avoid overwriting an existing backup.');
    await this.tool('pg_dump', ['--format=custom', '--no-password', '--file', file + '.partial']);
    await this.tool('pg_restore', ['--list', file + '.partial']);
    await fs.rename(file + '.partial', file);
    return file;
  }
  async restore(file) {
    await this.tool('pg_restore', ['--list', file]);
    const database = 'optics_restored_' + Date.now();
    await this.client('postgres', client => client.query('CREATE DATABASE "' + database + '"'));
    await this.tool('pg_restore', ['--exit-on-error', '--single-transaction', '--no-owner', '--no-acl', '--dbname', database, file], database);
    if (!await this.hasOwner(database)) throw new Error('Backup does not contain an active shop owner. The current database has not changed.');
    await this.migrate(database);
    await this.client(database, async client => {
      await client.query('SELECT discount_allocated FROM orders LIMIT 0');
      await client.query('SELECT id FROM inventory_movements LIMIT 0');
    });
    return database;
  }
  async stop() {
    if (this.started) { await this.tool('pg_ctl', ['-D', this.cluster, '-m', 'fast', '-w', '-t', '60', 'stop']); this.started = false; }
    else if (this.postgres && this.postgres.exitCode === null) this.postgres.kill();
  }
}
module.exports = { LocalDatabase, freePort };
