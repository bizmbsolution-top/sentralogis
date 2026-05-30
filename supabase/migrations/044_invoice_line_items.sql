-- Add line_items JSONB column to invoices table for draft persistence
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS line_items JSONB;

-- Allow storing line item selections (COA, tax, qty, unit_price, description) as draft
COMMENT ON COLUMN invoices.line_items IS 'Stores line item selections as JSON array for draft invoice editing';
