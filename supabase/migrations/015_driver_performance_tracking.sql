-- Migration 015: Driver Performance Tracking
-- 1. Auto-accumulate distance from completed jobs to md_drivers.total_km_driven
-- 2. Optional customer review score per job order
-- 3. driver_performance_logs for audit trail

-- ============================================================
-- 0. ADD: Customer review columns to job_orders
-- ============================================================

ALTER TABLE job_orders ADD COLUMN IF NOT EXISTS customer_review_score SMALLINT;
ALTER TABLE job_orders ADD COLUMN IF NOT EXISTS customer_review_notes TEXT;
ALTER TABLE job_orders ADD COLUMN IF NOT EXISTS customer_reviewed_at TIMESTAMPTZ;

COMMENT ON COLUMN job_orders.customer_review_score IS 'Rating 1-5 from customer (optional)';
COMMENT ON COLUMN job_orders.customer_review_notes IS 'Optional feedback text from customer';

-- ============================================================
-- 1. ADD: Performance metrics to md_drivers
-- ============================================================

ALTER TABLE md_drivers ADD COLUMN IF NOT EXISTS avg_review_score DECIMAL(3,2) DEFAULT 0;
ALTER TABLE md_drivers ADD COLUMN IF NOT EXISTS total_reviews INT DEFAULT 0;
ALTER TABLE md_drivers ADD COLUMN IF NOT EXISTS total_distance_km NUMERIC(15,2) DEFAULT 0;

COMMENT ON COLUMN md_drivers.avg_review_score IS 'Average customer review score (1-5)';
COMMENT ON COLUMN md_drivers.total_reviews IS 'Total number of customer reviews received';
COMMENT ON COLUMN md_drivers.total_distance_km IS 'Accumulated distance from all completed jobs';

-- ============================================================
-- 2. ENHANCE: driver_performance_logs table (if not exists)
-- ============================================================

CREATE TABLE IF NOT EXISTS driver_performance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES md_drivers(id),
  job_order_id UUID NOT NULL REFERENCES job_orders(id),
  type TEXT NOT NULL CHECK (type IN ('KM_LOG', 'SAFETY_INCIDENT', 'REVIEW')),
  km_start NUMERIC(12,2),
  km_end NUMERIC(12,2),
  total_km NUMERIC(12,2),
  review_score SMALLINT,
  review_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_driver_perf_driver ON driver_performance_logs(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_perf_job ON driver_performance_logs(job_order_id);
CREATE INDEX IF NOT EXISTS idx_driver_perf_type ON driver_performance_logs(type);

-- ============================================================
-- 3. ENHANCE: handle_job_status_change() trigger
--    Add distance accumulation + review logging on completion
-- ============================================================

CREATE OR REPLACE FUNCTION handle_job_status_change()
RETURNS TRIGGER AS $$
DECLARE
  active_job_count_driver INT;
  active_job_count_fleet INT;
  has_active_shift BOOLEAN;
  v_job_distance NUMERIC;
  v_driver_current_km NUMERIC;
  v_driver_current_reviews INT;
  v_driver_current_avg DECIMAL;
  v_driver RECORD;
BEGIN
  -- Only process on status change
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Handle job completion/cancellation
  IF NEW.status IN ('SELESAI', 'COMPLETED', 'PEKERJAAN SELESAI', 'VERIFIED', 'READY_FOR_BILLING', 'PAID', 'INVOICED', 'DONE', 'cancelled', 'rejected') THEN
    
    -- ===== DISTANCE ACCUMULATION =====
    -- Only accumulate for successful completion (not cancelled/rejected)
    IF NEW.driver_id IS NOT NULL AND NEW.status NOT IN ('cancelled', 'rejected') THEN
      
      -- Get distance from job_routes (last stop)
      SELECT COALESCE(distance_km, 0) INTO v_job_distance
      FROM job_routes
      WHERE job_order_id = NEW.id
      ORDER BY sequence DESC
      LIMIT 1;
      
      -- If distance_km is 0 or null, try to get from wo_items.item_data
      IF v_job_distance = 0 OR v_job_distance IS NULL THEN
        SELECT COALESCE((wi.item_data->>'est_distance_km')::NUMERIC, 0) INTO v_job_distance
        FROM job_orders jo
        LEFT JOIN wo_items wi ON wi.id = jo.wo_item_id
        WHERE jo.id = NEW.id;
      END IF;
      
      -- Only log if we have a valid distance
      IF v_job_distance > 0 THEN
        -- Get current driver stats
        SELECT total_km_driven, total_reviews, avg_review_score INTO v_driver
        FROM md_drivers WHERE id = NEW.driver_id;
        
        v_driver_current_km := COALESCE(v_driver.total_km_driven, 0);
        
        -- Update driver total_km_driven
        UPDATE md_drivers
        SET total_km_driven = v_driver_current_km + v_job_distance,
            total_distance_km = v_driver_current_km + v_job_distance,
            updated_at = NOW()
        WHERE id = NEW.driver_id;
        
        -- Log to driver_performance_logs
        INSERT INTO driver_performance_logs (driver_id, job_order_id, type, total_km)
        VALUES (NEW.driver_id, NEW.id, 'KM_LOG', v_job_distance);
      END IF;
    END IF;
    
    -- ===== CUSTOMER REVIEW ACCUMULATION =====
    -- If customer has left a review, accumulate it
    IF NEW.driver_id IS NOT NULL AND NEW.customer_review_score IS NOT NULL AND NEW.customer_review_score > 0 THEN
      
      SELECT total_reviews, avg_review_score INTO v_driver
      FROM md_drivers WHERE id = NEW.driver_id;
      
      v_driver_current_reviews := COALESCE(v_driver.total_reviews, 0);
      v_driver_current_avg := COALESCE(v_driver.avg_review_score, 0);
      
      -- Calculate new average
      IF v_driver_current_reviews = 0 THEN
        v_driver_current_avg := NEW.customer_review_score;
      ELSE
        v_driver_current_avg := ((v_driver_current_avg * v_driver_current_reviews) + NEW.customer_review_score) / (v_driver_current_reviews + 1);
      END IF;
      
      UPDATE md_drivers
      SET total_reviews = v_driver_current_reviews + 1,
          avg_review_score = ROUND(v_driver_current_avg::NUMERIC, 2),
          updated_at = NOW()
      WHERE id = NEW.driver_id;
      
      -- Log review to driver_performance_logs
      INSERT INTO driver_performance_logs (driver_id, job_order_id, type, review_score, review_notes)
      VALUES (NEW.driver_id, NEW.id, 'REVIEW', NEW.customer_review_score, NEW.customer_review_notes);
    END IF;
    
    -- ===== STATUS RESET (existing logic) =====
    IF NEW.driver_id IS NOT NULL THEN
      SELECT COUNT(*) INTO active_job_count_driver
      FROM job_orders 
      WHERE driver_id = NEW.driver_id 
        AND status NOT IN ('SELESAI', 'COMPLETED', 'PEKERJAAN SELESAI', 'VERIFIED', 'READY_FOR_BILLING', 'PAID', 'INVOICED', 'DONE', 'cancelled', 'rejected', 'draft', 'pending')
        AND id != NEW.id;

      SELECT EXISTS (
        SELECT 1 FROM driver_attendance
        WHERE driver_id = NEW.driver_id
          AND status = 'CHECK_IN'
          AND check_in::date = CURRENT_DATE
      ) INTO has_active_shift;

      IF active_job_count_driver = 0 AND NOT has_active_shift THEN
        UPDATE md_drivers 
        SET 
          is_working = false,
          status = 'available',
          updated_at = NOW()
        WHERE id = NEW.driver_id;
      ELSIF active_job_count_driver = 0 AND has_active_shift THEN
        UPDATE md_drivers 
        SET 
          status = 'available',
          updated_at = NOW()
        WHERE id = NEW.driver_id
          AND status != 'unavailable';
      END IF;
    END IF;
    
    IF NEW.fleet_id IS NOT NULL THEN
      SELECT COUNT(*) INTO active_job_count_fleet
      FROM job_orders 
      WHERE fleet_id = NEW.fleet_id 
        AND status NOT IN ('SELESAI', 'COMPLETED', 'PEKERJAAN SELESAI', 'VERIFIED', 'READY_FOR_BILLING', 'PAID', 'INVOICED', 'DONE', 'cancelled', 'rejected', 'draft', 'pending')
        AND id != NEW.id;

      IF active_job_count_fleet = 0 THEN
        UPDATE md_fleets 
        SET 
          status = 'available',
          updated_at = NOW()
        WHERE id = NEW.fleet_id;
      END IF;
    END IF;

  -- Handle job assignment
  ELSIF NEW.status = 'assigned' AND (OLD.status = 'draft' OR OLD.status = 'pending') THEN
    
    IF NEW.driver_id IS NOT NULL THEN
      UPDATE md_drivers 
      SET 
        is_working = true,
        status = 'on_duty',
        updated_at = NOW()
      WHERE id = NEW.driver_id
        AND status != 'unavailable';
    END IF;
    
    IF NEW.fleet_id IS NOT NULL THEN
      UPDATE md_fleets 
      SET 
        status = 'on_road',
        updated_at = NOW()
      WHERE id = NEW.fleet_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 4. ADD: Function to backfill existing completed jobs
--    Run once to populate historical data
-- ============================================================

CREATE OR REPLACE FUNCTION backfill_driver_distances()
RETURNS TABLE(
  jobs_processed INT,
  total_km_added NUMERIC,
  drivers_updated INT
) AS $$
DECLARE
  v_jobs_processed INT := 0;
  v_total_km NUMERIC := 0;
  v_drivers_updated INT := 0;
  v_job RECORD;
  v_job_distance NUMERIC;
  v_driver_km NUMERIC;
BEGIN
  FOR v_job IN 
    SELECT jo.id, jo.driver_id, jo.status
    FROM job_orders jo
    WHERE jo.driver_id IS NOT NULL
      AND jo.status IN ('SELESAI', 'COMPLETED', 'PEKERJAAN SELESAI')
      AND NOT EXISTS (
        SELECT 1 FROM driver_performance_logs dpl
        WHERE dpl.job_order_id = jo.id AND dpl.type = 'KM_LOG'
      )
  LOOP
    -- Get distance
    SELECT COALESCE(distance_km, 0) INTO v_job_distance
    FROM job_routes
    WHERE job_order_id = v_job.id
    ORDER BY sequence DESC
    LIMIT 1;
    
    IF v_job_distance = 0 OR v_job_distance IS NULL THEN
      SELECT COALESCE((wi.item_data->>'est_distance_km')::NUMERIC, 0) INTO v_job_distance
      FROM job_orders jo
      LEFT JOIN wo_items wi ON wi.id = jo.wo_item_id
      WHERE jo.id = v_job.id;
    END IF;
    
    IF v_job_distance > 0 THEN
      -- Update driver
      SELECT COALESCE(total_km_driven, 0) INTO v_driver_km
      FROM md_drivers WHERE id = v_job.driver_id;
      
      UPDATE md_drivers
      SET total_km_driven = v_driver_km + v_job_distance,
          total_distance_km = v_driver_km + v_job_distance,
          updated_at = NOW()
      WHERE id = v_job.driver_id;
      
      -- Log
      INSERT INTO driver_performance_logs (driver_id, job_order_id, type, total_km)
      VALUES (v_job.driver_id, v_job.id, 'KM_LOG', v_job_distance);
      
      v_jobs_processed := v_jobs_processed + 1;
      v_total_km := v_total_km + v_job_distance;
    END IF;
  END LOOP;
  
  -- Count distinct drivers updated
  SELECT COUNT(DISTINCT driver_id) INTO v_drivers_updated
  FROM driver_performance_logs
  WHERE type = 'KM_LOG' AND job_order_id IN (
    SELECT id FROM job_orders WHERE status IN ('SELESAI', 'COMPLETED', 'PEKERJAAN SELESAI')
  );
  
  jobs_processed := v_jobs_processed;
  total_km_added := v_total_km;
  drivers_updated := v_drivers_updated;
  
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 5. ADD: Helper function to get driver performance summary
-- ============================================================

CREATE OR REPLACE FUNCTION get_driver_performance_summary(p_driver_id UUID)
RETURNS TABLE(
  driver_id UUID,
  driver_name TEXT,
  total_jobs INT,
  total_km NUMERIC,
  avg_review DECIMAL,
  total_reviews INT,
  last_job_date TIMESTAMPTZ,
  last_review_score SMALLINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id,
    d.name,
    d.total_jobs_completed,
    d.total_km_driven,
    d.avg_review_score,
    d.total_reviews,
    (SELECT MAX(completed_at) FROM job_orders WHERE driver_id = d.id AND status IN ('SELESAI', 'COMPLETED')),
    (SELECT review_score FROM driver_performance_logs WHERE driver_id = d.id AND type = 'REVIEW' ORDER BY created_at DESC LIMIT 1)
  FROM md_drivers d
  WHERE d.id = p_driver_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- Verification
-- ============================================================

-- Check new columns exist
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'job_orders' AND column_name LIKE 'customer_review%'
ORDER BY column_name;

SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'md_drivers' AND column_name IN ('avg_review_score', 'total_reviews', 'total_distance_km')
ORDER BY column_name;

-- Check trigger
SELECT trigger_name FROM information_schema.triggers WHERE trigger_name = 'job_status_change_trigger';

-- Check backfill function exists
SELECT routine_name FROM information_schema.routines WHERE routine_name = 'backfill_driver_distances';
