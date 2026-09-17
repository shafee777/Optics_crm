-- 1. Add customer_code column if missing
ALTER TABLE customers ADD COLUMN IF NOT EXISTS customer_code VARCHAR(50);

-- 2. Drop strict unique phone constraint to allow shared family numbers
ALTER TABLE customers DROP CONSTRAINT IF EXISTS uq_customers_store_phone;

-- 3. Backfill existing rows (CUST-1001, CUST-1002, ...) partitioned per store
WITH numbered_customers AS (
  SELECT 
    id,
    'CUST-' || (1000 + ROW_NUMBER() OVER (PARTITION BY store_id ORDER BY created_at ASC)) AS generated_code
  FROM customers
  WHERE customer_code IS NULL
)
UPDATE customers c
SET customer_code = nc.generated_code
FROM numbered_customers nc
WHERE c.id = nc.id;

-- 4. Add unique constraint per store and lookup index
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_customers_store_code'
    ) THEN
        ALTER TABLE customers ADD CONSTRAINT uq_customers_store_code UNIQUE (store_id, customer_code);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_customers_store_code ON customers(store_id, customer_code);