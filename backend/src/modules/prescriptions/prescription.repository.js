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
    const sql = `
      UPDATE prescriptions
      SET 
        r_sph = $4,
        r_cyl = $5,
        r_axis = $6,
        r_add = $7,
        l_sph = $8,
        l_cyl = $9,
        l_axis = $10,
        l_add = $11,
        pd = $12,
        notes = $13,
        tested_at = COALESCE($14, tested_at)
      WHERE store_id = $1 AND customer_id = $2 AND id = $3
      RETURNING *;
    `;
    const values = [
      storeId,
      customerId,
      prescriptionId,
      data.rSph !== undefined ? data.rSph : null,
      data.rCyl !== undefined ? data.rCyl : null,
      data.rAxis !== undefined ? data.rAxis : null,
      data.rAdd !== undefined ? data.rAdd : null,
      data.lSph !== undefined ? data.lSph : null,
      data.lCyl !== undefined ? data.lCyl : null,
      data.lAxis !== undefined ? data.lAxis : null,
      data.lAdd !== undefined ? data.lAdd : null,
      data.pd !== undefined ? data.pd : null,
      data.notes !== undefined ? (data.notes?.trim() || null) : null,
      data.testedAt || null,
    ];
    const res = await query(sql, values);
    return res.rows[0] || null;
  },
};