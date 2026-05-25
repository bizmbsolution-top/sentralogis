-- Migration 040: Enable RLS and Add Policies for tenant_sbus
-- Eksekusi file ini di Supabase SQL Editor (untuk memperbaiki error 403 / RLS saat tambah SBU)

ALTER TABLE IF EXISTS public.tenant_sbus ENABLE ROW LEVEL SECURITY;

-- Hapus policy lama jika ada
DROP POLICY IF EXISTS "tenant_sbus_isolation" ON public.tenant_sbus;
DROP POLICY IF EXISTS "tenant_sbus_select" ON public.tenant_sbus;
DROP POLICY IF EXISTS "tenant_sbus_insert" ON public.tenant_sbus;
DROP POLICY IF EXISTS "tenant_sbus_all" ON public.tenant_sbus;

-- Buat policy baru yang sesuai dengan standar isolation tenant di project ini
CREATE POLICY "tenant_sbus_isolation" ON public.tenant_sbus
FOR ALL USING (
  tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
);

-- Verifikasi
SELECT '040_tenant_sbus_rls OK' AS result;
