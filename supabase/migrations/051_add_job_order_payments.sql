-- Migration 051: Create job_order_payments table
-- Tracks hybrid payment (SBU/HQ) for driver advance, vendor DP, pelunasan, extra costs
-- Includes who paid, timestamp, transfer proof, and verification status

CREATE TABLE IF NOT EXISTS job_order_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_order_id UUID NOT NULL REFERENCES job_orders(id) ON DELETE CASCADE,

  payment_type TEXT NOT NULL CHECK (payment_type IN (
    'advance_driver',
    'pelunasan_driver',
    'advance_vendor',
    'pelunasan_vendor',
    'extra_cost'
  )),

  amount NUMERIC NOT NULL CHECK (amount > 0),

  paid_by TEXT NOT NULL CHECK (paid_by IN ('sbu', 'hq')),
  paid_by_user UUID REFERENCES auth.users(id),

  paid_at TIMESTAMPTZ DEFAULT now(),
  transfer_proof_url TEXT,
  notes TEXT,

  status TEXT NOT NULL DEFAULT 'paid' CHECK (status IN ('paid', 'verified')),
  verified_by UUID REFERENCES auth.users(id),
  verified_at TIMESTAMPTZ,

  extra_cost_id UUID REFERENCES extra_costs(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_jo_payments_job_order ON job_order_payments(job_order_id);
CREATE INDEX IF NOT EXISTS idx_jo_payments_type ON job_order_payments(payment_type);
CREATE INDEX IF NOT EXISTS idx_jo_payments_status ON job_order_payments(status);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_jo_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_jo_payments_updated_at ON job_order_payments;
CREATE TRIGGER trg_jo_payments_updated_at
  BEFORE UPDATE ON job_order_payments
  FOR EACH ROW EXECUTE FUNCTION update_jo_payments_updated_at();

-- RLS: allow read, insert, and update using standard app-isolation pattern (consistent with extra_costs and job_orders)
ALTER TABLE job_order_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "job_order_payments_isolation"
  ON job_order_payments
  USING (true)
  WITH CHECK (true);

-- Create storage bucket for payment proofs
INSERT INTO storage.buckets (id, name, public) VALUES ('payment-proofs', 'payment-proofs', true)
ON CONFLICT (id) DO NOTHING;

SELECT '051_add_job_order_payments OK' AS result;
