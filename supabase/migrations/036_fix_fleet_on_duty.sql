-- Migration 036: Add on_duty fleet status + fix trigger on assignment
-- Eksekusi di Supabase SQL Editor

-- ============================================
-- 1. Fix driver status: assigned → on_road (not on_duty)
-- ============================================
CREATE OR REPLACE FUNCTION handle_job_status_change_v2()
RETURNS TRIGGER AS $$
DECLARE
  active_job_count_driver INT;
  active_job_count_fleet INT;
  has_active_shift BOOLEAN;
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Job completion/cancellation
  IF NEW.status IN ('SELESAI', 'COMPLETED', 'PEKERJAAN SELESAI', 'VERIFIED', 'READY_FOR_BILLING', 'PAID', 'INVOICED', 'DONE', 'cancelled', 'rejected') THEN
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
        UPDATE md_drivers SET is_working = false, status = 'available', updated_at = NOW() WHERE id = NEW.driver_id;
      ELSIF active_job_count_driver = 0 AND has_active_shift THEN
        UPDATE md_drivers SET status = 'available', updated_at = NOW() WHERE id = NEW.driver_id;
      END IF;
    END IF;
    IF NEW.fleet_id IS NOT NULL THEN
      SELECT COUNT(*) INTO active_job_count_fleet
      FROM job_orders
      WHERE fleet_id = NEW.fleet_id
        AND status NOT IN ('SELESAI', 'COMPLETED', 'PEKERJAAN SELESAI', 'VERIFIED', 'READY_FOR_BILLING', 'PAID', 'INVOICED', 'DONE', 'cancelled', 'rejected', 'draft', 'pending')
        AND id != NEW.id;
      IF active_job_count_fleet = 0 THEN
        UPDATE md_fleets SET status = 'available', updated_at = NOW() WHERE id = NEW.fleet_id;
      END IF;
    END IF;

  -- Job assignment
  ELSIF NEW.status = 'assigned' AND (OLD.status = 'draft' OR OLD.status = 'pending') THEN
    IF NEW.driver_id IS NOT NULL THEN
      UPDATE md_drivers SET is_working = true, status = 'on_road', updated_at = NOW()
      WHERE id = NEW.driver_id AND status != 'unavailable';
    END IF;
    IF NEW.fleet_id IS NOT NULL THEN
      UPDATE md_fleets SET status = 'on_road', updated_at = NOW() WHERE id = NEW.fleet_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 2. VERIFICATION
-- ============================================
SELECT '036_fix_on_duty OK' AS result;
