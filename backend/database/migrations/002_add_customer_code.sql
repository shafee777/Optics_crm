-- 1. Add customer_code column
ALTER TABLE customers ADD COLUMN IF NOT EXISTS customer_code VARCHAR(50);

-- 2. Drop the strict unique phone constraint so family members can share phones
ALTER TABLE customers DROP CONSTRAINT IF EXISTS uq_customers_store_phone;

-- 3. Populate existing rows with customer codes (CUST-1001, CUST-1002, ...)
DO $$
DECLARE
    r RECORD;
    c INT;
BEGIN
    FOR r IN SELECT DISTINCT store_id FROM customers LOOP
        c := 1000;
        FOR r IN SELECT id FROM customers WHERE store_id = r.store_id AND customer_code IS NULL ORDER BY created_at ASC LOOP
            c := c + 1;
            UPDATE customers SET customer_code = 'CUST-' || c WHERE id = r.id;
        END LOOP;
    END LOOP;
END $$;

-- 4. Add unique constraint on (store_id, customer_code)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_customers_store_code'
    ) THEN
        ALTER TABLE customers ADD CONSTRAINT uq_customers_store_code UNIQUE (store_id, customer_code);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_customers_store_code ON customers(store_id, customer_code);