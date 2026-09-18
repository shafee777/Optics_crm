import { query } from '../../config/database.js';

export const exportRepository = {
  async exportCustomers(storeId) {
    const sql = `
      SELECT 
        c.customer_code AS "Customer ID",
        c.full_name AS "Full Name",
        c.phone AS "Phone Number",
        c.email AS "Email Address",
        c.gender AS "Gender",
        c.age AS "Age",
        c.address AS "Address",
        c.notes AS "Notes",
        (SELECT COUNT(*) FROM prescriptions p WHERE p.customer_id = c.id) AS "Prescriptions Count",
        (SELECT COUNT(*) FROM orders o WHERE o.customer_id = c.id) AS "Orders Count",
        c.created_at AS "Registered Date"
      FROM customers c
      WHERE c.store_id = $1 AND c.archived_at IS NULL
      ORDER BY c.created_at DESC;
    `;
    const res = await query(sql, [storeId]);
    return res.rows;
  },

  async exportOrders(storeId) {
    const sql = `
      SELECT 
        o.order_number AS "Order Number",
        c.customer_code AS "Customer Code",
        c.full_name AS "Customer Name",
        c.phone AS "Customer Phone",
        o.status AS "Order Status",
        o.total_amount AS "Total Amount",
        COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.order_id = o.id), 0.00) AS "Total Paid",
        o.total_amount - COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.order_id = o.id), 0.00) AS "Balance Due",
        o.due_date AS "Expected Delivery Date",
        o.notes AS "Order Notes",
        o.created_at AS "Order Created Date"
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
      WHERE o.store_id = $1
      ORDER BY o.created_at DESC;
    `;
    const res = await query(sql, [storeId]);
    return res.rows;
  },

  async exportProducts(storeId) {
    const sql = `
      SELECT 
        p.model_code AS "Model / Code",
        p.name AS "Product Name",
        p.item_type AS "Item Category",
        p.brand AS "Brand",
        p.selling_price AS "Selling Price",
        p.cost_price AS "Cost Price",
        p.stock_quantity AS "Current Stock Quantity",
        p.min_stock_alert AS "Low Stock Threshold",
        p.created_at AS "Added Date"
      FROM products p
      WHERE p.store_id = $1 AND p.archived_at IS NULL
      ORDER BY p.name ASC;
    `;
    const res = await query(sql, [storeId]);
    return res.rows;
  },

  async exportExpenses(storeId) {
    const sql = `
      SELECT 
        e.category AS "Expense Category",
        e.amount AS "Amount",
        e.payment_method AS "Payment Method",
        e.note AS "Notes",
        e.incurred_at AS "Incurred Date",
        e.created_at AS "Recorded Timestamp"
      FROM expenses e
      WHERE e.store_id = $1
      ORDER BY e.incurred_at DESC;
    `;
    const res = await query(sql, [storeId]);
    return res.rows;
  },
};
