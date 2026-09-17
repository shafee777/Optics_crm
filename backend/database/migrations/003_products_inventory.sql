-- 1. Extend item_type enum with SUNGLASSES if not present
DO $$ BEGIN
    ALTER TYPE item_type ADD VALUE IF NOT EXISTS 'SUNGLASSES';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Products table (Tenant-isolated stock catalog)
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE RESTRICT,
    item_type item_type NOT NULL, -- FRAME, LENS, SUNGLASSES, CONTACT_LENS, SOLUTION, ACCESSORY
    brand VARCHAR(100),
    model_code VARCHAR(100),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    cost_price NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    selling_price NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    stock_quantity INT NOT NULL DEFAULT 0,
    min_stock_alert INT NOT NULL DEFAULT 3,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    archived_at TIMESTAMPTZ DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_products_store ON products(store_id);
CREATE INDEX IF NOT EXISTS idx_products_store_type ON products(store_id, item_type);
CREATE INDEX IF NOT EXISTS idx_products_store_name ON products(store_id, lower(name));