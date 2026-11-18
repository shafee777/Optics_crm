-- Migration 020: Daily Stock Expenses (Isolated Lens & Frame Purchases Tracking)

CREATE TABLE IF NOT EXISTS daily_stock_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    category VARCHAR(20) NOT NULL CHECK (category IN ('LENS', 'FRAME')),
    company_name VARCHAR(255) NOT NULL,
    brand_details VARCHAR(255),
    stock_notes TEXT,
    bill_date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (total_amount >= 0),
    paid_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (paid_amount >= 0),
    payment_status VARCHAR(20) NOT NULL DEFAULT 'UNPAID' CHECK (payment_status IN ('PAID', 'PARTIAL', 'UNPAID')),
    payment_method VARCHAR(50) NOT NULL DEFAULT 'CASH',
    invoice_number VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_daily_stock_expenses_store ON daily_stock_expenses(store_id);
CREATE INDEX IF NOT EXISTS idx_daily_stock_expenses_store_cat_date ON daily_stock_expenses(store_id, category, bill_date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_stock_expenses_store_comp ON daily_stock_expenses(store_id, lower(company_name));
