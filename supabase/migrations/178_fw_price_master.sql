-- 178_fw_price_master.sql
-- Migration to add missing fields to fw_price_master
-- Add tracking_token, sub_type, cargo_owner_id, vendor_origin_cost_breakdown, vendor_destination_cost_breakdown
-- Modify column sizes maybe

ALTER TABLE public.fw_price_master 
  ADD COLUMN IF NOT EXISTS tracking_token TEXT,
  ADD COLUMN IF NOT EXISTS sub_type TEXT NOT NULL DEFAULT 'standard' CHECK (sub_type IN ('standard', 'fragile', 'hazardous', 'temperature_controlled')),
  ADD COLUMN IF NOT EXISTS cargo_owner_id UUID REFERENCES customers(customer_id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS vendor_origin_cost_breakdown JSONB,
  ADD COLUMN IF NOT EXISTS vendor_destination_cost_breakdown JSONB,
  ADD COLUMN IF NOT EXISTS master_cost_origin_amount NUMERIC(18,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS master_cost_destination_amount NUMERIC(18,2) DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_fw_price_master_tracking_token ON public.fw_price_master(tracking_token);
CREATE INDEX IF NOT EXISTS idx_fw_price_master_sub_type ON public.fw_price_master(sub_type);
CREATE INDEX IF NOT EXISTS idx_fw_price_master_cargo_owner_id ON public.fw_price_master(cargo_owner_id);