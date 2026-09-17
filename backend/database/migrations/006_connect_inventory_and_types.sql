-- 1. Ensure all canonical item types exist in PostgreSQL enum
DO $$ BEGIN
    ALTER TYPE item_type ADD VALUE IF NOT EXISTS 'SUNGLASSES';
    ALTER TYPE item_type ADD VALUE IF NOT EXISTS 'SOLUTION';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Add product_id to order_items with foreign key
ALTER TABLE order_items 
ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES products(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id);