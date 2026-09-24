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
    for (const args of [['database/seeds/dev_seed.js'], ['--test','tests/api.test.js','tests/billing.test.mjs','tests/reliability.test.js','tests/whatsapp.test.mjs']]) {
      const result = spawnSync(process.execPath,args,{cwd:path.join(root,'backend'),env,stdio:'inherit'});
      if(result.status!==0) throw new Error('Desktop database tests failed');
    }
    const backup = await db.backup();
    const restored = await db.restore(backup);
    for (const table of ['users','customers','orders','order_items','payments','products','inventory_movements','schema_migrations']) {
      const count = async database => db.client(database, async c => (await c.query('SELECT count(*) FROM '+table)).rows[0].count);
      if(await count(config.database)!==await count(restored)) throw new Error('Restored row count mismatch: '+table);
    }
    const result = { passed:true, checks:['new PostgreSQL cluster','migrations','35 backend and WhatsApp tests','pg_dump archive','pg_restore into separate database','8 table row counts match'],postgres:'16.15',dataRoot };
    await fs.writeFile(path.join(root,'work/desktop-verification.json'),JSON.stringify(result,null,2));
    console.log('BACKUP_RESTORE_OK: source and restored database match.');
  } finally { await db.stop(); }
})().catch(error => {console.error(error.message); if(error.stderr)console.error(error.stderr); process.exitCode=1;});
