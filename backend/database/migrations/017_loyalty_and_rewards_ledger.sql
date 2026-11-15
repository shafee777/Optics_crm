-- 017_loyalty_and_rewards_ledger.sql
-- Financial-grade append-only FIFO loyalty points ledger

-- 1. Create loyalty transaction type enum
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'loyalty_tx_type') THEN
        CREATE TYPE loyalty_tx_type AS ENUM ('EARN', 'REDEEM', 'EXPIRE', 'CLAWBACK', 'ADJUSTMENT');
    END IF;
END $$;

-- 2. Add loyalty configuration to stores table
ALTER TABLE stores
ADD COLUMN IF NOT EXISTS loyalty_config JSONB DEFAULT '{
  "enabled": true,
  "accrualPercent": 5.0,
  "pointsPerRupee": 1.0,
  "redemptionValuePerPoint": 1.0,
  "minRedeemPoints": 50,
  "maxRedeemPercent": 30.0,
  "expiryDays": 365,
  "silverThreshold": 10000,
  "vipThreshold": 25000,
  "silverMultiplier": 1.5,
  "vipMultiplier": 2.0
}'::jsonb;

-- 3. Create loyalty_ledger table
CREATE TABLE IF NOT EXISTS loyalty_ledger (
    seq BIGSERIAL,
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE RESTRICT,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    transaction_type loyalty_tx_type NOT NULL,
    points_delta INT NOT NULL,
    points_unredeemed INT NOT NULL DEFAULT 0,
    balance_after INT NOT NULL,
    expires_at TIMESTAMPTZ DEFAULT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Create performance indexes for loyalty ledger
CREATE INDEX IF NOT EXISTS idx_loyalty_ledger_customer 
    ON loyalty_ledger(store_id, customer_id, seq DESC);

CREATE INDEX IF NOT EXISTS idx_loyalty_ledger_unredeemed 
    ON loyalty_ledger(store_id, customer_id, expires_at ASC) 
    WHERE points_unredeemed > 0;

CREATE INDEX IF NOT EXISTS idx_loyalty_ledger_order 
    ON loyalty_ledger(store_id, order_id) 
    WHERE order_id IS NOT NULL;

-- 5. Add loyalty tracking columns to orders table
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS loyalty_points_earned INT NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS loyalty_points_redeemed INT NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS loyalty_discount NUMERIC(10,2) NOT NULL DEFAULT 0.00;
