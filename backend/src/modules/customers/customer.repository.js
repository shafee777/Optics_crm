import { query } from '../../config/database.js';

export const customerRepository = {
  async ensureStoreCountersTable(db = query) {
    await db.query(`
      CREATE TABLE IF NOT EXISTS store_counters (
        store_id UUID PRIMARY KEY REFERENCES stores(id) ON DELETE CASCADE,
        customer_code_seq INT NOT NULL DEFAULT 1000,
        order_number_seq INT NOT NULL DEFAULT 1000,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_store_counters_updated_at
      ON store_counters(updated_at);
    `);
  },

  // Concurrency-safe, store-scoped customer code generation.
  async getNextCustomerCode(storeId, client = null) {
    const db = client ?? query;

    await this.ensureStoreCountersTable(db);

    await db.query(
      `
        INSERT INTO store_counters (store_id, customer_code_seq, order_number_seq)
        VALUES ($1, 1000, 1000)
        ON CONFLICT (store_id) DO NOTHING;
      `,
      [storeId]
    );

    const res = await db.query(
      `
        UPDATE store_counters
        SET customer_code_seq = GREATEST(
              customer_code_seq,
              COALESCE((SELECT MAX(CAST(regexp_replace(customer_code, '^CUST-','') AS integer))
                        FROM customers WHERE store_id = $1), 1000)
            ) + 1,
            updated_at = NOW()
        WHERE store_id = $1
        RETURNING customer_code_seq;
      `,
      [storeId]
    );

    const nextSeq = Number(res.rows[0]?.customer_code_seq ?? 1001);
    return `CUST-${nextSeq}`;
  },

  async findByCode(storeId, code) {
    const sql = `
      SELECT * FROM customers 
      WHERE store_id = $1 AND UPPER(customer_code) = UPPER($2) AND archived_at IS NULL;
    `;
    const res = await query(sql, [storeId, code.trim()]);
    return res.rows[0] || null;
  },

  // Check if both Customer ID AND Phone match an existing record
  async findByCodeAndPhone(storeId, code, phone) {
    if (!phone) return null;
    const sql = `
      SELECT * FROM customers 
      WHERE store_id = $1 AND UPPER(customer_code) = UPPER($2) AND phone = $3 AND archived_at IS NULL;
    `;
    const res = await query(sql, [storeId, code.trim(), phone.trim()]);
    return res.rows[0] || null;
  },

  // Check if Name and Phone match an existing record (prevents registering same person twice)
  async findByNameAndPhone(storeId, name, phone) {
    if (!phone || !name) return null;
    const sql = `
      SELECT * FROM customers 
      WHERE store_id = $1 AND LOWER(full_name) = LOWER($2) AND phone = $3 AND archived_at IS NULL;
    `;
    const res = await query(sql, [storeId, name.trim(), phone.trim()]);
    return res.rows[0] || null;
  },

  async findById(storeId, customerId) {
    const sql = `
      SELECT * FROM customers 
      WHERE store_id = $1 AND id = $2 AND archived_at IS NULL;
    `;
    const res = await query(sql, [storeId, customerId]);
    return res.rows[0] || null;
  },

  async create(storeId, data) {
    const customerCode = data.customerCode?.trim() || (await this.getNextCustomerCode(storeId));

    const sql = `
      INSERT INTO customers (
        store_id, customer_code, full_name, phone, email, gender, age, address, notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *;
    `;
    const values = [
      storeId,
      customerCode,
      data.fullName.trim(),
      data.phone?.trim() || null,
      data.email?.trim() || null,
      data.gender || null,
      data.age || null,
      data.address?.trim() || null,
      data.notes?.trim() || null,
    ];
    const res = await query(sql, values);
    return res.rows[0];
  },

  async update(storeId, customerId, data) {
    const sql = `
      UPDATE customers
      SET 
        full_name = COALESCE($3, full_name),
        phone = COALESCE($4, phone),
        email = COALESCE($5, email),
        gender = COALESCE($6, gender),
        age = COALESCE($7, age),
        address = COALESCE($8, address),
        notes = COALESCE($9, notes),
        updated_at = NOW()
      WHERE store_id = $1 AND id = $2 AND archived_at IS NULL
      RETURNING *;
    `;
    const values = [
      storeId,
      customerId,
      data.fullName,
      data.phone,
      data.email !== undefined ? data.email || null : null,
      data.gender !== undefined ? data.gender || null : null,
      data.age !== undefined ? data.age : null,
      data.address !== undefined ? data.address || null : null,
      data.notes !== undefined ? data.notes || null : null,
    ];
    const res = await query(sql, values);
    return res.rows[0] || null;
  },

  async list(storeId, { search, page = 1, limit = 10 }) {
    const offset = (page - 1) * limit;
    let whereClause = 'WHERE store_id = $1 AND archived_at IS NULL';
    const params = [storeId];

    if (search && search.trim() !== '') {
      params.push(`%${search.trim().toLowerCase()}%`);
      whereClause += ` AND (
        LOWER(customer_code) LIKE $2 OR 
        phone ILIKE $2 OR 
        LOWER(full_name) LIKE $2
      )`;
    }

    const countSql = `SELECT COUNT(*) FROM customers ${whereClause};`;
    const countRes = await query(countSql, params);
    const total = parseInt(countRes.rows[0].count, 10);

    const dataSql = `
      SELECT 
        c.*,
        (SELECT COUNT(*) FROM prescriptions p WHERE p.customer_id = c.id) AS prescription_count,
        (SELECT COUNT(*) FROM orders o WHERE o.customer_id = c.id) AS order_count
      FROM customers c
      ${whereClause}
      ORDER BY c.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2};
    `;
    const dataParams = [...params, limit, offset];
    const dataRes = await query(dataSql, dataParams);

    return {
      customers: dataRes.rows,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  },

  async softDelete(storeId, customerId) {
    const sql = `
      UPDATE customers 
      SET archived_at = NOW() 
      WHERE store_id = $1 AND id = $2 AND archived_at IS NULL
      RETURNING id;
    `;
    const res = await query(sql, [storeId, customerId]);
    return res.rowCount > 0;
  },
};