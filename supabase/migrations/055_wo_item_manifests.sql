-- Migration 055: Create WO Item Manifests for SBU Warehouse
CREATE TABLE IF NOT EXISTS public.wo_item_manifests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wo_item_id UUID NOT NULL REFERENCES public.wo_items(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  product_sku_id UUID NOT NULL REFERENCES public.md_product_skus(id) ON DELETE CASCADE,
  quantity NUMERIC(15, 2) NOT NULL DEFAULT 1,
  unit_weight_kg NUMERIC(12, 4) DEFAULT 0,
  unit_volume_m3 NUMERIC(12, 4) DEFAULT 0,
  total_weight_kg NUMERIC(15, 4) GENERATED ALWAYS AS (quantity * unit_weight_kg) STORED,
  total_volume_m3 NUMERIC(15, 4) GENERATED ALWAYS AS (quantity * unit_volume_m3) STORED,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wo_item_manifests_wo_item ON public.wo_item_manifests(wo_item_id);
CREATE INDEX IF NOT EXISTS idx_wo_item_manifests_tenant ON public.wo_item_manifests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_wo_item_manifests_sku ON public.wo_item_manifests(product_sku_id);

ALTER TABLE public.wo_item_manifests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS wo_item_manifests_all ON public.wo_item_manifests;
CREATE POLICY wo_item_manifests_all ON public.wo_item_manifests
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

SELECT '055_wo_item_manifests OK' AS result;
