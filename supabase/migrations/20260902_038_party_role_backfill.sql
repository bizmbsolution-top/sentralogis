-- ============================================================================
-- Migration: 20260902_038_party_role_backfill.sql
-- Description: DATA-3 Backfill party_roles from legacy is_vendor/is_customer/is_supplier/is_broker
-- Architecture: ADR-070 Party Role Architecture
-- ============================================================================

-- 1. Backfill VENDOR roles from is_vendor = true
-- Idempotent: only inserts if no existing VENDOR role
INSERT INTO public.party_roles (tenant_id, party_id, role_type, context_type, is_primary, created_at, updated_at)
SELECT
  e.tenant_id,
  e.id,
  'VENDOR',
  'GLOBAL',
  true,
  NOW(),
  NOW()
FROM public.md_entities e
WHERE e.is_vendor = true
  AND NOT EXISTS (
    SELECT 1 FROM public.party_roles pr
    WHERE pr.tenant_id = e.tenant_id
      AND pr.party_id = e.id
      AND pr.role_type = 'VENDOR'
      AND pr.context_type = 'GLOBAL'
  );

-- 2. Backfill CUSTOMER roles from is_customer = true
INSERT INTO public.party_roles (tenant_id, party_id, role_type, context_type, is_primary, created_at, updated_at)
SELECT
  e.tenant_id,
  e.id,
  'CUSTOMER',
  'GLOBAL',
  true,
  NOW(),
  NOW()
FROM public.md_entities e
WHERE e.is_customer = true
  AND NOT EXISTS (
    SELECT 1 FROM public.party_roles pr
    WHERE pr.tenant_id = e.tenant_id
      AND pr.party_id = e.id
      AND pr.role_type = 'CUSTOMER'
      AND pr.context_type = 'GLOBAL'
  );

-- 3. Backfill SUPPLIER roles from is_supplier = true
INSERT INTO public.party_roles (tenant_id, party_id, role_type, context_type, is_primary, created_at, updated_at)
SELECT
  e.tenant_id,
  e.id,
  'SUPPLIER',
  'GLOBAL',
  true,
  NOW(),
  NOW()
FROM public.md_entities e
WHERE e.is_supplier = true
  AND NOT EXISTS (
    SELECT 1 FROM public.party_roles pr
    WHERE pr.tenant_id = e.tenant_id
      AND pr.party_id = e.id
      AND pr.role_type = 'SUPPLIER'
      AND pr.context_type = 'GLOBAL'
  );

-- 4. Backfill BROKER roles from is_broker = true
INSERT INTO public.party_roles (tenant_id, party_id, role_type, context_type, is_primary, created_at, updated_at)
SELECT
  e.tenant_id,
  e.id,
  'BROKER',
  'GLOBAL',
  true,
  NOW(),
  NOW()
FROM public.md_entities e
WHERE e.is_broker = true
  AND NOT EXISTS (
    SELECT 1 FROM public.party_roles pr
    WHERE pr.tenant_id = e.tenant_id
      AND pr.party_id = e.id
      AND pr.role_type = 'BROKER'
      AND pr.context_type = 'GLOBAL'
  );

NOTIFY pgrst, 'reload schema';
