-- Migration 010: Add whatsapp_templates JSONB column to stores table
ALTER TABLE stores
ADD COLUMN IF NOT EXISTS whatsapp_templates JSONB DEFAULT '{}'::jsonb;