-- ============================================================================
-- Migration: 20260902_035_party_role_foundation.sql
-- Description: DATA-3 Canonical Party Role Foundation
-- Architecture: ADR-070 Party Role Architecture (Amended)
-- ============================================================================

-- 1. party_roles — Canonical contextual Party role authority
CREATE TABLE IF NOT EXISTS public.party_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  party_id UUID NOT NULL REFERENCES public.md_entities(id) ON DELETE CASCADE,
  role_type TEXT NOT NULL,
  context_type TEXT NOT NULL DEFAULT 'GLOBAL' CHECK (context_type IN ('GLOBAL', 'ENGAGEMENT', 'ORDER', 'CONTRACT')),
  context_id UUID,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  effective_from DATE,
  effective_to DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  CONSTRAINT uq_party_role UNIQUE (tenant_id, party_id, role_type, context_type, context_id)
);

CREATE INDEX IF NOT EXISTS idx_party_roles_tenant ON public.party_roles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_party_roles_party ON public.party_roles(party_id);
CREATE INDEX IF NOT EXISTS idx_party_roles_type ON public.party_roles(role_type);
CREATE INDEX IF NOT EXISTS idx_party_roles_context ON public.party_roles(context_type, context_id);
CREATE INDEX IF NOT EXISTS idx_party_roles_tenant_party ON public.party_roles(tenant_id, party_id);
CREATE INDEX IF NOT EXISTS idx_party_roles_active ON public.party_roles(tenant_id, party_id, is_active) WHERE is_active = true;

ALTER TABLE public.party_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "party_roles_tenant_isolation" ON public.party_roles;
CREATE POLICY "party_roles_tenant_isolation" ON public.party_roles
FOR ALL TO authenticated
USING (tenant_id = public.get_my_tenant_id())
WITH CHECK (tenant_id = public.get_my_tenant_id());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.party_roles TO authenticated;

-- 2. party_relationships — Party-to-party business relationships
CREATE TABLE IF NOT EXISTS public.party_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  from_party_id UUID NOT NULL REFERENCES public.md_entities(id) ON DELETE CASCADE,
  to_party_id UUID NOT NULL REFERENCES public.md_entities(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL,
  effective_from DATE,
  effective_to DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  CONSTRAINT uq_party_relationship UNIQUE (tenant_id, from_party_id, to_party_id, relationship_type),
  CONSTRAINT chk_party_relationship_different CHECK (from_party_id <> to_party_id)
);

CREATE INDEX IF NOT EXISTS idx_party_rel_tenant ON public.party_relationships(tenant_id);
CREATE INDEX IF NOT EXISTS idx_party_rel_from ON public.party_relationships(from_party_id);
CREATE INDEX IF NOT EXISTS idx_party_rel_to ON public.party_relationships(to_party_id);
CREATE INDEX IF NOT EXISTS idx_party_rel_type ON public.party_relationships(relationship_type);

ALTER TABLE public.party_relationships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "party_relationships_tenant_isolation" ON public.party_relationships;
CREATE POLICY "party_relationships_tenant_isolation" ON public.party_relationships
FOR ALL TO authenticated
USING (tenant_id = public.get_my_tenant_id())
WITH CHECK (tenant_id = public.get_my_tenant_id());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.party_relationships TO authenticated;

-- 3. party_contacts — Party communication contacts
CREATE TABLE IF NOT EXISTS public.party_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  party_id UUID NOT NULL REFERENCES public.md_entities(id) ON DELETE CASCADE,
  contact_name TEXT NOT NULL,
  contact_role TEXT,
  department TEXT,
  title TEXT,
  email TEXT,
  phone TEXT,
  mobile TEXT,
  whatsapp TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  CONSTRAINT uq_party_contact_primary UNIQUE (tenant_id, party_id, contact_role, is_primary)
);

CREATE INDEX IF NOT EXISTS idx_party_contacts_tenant ON public.party_contacts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_party_contacts_party ON public.party_contacts(party_id);
CREATE INDEX IF NOT EXISTS idx_party_contacts_active ON public.party_contacts(tenant_id, party_id, is_active) WHERE is_active = true;

ALTER TABLE public.party_contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "party_contacts_tenant_isolation" ON public.party_contacts;
CREATE POLICY "party_contacts_tenant_isolation" ON public.party_contacts
FOR ALL TO authenticated
USING (tenant_id = public.get_my_tenant_id())
WITH CHECK (tenant_id = public.get_my_tenant_id());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.party_contacts TO authenticated;

-- 4. party_locations — Party-to-location relationships
CREATE TABLE IF NOT EXISTS public.party_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  party_id UUID NOT NULL REFERENCES public.md_entities(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES public.md_locations(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL CHECK (relationship_type IN ('OWNS', 'OPERATES', 'MANAGES', 'USES', 'LOCATED_AT')),
  is_primary BOOLEAN NOT NULL DEFAULT false,
  effective_from DATE,
  effective_to DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  CONSTRAINT uq_party_location UNIQUE (tenant_id, party_id, location_id, relationship_type)
);

CREATE INDEX IF NOT EXISTS idx_party_locations_tenant ON public.party_locations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_party_locations_party ON public.party_locations(party_id);
CREATE INDEX IF NOT EXISTS idx_party_locations_location ON public.party_locations(location_id);
CREATE INDEX IF NOT EXISTS idx_party_locations_rel_type ON public.party_locations(relationship_type);

ALTER TABLE public.party_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "party_locations_tenant_isolation" ON public.party_locations;
CREATE POLICY "party_locations_tenant_isolation" ON public.party_locations
FOR ALL TO authenticated
USING (tenant_id = public.get_my_tenant_id())
WITH CHECK (tenant_id = public.get_my_tenant_id());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.party_locations TO authenticated;

-- 5. Updated at trigger for new tables
CREATE OR REPLACE FUNCTION update_party_tables_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_party_roles_updated_at ON public.party_roles;
CREATE TRIGGER trg_party_roles_updated_at
BEFORE UPDATE ON public.party_roles
FOR EACH ROW EXECUTE FUNCTION update_party_tables_updated_at();

DROP TRIGGER IF EXISTS trg_party_relationships_updated_at ON public.party_relationships;
CREATE TRIGGER trg_party_relationships_updated_at
BEFORE UPDATE ON public.party_relationships
FOR EACH ROW EXECUTE FUNCTION update_party_tables_updated_at();

DROP TRIGGER IF EXISTS trg_party_contacts_updated_at ON public.party_contacts;
CREATE TRIGGER trg_party_contacts_updated_at
BEFORE UPDATE ON public.party_contacts
FOR EACH ROW EXECUTE FUNCTION update_party_tables_updated_at();

DROP TRIGGER IF EXISTS trg_party_locations_updated_at ON public.party_locations;
CREATE TRIGGER trg_party_locations_updated_at
BEFORE UPDATE ON public.party_locations
FOR EACH ROW EXECUTE FUNCTION update_party_tables_updated_at();

NOTIFY pgrst, 'reload schema';
