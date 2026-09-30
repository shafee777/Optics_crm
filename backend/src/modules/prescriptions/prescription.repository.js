import { query } from '../../config/database.js';

export const prescriptionRepository = {
  async create(storeId, customerId, testedByUserId, data) {
    const sql = `
      INSERT INTO prescriptions (
        store_id, customer_id, tested_by_user_id, tested_at,
        r_sph, r_cyl, r_axis, r_add,
        l_sph, l_cyl, l_axis, l_add,
        pd, notes
      )
      VALUES ($1, $2, $3, COALESCE($4, NOW()), $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *;
    `;
    const values = [
      storeId,
      customerId,
      testedByUserId,
      data.testedAt || null,
      data.rSph ?? null,
      data.rCyl ?? null,
      data.rAxis ?? null,
      data.rAdd ?? null,
      data.lSph ?? null,
      data.lCyl ?? null,
      data.lAxis ?? null,
      data.lAdd ?? null,
      data.pd ?? null,
      data.notes?.trim() || null,
    ];
    const res = await query(sql, values);
    return res.rows[0];
  },

  async findByCustomerId(storeId, customerId) {
    const sql = `
      SELECT 
        p.*,
        u.full_name AS tested_by_name
      FROM prescriptions p
      LEFT JOIN users u ON p.tested_by_user_id = u.id
      WHERE p.store_id = $1 AND p.customer_id = $2
      ORDER BY p.tested_at DESC;
    `;
    const res = await query(sql, [storeId, customerId]);
    return res.rows;
  },

  async findById(storeId, customerId, prescriptionId) {
    const sql = `
      SELECT 
        p.*,
        u.full_name AS tested_by_name
      FROM prescriptions p
      LEFT JOIN users u ON p.tested_by_user_id = u.id
      WHERE p.store_id = $1 AND p.customer_id = $2 AND p.id = $3;
    `;
    const res = await query(sql, [storeId, customerId, prescriptionId]);
    return res.rows[0] || null;
  },

  async update(storeId, customerId, prescriptionId, data) {
    const fields = [];
    const values = [storeId, customerId, prescriptionId];
    let idx = 4;

    const map = {
      rSph: 'r_sph',
      rCyl: 'r_cyl',
      rAxis: 'r_axis',
      rAdd: 'r_add',
      lSph: 'l_sph',
      lCyl: 'l_cyl',
      lAxis: 'l_axis',
      lAdd: 'l_add',
      pd: 'pd',
      notes: 'notes',
      testedAt: 'tested_at',
    };

    for (const [key, dbCol] of Object.entries(map)) {
      if (data[key] !== undefined) {
        fields.push(`${dbCol} = $${idx++}`);
        if (key === 'notes') {
          values.push(data[key] ? data[key].trim() : null);
        } else {
          values.push(data[key] ?? null);
        }
      }
    }

    if (fields.length === 0) {
      return this.findById(storeId, customerId, prescriptionId);
    }

    const sql = `
      UPDATE prescriptions
      SET ${fields.join(', ')}
      WHERE store_id = $1 AND customer_id = $2 AND id = $3
      RETURNING *;
    `;
    const res = await query(sql, values);
    return res.rows[0] || null;
  },
};