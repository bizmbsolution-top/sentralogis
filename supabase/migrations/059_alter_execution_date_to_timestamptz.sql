-- Migration 059: Alter execution_date to TIMESTAMPTZ to support execution_time
ALTER TABLE work_orders ALTER COLUMN execution_date TYPE TIMESTAMPTZ USING execution_date::timestamptz;
