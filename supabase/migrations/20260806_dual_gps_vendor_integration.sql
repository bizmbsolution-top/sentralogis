-- Dual GPS Source + Cross-Tenant Vendor Integration
-- Adds vendor_tenant_id to enable cross-tenant vendor fleet visibility

-- 1. Add vendor_tenant_id to md_entities (vendor master data)
ALTER TABLE public.md_entities
ADD COLUMN IF NOT EXISTS vendor_tenant_id UUID REFERENCES public.tenants(id);

-- 2. Add vendor_tenant_id to job_orders (which tenant owns the assigned vendor fleet)
ALTER TABLE public.job_orders
ADD COLUMN IF NOT EXISTS vendor_tenant_id UUID REFERENCES public.tenants(id);

-- 3. Add vendor_tenant_id to md_fleets (original tenant of fleet, for cross-tenant ref)
ALTER TABLE public.md_fleets
ADD COLUMN IF NOT EXISTS vendor_tenant_id UUID REFERENCES public.tenants(id);

-- 4. Indexes for cross-tenant queries
CREATE INDEX IF NOT EXISTS idx_fleet_gps_status_tenant_id
ON public.fleet_gps_status(tenant_id);

CREATE INDEX IF NOT EXISTS idx_job_orders_vendor_tenant_id
ON public.job_orders(vendor_tenant_id);

CREATE INDEX IF NOT EXISTS idx_md_fleets_vendor_tenant_id
ON public.md_fleets(vendor_tenant_id);

-- 5. Add GPS source indicator comment
COMMENT ON COLUMN public.fleet_gps_status.provider IS
'GPS source: easygo (hardware), pwa (browser), native_android (app), native_android_offline';
