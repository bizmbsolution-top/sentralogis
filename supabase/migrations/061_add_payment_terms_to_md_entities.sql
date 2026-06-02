-- Migration 061: Add payment_terms to md_entities
-- The contacts form references payment_terms but the column was never created

ALTER TABLE md_entities ADD COLUMN IF NOT EXISTS payment_terms TEXT;

CREATE INDEX IF NOT EXISTS idx_md_entities_payment_terms ON md_entities(payment_terms) WHERE payment_terms IS NOT NULL;

SELECT '061_add_payment_terms_to_md_entities OK' AS result;
