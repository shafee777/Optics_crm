-- 1. Add Google review link and store phone to stores table
ALTER TABLE stores 
ADD COLUMN IF NOT EXISTS google_review_link TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS address TEXT DEFAULT NULL;

-- 2. Track communication logs to prevent spamming customers
CREATE TABLE IF NOT EXISTS customer_messages_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE RESTRICT,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    message_type VARCHAR(50) NOT NULL, -- 'GREETING', 'ORDER_READY', 'GOOGLE_REVIEW', 'ANNUAL_CHECKUP'
    channel VARCHAR(20) NOT NULL DEFAULT 'WHATSAPP',
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_msg_log_customer ON customer_messages_log(store_id, customer_id, message_type);