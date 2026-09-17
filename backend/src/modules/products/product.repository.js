import { pool } from '../../config/database.js';

export const productRepository = {
  async create({ storeId, itemType, brand, modelCode, name, description, costPrice, sellingPrice, stockQuantity, minStockAlert }) {
    const query = `
      INSERT INTO products (
        store_id, item_type, brand, model_code, name, description, cost_price, selling_price, stock_quantity, min_stock_alert
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *;
    `;
    const values = [storeId, itemType, brand || null, modelCode || null, name, description || null, costPrice || 0, sellingPrice || 0, stockQuantity || 0, minStockAlert || 3];
    const { rows } = await pool.query(query, values);
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

    const query = `
      SELECT * FROM products
      WHERE ${whereClause}
      ORDER BY updated_at DESC
      LIMIT $${counter} OFFSET $${counter + 1};
    `;
    values.push(limit, offset);

    const { rows } = await pool.query(query, values);
    return rows;
  },

  async findById(storeId, id) {
    const query = `SELECT * FROM products WHERE store_id = $1 AND id = $2 AND archived_at IS NULL;`;
    const { rows } = await pool.query(query, [storeId, id]);
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

    const query = `
      UPDATE products
      SET ${fields.join(', ')}
      WHERE store_id = $1 AND id = $2 AND archived_at IS NULL
      RETURNING *;
    `;
    const { rows } = await pool.query(query, values);
    return rows[0];
  },

  async adjustStock(storeId, id, adjustment) {
    const query = `
      UPDATE products
      SET stock_quantity = GREATEST(0, stock_quantity + $3),
          updated_at = NOW()
      WHERE store_id = $1 AND id = $2 AND archived_at IS NULL
      RETURNING *;
    `;
    const { rows } = await pool.query(query, [storeId, id, adjustment]);
    return rows[0];
  },

  async archive(storeId, id) {
    const query = `
      UPDATE products
      SET archived_at = NOW()
      WHERE store_id = $1 AND id = $2
      RETURNING id;
    `;
    const { rows } = await pool.query(query, [storeId, id]);
    return rows[0];
  },
};