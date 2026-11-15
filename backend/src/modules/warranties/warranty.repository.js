import { query } from '../../config/database.js';
import { AppError } from '../../shared/errors/AppError.js';

export const warrantyRepository = {
  async listPlans(storeId, activeOnly = true) {
    const sql = `
      SELECT id, plan_code, name, description, duration_days, price, max_claims, coverage_percentage, terms, active, created_at
      FROM warranty_plans
      WHERE store_id = $1 ${activeOnly ? 'AND active = TRUE' : ''}
      ORDER BY price ASC, name ASC;
    `;
    const res = await query(sql, [storeId]);
    let rows = res.rows;
    if (rows.length === 0) {
      await query(`
        INSERT INTO warranty_plans (store_id, plan_code, name, description, duration_days, price, max_claims, coverage_percentage, terms, active)
        VALUES 
          ($1, 'CARE_1YR', '1-Year Frame & Lens Protection', 'Covers accidental frame breakage & deep lens scratch replacement', 365, 499.00, 1, 100.00, 'Valid for 1 claim within 365 days of purchase.', TRUE),
          ($1, 'CARE_6MO', '6-Month Accidental Glass Care', 'Covers accidental lens cracking or frame misalignment repair', 180, 299.00, 1, 100.00, 'Valid for 1 claim within 180 days of purchase.', TRUE)
        ON CONFLICT (store_id, plan_code) DO NOTHING;
      `, [storeId]);
      const reRes = await query(sql, [storeId]);
      rows = reRes.rows;
    }

    return rows.map(r => ({
      id: r.id,
      planCode: r.plan_code,
      name: r.name,
      description: r.description,
      durationDays: r.duration_days,
      price: Number(r.price),
      maxClaims: r.max_claims,
      coveragePercentage: Number(r.coverage_percentage),
      terms: r.terms,
      active: r.active,
      createdAt: r.created_at,
    }));
  },

  async getPlanById(storeId, planId, client = null) {
    const sql = `SELECT * FROM warranty_plans WHERE store_id = $1 AND id = $2;`;
    const res = client ? await client.query(sql, [storeId, planId]) : await query(sql, [storeId, planId]);
    return res.rows[0] || null;
  },

  async createPlan(storeId, data) {
    const sql = `
      INSERT INTO warranty_plans (
        store_id, plan_code, name, description,
        duration_days, price, max_claims,
        coverage_percentage, terms, active
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *;
    `;
    const res = await query(sql, [
      storeId,
      data.planCode.toUpperCase().trim(),
      data.name.trim(),
      data.description || null,
      data.durationDays || 365,
      data.price || 499.00,
      data.maxClaims || 1,
      data.coveragePercentage || 100.00,
      data.terms || null,
      data.active !== false,
    ]);
    const r = res.rows[0];
    return {
      id: r.id,
      planCode: r.plan_code,
      name: r.name,
      description: r.description,
      durationDays: r.duration_days,
      price: Number(r.price),
      maxClaims: r.max_claims,
      coveragePercentage: Number(r.coverage_percentage),
      terms: r.terms,
      active: r.active,
    };
  },

  async createContractTx(client, storeId, data) {
    const plan = await this.getPlanById(storeId, data.planId, client);
    if (!plan) throw new AppError('Warranty plan not found', 404, 'PLAN_NOT_FOUND');

    const durationDays = plan.duration_days || 365;
    const startDate = data.startDate || new Date().toISOString().split('T')[0];
    const claimsAllowed = plan.max_claims || 1;

    const sql = `
      INSERT INTO customer_warranties (
        store_id, customer_id, plan_id, source_order_id,
        source_order_item_id, covered_product_id, covered_item_description,
        start_date, end_date, claims_allowed, claims_used, status, notes
      )
      VALUES (
        $1, $2, $3, $4,
        $5, $6, $7,
        $8::date, ($8::date + ($9 || ' days')::interval)::date,
        $10, 0, 'ACTIVE', $11
      )
      RETURNING *;
    `;

    const res = await client.query(sql, [
      storeId,
      data.customerId,
      data.planId,
      data.sourceOrderId || null,
      data.sourceOrderItemId || null,
      data.coveredProductId || null,
      data.coveredItemDescription || plan.name,
      startDate,
      durationDays,
      claimsAllowed,
      data.notes || null,
    ]);

    return res.rows[0];
  },

  async getCustomerWarranties(storeId, customerId) {
    const sql = `
      SELECT 
        cw.id,
        cw.customer_id,
        cw.plan_id,
        wp.plan_code,
        wp.name AS plan_name,
        wp.coverage_percentage,
        cw.source_order_id,
        o.order_number AS source_order_number,
        cw.covered_product_id,
        cw.covered_item_description,
        cw.start_date,
        cw.end_date,
        cw.claims_allowed,
        cw.claims_used,
        CASE 
          WHEN cw.status = 'ACTIVE' AND cw.end_date < CURRENT_DATE THEN 'EXPIRED'
          ELSE cw.status
        END AS status,
        cw.notes,
        cw.created_at,
        COALESCE(
          json_agg(
            json_build_object(
              'id', wc.id,
              'claimedAt', wc.claimed_at,
              'replacementDescription', wc.replacement_description,
              'claimType', wc.claim_type,
              'discountAmount', wc.discount_amount,
              'customerPaid', wc.customer_paid,
              'notes', wc.notes
            )
          ) FILTER (WHERE wc.id IS NOT NULL),
          '[]'
        ) AS claims
      FROM customer_warranties cw
      JOIN warranty_plans wp ON cw.plan_id = wp.id
      LEFT JOIN orders o ON cw.source_order_id = o.id
      LEFT JOIN warranty_claims wc ON cw.id = wc.warranty_id
      WHERE cw.store_id = $1 AND cw.customer_id = $2
      GROUP BY cw.id, wp.plan_code, wp.name, wp.coverage_percentage, o.order_number
      ORDER BY cw.created_at DESC;
    `;
    const res = await query(sql, [storeId, customerId]);
    return res.rows.map(r => ({
      id: r.id,
      customerId: r.customer_id,
      planId: r.plan_id,
      planCode: r.plan_code,
      planName: r.plan_name,
      coveragePercentage: Number(r.coverage_percentage),
      sourceOrderId: r.source_order_id,
      sourceOrderNumber: r.source_order_number,
      coveredProductId: r.covered_product_id,
      coveredItemDescription: r.covered_item_description,
      startDate: r.start_date,
      endDate: r.end_date,
      claimsAllowed: r.claims_allowed,
      claimsUsed: r.claims_used,
      claimsRemaining: Math.max(0, r.claims_allowed - r.claims_used),
      status: r.status,
      notes: r.notes,
      createdAt: r.created_at,
      claims: r.claims,
    }));
  },

  async getWarrantyById(storeId, warrantyId, client = null) {
    const sql = `
      SELECT 
        cw.*,
        wp.plan_code,
        wp.name AS plan_name,
        wp.coverage_percentage,
        c.full_name AS customer_name,
        c.phone AS customer_phone
      FROM customer_warranties cw
      JOIN warranty_plans wp ON cw.plan_id = wp.id
      JOIN customers c ON cw.customer_id = c.id
      WHERE cw.store_id = $1 AND cw.id = $2;
    `;
    const res = client ? await client.query(sql, [storeId, warrantyId]) : await query(sql, [storeId, warrantyId]);
    return res.rows[0] || null;
  },

  async processClaimTx(client, storeId, warrantyId, claimData, userId) {
    // 1. Lock warranty record
    const lockSql = `
      SELECT * FROM customer_warranties 
      WHERE store_id = $1 AND id = $2 
      FOR UPDATE;
    `;
    const lockRes = await client.query(lockSql, [storeId, warrantyId]);
    const contract = lockRes.rows[0];

    if (!contract) throw new AppError('Warranty contract not found', 404, 'WARRANTY_NOT_FOUND');

    // 2. Validate active eligibility
    const today = new Date().toISOString().split('T')[0];
    if (contract.status !== 'ACTIVE') {
      throw new AppError(`Warranty contract is not active (Status: ${contract.status})`, 400, 'WARRANTY_NOT_ACTIVE');
    }
    if (new Date(contract.end_date) < new Date(today)) {
      await client.query(`UPDATE customer_warranties SET status = 'EXPIRED', updated_at = NOW() WHERE id = $1;`, [warrantyId]);
      throw new AppError('Warranty contract has expired', 400, 'WARRANTY_EXPIRED');
    }
    if (contract.claims_used >= contract.claims_allowed) {
      await client.query(`UPDATE customer_warranties SET status = 'EXHAUSTED', updated_at = NOW() WHERE id = $1;`, [warrantyId]);
      throw new AppError('All allowed claims under this warranty have already been fulfilled', 400, 'CLAIMS_EXHAUSTED');
    }

    // 3. Decrement replacement product stock if physically selected
    const replacementProductId = claimData.replacementProductId || null;
    if (replacementProductId) {
      // Row lock product
      const pRes = await client.query(
        `SELECT id, name, stock_quantity FROM products WHERE store_id = $1 AND id = $2 FOR UPDATE;`,
        [storeId, replacementProductId]
      );
      if (!pRes.rows[0]) throw new AppError('Replacement product not found in inventory', 404, 'PRODUCT_NOT_FOUND');
      if (pRes.rows[0].stock_quantity < 1) {
        throw new AppError(`Replacement product "${pRes.rows[0].name}" is out of stock (Stock: 0)`, 400, 'OUT_OF_STOCK');
      }

      await client.query("SELECT set_config('app.stock_reason', $1, true)", [`WARRANTY_REPLACEMENT (Contract ${warrantyId.slice(0, 8)})`]);
      await client.query(
        `UPDATE products SET stock_quantity = stock_quantity - 1, updated_at = NOW() WHERE store_id = $1 AND id = $2;`,
        [storeId, replacementProductId]
      );
    }

    // 4. Update claims used counter and update status if reached max
    const nextClaimsUsed = contract.claims_used + 1;
    const nextStatus = nextClaimsUsed >= contract.claims_allowed ? 'EXHAUSTED' : 'ACTIVE';

    await client.query(`
      UPDATE customer_warranties 
      SET claims_used = $1, status = $2, updated_at = NOW() 
      WHERE id = $3;
    `, [nextClaimsUsed, nextStatus, warrantyId]);

    // 5. Insert warranty claim audit row
    const claimSql = `
      INSERT INTO warranty_claims (
        store_id, warranty_id, claim_order_id,
        replacement_product_id, replacement_description,
        claim_type, original_item_price, discount_amount,
        customer_paid, notes, processed_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *;
    `;
    const claimRes = await client.query(claimSql, [
      storeId,
      warrantyId,
      claimData.claimOrderId || null,
      replacementProductId,
      claimData.replacementDescription || 'Warranty Replacement',
      claimData.claimType || 'REPLACEMENT',
      claimData.originalItemPrice || 0,
      claimData.discountAmount || 0,
      claimData.customerPaid || 0,
      claimData.notes || null,
      userId || null,
    ]);

    return {
      claim: claimRes.rows[0],
      updatedWarranty: {
        ...contract,
        claims_used: nextClaimsUsed,
        status: nextStatus,
        claims_remaining: Math.max(0, contract.claims_allowed - nextClaimsUsed),
      }
    };
  }
};
