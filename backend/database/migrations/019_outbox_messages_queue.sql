-- 019_outbox_messages_queue.sql
-- Resilient offline-first outbox message queue for WhatsApp & Customer Notifications

CREATE TABLE IF NOT EXISTS outbox_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE RESTRICT,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    phone_number VARCHAR(20) NOT NULL,
    customer_name VARCHAR(255),
    event_type VARCHAR(50) NOT NULL,
    message_body TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SENT', 'FAILED', 'DISMISSED')),
    channel VARCHAR(20) NOT NULL DEFAULT 'WHATSAPP',
    dispatch_method VARCHAR(30) DEFAULT NULL,
    sent_at TIMESTAMPTZ DEFAULT NULL,
    sent_by UUID REFERENCES users(id) ON DELETE SET NULL,
    error_detail TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_outbox_messages_status 
    ON outbox_messages(store_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_outbox_messages_customer 
    ON outbox_messages(store_id, customer_id);
