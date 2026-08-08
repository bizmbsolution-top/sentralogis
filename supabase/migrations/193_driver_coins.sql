-- =====================================================
-- Driver Coin Reward + WA Inquiry
-- 1 koin = Rp 5.000 per job completed
-- =====================================================

-- 1. Table driver_coins
CREATE TABLE IF NOT EXISTS driver_coins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES md_drivers(id) ON DELETE CASCADE,
  job_order_id UUID REFERENCES job_orders(id) ON DELETE SET NULL,
  coins INTEGER NOT NULL DEFAULT 1,
  coin_value NUMERIC NOT NULL DEFAULT 5000,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'available',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Add columns to md_drivers
ALTER TABLE md_drivers
  ADD COLUMN IF NOT EXISTS total_coins INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_coin_value NUMERIC NOT NULL DEFAULT 0;

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_driver_coins_driver ON driver_coins(driver_id, earned_at DESC);
CREATE INDEX IF NOT EXISTS idx_driver_coins_tenant ON driver_coins(tenant_id);
CREATE INDEX IF NOT EXISTS idx_driver_coins_job ON driver_coins(job_order_id);

-- 4. RLS Policy
ALTER TABLE driver_coins ENABLE ROW LEVEL SECURITY;

-- Driver can read their own coins
CREATE POLICY "driver_read_own_coins"
  ON driver_coins FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM tenant_users WHERE tenant_id = driver_coins.tenant_id
    )
  );

-- Tenant admin can read all
CREATE POLICY "tenant_admin_read_coins"
  ON driver_coins FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tenant_users tu
      WHERE tu.tenant_id = driver_coins.tenant_id
        AND tu.user_id = auth.uid()
        AND (tu.role IN ('owner', 'admin', 'hq_admin', 'sbu_admin', 'sbu_tr', 'sbu_fin_tr'))
    )
  );

-- 5. Function to award coins atomically (avoids double-credit)
CREATE OR REPLACE FUNCTION award_driver_coin(
  p_driver_id UUID,
  p_tenant_id UUID,
  p_job_order_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_existing BOOLEAN;
BEGIN
  -- Prevent double credit for same job
  SELECT EXISTS(
    SELECT 1 FROM driver_coins
    WHERE job_order_id = p_job_order_id AND driver_id = p_driver_id
  ) INTO v_existing;

  IF v_existing THEN
    RETURN FALSE;
  END IF;

  -- Insert coin record
  INSERT INTO driver_coins (tenant_id, driver_id, job_order_id, coins, coin_value)
  VALUES (p_tenant_id, p_driver_id, p_job_order_id, 1, 5000);

  -- Update running totals
  UPDATE md_drivers
  SET
    total_coins = total_coins + 1,
    total_coin_value = total_coin_value + 5000
  WHERE id = p_driver_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Function to get driver coin balance (for WA inquiry)
CREATE OR REPLACE FUNCTION get_driver_coin_balance(p_driver_id UUID)
RETURNS TABLE (
  total_coins INTEGER,
  total_coin_value NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT d.total_coins, d.total_coin_value
  FROM md_drivers d
  WHERE d.id = p_driver_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;