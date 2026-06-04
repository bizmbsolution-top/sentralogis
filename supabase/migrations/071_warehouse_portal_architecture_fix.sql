-- Migration 071: Warehouse Portal Architecture (safe re-run)
-- Sama seperti 071 tapi pakai DROP IF EXISTS untuk policy

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
    UNIQUE(tenant_id, whatsapp)
);

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

CREATE TABLE IF NOT EXISTS wh_jo_staff_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    jo_id UUID NOT NULL REFERENCES job_orders(id) ON DELETE CASCADE,
    receipt_id UUID REFERENCES wh_inbound_receipts(id) ON DELETE CASCADE,
    shipment_id UUID REFERENCES wh_outbound_shipments(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES md_warehouse_staff(id) ON DELETE CASCADE,
    assigned_role TEXT NOT NULL CHECK (assigned_role IN ('SECURITY', 'TALLY', 'PUTAWAY')),
    status TEXT NOT NULL DEFAULT 'ASSIGNED' CHECK (status IN ('ASSIGNED', 'IN_PROGRESS', 'COMPLETED')),
    assigned_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(jo_id, staff_id)
);

-- RLS (safe re-run with DROP IF EXISTS)
ALTER TABLE md_warehouse_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE wh_staff_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE wh_jo_staff_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable ALL for authenticated" ON md_warehouse_staff;
DROP POLICY IF EXISTS "Enable ALL for authenticated" ON wh_staff_attendance;
DROP POLICY IF EXISTS "Enable ALL for authenticated" ON wh_jo_staff_assignments;
DROP POLICY IF EXISTS "Enable public SELECT for login" ON md_warehouse_staff;
DROP POLICY IF EXISTS "Enable public SELECT for attendance" ON wh_staff_attendance;
DROP POLICY IF EXISTS "Enable public INSERT for attendance" ON wh_staff_attendance;
DROP POLICY IF EXISTS "Enable public UPDATE for attendance" ON wh_staff_attendance;
DROP POLICY IF EXISTS "Enable public SELECT for assignments" ON wh_jo_staff_assignments;
DROP POLICY IF EXISTS "Enable public UPDATE for assignments" ON wh_jo_staff_assignments;

CREATE POLICY "Enable ALL for authenticated" ON md_warehouse_staff FOR ALL USING (true);
CREATE POLICY "Enable ALL for authenticated" ON wh_staff_attendance FOR ALL USING (true);
CREATE POLICY "Enable ALL for authenticated" ON wh_jo_staff_assignments FOR ALL USING (true);
CREATE POLICY "Enable public SELECT for login" ON md_warehouse_staff FOR SELECT USING (true);
CREATE POLICY "Enable public SELECT for attendance" ON wh_staff_attendance FOR SELECT USING (true);
CREATE POLICY "Enable public INSERT for attendance" ON wh_staff_attendance FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable public UPDATE for attendance" ON wh_staff_attendance FOR UPDATE USING (true);
CREATE POLICY "Enable public SELECT for assignments" ON wh_jo_staff_assignments FOR SELECT USING (true);
CREATE POLICY "Enable public UPDATE for assignments" ON wh_jo_staff_assignments FOR UPDATE USING (true);
