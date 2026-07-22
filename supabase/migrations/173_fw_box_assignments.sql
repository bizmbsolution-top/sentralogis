-- Migration 173: Box Layer for Forwarding Consolidations
-- Adds fw_box_assignments and fw_box_items for hierarchical packing:
-- Consolidation → Container → Box → Cargo Items

-- 1. fw_box_assignments
CREATE TABLE IF NOT EXISTS public.fw_box_assignments (
  id                      UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id               UUID NOT NULL,
  container_assignment_id UUID NOT NULL REFERENCES fw_container_assignments(id) ON DELETE CASCADE,
  box_code                TEXT NOT NULL,
  volume_cbm              NUMERIC,
  colli                   INTEGER,
  weight_kg               NUMERIC,
  seal_number             TEXT,
  status                  TEXT DEFAULT 'packed' CHECK (status IN ('packed','stuffed','shipped','arrived','deconsoled','returned')),
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT fw_box_assignments_unique UNIQUE (tenant_id, container_assignment_id, box_code)
);

CREATE INDEX IF NOT EXISTS idx_fw_box_assignments_container ON public.fw_box_assignments(container_assignment_id);
CREATE INDEX IF NOT EXISTS idx_fw_box_assignments_tenant ON public.fw_box_assignments(tenant_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fw_box_assignments TO authenticated;
ALTER TABLE public.fw_box_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fw_box_assignments_tenant_isolation" ON public.fw_box_assignments
FOR ALL TO authenticated
USING (tenant_id = public.get_my_tenant_id())
WITH CHECK (tenant_id = public.get_my_tenant_id());

-- 2. fw_box_items
CREATE TABLE IF NOT EXISTS public.fw_box_items (
  id                     UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id              UUID NOT NULL,
  box_assignment_id      UUID NOT NULL REFERENCES fw_box_assignments(id) ON DELETE CASCADE,
  wo_item_id             UUID NOT NULL REFERENCES wo_items(id) ON DELETE CASCADE,
  quantity               INTEGER DEFAULT 1,
  description            TEXT,
  commodity              TEXT,
  volume_cbm             NUMERIC,
  gross_weight_kg        NUMERIC,
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  updated_at             TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fw_box_items_box ON public.fw_box_items(box_assignment_id);
CREATE INDEX IF NOT EXISTS idx_fw_box_items_wo_item ON public.fw_box_items(wo_item_id);
CREATE INDEX IF NOT EXISTS idx_fw_box_items_tenant ON public.fw_box_items(tenant_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fw_box_items TO authenticated;
ALTER TABLE public.fw_box_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fw_box_items_tenant_isolation" ON public.fw_box_items
FOR ALL TO authenticated
USING (tenant_id = public.get_my_tenant_id())
WITH CHECK (tenant_id = public.get_my_tenant_id());

-- 3. Sequence for box codes per container
CREATE SEQUENCE IF NOT EXISTS fw_box_seq START 1;

CREATE OR REPLACE FUNCTION generate_fw_box_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.box_code IS NULL OR NEW.box_code = '' THEN
    NEW.box_code := 'BOX-' || LPAD(nextval('fw_box_seq')::TEXT, 3, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_generate_fw_box_code
BEFORE INSERT ON public.fw_box_assignments
FOR EACH ROW
EXECUTE FUNCTION generate_fw_box_code();

-- 4. Updated at triggers
CREATE TRIGGER trg_fw_box_assignments_updated_at
BEFORE UPDATE ON public.fw_box_assignments
FOR EACH ROW EXECUTE FUNCTION update_fw_tables_updated_at();

CREATE TRIGGER trg_fw_box_items_updated_at
BEFORE UPDATE ON public.fw_box_items
FOR EACH ROW EXECUTE FUNCTION update_fw_tables_updated_at();

-- 5. Helper function to get box summary for a container
CREATE OR REPLACE FUNCTION get_container_box_summary(p_container_id UUID)
RETURNS TABLE (
  total_boxes BIGINT,
  total_colli BIGINT,
  total_volume NUMERIC,
  total_weight NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT,
    COALESCE(SUM(ba.colli), 0)::BIGINT,
    COALESCE(SUM(ba.volume_cbm), 0),
    COALESCE(SUM(ba.weight_kg), 0)
  FROM public.fw_box_assignments ba
  WHERE ba.container_assignment_id = p_container_id;
END;
$$ LANGUAGE plpgsql;

NOTIFY pgrst, 'reload schema';
