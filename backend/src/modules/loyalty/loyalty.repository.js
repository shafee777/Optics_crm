import { query } from '../../config/database.js';
import { AppError } from '../../shared/errors/AppError.js';

export const loyaltyRepository = {
  async getStoreConfig(storeId, client = null) {
    const sql = `SELECT loyalty_config FROM stores WHERE id = $1;`;
    const res = client ? await client.query(sql, [storeId]) : await query(sql, [storeId]);
    const defaultConfig = {
      enabled: true,
      accrualPercent: 5.0,
      pointsPerRupee: 1.0,
      redemptionValuePerPoint: 1.0,
      minRedeemPoints: 50,
      maxRedeemPercent: 30.0,
      expiryDays: 365,
      silverThreshold: 10000,
      vipThreshold: 25000,
      silverMultiplier: 1.5,
      vipMultiplier: 2.0,
    };
    return { ...defaultConfig, ...(res.rows[0]?.loyalty_config || {}) };
  },

  async getCustomerBalance(storeId, customerId, client = null) {
    const sql = `
      SELECT balance_after 
      FROM loyalty_ledger 
      WHERE store_id = $1 AND customer_id = $2 
      ORDER BY seq DESC 
      LIMIT 1;
    `;
    const res = client ? await client.query(sql, [storeId, customerId]) : await query(sql, [storeId, customerId]);
    return res.rows[0]?.balance_after || 0;
  },

  async getCustomerProfile(storeId, customerId) {
    const config = await this.getStoreConfig(storeId);

    // 1. Calculate lifetime approved spend for tier classification
    const spendSql = `
      SELECT COALESCE(SUM(total_amount), 0) AS lifetime_spend
      FROM orders
      WHERE store_id = $1 AND customer_id = $2 AND status != 'CANCELLED';
    `;
    const spendRes = await query(spendSql, [storeId, customerId]);
    const lifetimeSpend = Number(spendRes.rows[0]?.lifetime_spend || 0);

    // 2. Compute Tier and Multiplier
    let tier = 'STANDARD';
    let multiplier = 1.0;
    if (lifetimeSpend >= (config.vipThreshold || 25000)) {
      tier = 'VIP';
      multiplier = Number(config.vipMultiplier || 2.0);
    } else if (lifetimeSpend >= (config.silverThreshold || 10000)) {
      tier = 'SILVER';
      multiplier = Number(config.silverMultiplier || 1.5);
    }

    // 3. Active Balance
    const balance = await this.getCustomerBalance(storeId, customerId);

    // 4. Points expiring within 30 days
    const expiringSql = `
      SELECT COALESCE(SUM(points_unredeemed), 0) AS expiring_points
      FROM loyalty_ledger
      WHERE store_id = $1 
        AND customer_id = $2 
        AND points_unredeemed > 0 
        AND expires_at IS NOT NULL
        AND expires_at <= NOW() + INTERVAL '30 days'
        AND expires_at > NOW();
    `;
    const expiringRes = await query(expiringSql, [storeId, customerId]);
    const expiringSoon = Number(expiringRes.rows[0]?.expiring_points || 0);

    // 5. Total earned and redeemed lifetime
    const statsSql = `
      SELECT 
        COALESCE(SUM(CASE WHEN points_delta > 0 THEN points_delta ELSE 0 END), 0) AS total_earned,
        COALESCE(SUM(CASE WHEN points_delta < 0 AND transaction_type = 'REDEEM' THEN ABS(points_delta) ELSE 0 END), 0) AS total_redeemed
      FROM loyalty_ledger
      WHERE store_id = $1 AND customer_id = $2;
    `;
    const statsRes = await query(statsSql, [storeId, customerId]);
    const totalEarned = Number(statsRes.rows[0]?.total_earned || 0);
    const totalRedeemed = Number(statsRes.rows[0]?.total_redeemed || 0);

    // 6. Recent ledger transactions
    const ledgerSql = `
      SELECT 
        l.id,
        l.order_id,
        o.order_number,
        l.transaction_type,
        l.points_delta,
        l.points_unredeemed,
        l.balance_after,
        l.expires_at,
        l.notes,
        l.created_at
      FROM loyalty_ledger l
      LEFT JOIN orders o ON l.order_id = o.id
      WHERE l.store_id = $1 AND l.customer_id = $2
      ORDER BY l.seq DESC
      LIMIT 50;
    `;
    const ledgerRes = await query(ledgerSql, [storeId, customerId]);

    return {
      customerId,
      tier,
      multiplier,
      tierMultiplier: multiplier,
      lifetimeSpend,
      balance,
      valueRupees: balance * Number(config.redemptionValuePerPoint || 1.0),
      expiringSoon,
      totalEarned,
      totalRedeemed,
      config: {
        enabled: config.enabled,
        accrualPercent: config.accrualPercent,
        redemptionValuePerPoint: config.redemptionValuePerPoint,
        minRedeemPoints: config.minRedeemPoints,
        maxRedeemPercent: config.maxRedeemPercent,
      },
      transactions: ledgerRes.rows.map(r => ({
        id: r.id,
        orderId: r.order_id,
        orderNumber: r.order_number,
        type: r.transaction_type,
        delta: r.points_delta,
        pointsUnredeemed: r.points_unredeemed,
        balanceAfter: r.balance_after,
        expiresAt: r.expires_at,
        notes: r.notes,
        createdAt: r.created_at,
      })),
    };
  },

  async earnPointsTx(client, storeId, customerId, orderId, orderSubtotal, orderNumber) {
    const config = await this.getStoreConfig(storeId, client);
    if (!config.enabled) return { pointsEarned: 0, balance: 0 };

    // Calculate customer tier
    const spendRes = await client.query(
      `SELECT COALESCE(SUM(total_amount), 0) AS lifetime_spend FROM orders WHERE store_id = $1 AND customer_id = $2 AND status != 'CANCELLED';`,
      [storeId, customerId]
    );
    const lifetimeSpend = Number(spendRes.rows[0]?.lifetime_spend || 0);

    let multiplier = 1.0;
    let tier = 'STANDARD';
    if (lifetimeSpend >= (config.vipThreshold || 25000)) {
      tier = 'VIP';
      multiplier = Number(config.vipMultiplier || 2.0);
    } else if (lifetimeSpend >= (config.silverThreshold || 10000)) {
      tier = 'SILVER';
      multiplier = Number(config.silverMultiplier || 1.5);
    }

    const accrualPct = Number(config.accrualPercent || 5.0) / 100;
    const pointsPerRupee = Number(config.pointsPerRupee || 1.0);
    const pointsEarned = Math.max(0, Math.floor(Number(orderSubtotal) * accrualPct * multiplier * pointsPerRupee));

    if (pointsEarned <= 0) {
      const curBal = await this.getCustomerBalance(storeId, customerId, client);
      return { pointsEarned: 0, balance: curBal, tier };
    }

    const currentBalance = await this.getCustomerBalance(storeId, customerId, client);
    const newBalance = currentBalance + pointsEarned;
    const expiryDays = Number(config.expiryDays || 365);

    const insertSql = `
      INSERT INTO loyalty_ledger (
        store_id, customer_id, order_id, transaction_type,
        points_delta, points_unredeemed, balance_after,
        expires_at, notes
      )
      VALUES (
        $1, $2, $3, 'EARN',
        $4, $4, $5,
        NOW() + ($6 || ' days')::interval,
        $7
      )
      RETURNING *;
    `;
    const res = await client.query(insertSql, [
      storeId,
      customerId,
      orderId,
      pointsEarned,
      newBalance,
      expiryDays,
      `Points earned on Order #${orderNumber || orderId} (${tier} tier - ${multiplier}x)`
    ]);

    return { pointsEarned, balance: newBalance, tier, entry: res.rows[0] };
  },

  async redeemPointsTx(client, storeId, customerId, orderId, pointsToRedeem, orderNumber) {
    if (!pointsToRedeem || pointsToRedeem <= 0) return { pointsRedeemed: 0 };

    const currentBalance = await this.getCustomerBalance(storeId, customerId, client);
    if (currentBalance < pointsToRedeem) {
      throw new AppError(
        `Insufficient loyalty points balance (Available: ${currentBalance}, Requested: ${pointsToRedeem})`,
        400,
        'INSUFFICIENT_LOYALTY_POINTS'
      );
    }

    // FIFO Lot Deduction: Consume unredeemed points starting from oldest expiring lots
    const lotsSql = `
      SELECT id, points_unredeemed 
      FROM loyalty_ledger 
      WHERE store_id = $1 AND customer_id = $2 AND points_unredeemed > 0 
      ORDER BY expires_at ASC NULLS LAST, seq ASC 
      FOR UPDATE;
    `;
    const lotsRes = await client.query(lotsSql, [storeId, customerId]);
    let remainingToDeduct = pointsToRedeem;

    for (const lot of lotsRes.rows) {
      if (remainingToDeduct <= 0) break;
      const deductFromThisLot = Math.min(lot.points_unredeemed, remainingToDeduct);
      await client.query(
        `UPDATE loyalty_ledger SET points_unredeemed = points_unredeemed - $1 WHERE id = $2;`,
        [deductFromThisLot, lot.id]
      );
      remainingToDeduct -= deductFromThisLot;
    }

    const newBalance = currentBalance - pointsToRedeem;
    const insertSql = `
      INSERT INTO loyalty_ledger (
        store_id, customer_id, order_id, transaction_type,
        points_delta, points_unredeemed, balance_after,
        notes
      )
      VALUES ($1, $2, $3, 'REDEEM', $4, 0, $5, $6)
      RETURNING *;
    `;
    const res = await client.query(insertSql, [
      storeId,
      customerId,
      orderId,
      -pointsToRedeem,
      newBalance,
      `Redeemed on Order #${orderNumber || orderId}`
    ]);

    return { pointsRedeemed: pointsToRedeem, balance: newBalance, entry: res.rows[0] };
  },

  async clawbackPointsTx(client, storeId, customerId, orderId, orderNumber) {
    const txSql = `
      SELECT transaction_type, points_delta 
      FROM loyalty_ledger 
      WHERE store_id = $1 AND customer_id = $2 AND order_id = $3;
    `;
    const txRes = await client.query(txSql, [storeId, customerId, orderId]);
    if (!txRes.rows.length) return null;

    let currentBalance = await this.getCustomerBalance(storeId, customerId, client);

    for (const row of txRes.rows) {
      if (row.transaction_type === 'EARN' && row.points_delta > 0) {
        // Reverse earned points
        const delta = row.points_delta;
        currentBalance -= delta;
        await client.query(`
          INSERT INTO loyalty_ledger (
            store_id, customer_id, order_id, transaction_type,
            points_delta, points_unredeemed, balance_after, notes
          )
          VALUES ($1, $2, $3, 'CLAWBACK', $4, 0, $5, $6);
        `, [storeId, customerId, orderId, -delta, currentBalance, `Order #${orderNumber} cancelled - Points clawed back`]);
      } else if (row.transaction_type === 'REDEEM' && row.points_delta < 0) {
        // Restore redeemed points
        const restored = Math.abs(row.points_delta);
        currentBalance += restored;
        await client.query(`
          INSERT INTO loyalty_ledger (
            store_id, customer_id, order_id, transaction_type,
            points_delta, points_unredeemed, balance_after, expires_at, notes
          )
          VALUES ($1, $2, $3, 'ADJUSTMENT', $4, $4, $5, NOW() + INTERVAL '365 days', $6);
        `, [storeId, customerId, orderId, restored, currentBalance, `Order #${orderNumber} cancelled - Points restored`]);
      }
    }

    return { balance: currentBalance };
  },

  async manualAdjustment(storeId, customerId, pointsDelta, notes, userId) {
    if (pointsDelta === 0) {
      throw new AppError('Points adjustment cannot be zero', 400, 'INVALID_ADJUSTMENT');
    }
    const currentBalance = await this.getCustomerBalance(storeId, customerId);
    const newBalance = currentBalance + pointsDelta;
    if (newBalance < 0) {
      throw new AppError(`Adjustment would result in negative points balance (${newBalance})`, 400, 'NEGATIVE_BALANCE');
    }

    const insertSql = `
      INSERT INTO loyalty_ledger (
        store_id, customer_id, transaction_type,
        points_delta, points_unredeemed, balance_after,
        expires_at, notes
      )
      VALUES ($1, $2, 'ADJUSTMENT', $3, $4, $5, $6, $7)
      RETURNING *;
    `;
    const res = await query(insertSql, [
      storeId,
      customerId,
      pointsDelta,
      pointsDelta > 0 ? pointsDelta : 0,
      newBalance,
      pointsDelta > 0 ? new Date(Date.now() + 365 * 86400000) : null,
      notes || `Manual adjustment by staff (${pointsDelta > 0 ? '+' : ''}${pointsDelta} pts)`
    ]);

    return { entry: res.rows[0], balance: newBalance };
  }
};
