-- Migration 071: Warehouse Portal Architecture
-- Creates standalone warehouse staff tables, attendance, and job assignments
-- Similar to Driver Portal Architecture for isolated WA+PIN login and strict role execution.

-- ============================================
-- 1. MASTER WAREHOUSE STAFF
-- ============================================
CREATE TABLE IF NOT EXISTS md_warehouse_staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    sbu_id UUID NOT NULL REFERENCES tenant_sbus(id) ON DELETE CASCADE,
    warehouse_id UUID REFERENCES md_warehouses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    whatsapp TEXT NOT NULL,
    pin TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('SECURITY', 'TALLY', 'PUTAWAY', 'ADMIN')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- WhatsApp must be unique per tenant so login is unambiguous
    UNIQUE(tenant_id, whatsapp)
);

CREATE INDEX IF NOT EXISTS idx_md_wh_staff_tenant ON md_warehouse_staff(tenant_id);
CREATE INDEX IF NOT EXISTS idx_md_wh_staff_sbu ON md_warehouse_staff(sbu_id);
CREATE INDEX IF NOT EXISTS idx_md_wh_staff_wa ON md_warehouse_staff(whatsapp);

-- ============================================
-- 2. WAREHOUSE STAFF ATTENDANCE
-- ============================================
-- (Note: 038_wms_staff_attendance used user_id. We create a dedicated one for the new md_warehouse_staff)
CREATE TABLE IF NOT EXISTS wh_staff_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    staff_id UUID NOT NULL REFERENCES md_warehouse_staff(id) ON DELETE CASCADE,
    check_in_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    check_out_time TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'CHECK_IN' CHECK (status IN ('CHECK_IN', 'CHECK_OUT')),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wh_staff_att_tenant ON wh_staff_attendance(tenant_id);
CREATE INDEX IF NOT EXISTS idx_wh_staff_att_staff ON wh_staff_attendance(staff_id);

-- ============================================
-- 3. WAREHOUSE JO STAFF ASSIGNMENTS (INBOX)
-- ============================================
-- Used to push JOs directly to a specific staff's inbox based on their role
CREATE TABLE IF NOT EXISTS wh_jo_staff_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    jo_id UUID NOT NULL REFERENCES job_orders(id) ON DELETE CASCADE,
    receipt_id UUID REFERENCES wh_inbound_receipts(id) ON DELETE CASCADE,
    shipment_id UUID REFERENCES wh_outbound_shipments(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES md_warehouse_staff(id) ON DELETE CASCADE,
    assigned_role TEXT NOT NULL CHECK (assigned_role IN ('SECURITY', 'TALLY', 'PUTAWAY')),
    status TEXT NOT NULL DEFAULT 'ASSIGNED' CHECK (status IN ('ASSIGNED', 'IN_PROGRESS', 'COMPLETED')),
    assigned_by UUID, -- Profile ID of the admin who assigned it
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Prevent duplicate assignments for the same staff on the same task
    UNIQUE(jo_id, staff_id)
);

CREATE INDEX IF NOT EXISTS idx_wh_jo_assign_tenant ON wh_jo_staff_assignments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_wh_jo_assign_staff ON wh_jo_staff_assignments(staff_id);
CREATE INDEX IF NOT EXISTS idx_wh_jo_assign_jo ON wh_jo_staff_assignments(jo_id);

-- ============================================
-- RLS POLICIES (Superadmin / Dashboard Access)
-- ============================================
ALTER TABLE md_warehouse_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE wh_staff_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE wh_jo_staff_assignments ENABLE ROW LEVEL SECURITY;

-- Temporary bypass for development (Allows backend/API and authenticated UI to access it)
-- Since PWA uses LocalStorage session, API endpoints or custom logic will use Service Role 
-- or we can allow public read for matched PINS. For now, enable for authenticated.
CREATE POLICY "Enable ALL for authenticated" ON md_warehouse_staff FOR ALL USING (true);
CREATE POLICY "Enable ALL for authenticated" ON wh_staff_attendance FOR ALL USING (true);
CREATE POLICY "Enable ALL for authenticated" ON wh_jo_staff_assignments FOR ALL USING (true);

-- Allow public access for login validation from the PWA (Since PWA users aren't Supabase auth users yet)
CREATE POLICY "Enable public SELECT for login" ON md_warehouse_staff FOR SELECT USING (true);
CREATE POLICY "Enable public SELECT for attendance" ON wh_staff_attendance FOR SELECT USING (true);
CREATE POLICY "Enable public INSERT for attendance" ON wh_staff_attendance FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable public UPDATE for attendance" ON wh_staff_attendance FOR UPDATE USING (true);
CREATE POLICY "Enable public SELECT for assignments" ON wh_jo_staff_assignments FOR SELECT USING (true);
CREATE POLICY "Enable public UPDATE for assignments" ON wh_jo_staff_assignments FOR UPDATE USING (true);
