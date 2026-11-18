import { query } from '../../config/database.js';

function calculatePaymentStatus(totalAmount, paidAmount) {
  const total = parseFloat(totalAmount) || 0;
  const paid = parseFloat(paidAmount) || 0;
  if (total <= 0) return 'PAID';
  if (paid >= total) return 'PAID';
  if (paid > 0) return 'PARTIAL';
  return 'UNPAID';
}

export const dailyStockExpenseRepository = {
  async create(storeId, data) {
    const totalAmount = parseFloat(data.totalAmount) || 0;
    const paidAmount = parseFloat(data.paidAmount) || 0;
    const paymentStatus = calculatePaymentStatus(totalAmount, paidAmount);

    const sql = `
      INSERT INTO daily_stock_expenses (
        store_id,
        category,
        company_name,
        brand_details,
        stock_notes,
        bill_date,
        total_amount,
        paid_amount,
        payment_status,
        payment_method,
        invoice_number,
        notes
      )
      VALUES ($1, $2, $3, $4, $5, COALESCE($6::date, CURRENT_DATE), $7, $8, $9, $10, $11, $12)
      RETURNING *;
    `;

    const values = [
      storeId,
      data.category,
      data.companyName.trim(),
      data.brandDetails?.trim() || null,
      data.stockNotes?.trim() || null,
      data.billDate || null,
      totalAmount,
      paidAmount,
      paymentStatus,
      data.paymentMethod || 'CASH',
      data.invoiceNumber?.trim() || null,
      data.notes?.trim() || null,
    ];

    const res = await query(sql, values);
    return res.rows[0];
  },

  async findById(storeId, id) {
    const sql = `
      SELECT *
      FROM daily_stock_expenses
      WHERE store_id = $1 AND id = $2;
    `;
    const res = await query(sql, [storeId, id]);
    return res.rows[0] || null;
  },

  async update(storeId, id, data) {
    const existing = await this.findById(storeId, id);
    if (!existing) return null;

    const totalAmount = data.totalAmount !== undefined ? parseFloat(data.totalAmount) : parseFloat(existing.total_amount);
    const paidAmount = data.paidAmount !== undefined ? parseFloat(data.paidAmount) : parseFloat(existing.paid_amount);
    const paymentStatus = calculatePaymentStatus(totalAmount, paidAmount);

    const sql = `
      UPDATE daily_stock_expenses
      SET
        category = COALESCE($3, category),
        company_name = COALESCE($4, company_name),
        brand_details = COALESCE($5, brand_details),
        stock_notes = COALESCE($6, stock_notes),
        bill_date = COALESCE($7::date, bill_date),
        total_amount = $8,
        paid_amount = $9,
        payment_status = $10,
        payment_method = COALESCE($11, payment_method),
        invoice_number = COALESCE($12, invoice_number),
        notes = COALESCE($13, notes),
        updated_at = NOW()
      WHERE store_id = $1 AND id = $2
      RETURNING *;
    `;

    const values = [
      storeId,
      id,
      data.category || null,
      data.companyName ? data.companyName.trim() : null,
      data.brandDetails !== undefined ? data.brandDetails?.trim() || null : null,
      data.stockNotes !== undefined ? data.stockNotes?.trim() || null : null,
      data.billDate || null,
      totalAmount,
      paidAmount,
      paymentStatus,
      data.paymentMethod || null,
      data.invoiceNumber !== undefined ? data.invoiceNumber?.trim() || null : null,
      data.notes !== undefined ? data.notes?.trim() || null : null,
    ];

    const res = await query(sql, values);
    return res.rows[0] || null;
  },

  async updatePayment(storeId, id, { paidAmount, paymentMethod, notes }) {
    const existing = await this.findById(storeId, id);
    if (!existing) return null;

    const totalAmount = parseFloat(existing.total_amount);
    const newPaidAmount = parseFloat(paidAmount);
    const paymentStatus = calculatePaymentStatus(totalAmount, newPaidAmount);

    const sql = `
      UPDATE daily_stock_expenses
      SET
        paid_amount = $3,
        payment_status = $4,
        payment_method = COALESCE($5, payment_method),
        notes = COALESCE($6, notes),
        updated_at = NOW()
      WHERE store_id = $1 AND id = $2
      RETURNING *;
    `;

    const res = await query(sql, [
      storeId,
      id,
      newPaidAmount,
      paymentStatus,
      paymentMethod || null,
      notes !== undefined ? notes?.trim() || null : null,
    ]);
    return res.rows[0] || null;
  },

  async delete(storeId, id) {
    const sql = `
      DELETE FROM daily_stock_expenses
      WHERE store_id = $1 AND id = $2
      RETURNING id;
    `;
    const res = await query(sql, [storeId, id]);
    return res.rowCount > 0;
  },

  async list(storeId, { category, companyName, search, month, startDate, endDate, paymentStatus, page = 1, limit = 50 }) {
    const offset = (page - 1) * limit;
    let whereClause = 'WHERE store_id = $1';
    const params = [storeId];

    if (category && category !== 'ALL') {
      params.push(category);
      whereClause += ` AND category = $${params.length}`;
    }

    if (companyName) {
      params.push(companyName.trim());
      whereClause += ` AND LOWER(company_name) = LOWER($${params.length})`;
    }

    if (search) {
      params.push(`%${search.trim()}%`);
      whereClause += ` AND (company_name ILIKE $${params.length} OR brand_details ILIKE $${params.length} OR stock_notes ILIKE $${params.length} OR invoice_number ILIKE $${params.length})`;
    }

    if (month) {
      params.push(month);
      whereClause += ` AND TO_CHAR(bill_date, 'YYYY-MM') = $${params.length}`;
    }

    if (startDate) {
      params.push(startDate);
      whereClause += ` AND bill_date >= $${params.length}::date`;
    }

    if (endDate) {
      params.push(endDate);
      whereClause += ` AND bill_date <= $${params.length}::date`;
    }

    if (paymentStatus && paymentStatus !== 'ALL') {
      params.push(paymentStatus);
      whereClause += ` AND payment_status = $${params.length}`;
    }

    // Totals query across all matches (unpaginated)
    const summarySql = `
      SELECT
        COUNT(*)::int AS total_records,
        COALESCE(SUM(total_amount), 0)::numeric(10,2) AS total_purchased,
        COALESCE(SUM(paid_amount), 0)::numeric(10,2) AS total_paid,
        COALESCE(SUM(total_amount - paid_amount), 0)::numeric(10,2) AS balance_owed
      FROM daily_stock_expenses
      ${whereClause};
    `;
    const summaryRes = await query(summarySql, params);
    const summary = summaryRes.rows[0];

    // Data query with pagination
    params.push(limit, offset);
    const dataSql = `
      SELECT *
      FROM daily_stock_expenses
      ${whereClause}
      ORDER BY bill_date DESC, created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length};
    `;
    const dataRes = await query(dataSql, params);

    return {
      expenses: dataRes.rows,
      summary: {
        totalRecords: parseInt(summary.total_records, 10),
        totalPurchased: parseFloat(summary.total_purchased),
        totalPaid: parseFloat(summary.total_paid),
        balanceOwed: parseFloat(summary.balance_owed),
      },
      meta: {
        page,
        limit,
        totalPages: Math.ceil(parseInt(summary.total_records, 10) / limit) || 1,
      },
    };
  },

  async getCompanySummary(storeId, { category, month, companyName }) {
    let whereClause = 'WHERE store_id = $1';
    const params = [storeId];

    if (category && category !== 'ALL') {
      params.push(category);
      whereClause += ` AND category = $${params.length}`;
    }

    if (month) {
      params.push(month);
      whereClause += ` AND TO_CHAR(bill_date, 'YYYY-MM') = $${params.length}`;
    }

    if (companyName) {
      params.push(companyName.trim());
      whereClause += ` AND LOWER(company_name) = LOWER($${params.length})`;
    }

    // Per-company summary
    const companySql = `
      SELECT
        company_name,
        category,
        COUNT(*)::int AS total_bills,
        COALESCE(SUM(total_amount), 0)::numeric(10,2) AS total_purchased,
        COALESCE(SUM(paid_amount), 0)::numeric(10,2) AS total_paid,
        COALESCE(SUM(total_amount - paid_amount), 0)::numeric(10,2) AS balance_owed,
        COUNT(*) FILTER (WHERE payment_status != 'PAID')::int AS unpaid_bills
      FROM daily_stock_expenses
      ${whereClause}
      GROUP BY company_name, category
      ORDER BY balance_owed DESC, total_purchased DESC;
    `;
    const companyRes = await query(companySql, params);

    // If specific company selected, get brand-wise details
    let brandBreakdown = [];
    if (companyName) {
      const brandSql = `
        SELECT
          COALESCE(NULLIF(TRIM(brand_details), ''), 'General / Unspecified') AS brand,
          COUNT(*)::int AS count,
          COALESCE(SUM(total_amount), 0)::numeric(10,2) AS total_purchased,
          COALESCE(SUM(paid_amount), 0)::numeric(10,2) AS total_paid,
          COALESCE(SUM(total_amount - paid_amount), 0)::numeric(10,2) AS balance_owed
        FROM daily_stock_expenses
        ${whereClause}
        GROUP BY brand
        ORDER BY total_purchased DESC;
      `;
      const brandRes = await query(brandSql, params);
      brandBreakdown = brandRes.rows.map((row) => ({
        brand: row.brand,
        count: parseInt(row.count, 10),
        totalPurchased: parseFloat(row.total_purchased),
        totalPaid: parseFloat(row.total_paid),
        balanceOwed: parseFloat(row.balance_owed),
      }));
    }

    return {
      companies: companyRes.rows.map((r) => ({
        companyName: r.company_name,
        category: r.category,
        totalBills: parseInt(r.total_bills, 10),
        totalPurchased: parseFloat(r.total_purchased),
        totalPaid: parseFloat(r.total_paid),
        balanceOwed: parseFloat(r.balance_owed),
        unpaidBills: parseInt(r.unpaid_bills, 10),
      })),
      brandBreakdown,
    };
  },

  async getDistinctCompanies(storeId, category) {
    let sql = `
      SELECT DISTINCT company_name
      FROM daily_stock_expenses
      WHERE store_id = $1
    `;
    const params = [storeId];
    if (category && category !== 'ALL') {
      params.push(category);
      sql += ` AND category = $2`;
    }
    sql += ` ORDER BY company_name ASC;`;

    const res = await query(sql, params);
    return res.rows.map((r) => r.company_name);
  },
};
