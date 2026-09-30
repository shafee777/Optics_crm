const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs/promises');
const { LocalDatabase } = require('../local-database.cjs');
const root = path.resolve(__dirname, '../..');
const dataRoot = path.join(root, 'work', 'desktop-check-' + Date.now());
const config = { password: crypto.randomBytes(32).toString('hex'), database: 'optics_test_desktop' };
const db = new LocalDatabase({ dataRoot, pgRoot: path.join(root,'desktop/vendor/pgsql'), migrations: path.join(root,'backend/database/migrations'), config });
(async () => {
  try {
    await db.start(); console.log('Embedded PostgreSQL initialized and migrations applied.');
    const env = { ...process.env, DATABASE_URL: db.url(), NODE_ENV: 'test', LOG_LEVEL: 'fatal', LOGIN_RATE_LIMIT_MAX: '10000' };
    for (const args of [['database/migrate.js'], ['database/migrate.js'], ['database/seeds/dev_seed.js'], ['--test', ...(await fs.readdir(path.join(root, 'backend/tests'))).filter(f => /\.test\.(mjs|js)$/.test(f)).sort().map(f => 'tests/' + f)]]) {
      const result = spawnSync(process.execPath,args,{cwd:path.join(root,'backend'),env,stdio:'inherit'});
      if(result.status!==0) throw new Error('Desktop database tests failed');
    }
    const backup = await db.backup();
    const restored = await db.restore(backup);
    const tables = await db.client(config.database, async c => (await c.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")).rows.map(row => row.tablename));
    for (const table of tables) {
      const quoted = '"' + table.replaceAll('"', '""') + '"';
      const contents = async database => db.client(database, async c => (await c.query('SELECT row_to_json(t)::text AS row FROM ' + quoted + ' t ORDER BY row_to_json(t)::text')).rows);
      if(JSON.stringify(await contents(config.database))!==JSON.stringify(await contents(restored))) throw new Error('Restored contents mismatch: '+table);
    }
    const result = { passed:true, verifiedAt:new Date().toISOString(), checks:['new PostgreSQL cluster','migrations and two CLI reruns','all backend test files','pg_dump archive','pg_restore into separate database','all public table contents match'],tables, dataRoot };
    await fs.writeFile(path.join(root,'work/desktop-verification.json'),JSON.stringify(result,null,2));
    console.log('BACKUP_RESTORE_OK: source and restored database match.');
  } finally { await db.stop(); }
})().catch(error => {console.error(error.message); if(error.stderr)console.error(error.stderr); process.exitCode=1;});
