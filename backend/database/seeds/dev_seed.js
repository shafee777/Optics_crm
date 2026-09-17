import bcrypt from 'bcrypt';
import { pool } from '../../src/config/database.js';
import { logger } from '../../src/config/logger.js';

async function seed() {
  const client = await pool.connect();
  try {
    logger.info(' Starting database seed for development...');
    await client.query('BEGIN');

    // Default password for all dev accounts: Password123!
    const defaultPasswordHash = await bcrypt.hash('Password123!', 10);

    // 1. Create Store A (Vision Care Opticals)
    const storeAResult = await client.query(`
      INSERT INTO stores (name, phone, currency, timezone)
      VALUES ('Vision Care Opticals', '+91 98765 00001', 'INR', 'Asia/Kolkata')
      ON CONFLICT DO NOTHING
      RETURNING id;
    `);

    let storeAId;
    if (storeAResult.rows.length > 0) {
      storeAId = storeAResult.rows[0].id;
    } else {
      const existing = await client.query("SELECT id FROM stores WHERE name = 'Vision Care Opticals';");
      storeAId = existing.rows[0].id;
    }

    // 2. Users for Store A (Owner & Staff)
    await client.query(`
      INSERT INTO users (store_id, email, password_hash, full_name, role)
      VALUES 
        ('${storeAId}', 'owner@visioncare.com', '${defaultPasswordHash}', 'Rajesh Sharma (Owner)', 'OWNER'),
        ('${storeAId}', 'staff@visioncare.com', '${defaultPasswordHash}', 'Anjali Gupta (Optometrist)', 'STAFF')
      ON CONFLICT (email) DO NOTHING;
    `);

    // 3. Create Store B (City Eye Optics - for multi-tenant isolation testing)
    const storeBResult = await client.query(`
      INSERT INTO stores (name, phone, currency, timezone)
      VALUES ('City Eye Optics', '+91 98765 00002', 'INR', 'Asia/Kolkata')
      ON CONFLICT DO NOTHING
      RETURNING id;
    `);

    let storeBId;
    if (storeBResult.rows.length > 0) {
      storeBId = storeBResult.rows[0].id;
    } else {
      const existing = await client.query("SELECT id FROM stores WHERE name = 'City Eye Optics';");
      storeBId = existing.rows[0].id;
    }

    // 4. User for Store B
    await client.query(`
      INSERT INTO users (store_id, email, password_hash, full_name, role)
      VALUES ('${storeBId}', 'owner@cityeye.com', '${defaultPasswordHash}', 'Suresh Verma (Owner)', 'OWNER')
      ON CONFLICT (email) DO NOTHING;
    `);

    // 5. Sample Customer for Store A (Ravi Kumar)
    const custAResult = await client.query(`
      INSERT INTO customers (store_id, full_name, phone, email, gender, age, address)
      SELECT '${storeAId}', 'Ravi Kumar', '9876543210', 'ravi@example.com', 'Male', 38, 'Flat 201, Green Park, Delhi'
      WHERE NOT EXISTS (
        SELECT 1 FROM customers WHERE store_id = '${storeAId}' AND phone = '9876543210'
      )
      RETURNING id;
    `);
    let customerAId;
    if (custAResult.rows.length > 0) {
      customerAId = custAResult.rows[0].id;
    } else {
      const existingCustomer = await client.query(
        `SELECT id FROM customers WHERE store_id = '${storeAId}' AND phone = '9876543210' ORDER BY created_at ASC LIMIT 1;`
      );
      customerAId = existingCustomer.rows[0].id;
    }

    // 6. Customer in Store B with the SAME phone (Proves tenant isolation!)
    await client.query(`
      INSERT INTO customers (store_id, full_name, phone, email, gender, age, address)
      SELECT '${storeBId}', 'Ravi Kumar (City Eye Branch)', '9876543210', 'ravi.cityeye@example.com', 'Male', 38, 'MG Road'
      WHERE NOT EXISTS (
        SELECT 1 FROM customers WHERE store_id = '${storeBId}' AND phone = '9876543210'
      );
    `);

    // 7. Initial Historical Prescription for Ravi at Vision Care
    await client.query(`
      INSERT INTO prescriptions (
        store_id, customer_id, r_sph, r_cyl, r_axis, r_add, l_sph, l_cyl, l_axis, l_add, pd, notes
      )
      SELECT
        '${storeAId}', '${customerAId}',
        -1.50, -0.50, 90, 1.25,
        -1.75, -0.25, 85, 1.25,
        63.0, 'Mild eye strain during screen use'
      WHERE NOT EXISTS (
        SELECT 1
        FROM prescriptions
        WHERE store_id = '${storeAId}'
          AND customer_id = '${customerAId}'
          AND notes = 'Mild eye strain during screen use'
      );
    `);

    await client.query('COMMIT');
    logger.info('🎉 Seed completed successfully!');
    logger.info('');
    logger.info('🔑 DEMO LOGIN CREDENTIALS CREATED:');
    logger.info('----------------------------------------------------');
    logger.info('STORE A (Vision Care Opticals):');
    logger.info('  Owner: owner@visioncare.com | Password123!');
    logger.info('  Staff: staff@visioncare.com | Password123!');
    logger.info('STORE B (City Eye Optics):');
    logger.info('  Owner: owner@cityeye.com    | Password123!');
    logger.info('----------------------------------------------------');
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error({ error }, ' Seeding failed.');
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();