-- Migration 041: Add Performance Indexes to speed up login and dashboard loading
-- Eksekusi file ini di Supabase SQL Editor

-- 1. Index untuk mempercepat proses Login (cek role dan hak akses)
CREATE INDEX IF NOT EXISTS idx_tenant_users_user_id ON public.tenant_users(user_id);
CREATE INDEX IF NOT EXISTS idx_tenant_users_tenant_id ON public.tenant_users(tenant_id);

-- 2. Index untuk mempercepat loading halaman Dashboard (menghindari full table scan)
CREATE INDEX IF NOT EXISTS idx_job_orders_tenant_id ON public.job_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_wo_items_tenant_id ON public.wo_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_md_drivers_tenant_id ON public.md_drivers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_md_fleets_tenant_id ON public.md_fleets(tenant_id);

SELECT '041_performance_indexes OK' AS result;
