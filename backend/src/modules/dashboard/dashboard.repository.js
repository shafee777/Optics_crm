import { query } from '../../config/database.js';

export const dashboardRepository = {
  async getTodaySummary(storeId) {
    // 1. Sales & Payment split
    const salesSql = `
      SELECT 
        COALESCE(SUM(amount), 0.00) AS today_sales,
        COALESCE(SUM(CASE WHEN payment_method = 'UPI' THEN amount ELSE 0 END), 0.00) AS upi_total,
        COALESCE(SUM(CASE WHEN payment_method = 'CASH' THEN amount ELSE 0 END), 0.00) AS cash_total,
        COALESCE(SUM(CASE WHEN payment_method = 'CARD' THEN amount ELSE 0 END), 0.00) AS card_total
      FROM payments
      WHERE store_id = $1 AND paid_at::date = CURRENT_DATE;
    `;
    const salesRes = await query(salesSql, [storeId]);
    const salesData = salesRes.rows[0];

    // 2. Today's Expenses
    const expensesSql = `
      SELECT COALESCE(SUM(amount), 0.00) AS today_expenses
      FROM expenses
      WHERE store_id = $1 AND incurred_at::date = CURRENT_DATE;
    `;
    const expensesRes = await query(expensesSql, [storeId]);
    const todayExpenses = parseFloat(expensesRes.rows[0].today_expenses);

    // 3. Operational Order Counters
    const countsSql = `
      SELECT 
        COUNT(CASE WHEN status = 'PENDING' THEN 1 END) AS pending_count,
        COUNT(CASE WHEN status = 'PROCESSING' THEN 1 END) AS processing_count,
        COUNT(CASE WHEN status = 'READY_FOR_PICKUP' THEN 1 END) AS ready_count,
        COUNT(CASE WHEN due_date < CURRENT_DATE AND status NOT IN ('DELIVERED', 'CANCELLED') THEN 1 END) AS overdue_count
      FROM orders
      WHERE store_id = $1;
    `;
    const countsRes = await query(countsSql, [storeId]);
    const countsData = countsRes.rows[0];

    // 4. Quick Ready for Pickup list (top 5)
    const readyOrdersSql = `
      SELECT 
        o.id, o.order_number, o.due_date, o.total_amount,
        c.full_name AS customer_name, c.phone AS customer_phone, c.customer_code,
        COALESCE((SELECT SUM(amount) FROM payments p WHERE p.order_id = o.id), 0.00) AS total_paid
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
      WHERE o.store_id = $1 AND o.status = 'READY_FOR_PICKUP'
      ORDER BY o.ready_at ASC NULLS LAST
      LIMIT 5;
    `;
    const readyRes = await query(readyOrdersSql, [storeId]);

    // 5. Quick Overdue Orders list (top 5)
    const overdueOrdersSql = `
      SELECT 
        o.id, o.order_number, o.due_date, o.status, o.total_amount,
        c.full_name AS customer_name, c.phone AS customer_phone, c.customer_code,
        COALESCE((SELECT SUM(amount) FROM payments p WHERE p.order_id = o.id), 0.00) AS total_paid
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
      WHERE o.store_id = $1 AND o.due_date < CURRENT_DATE AND o.status NOT IN ('DELIVERED', 'CANCELLED')
      ORDER BY o.due_date ASC
      LIMIT 5;
    `;
    const overdueRes = await query(overdueOrdersSql, [storeId]);

    const todaySales = parseFloat(salesData.today_sales);

    return {
      todaySales,
      todayExpenses,
      netCashFlow: todaySales - todayExpenses,
      counts: {
        pending: parseInt(countsData.pending_count, 10),
        processing: parseInt(countsData.processing_count, 10),
        readyForPickup: parseInt(countsData.ready_count, 10),
        overdue: parseInt(countsData.overdue_count, 10),
      },
      paymentSplit: {
        UPI: parseFloat(salesData.upi_total),
        CASH: parseFloat(salesData.cash_total),
        CARD: parseFloat(salesData.card_total),
      },
      readyOrders: readyRes.rows.map((row) => {
        const tot = parseFloat(row.total_amount);
        const pd = parseFloat(row.total_paid);
        return {
          ...row,
          total_amount: tot,
          total_paid: pd,
          balance_due: Math.max(0, tot - pd),
        };
      }),
      overdueOrders: overdueRes.rows.map((row) => {
        const tot = parseFloat(row.total_amount);
        const pd = parseFloat(row.total_paid);
        return {
          ...row,
          total_amount: tot,
          total_paid: pd,
          balance_due: Math.max(0, tot - pd),
        };
      }),
    };
  },
};
