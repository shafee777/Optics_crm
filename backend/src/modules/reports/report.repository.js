import { query } from '../../config/database.js';

export const reportRepository = {
  // 1. Detailed breakdown of every payment transaction on a specific date
  async getDailySalesDetail(storeId, dateStr) {
    const sql = `
      SELECT 
        p.id AS payment_id,
        p.amount,
        p.payment_method,
        p.reference,
        p.notes AS payment_notes,
        p.paid_at,
        o.id AS order_id,
        o.order_number,
        o.status AS order_status,
        o.total_amount AS order_total,
        COALESCE((SELECT SUM(p2.amount) FROM payments p2 WHERE p2.order_id = o.id), 0.00) AS order_total_paid,
        c.id AS customer_id,
        c.full_name AS customer_name,
        c.customer_code,
        c.phone AS customer_phone
      FROM payments p
      JOIN orders o ON p.order_id = o.id
      JOIN customers c ON o.customer_id = c.id
      WHERE p.store_id = $1 AND p.paid_at::date = $2::date
      ORDER BY p.paid_at DESC;
    `;
    const res = await query(sql, [storeId, dateStr]);

    const transactions = res.rows.map((r) => {
      const amt = parseFloat(r.amount);
      const ordTot = parseFloat(r.order_total);
      const ordPaid = parseFloat(r.order_total_paid);
      return {
        paymentId: r.payment_id,
        amount: amt,
        paymentMethod: r.payment_method,
        reference: r.reference,
        paymentNotes: r.payment_notes,
        paidAt: r.paid_at,
        orderId: r.order_id,
        orderNumber: r.order_number,
        orderStatus: r.order_status,
        orderTotal: ordTot,
        balanceDue: Math.max(0, ordTot - ordPaid),
        customerId: r.customer_id,
        customerName: r.customer_name,
        customerCode: r.customer_code,
        customerPhone: r.customer_phone,
      };
    });

    const totalSales = transactions.reduce((sum, t) => sum + t.amount, 0);

    return {
      date: dateStr,
      totalSales,
      transactionCount: transactions.length,
      transactions,
    };
  },

  // 2. Month-view with day-by-day aggregates (e.g. for Sept 2026: 1st, 2nd, 3rd...)
  async getMonthlySales(storeId, year, month) {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const sql = `
      SELECT 
        d::date AS date,
        TO_CHAR(d, 'Dy') AS day_name,
        COALESCE(SUM(p.amount), 0.00) AS total_sales,
        COUNT(p.id) AS payment_count
      FROM generate_series(
        $2::date,
        ($2::date + INTERVAL '1 month' - INTERVAL '1 day')::date,
        INTERVAL '1 day'
      ) d
      LEFT JOIN payments p 
        ON p.store_id = $1 
       AND p.paid_at::date = d::date
      GROUP BY d
      ORDER BY d ASC;
    `;
    const res = await query(sql, [storeId, startDate]);

    const days = res.rows.map((r) => ({
      date: r.date.toISOString ? r.date.toISOString().split('T')[0] : String(r.date).slice(0, 10),
      dayName: r.day_name,
      totalSales: parseFloat(r.total_sales),
      paymentCount: parseInt(r.payment_count, 10),
    }));

    const totalMonthSales = days.reduce((sum, d) => sum + d.totalSales, 0);
    const totalTransactions = days.reduce((sum, d) => sum + d.paymentCount, 0);

    return {
      year: parseInt(year, 10),
      month: parseInt(month, 10),
      totalSales: totalMonthSales,
      totalTransactions,
      days,
    };
  },

  // 3. Year-view with month-by-month aggregates (Jan, Feb, Mar ... Dec)
  async getYearlySales(storeId, year) {
    const startDate = `${year}-01-01`;
    const sql = `
      SELECT 
        m::date AS month_start,
        TO_CHAR(m, 'Mon') AS month_name,
        EXTRACT(MONTH FROM m)::int AS month_num,
        COALESCE(SUM(p.amount), 0.00) AS total_sales,
        COUNT(p.id) AS payment_count
      FROM generate_series(
        $2::date,
        ($2::date + INTERVAL '1 year' - INTERVAL '1 day')::date,
        INTERVAL '1 month'
      ) m
      LEFT JOIN payments p 
        ON p.store_id = $1 
       AND p.paid_at >= m 
       AND p.paid_at < m + INTERVAL '1 month'
      GROUP BY m
      ORDER BY m ASC;
    `;
    const res = await query(sql, [storeId, startDate]);

    const months = res.rows.map((r) => ({
      monthStart: r.month_start.toISOString ? r.month_start.toISOString().split('T')[0] : String(r.month_start).slice(0, 7),
      monthName: r.month_name,
      monthNum: r.month_num,
      totalSales: parseFloat(r.total_sales),
      paymentCount: parseInt(r.payment_count, 10),
    }));

    const totalYearSales = months.reduce((sum, m) => sum + m.totalSales, 0);
    const totalTransactions = months.reduce((sum, m) => sum + m.paymentCount, 0);

    return {
      year: parseInt(year, 10),
      totalSales: totalYearSales,
      totalTransactions,
      months,
    };
  },
};
