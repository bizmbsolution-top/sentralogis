-- Migration 165: Support Multi-Role for Warehouse Ground Staff
-- Adds `roles` (TEXT[]) column to `md_warehouse_staff` and syncs with `role` column

ALTER TABLE md_warehouse_staff 
ADD COLUMN IF NOT EXISTS roles TEXT[] DEFAULT '{}'::TEXT[];

-- Backfill existing staff rows to have array of roles based on single `role`
UPDATE md_warehouse_staff 
SET roles = ARRAY[role] 
WHERE (roles IS NULL OR roles = '{}'::TEXT[]) AND role IS NOT NULL;

-- Create sync function to keep `role` (primary role) and `roles` (all roles) in sync
CREATE OR REPLACE FUNCTION sync_warehouse_staff_roles()
RETURNS TRIGGER AS $$
BEGIN
    -- If `roles` array is provided and not empty, ensure primary `role` is set to the first element if needed
    IF NEW.roles IS NOT NULL AND ARRAY_LENGTH(NEW.roles, 1) > 0 THEN
        IF NEW.role IS NULL OR NOT (NEW.role = ANY(NEW.roles)) THEN
            NEW.role := NEW.roles[1];
        END IF;
    -- If `roles` array is empty or null, but `role` exists, populate `roles` array from `role`
    ELSIF NEW.role IS NOT NULL THEN
        NEW.roles := ARRAY[NEW.role];
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_warehouse_staff_roles ON md_warehouse_staff;

CREATE TRIGGER trg_sync_warehouse_staff_roles
BEFORE INSERT OR UPDATE ON md_warehouse_staff
FOR EACH ROW
EXECUTE FUNCTION sync_warehouse_staff_roles();
