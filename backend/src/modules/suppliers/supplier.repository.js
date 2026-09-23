import { pool } from '../../config/database.js';

export const supplierRepository = {
  async create(storeId, data) {
    const query = `
      INSERT INTO suppliers (
        store_id, name, contact_person, phone, email, gstin, address, category
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *;
    `;
    const values = [
      storeId,
      data.name,
      data.contactPerson || null,
      data.phone || null,
      data.email || null,
      data.gstin ? data.gstin.toUpperCase() : null,
      data.address || null,
      data.category || 'FRAME_VENDOR',
    ];
    const { rows } = await pool.query(query, values);
    return rows[0];
  },

  async findAll(storeId, { category, search, limit = 100, offset = 0 } = {}) {
    let whereClause = 's.store_id = $1 AND s.archived_at IS NULL';
    const values = [storeId];
    let counter = 2;

    if (category && category !== 'ALL') {
      whereClause += ` AND s.category = $${counter}`;
      values.push(category);
      counter++;
    }

    if (search) {
      whereClause += ` AND (s.name ILIKE $${counter} OR s.contact_person ILIKE $${counter} OR s.phone ILIKE $${counter} OR s.gstin ILIKE $${counter})`;
      values.push(`%${search}%`);
      counter++;
    }

    const query = `
      SELECT 
        s.*,
        COALESCE(SUM(po.total_amount), 0.00)::numeric(10,2) AS total_purchased,
        COALESCE(SUM(po.paid_amount), 0.00)::numeric(10,2) AS total_paid,
        COALESCE(SUM(po.total_amount - po.paid_amount), 0.00)::numeric(10,2) AS balance_due,
        COUNT(po.id)::int AS po_count
      FROM suppliers s
      LEFT JOIN purchase_orders po ON po.supplier_id = s.id AND po.status != 'CANCELLED'
      WHERE ${whereClause}
      GROUP BY s.id
      ORDER BY s.updated_at DESC
      LIMIT $${counter} OFFSET $${counter + 1};
    `;
    values.push(limit, offset);

    const { rows } = await pool.query(query, values);
    return rows;
  },

  async findById(storeId, id) {
    const query = `
      SELECT 
        s.*,
        COALESCE(SUM(po.total_amount), 0.00)::numeric(10,2) AS total_purchased,
        COALESCE(SUM(po.paid_amount), 0.00)::numeric(10,2) AS total_paid,
        COALESCE(SUM(po.total_amount - po.paid_amount), 0.00)::numeric(10,2) AS balance_due,
        COUNT(po.id)::int AS po_count
      FROM suppliers s
      LEFT JOIN purchase_orders po ON po.supplier_id = s.id AND po.status != 'CANCELLED'
      WHERE s.store_id = $1 AND s.id = $2 AND s.archived_at IS NULL
      GROUP BY s.id;
    `;
    const { rows } = await pool.query(query, [storeId, id]);
    return rows[0] || null;
  },

  async update(storeId, id, data) {
    const fields = [];
    const values = [storeId, id];
    let counter = 3;

    const map = {
      name: 'name',
      contactPerson: 'contact_person',
      phone: 'phone',
      email: 'email',
      gstin: 'gstin',
      address: 'address',
      category: 'category',
    };

    for (const [key, col] of Object.entries(map)) {
      if (data[key] !== undefined) {
        fields.push(`${col} = $${counter}`);
        values.push(key === 'gstin' && data[key] ? data[key].toUpperCase() : data[key]);
        counter++;
      }
    }

    if (fields.length === 0) return this.findById(storeId, id);

    fields.push(`updated_at = NOW()`);

    const query = `
      UPDATE suppliers
      SET ${fields.join(', ')}
      WHERE store_id = $1 AND id = $2 AND archived_at IS NULL
      RETURNING *;
    `;
    const { rows } = await pool.query(query, values);
    return rows[0] || null;
  },

  async archive(storeId, id) {
    const query = `
      UPDATE suppliers
      SET archived_at = NOW(), updated_at = NOW()
      WHERE store_id = $1 AND id = $2 AND archived_at IS NULL
      RETURNING *;
    `;
    const { rows } = await pool.query(query, [storeId, id]);
    return rows[0] || null;
  },

  async getSupplierDuesSummary(storeId) {
    const query = `
      SELECT 
        COALESCE(SUM(total_amount - paid_amount), 0.00)::numeric(10,2) AS total_outstanding_payables,
        COUNT(DISTINCT supplier_id)::int AS suppliers_with_dues_count,
        COUNT(id)::int AS unpaid_po_count
      FROM purchase_orders
      WHERE store_id = $1 AND status != 'CANCELLED' AND (total_amount - paid_amount) > 0;
    `;
    const { rows } = await pool.query(query, [storeId]);
    return rows[0];
  },
};