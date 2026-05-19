-- Migration 014: Enhanced Fleet/Driver Status Management
-- Fixes: auto-reset trigger, cancelled jobs, inspection logic, attendance integration
-- Status simplification: available | on_duty | unavailable (replaces off_duty)

-- ============================================================
-- 0. MIGRATE: Replace off_duty with unavailable
-- ============================================================

UPDATE md_drivers SET status = 'unavailable' WHERE status = 'off_duty';

-- ============================================================
-- 1. ENHANCED TRIGGER: Auto-reset on job completion/cancellation
-- ============================================================

CREATE OR REPLACE FUNCTION handle_job_status_change()
RETURNS TRIGGER AS $$
DECLARE
  active_job_count_driver INT;
  active_job_count_fleet INT;
  has_active_shift BOOLEAN;
BEGIN
  -- Only process on status change
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Handle job completion/cancellation
  IF NEW.status IN ('SELESAI', 'COMPLETED', 'PEKERJAAN SELESAI', 'VERIFIED', 'READY_FOR_BILLING', 'PAID', 'INVOICED', 'DONE', 'cancelled', 'rejected') THEN
    
    -- Reset driver status
    IF NEW.driver_id IS NOT NULL THEN
      -- Count remaining active jobs for this driver
      SELECT COUNT(*) INTO active_job_count_driver
      FROM job_orders 
      WHERE driver_id = NEW.driver_id 
        AND status NOT IN ('SELESAI', 'COMPLETED', 'PEKERJAAN SELESAI', 'VERIFIED', 'READY_FOR_BILLING', 'PAID', 'INVOICED', 'DONE', 'cancelled', 'rejected', 'draft', 'pending')
        AND id != NEW.id;

      -- Check if driver has active shift today
      SELECT EXISTS (
        SELECT 1 FROM driver_attendance
        WHERE driver_id = NEW.driver_id
          AND status = 'CHECK_IN'
          AND check_in::date = CURRENT_DATE
      ) INTO has_active_shift;

      -- Only reset if no active jobs AND no active shift
      IF active_job_count_driver = 0 AND NOT has_active_shift THEN
        UPDATE md_drivers 
        SET 
          is_working = false,
          status = 'available',
          updated_at = NOW()
        WHERE id = NEW.driver_id;
      ELSIF active_job_count_driver = 0 AND has_active_shift THEN
        -- Driver still on shift but no jobs - set to available (still checked in)
        UPDATE md_drivers 
        SET 
          status = 'available',
          updated_at = NOW()
        WHERE id = NEW.driver_id
          AND status != 'unavailable'; -- Don't override manual unavailable status
      END IF;
    END IF;
    
    -- Reset fleet status
    IF NEW.fleet_id IS NOT NULL THEN
      -- Count remaining active jobs for this fleet
      SELECT COUNT(*) INTO active_job_count_fleet
      FROM job_orders 
      WHERE fleet_id = NEW.fleet_id 
        AND status NOT IN ('SELESAI', 'COMPLETED', 'PEKERJAAN SELESAI', 'VERIFIED', 'READY_FOR_BILLING', 'PAID', 'INVOICED', 'DONE', 'cancelled', 'rejected', 'draft', 'pending')
        AND id != NEW.id;

      -- Only reset if no active jobs
      IF active_job_count_fleet = 0 THEN
        UPDATE md_fleets 
        SET 
          status = 'available',
          updated_at = NOW()
        WHERE id = NEW.fleet_id;
      END IF;
    END IF;

  -- Handle job assignment (status becomes 'assigned')
  ELSIF NEW.status = 'assigned' AND (OLD.status = 'draft' OR OLD.status = 'pending') THEN
    
    -- Set driver to on_duty (only if not manually set to unavailable)
    IF NEW.driver_id IS NOT NULL THEN
      UPDATE md_drivers 
      SET 
        is_working = true,
        status = 'on_duty',
        updated_at = NOW()
      WHERE id = NEW.driver_id
        AND status != 'unavailable';
    END IF;
    
    -- Set fleet to on_road
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

-- Replace old trigger with new one
DROP TRIGGER IF EXISTS job_completion_trigger ON job_orders;

CREATE TRIGGER job_status_change_trigger
  AFTER UPDATE ON job_orders
  FOR EACH ROW
  EXECUTE FUNCTION handle_job_status_change();

-- ============================================================
-- 2. ADD: Last inspection date tracking for daily validation
-- ============================================================

ALTER TABLE md_drivers ADD COLUMN IF NOT EXISTS last_inspection_date DATE;
ALTER TABLE md_fleets ADD COLUMN IF NOT EXISTS last_inspection_date DATE;

-- ============================================================
-- 3. ADD: Function to check if driver is ready for assignment
-- ============================================================

CREATE OR REPLACE FUNCTION is_driver_ready_for_assignment(p_driver_id UUID)
RETURNS TABLE(
  ready BOOLEAN,
  reason TEXT,
  has_attendance_today BOOLEAN,
  has_inspection_today BOOLEAN,
  fleet_inspection_status TEXT
) AS $$
DECLARE
  v_driver RECORD;
  v_attendance RECORD;
  v_inspection RECORD;
BEGIN
  -- Get driver info
  SELECT * INTO v_driver FROM md_drivers WHERE id = p_driver_id;
  
  IF NOT FOUND THEN
    ready := false;
    reason := 'Driver not found';
    has_attendance_today := false;
    has_inspection_today := false;
    fleet_inspection_status := 'N/A';
    RETURN NEXT;
    RETURN;
  END IF;

  -- Check attendance today
  SELECT * INTO v_attendance
  FROM driver_attendance
  WHERE driver_id = p_driver_id
    AND status = 'CHECK_IN'
    AND check_in::date = CURRENT_DATE
  ORDER BY check_in DESC
  LIMIT 1;

  has_attendance_today := FOUND;

  -- Check inspection today
  SELECT * INTO v_inspection
  FROM fleet_inspections
  WHERE driver_id = p_driver_id
    AND created_at::date = CURRENT_DATE
  ORDER BY created_at DESC
  LIMIT 1;

  has_inspection_today := FOUND;
  fleet_inspection_status := COALESCE(v_inspection.status, 'N/A');

  -- Determine readiness
  IF NOT has_attendance_today THEN
    ready := false;
    reason := 'Driver belum absen hari ini';
  ELSIF NOT has_inspection_today THEN
    ready := false;
    reason := 'Driver belum inspeksi fleet hari ini';
  ELSIF v_inspection.status = 'GROUNDED' THEN
    ready := false;
    reason := 'Fleet tidak layak jalan (GROUNDED)';
  ELSIF v_driver.status = 'on_duty' THEN
    ready := false;
    reason := 'Driver sedang dalam tugas lain';
  ELSIF v_driver.status = 'unavailable' THEN
    ready := false;
    reason := 'Driver tidak tersedia (sakit/cuti)';
  ELSE
    ready := true;
    reason := 'Driver ready for assignment';
  END IF;

  RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 4. ADD: Function to sync stuck driver/fleet statuses
-- ============================================================

CREATE OR REPLACE FUNCTION sync_stuck_statuses()
RETURNS TABLE(
  drivers_reset INT,
  fleets_reset INT,
  details JSON
) AS $$
DECLARE
  v_drivers_reset INT := 0;
  v_fleets_reset INT := 0;
  v_details JSON;
BEGIN
  -- Reset drivers that are on_duty but have no active jobs
  WITH stuck_drivers AS (
    SELECT d.id
    FROM md_drivers d
    WHERE d.status = 'on_duty'
      AND d.is_working = true
      AND NOT EXISTS (
        SELECT 1 FROM job_orders jo
        WHERE jo.driver_id = d.id
          AND jo.status NOT IN ('SELESAI', 'COMPLETED', 'PEKERJAAN SELESAI', 'VERIFIED', 'READY_FOR_BILLING', 'PAID', 'INVOICED', 'DONE', 'cancelled', 'rejected', 'draft', 'pending')
      )
  )
  UPDATE md_drivers d
  SET 
    status = 'available',
    is_working = false,
    updated_at = NOW()
  FROM stuck_drivers sd
  WHERE d.id = sd.id
    AND d.status != 'unavailable'; -- Never override manual unavailable
  
  GET DIAGNOSTICS v_drivers_reset = ROW_COUNT;

  -- Reset fleets that are on_road but have no active jobs
  WITH stuck_fleets AS (
    SELECT f.id
    FROM md_fleets f
    WHERE f.status = 'on_road'
      AND NOT EXISTS (
        SELECT 1 FROM job_orders jo
        WHERE jo.fleet_id = f.id
          AND jo.status NOT IN ('SELESAI', 'COMPLETED', 'PEKERJAAN SELESAI', 'VERIFIED', 'READY_FOR_BILLING', 'PAID', 'INVOICED', 'DONE', 'cancelled', 'rejected', 'draft', 'pending')
      )
  )
  UPDATE md_fleets f
  SET 
    status = 'available',
    updated_at = NOW()
  FROM stuck_fleets sf
  WHERE f.id = sf.id;
  
  GET DIAGNOSTICS v_fleets_reset = ROW_COUNT;

  -- Build details JSON
  SELECT json_build_object(
    'drivers_reset', v_drivers_reset,
    'fleets_reset', v_fleets_reset,
    'synced_at', NOW()
  ) INTO v_details;

  drivers_reset := v_drivers_reset;
  fleets_reset := v_fleets_reset;
  details := v_details;
  
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- Verification queries
-- ============================================================

-- Check trigger exists
SELECT trigger_name, event_manipulation, event_object_table 
FROM information_schema.triggers 
WHERE trigger_name = 'job_status_change_trigger';

-- Test sync function (should return 0 if no stuck records)
SELECT * FROM sync_stuck_statuses();
