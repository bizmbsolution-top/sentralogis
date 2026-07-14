-- Migration 159: Alter warehouse staff role check constraint to include ADD_SERVICE role

ALTER TABLE md_warehouse_staff 
DROP CONSTRAINT IF EXISTS md_warehouse_staff_role_check;

ALTER TABLE md_warehouse_staff 
ADD CONSTRAINT md_warehouse_staff_role_check 
CHECK (role IN ('SECURITY', 'TALLY', 'PUTAWAY', 'ADMIN', 'ADD_SERVICE'));
