-- Migration 012: Add email and logo_url to stores table for branded invoices and receipts
ALTER TABLE stores 
ADD COLUMN IF NOT EXISTS email VARCHAR(255) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS logo_url TEXT DEFAULT NULL;
