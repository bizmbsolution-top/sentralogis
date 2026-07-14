-- Migration 149: Repacking Conversions Master Table

CREATE TABLE IF NOT EXISTS public.wh_repacking_conversions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.md_entities(id) ON DELETE CASCADE,
    source_product_id UUID REFERENCES public.md_product_skus(id) ON DELETE CASCADE,
    source_qty NUMERIC NOT NULL CHECK (source_qty > 0),
    target_product_id UUID REFERENCES public.md_product_skus(id) ON DELETE CASCADE,
    target_qty NUMERIC NOT NULL CHECK (target_qty > 0),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    UNIQUE(tenant_id, customer_id, source_product_id, target_product_id)
);

CREATE INDEX IF NOT EXISTS idx_wh_repacking_conversions_tenant ON public.wh_repacking_conversions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_wh_repacking_conversions_customer ON public.wh_repacking_conversions(customer_id);
CREATE INDEX IF NOT EXISTS idx_wh_repacking_conversions_source ON public.wh_repacking_conversions(source_product_id);
CREATE INDEX IF NOT EXISTS idx_wh_repacking_conversions_target ON public.wh_repacking_conversions(target_product_id);

-- Enable RLS
ALTER TABLE public.wh_repacking_conversions ENABLE ROW LEVEL SECURITY;

-- Basic Policies
CREATE POLICY "Tenant users can view repacking conversions"
    ON public.wh_repacking_conversions
    FOR SELECT
    USING (tenant_id IN (
        SELECT tenant_users.tenant_id FROM public.tenant_users WHERE tenant_users.user_id = auth.uid()
    ));

CREATE POLICY "Tenant admins and warehouse ops can manage repacking conversions"
    ON public.wh_repacking_conversions
    FOR ALL
    USING (tenant_id IN (
        SELECT tenant_users.tenant_id FROM public.tenant_users WHERE tenant_users.user_id = auth.uid()
    ));

DROP TRIGGER IF EXISTS update_wh_repacking_conversions_updated_at ON public.wh_repacking_conversions;
CREATE TRIGGER update_wh_repacking_conversions_updated_at
    BEFORE UPDATE ON public.wh_repacking_conversions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
