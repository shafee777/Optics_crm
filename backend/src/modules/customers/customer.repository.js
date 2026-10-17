import { query, withTransaction } from '../../config/database.js';
import { AppError } from '../../shared/errors/AppError.js';

export const customerRepository = {
  async ensureStoreCountersTable(client = null) {
    const run = client ? (sql, params) => client.query(sql, params) : query;
    await run(`
      CREATE TABLE IF NOT EXISTS store_counters (
        store_id UUID PRIMARY KEY REFERENCES stores(id) ON DELETE CASCADE,
        customer_code_seq INT NOT NULL DEFAULT 1000,
        order_number_seq INT NOT NULL DEFAULT 1000,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await run(`
      CREATE INDEX IF NOT EXISTS idx_store_counters_updated_at
      ON store_counters(updated_at);
    `);
  },

  // Concurrency-safe, store-scoped customer code generation.
  async getNextCustomerCode(storeId, client = null) {
    const run = client ? (sql, params) => client.query(sql, params) : query;

    await this.ensureStoreCountersTable(client);

    await run(
      `
        INSERT INTO store_counters (store_id, customer_code_seq, order_number_seq)
        VALUES ($1, 1000, 1000)
        ON CONFLICT (store_id) DO NOTHING;
      `,
      [storeId]
    );

    const res = await run(
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
      WHERE store_id = $1 AND id = $2;
    `;
    const res = await query(sql, [storeId, customerId]);
    return res.rows[0] || null;
  },

  async findActiveById(storeId, customerId) {
    const sql = `
      SELECT * FROM customers 
      WHERE store_id = $1 AND id = $2 AND archived_at IS NULL;
    `;
    const res = await query(sql, [storeId, customerId]);
    return res.rows[0] || null;
  },

  async create(storeId, data) {
    const customerCode = data.customerCode?.trim() || (await this.getNextCustomerCode(storeId));
    const customDate = data.createdAt || data.visitDate || null;

    const sql = `
      INSERT INTO customers (
        store_id, customer_code, full_name, phone, email, gender, age, address, notes, tags, category, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, COALESCE($12::timestamptz, NOW()))
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
      data.tags || [],
      data.category || 'REGULAR',
      customDate ? (customDate.includes('T') ? customDate : `${customDate} 12:00:00+05:30`) : null,
    ];
    const res = await query(sql, values);
    return res.rows[0];
  },

  async update(storeId, customerId, data) {
    const fields = [];
    const values = [storeId, customerId];
    let idx = 3;

    if (data.fullName !== undefined) {
      fields.push(`full_name = $${idx++}`);
      values.push(data.fullName.trim());
    }
    if (data.phone !== undefined) {
      fields.push(`phone = $${idx++}`);
      values.push(data.phone?.trim() || null);
    }
    if (data.email !== undefined) {
      fields.push(`email = $${idx++}`);
      values.push(data.email?.trim() || null);
    }
    if (data.gender !== undefined) {
      fields.push(`gender = $${idx++}`);
      values.push(data.gender || null);
    }
    if (data.age !== undefined) {
      fields.push(`age = $${idx++}`);
      values.push(data.age ?? null);
    }
    if (data.address !== undefined) {
      fields.push(`address = $${idx++}`);
      values.push(data.address?.trim() || null);
    }
    if (data.notes !== undefined) {
      fields.push(`notes = $${idx++}`);
      values.push(data.notes?.trim() || null);
    }
    if (data.customerCode !== undefined) {
      fields.push(`customer_code = $${idx++}`);
      values.push(data.customerCode.trim());
    }
    if (data.tags !== undefined) {
      fields.push(`tags = $${idx++}`);
      values.push(data.tags);
    }
    if (data.category !== undefined) {
      fields.push(`category = $${idx++}`);
      values.push(data.category);
    }
    if (data.createdAt !== undefined || data.visitDate !== undefined) {
      const customDate = data.createdAt || data.visitDate || null;
      if (customDate) {
        fields.push(`created_at = $${idx++}`);
        values.push(customDate.includes('T') ? customDate : `${customDate} 12:00:00+05:30`);
      }
    }

    if (fields.length === 0) {
      return this.findById(storeId, customerId);
    }

    fields.push(`updated_at = NOW()`);

    const sql = `
      UPDATE customers
      SET ${fields.join(', ')}
      WHERE store_id = $1 AND id = $2 AND archived_at IS NULL
      RETURNING *;
    `;
    const res = await query(sql, values);
    return res.rows[0] || null;
  },
  async findDueForAnnualCheckup(storeId) {
    const sql = `
      WITH latest_prescriptions AS (
        SELECT 
          customer_id, 
          MAX(tested_at) AS last_test_date
        FROM prescriptions
        WHERE store_id = $1
        GROUP BY customer_id
      )
      SELECT 
        c.id,
        c.customer_code,
        c.full_name,
        c.phone,
        lp.last_test_date,
        ROUND(EXTRACT(EPOCH FROM (NOW() - lp.last_test_date)) / 86400) AS days_since_test
      FROM customers c
      JOIN latest_prescriptions lp ON c.id = lp.customer_id
      WHERE c.store_id = $1
        AND c.archived_at IS NULL
        AND lp.last_test_date <= NOW() - INTERVAL '330 days'
      ORDER BY lp.last_test_date ASC;
    `;
    const { rows } = await query(sql, [storeId]);
    return rows;
  },

  async list(storeId, {
    search,
    page = 1,
    limit = 10,
    startDate,
    endDate,
    segment = 'ALL',
    tag,
    category,
    hasBalance,
    sortBy = 'created_at',
    sortOrder = 'desc',
  }) {
    const offset = (page - 1) * limit;
    const params = [storeId];
    const filterConditions = [];

    if (search && search.trim() !== '') {
      params.push(`%${search.trim().toLowerCase()}%`);
      const searchParamIdx = params.length;
      filterConditions.push(`(
        LOWER(c.customer_code) LIKE $${searchParamIdx} OR 
        c.phone ILIKE $${searchParamIdx} OR 
        LOWER(c.full_name) LIKE $${searchParamIdx} OR
        LOWER(COALESCE(c.email, '')) LIKE $${searchParamIdx}
      )`);
    }

    if (startDate) {
      params.push(startDate);
      filterConditions.push(`c.created_at >= $${params.length}::timestamptz`);
    }

    if (endDate) {
      params.push(endDate);
      filterConditions.push(`c.created_at <= ($${params.length}::date + INTERVAL '1 day')::timestamptz`);
    }

    if (tag && tag.trim() !== '') {
      params.push(tag.trim());
      filterConditions.push(`$${params.length} = ANY(COALESCE(c.tags, '{}'))`);
    }

    if (category && category.trim() !== '') {
      params.push(category.trim().toLowerCase());
      filterConditions.push(`LOWER(COALESCE(c.category, 'REGULAR')) = $${params.length}`);
    }

    if (hasBalance === 'true') {
      filterConditions.push(`COALESCE(co.balance_due, 0) > 0`);
    } else if (hasBalance === 'false') {
      filterConditions.push(`COALESCE(co.balance_due, 0) <= 0`);
    }

    if (segment && segment !== 'ALL') {
      const seg = segment.toUpperCase();
      if (seg === 'VIP') {
        filterConditions.push(`(c.category = 'VIP' OR COALESCE(co.total_spend, 0) >= 5000)`);
      } else if (seg === 'PENDING_BALANCE') {
        filterConditions.push(`COALESCE(co.balance_due, 0) > 0`);
      } else if (seg === 'DUE_EYE_TEST') {
        filterConditions.push(`cr.last_test_date IS NOT NULL AND cr.last_test_date <= NOW() - INTERVAL '330 days'`);
      } else if (seg === 'NEW_THIS_MONTH') {
        filterConditions.push(`c.created_at >= NOW() - INTERVAL '30 days'`);
      } else if (seg === 'INACTIVE_6M') {
        filterConditions.push(`(co.last_order_date IS NULL OR co.last_order_date <= CURRENT_DATE - INTERVAL '180 days')`);
      } else if (seg === 'REPEAT') {
        filterConditions.push(`COALESCE(co.order_count, 0) >= 2`);
      } else if (seg === 'NO_ORDERS') {
        filterConditions.push(`COALESCE(co.order_count, 0) = 0`);
      }
    }

    const whereExtra = filterConditions.length > 0 ? ` AND ${filterConditions.join(' AND ')}` : '';

    const cte = `
      WITH customer_orders AS (
        SELECT 
          o.customer_id,
          COUNT(o.id) AS order_count,
          COALESCE(SUM(o.total_amount), 0) AS total_spend,
          COALESCE(SUM(o.total_amount - COALESCE(p.paid_sum, 0)), 0) AS balance_due,
          MAX(o.order_date) AS last_order_date
        FROM orders o
        LEFT JOIN (
          SELECT order_id, SUM(amount) AS paid_sum
          FROM payments
          GROUP BY order_id
        ) p ON p.order_id = o.id
        WHERE o.store_id = $1 AND o.status != 'CANCELLED'
        GROUP BY o.customer_id
      ),
      customer_rx AS (
        SELECT 
          customer_id,
          COUNT(id) AS prescription_count,
          MAX(tested_at) AS last_test_date
        FROM prescriptions
        WHERE store_id = $1
        GROUP BY customer_id
      )
    `;

    const countSql = `
      ${cte}
      SELECT COUNT(*) AS total
      FROM customers c
      LEFT JOIN customer_orders co ON co.customer_id = c.id
      LEFT JOIN customer_rx cr ON cr.customer_id = c.id
      WHERE c.store_id = $1 AND c.archived_at IS NULL ${whereExtra};
    `;

    const countRes = await query(countSql, params);
    const total = parseInt(countRes.rows[0]?.total || 0, 10);

    let orderColumn = 'c.created_at';
    if (sortBy === 'total_spend') orderColumn = 'COALESCE(co.total_spend, 0)';
    else if (sortBy === 'balance_due') orderColumn = 'COALESCE(co.balance_due, 0)';
    else if (sortBy === 'last_order_date') orderColumn = 'co.last_order_date';
    else if (sortBy === 'full_name') orderColumn = 'LOWER(c.full_name)';

    const direction = (sortOrder || 'desc').toLowerCase() === 'asc' ? 'ASC' : 'DESC';
    const nullsClause = direction === 'DESC' ? 'NULLS LAST' : 'NULLS FIRST';

    params.push(limit);
    const limitIdx = params.length;
    params.push(offset);
    const offsetIdx = params.length;

    const dataSql = `
      ${cte}
      SELECT 
        c.*,
        COALESCE(co.order_count, 0)::int AS order_count,
        COALESCE(co.total_spend, 0)::numeric(12,2) AS total_spend,
        COALESCE(co.balance_due, 0)::numeric(12,2) AS balance_due,
        co.last_order_date,
        COALESCE(cr.prescription_count, 0)::int AS prescription_count,
        cr.last_test_date
      FROM customers c
      LEFT JOIN customer_orders co ON co.customer_id = c.id
      LEFT JOIN customer_rx cr ON cr.customer_id = c.id
      WHERE c.store_id = $1 AND c.archived_at IS NULL ${whereExtra}
      ORDER BY ${orderColumn} ${direction} ${nullsClause}
      LIMIT $${limitIdx} OFFSET $${offsetIdx};
    `;

    const dataRes = await query(dataSql, params);

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

  async findByIds(storeId, customerIds) {
    if (!customerIds || customerIds.length === 0) return [];
    const sql = `
      SELECT id, customer_code, full_name, phone, email, tags, category
      FROM customers
      WHERE store_id = $1 AND id = ANY($2::uuid[]) AND archived_at IS NULL;
    `;
    const res = await query(sql, [storeId, customerIds]);
    return res.rows;
  },

  async bulkUpdateTags(storeId, customerIds, tagsToAdd = [], tagsToRemove = [], category = null) {
    if (!customerIds || customerIds.length === 0) return 0;
    
    let sql = `
      UPDATE customers
      SET updated_at = NOW()
    `;
    const params = [storeId, customerIds];
    let idx = 3;

    if (category) {
      sql += `, category = $${idx++}`;
      params.push(category);
    }

    if (tagsToAdd && tagsToAdd.length > 0) {
      sql += `, tags = ARRAY(
        SELECT DISTINCT e
        FROM unnest(array_cat(COALESCE(tags, '{}'), $${idx++}::text[])) e
      )`;
      params.push(tagsToAdd);
    }

    if (tagsToRemove && tagsToRemove.length > 0) {
      sql += `, tags = ARRAY(
        SELECT e
        FROM unnest(COALESCE(tags, '{}')) e
        WHERE e != ALL($${idx++}::text[])
      )`;
      params.push(tagsToRemove);
    }

    sql += ` WHERE store_id = $1 AND id = ANY($2::uuid[]) AND archived_at IS NULL RETURNING id;`;
    const res = await query(sql, params);
    return res.rowCount;
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

  // ─── Recycle Bin Methods ────────────────────────────────────────────────────

  /** List all soft-deleted customers for a store, newest archived first. */
  async listBin(storeId) {
    const sql = `
      WITH customer_orders AS (
        SELECT
          o.customer_id,
          COUNT(o.id) AS order_count,
          COALESCE(SUM(o.total_amount), 0) AS total_spend,
          COALESCE(SUM(o.total_amount - COALESCE(p.paid_sum, 0)), 0) AS balance_due
        FROM orders o
        LEFT JOIN (
          SELECT order_id, SUM(amount) AS paid_sum
          FROM payments
          GROUP BY order_id
        ) p ON p.order_id = o.id
        WHERE o.store_id = $1 AND o.status != 'CANCELLED'
        GROUP BY o.customer_id
      ),
      customer_rx AS (
        SELECT customer_id, COUNT(id) AS prescription_count
        FROM prescriptions
        WHERE store_id = $1
        GROUP BY customer_id
      )
      SELECT
        c.id, c.customer_code, c.full_name, c.phone, c.email,
        c.gender, c.age, c.category, c.tags,
        c.created_at, c.archived_at,
        COALESCE(co.order_count, 0)::int            AS order_count,
        COALESCE(co.total_spend, 0)::numeric(12,2)  AS total_spend,
        COALESCE(co.balance_due, 0)::numeric(12,2)  AS balance_due,
        COALESCE(cr.prescription_count, 0)::int     AS prescription_count
      FROM customers c
      LEFT JOIN customer_orders co ON co.customer_id = c.id
      LEFT JOIN customer_rx cr     ON cr.customer_id = c.id
      WHERE c.store_id = $1 AND c.archived_at IS NOT NULL
      ORDER BY c.archived_at DESC;
    `;
    const { rows } = await query(sql, [storeId]);
    return rows;
  },

  /** Find a soft-deleted customer by id (used before restore). */
  async findArchivedById(storeId, customerId) {
    const sql = `
      SELECT * FROM customers
      WHERE store_id = $1 AND id = $2 AND archived_at IS NOT NULL;
    `;
    const res = await query(sql, [storeId, customerId]);
    return res.rows[0] || null;
  },

  /** Restore an archived customer (clear archived_at). */
  async restore(storeId, customerId) {
    const sql = `
      UPDATE customers
      SET archived_at = NULL, updated_at = NOW()
      WHERE store_id = $1 AND id = $2 AND archived_at IS NOT NULL
      RETURNING *;
    `;
    const res = await query(sql, [storeId, customerId]);
    return res.rows[0] || null;
  },

  /** Check whether a customer has any dependent records that prevent hard deletion. */
  async hasDependents(storeId, customerId) {
    const sql = `
      SELECT
        (SELECT COUNT(*) FROM orders       WHERE store_id = $1 AND customer_id = $2) AS order_count,
        (SELECT COUNT(*) FROM prescriptions WHERE store_id = $1 AND customer_id = $2) AS rx_count,
        (SELECT COUNT(*) FROM payments     WHERE order_id IN (
           SELECT id FROM orders WHERE store_id = $1 AND customer_id = $2
        ))                                                                             AS payment_count,
        (SELECT COUNT(*) FROM customer_messages_log WHERE store_id = $1 AND customer_id = $2) AS msg_count;
    `;
    const res = await query(sql, [storeId, customerId]);
    const row = res.rows[0];
    return {
      orders:        parseInt(row.order_count,   10),
      prescriptions: parseInt(row.rx_count,      10),
      payments:      parseInt(row.payment_count, 10),
      messages:      parseInt(row.msg_count,     10),
    };
  },

  /** Permanently delete an archived customer inside a transaction. Verifies no dependents first. */
  async permanentDelete(storeId, customerId) {
    return await withTransaction(async (client) => {
      // 1. Lock customer row to ensure atomicity
      const checkRes = await client.query(
        `SELECT id FROM customers WHERE store_id = $1 AND id = $2 AND archived_at IS NOT NULL FOR UPDATE;`,
        [storeId, customerId]
      );
      if (checkRes.rows.length === 0) return false;

      // 2. Strict concurrency check inside transaction: verify zero orders & zero prescriptions
      const ordersRes = await client.query(
        `SELECT COUNT(*) FROM orders WHERE store_id = $1 AND customer_id = $2;`,
        [storeId, customerId]
      );
      if (parseInt(ordersRes.rows[0].count, 10) > 0) {
        throw new AppError('Cannot permanently delete: customer has linked orders.', 409, 'HAS_DEPENDENTS');
      }

      const rxRes = await client.query(
        `SELECT COUNT(*) FROM prescriptions WHERE store_id = $1 AND customer_id = $2;`,
        [storeId, customerId]
      );
      if (parseInt(rxRes.rows[0].count, 10) > 0) {
        throw new AppError('Cannot permanently delete: customer has linked prescriptions.', 409, 'HAS_DEPENDENTS');
      }

      // 3. Clear non-financial communication logs if any exist
      await client.query(
        `DELETE FROM customer_messages_log WHERE store_id = $1 AND customer_id = $2;`,
        [storeId, customerId]
      );

      // 4. Delete the customer record
      const delRes = await client.query(
        `DELETE FROM customers WHERE store_id = $1 AND id = $2 AND archived_at IS NOT NULL RETURNING id;`,
        [storeId, customerId]
      );

      return delRes.rowCount > 0;
    });
  },
};