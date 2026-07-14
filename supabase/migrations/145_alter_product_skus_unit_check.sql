-- Migration 145: Drop check constraint on md_product_skus.unit to allow custom dynamic UoMs
ALTER TABLE public.md_product_skus DROP CONSTRAINT IF EXISTS md_product_skus_unit_check;
