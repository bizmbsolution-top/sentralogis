-- Migration 121: Quotation Items SBU Clustering
-- Adds the ability to group line items in a quotation by SBU/Category.

ALTER TABLE public.crm_quotation_items
  ADD COLUMN IF NOT EXISTS sbu_cluster VARCHAR(50) DEFAULT 'GENERAL';

-- Note: sbu_cluster is a logical grouping (e.g., 'TRUCKING', 'WAREHOUSE', 'CLEARANCE', 'FORWARDING', 'GENERAL')

-- Notify PostgREST to reload the schema cache so the new column is visible to the API
NOTIFY pgrst, 'reload schema';

SELECT '121_quotation_item_clusters applied successfully' as result;
