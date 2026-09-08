-- ============================================================================
-- Migration: 20260826_002_commercial_and_service_scopes.sql
-- Description: Commercial Domain Canonical Schema (Service Scopes, Work Orders, Line Items)
-- Architecture: Sentralogis Target Architecture v1.0 (Phase 1)
-- ============================================================================

-- 1. commercial_service_scopes
CREATE TABLE IF NOT EXISTS public.commercial_service_scopes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.md_tenants(id),
  scope_code TEXT NOT NULL,
  scope_name TEXT NOT NULL,
  incoterm com_incoterm_type NOT NULL DEFAULT 'DAP',
  incoterm_named_place TEXT,
  origin_scope_node_id UUID REFERENCES public.md_locations(id),
  dest_scope_node_id UUID REFERENCES public.md_locations(id),
  included_services TEXT[] NOT NULL DEFAULT '{}',
  excluded_services TEXT[] NOT NULL DEFAULT '{}',
  billing_currency TEXT NOT NULL DEFAULT 'IDR',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  version_no INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  CONSTRAINT uq_com_scope_code UNIQUE (tenant_id, scope_code)
);

-- 2. commercial_work_orders
CREATE TABLE IF NOT EXISTS public.commercial_work_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.md_tenants(id),
  wo_number TEXT NOT NULL,
  customer_id UUID NOT NULL REFERENCES public.md_entities(id),
  service_scope_id UUID NOT NULL REFERENCES public.commercial_service_scopes(id),
  contract_reference TEXT,
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  target_fulfillment_date DATE,
  status com_work_order_status NOT NULL DEFAULT 'DRAFT',
  currency TEXT NOT NULL DEFAULT 'IDR',
  total_agreed_revenue NUMERIC(18, 2) NOT NULL DEFAULT 0,
  payment_terms_days INTEGER NOT NULL DEFAULT 30,
  commercial_notes TEXT,
  version_no INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  CONSTRAINT uq_com_wo_number UNIQUE (tenant_id, wo_number)
);

-- 3. commercial_line_items
CREATE TABLE IF NOT EXISTS public.commercial_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.md_tenants(id),
  work_order_id UUID NOT NULL REFERENCES public.commercial_work_orders(id) ON DELETE CASCADE,
  line_sequence INTEGER NOT NULL DEFAULT 1,
  service_product_sku TEXT NOT NULL,
  service_description TEXT NOT NULL,
  quantity NUMERIC(15, 3) NOT NULL DEFAULT 1,
  unit_of_measure TEXT NOT NULL DEFAULT 'UNIT',
  unit_sell_price NUMERIC(18, 2) NOT NULL DEFAULT 0,
  total_sell_price NUMERIC(18, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_com_wo_line_seq UNIQUE (work_order_id, line_sequence)
);

-- 4. INDEXES
CREATE INDEX IF NOT EXISTS idx_com_scopes_tenant ON public.commercial_service_scopes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_com_wo_tenant ON public.commercial_work_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_com_wo_customer ON public.commercial_work_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_com_wo_scope ON public.commercial_work_orders(service_scope_id);
CREATE INDEX IF NOT EXISTS idx_com_wo_status ON public.commercial_work_orders(status);
CREATE INDEX IF NOT EXISTS idx_com_lines_wo ON public.commercial_line_items(work_order_id);

-- 5. GRANTS
GRANT SELECT, INSERT, UPDATE, DELETE ON public.commercial_service_scopes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.commercial_work_orders TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.commercial_line_items TO authenticated;

-- 6. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.commercial_service_scopes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commercial_work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commercial_line_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS com_service_scopes_isolation ON public.commercial_service_scopes;
CREATE POLICY com_service_scopes_isolation ON public.commercial_service_scopes
  FOR ALL TO authenticated
  USING (tenant_id = public.get_my_tenant_id())
  WITH CHECK (tenant_id = public.get_my_tenant_id());

DROP POLICY IF EXISTS com_work_orders_isolation ON public.commercial_work_orders;
CREATE POLICY com_work_orders_isolation ON public.commercial_work_orders
  FOR ALL TO authenticated
  USING (tenant_id = public.get_my_tenant_id())
  WITH CHECK (tenant_id = public.get_my_tenant_id());

DROP POLICY IF EXISTS com_line_items_isolation ON public.commercial_line_items;
CREATE POLICY com_line_items_isolation ON public.commercial_line_items
  FOR ALL TO authenticated
  USING (tenant_id = public.get_my_tenant_id())
  WITH CHECK (tenant_id = public.get_my_tenant_id());

-- Notify PostgREST schema cache
NOTIFY pgrst, 'reload schema';
