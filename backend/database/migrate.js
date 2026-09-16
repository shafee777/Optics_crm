import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../src/config/database.js';
import { logger } from '../src/config/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrations() {
  const client = await pool.connect();
  try {
    logger.info(' Checking database migrations...');

    // Create schema_migrations tracking table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // Fetch already applied migrations
    const { rows: appliedRows } = await client.query(
      'SELECT name FROM schema_migrations ORDER BY id ASC;'
    );
    const appliedSet = new Set(appliedRows.map((r) => r.name));

    // Read all .sql files in migrations directory
    const migrationsDir = path.join(__dirname, 'migrations');
    const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();

    for (const file of files) {
      if (appliedSet.has(file)) {
        logger.debug(` Migration ${file} already applied.`);
        continue;
      }

      logger.info(`Applying migration: ${file}...`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');

      // Execute migration in an atomic transaction
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (name) VALUES ($1);', [file]);
      await client.query('COMMIT');

      logger.info(` Successfully applied migration: ${file}`);
    }

    logger.info(' All database migrations are up to date!');
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error({ error }, ' Migration failed.');
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations();