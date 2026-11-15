-- 018_warranty_plans_and_contracts.sql
-- Enterprise warranty subscriptions and claim lifecycle tracking

-- 1. Create warranty_plans catalog
CREATE TABLE IF NOT EXISTS warranty_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE RESTRICT,
    plan_code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    duration_days INT NOT NULL DEFAULT 365 CHECK (duration_days > 0),
    price NUMERIC(10,2) NOT NULL DEFAULT 499.00 CHECK (price >= 0),
    max_claims INT NOT NULL DEFAULT 1 CHECK (max_claims > 0),
    coverage_percentage NUMERIC(5,2) NOT NULL DEFAULT 100.00 CHECK (coverage_percentage > 0 AND coverage_percentage <= 100),
    terms TEXT,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_warranty_plans_store_code UNIQUE (store_id, plan_code)
);

CREATE INDEX IF NOT EXISTS idx_warranty_plans_store ON warranty_plans(store_id, active);

-- 2. Create customer_warranties contracts table
CREATE TABLE IF NOT EXISTS customer_warranties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE RESTRICT,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES warranty_plans(id) ON DELETE RESTRICT,
    source_order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    source_order_item_id UUID DEFAULT NULL,
    covered_product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    covered_item_description VARCHAR(255) NOT NULL,
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE NOT NULL,
    claims_allowed INT NOT NULL DEFAULT 1 CHECK (claims_allowed > 0),
    claims_used INT NOT NULL DEFAULT 0 CHECK (claims_used >= 0),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'EXHAUSTED', 'EXPIRED', 'CANCELLED')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_warranties_customer 
    ON customer_warranties(store_id, customer_id, status);

CREATE INDEX IF NOT EXISTS idx_customer_warranties_dates 
    ON customer_warranties(store_id, end_date) 
    WHERE status = 'ACTIVE';

-- 3. Create warranty_claims audit log
CREATE TABLE IF NOT EXISTS warranty_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE RESTRICT,
    warranty_id UUID NOT NULL REFERENCES customer_warranties(id) ON DELETE RESTRICT,
    claim_order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    replacement_product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    replacement_description VARCHAR(255) NOT NULL,
    claim_type VARCHAR(50) NOT NULL DEFAULT 'REPLACEMENT',
    original_item_price NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    customer_paid NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    notes TEXT,
    claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_warranty_claims_warranty 
    ON warranty_claims(store_id, warranty_id);
