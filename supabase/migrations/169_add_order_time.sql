-- Migration 169: Add order_time to work_orders for execution-time correlation
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS order_time TEXT;

CREATE INDEX IF NOT EXISTS idx_work_orders_order_time ON work_orders (order_time);
