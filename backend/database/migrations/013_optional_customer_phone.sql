-- Make customer phone optional to support walk-in customers without a phone number
ALTER TABLE customers ALTER COLUMN phone DROP NOT NULL;
