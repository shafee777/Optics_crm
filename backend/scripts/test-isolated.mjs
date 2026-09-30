import dotenv from 'dotenv';
import { readdirSync } from 'node:fs';
import pg from 'pg';
import { spawnSync } from 'node:child_process';
dotenv.config();
const url=new URL(process.env.DATABASE_URL);
if(!['localhost','127.0.0.1','[::1]'].includes(url.hostname)) throw new Error('Local database required');
const db=process.argv[2] || 'optics_test_'+Date.now();
if (!/^optics_test_[0-9]+$/.test(db)) throw new Error('Invalid test database name');
const admin=new pg.Client({connectionString:url.toString()});
await admin.connect();
try { if (!process.argv[2]) await admin.query('CREATE DATABASE "'+db+'"'); } finally { await admin.end(); }
url.pathname='/'+db;
const env={...process.env,DATABASE_URL:url.toString(),NODE_ENV:'test',LOG_LEVEL:'fatal',LOGIN_RATE_LIMIT_MAX:'10000'};
for(const args of [['database/migrate.js'],['database/seeds/dev_seed.js'],['--test', ...readdirSync('tests').filter(f => /\.test\.(mjs|js)$/.test(f)).sort().map(f => 'tests/' + f)]]) {
  const result=spawnSync(process.execPath,args,{env,stdio:'inherit'});
  if(result.status!==0){console.error('Failed stage:',args[0],'; retained database:',db);process.exit(result.status||1);}
}
console.log('Passed. Isolated test database retained for inspection: '+db);
