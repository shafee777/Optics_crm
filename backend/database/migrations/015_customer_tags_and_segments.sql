-- Migration 015: Customer Tags, Categories, and Enhanced Filtering
-- Adds tags array and category column for customer segmentation, quick filters, and marketing campaigns.

ALTER TABLE customers ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'REGULAR';

CREATE INDEX IF NOT EXISTS idx_customers_tags ON customers USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_customers_category ON customers(store_id, category);
CREATE INDEX IF NOT EXISTS idx_customers_created_at ON customers(store_id, created_at);
