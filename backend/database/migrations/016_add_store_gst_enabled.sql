-- Migration 016: Add gst_enabled flag to stores table
ALTER TABLE stores 
ADD COLUMN IF NOT EXISTS gst_enabled BOOLEAN NOT NULL DEFAULT TRUE;
