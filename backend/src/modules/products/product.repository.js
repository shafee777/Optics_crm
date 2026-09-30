import { AppError } from '../../shared/errors/AppError.js';
import { query } from '../../config/database.js';

export const productRepository = {
  async create({ storeId, itemType, brand, modelCode, name, description, costPrice, sellingPrice, stockQuantity, minStockAlert, hsnCode, gstRate }) {
    const sql = `
      INSERT INTO products (
        store_id, item_type, brand, model_code, name, description, cost_price, selling_price, stock_quantity, min_stock_alert, hsn_code, gst_rate
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *;
    `;
    const values = [storeId, itemType, brand || null, modelCode || null, name, description || null, costPrice || 0, sellingPrice || 0, stockQuantity || 0, minStockAlert || 3, hsnCode || null, gstRate ?? 12.00];
    const { rows } = await query(sql, values);
    return rows[0];
  },

  async findAll({ storeId, itemType, search, lowStockOnly, limit = 100, offset = 0 }) {
    let whereClause = 'store_id = $1 AND archived_at IS NULL';
    const values = [storeId];
    let counter = 2;

    if (itemType) {
      whereClause += ` AND item_type = $${counter}`;
      values.push(itemType);
      counter++;
    }

    if (search) {
      whereClause += ` AND (name ILIKE $${counter} OR brand ILIKE $${counter} OR model_code ILIKE $${counter})`;
      values.push(`%${search}%`);
      counter++;
    }

    if (lowStockOnly) {
      whereClause += ` AND stock_quantity <= min_stock_alert`;
    }

    const sql = `
      SELECT * FROM products
      WHERE ${whereClause}
      ORDER BY updated_at DESC
      LIMIT $${counter} OFFSET $${counter + 1};
    `;
    values.push(limit, offset);

    const { rows } = await query(sql, values);
    return rows;
  },

  async findById(storeId, id) {
    const sql = `SELECT * FROM products WHERE store_id = $1 AND id = $2 AND archived_at IS NULL;`;
    const { rows } = await query(sql, [storeId, id]);
    return rows[0] || null;
  },

  async update(storeId, id, data) {
    const fields = [];
    const values = [storeId, id];
    let counter = 3;

    const map = {
      itemType: 'item_type',
      brand: 'brand',
      modelCode: 'model_code',
      name: 'name',
      description: 'description',
      costPrice: 'cost_price',
      sellingPrice: 'selling_price',
      stockQuantity: 'stock_quantity',
      minStockAlert: 'min_stock_alert',
      hsnCode: 'hsn_code',
      gstRate: 'gst_rate',
    };

    for (const [key, dbCol] of Object.entries(map)) {
      if (data[key] !== undefined) {
        fields.push(`${dbCol} = $${counter}`);
        values.push(data[key]);
        counter++;
      }
    }

    if (fields.length === 0) return this.findById(storeId, id);

    fields.push(`updated_at = NOW()`);

    const sql = `
      UPDATE products
      SET ${fields.join(', ')}
      WHERE store_id = $1 AND id = $2 AND archived_at IS NULL
      RETURNING *;
    `;
    const { rows } = await query(sql, values);
    return rows[0];
  },

  async adjustStock(storeId, id, adjustment, reason = null) {
    if (reason) {
      await query("SELECT set_config('app.stock_reason', $1, true)", [reason]);
    }
    const sql = `
      UPDATE products
      SET stock_quantity = stock_quantity + $3,
          updated_at = NOW()
      WHERE store_id = $1 AND id = $2 AND archived_at IS NULL AND stock_quantity + $3 >= 0
      RETURNING *;
    `;
    const { rows } = await query(sql, [storeId, id, adjustment]);
    if (!rows.length) throw new AppError('Insufficient stock or product unavailable', 409, 'INSUFFICIENT_STOCK');
    return rows[0];
  },

  async archive(storeId, id) {
    const sql = `
      UPDATE products
      SET archived_at = NOW(),
          updated_at = NOW()
      WHERE store_id = $1 AND id = $2 AND archived_at IS NULL
      RETURNING id, name, archived_at;
    `;
    const { rows } = await query(sql, [storeId, id]);
    return rows[0] || null;
  },
};