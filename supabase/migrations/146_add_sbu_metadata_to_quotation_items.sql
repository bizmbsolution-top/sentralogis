-- Migration 146: Add sbu_metadata and remarks to crm_quotation_items
ALTER TABLE public.crm_quotation_items ADD COLUMN IF NOT EXISTS sbu_metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.crm_quotation_items ADD COLUMN IF NOT EXISTS remarks TEXT;
