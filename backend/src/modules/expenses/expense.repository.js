import { query } from '../../config/database.js';

export const expenseRepository = {
  async create(storeId, userId, data) {
    const sql = `
      INSERT INTO expenses (
        store_id, category, amount, payment_method, incurred_at, note, created_by
      )
      VALUES ($1, $2, $3, $4, COALESCE($5, NOW()), $6, $7)
      RETURNING *;
    `;
    const values = [
      storeId,
      data.category,
      data.amount,
      data.paymentMethod,
      data.incurredAt || null,
      data.note || null,
      userId,
    ];
    const res = await query(sql, values);
    return res.rows[0];
  },

  async list(storeId, { category, from, to, page = 1, limit = 10 }) {
    const offset = (page - 1) * limit;
    let whereClause = 'WHERE e.store_id = $1';
    const params = [storeId];

    if (category && category !== 'ALL') {
      params.push(category);
      whereClause += ` AND e.category = $${params.length}`;
    }

    if (from) {
      params.push(from);
      whereClause += ` AND e.incurred_at >= $${params.length}::timestamptz`;
    }

    if (to) {
      params.push(to);
      whereClause += ` AND e.incurred_at <= $${params.length}::timestamptz`;
    }

    const countSql = `SELECT COUNT(*) FROM expenses e ${whereClause};`;
    const countRes = await query(countSql, params);
    const total = parseInt(countRes.rows[0].count, 10);

    const dataSql = `
      SELECT 
        e.*,
        u.full_name AS created_by_name
      FROM expenses e
      LEFT JOIN users u ON e.created_by = u.id
      ${whereClause}
      ORDER BY e.incurred_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2};
    `;
    const dataParams = [...params, limit, offset];
    const dataRes = await query(dataSql, dataParams);

    const formattedExpenses = dataRes.rows.map((row) => ({
      ...row,
      amount: parseFloat(row.amount),
    }));

    return {
      expenses: formattedExpenses,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  },

  async getFinancialLedgerSummary(storeId) {
    // Today's total sales (inflows)
    const salesSql = `
      SELECT 
        COALESCE(SUM(amount), 0.00) AS today_sales,
        COALESCE(SUM(CASE WHEN payment_method = 'UPI' THEN amount ELSE 0 END), 0.00) AS upi_total,
        COALESCE(SUM(CASE WHEN payment_method = 'CASH' THEN amount ELSE 0 END), 0.00) AS cash_total,
        COALESCE(SUM(CASE WHEN payment_method = 'CARD' THEN amount ELSE 0 END), 0.00) AS card_total,
        COALESCE(SUM(CASE WHEN payment_method NOT IN ('UPI', 'CASH', 'CARD') THEN amount ELSE 0 END), 0.00) AS other_total
      FROM payments
      WHERE store_id = $1 AND paid_at::date = CURRENT_DATE;
    `;
    const salesRes = await query(salesSql, [storeId]);
    const salesData = salesRes.rows[0];

    // Today's total expenses (outflows)
    const expensesSql = `
      SELECT COALESCE(SUM(amount), 0.00) AS today_expenses
      FROM expenses
      WHERE store_id = $1 AND incurred_at::date = CURRENT_DATE;
    `;
    const expensesRes = await query(expensesSql, [storeId]);
    const todayExpenses = parseFloat(expensesRes.rows[0].today_expenses);

    const todaySales = parseFloat(salesData.today_sales);
    const netCashFlow = todaySales - todayExpenses;

    return {
      todaySales,
      todayExpenses,
      netCashFlow,
      paymentSplit: {
        UPI: parseFloat(salesData.upi_total),
        CASH: parseFloat(salesData.cash_total),
        CARD: parseFloat(salesData.card_total),
        OTHER: parseFloat(salesData.other_total),
      },
    };
  },
};
