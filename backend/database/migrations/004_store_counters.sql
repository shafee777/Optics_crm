CREATE TABLE IF NOT EXISTS store_counters (
    store_id UUID PRIMARY KEY REFERENCES stores(id) ON DELETE CASCADE,
    customer_code_seq INT NOT NULL DEFAULT 1000,
    order_number_seq INT NOT NULL DEFAULT 1000,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_store_counters_updated_at ON store_counters(updated_at);
