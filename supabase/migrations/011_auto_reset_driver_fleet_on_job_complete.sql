-- Auto reset driver and fleet status when job is completed
-- Eksekusi ini di Supabase SQL Editor

-- Create function to handle job completion
CREATE OR REPLACE FUNCTION handle_job_completion()
RETURNS TRIGGER AS $$
BEGIN
  -- When job is marked as completed/paid/done, reset driver and fleet
  IF NEW.status IN ('SELESAI', 'COMPLETED', 'PEKERJAAN SELESAI', 'VERIFIED', 'READY_FOR_BILLING', 'PAID', 'INVOICED', 'DONE') 
     AND (OLD.status != NEW.status) THEN
    
    -- Reset driver to available if this was their job
    IF OLD.driver_id IS NOT NULL THEN
      UPDATE md_drivers 
      SET 
        is_working = false,
        status = 'available',
        updated_at = NOW()
      WHERE id = OLD.driver_id 
        AND (
          -- Only reset if this is the only active job
          (SELECT COUNT(*) FROM job_orders 
           WHERE driver_id = OLD.driver_id 
           AND status NOT IN ('SELESAI', 'COMPLETED', 'PEKERJAAN SELESAI', 'VERIFIED', 'READY_FOR_BILLING', 'PAID', 'INVOICED', 'DONE')
          ) = 0
        );
    END IF;
    
    -- Reset fleet to available if this was their job
    IF OLD.fleet_id IS NOT NULL THEN
      UPDATE md_fleets 
      SET 
        status = 'available',
        updated_at = NOW()
      WHERE id = OLD.fleet_id
        AND (
          -- Only reset if this is the only active job
          (SELECT COUNT(*) FROM job_orders 
           WHERE fleet_id = OLD.fleet_id 
           AND status NOT IN ('SELESAI', 'COMPLETED', 'PEKERJAAN SELESAI', 'VERIFIED', 'READY_FOR_BILLING', 'PAID', 'INVOICED', 'DONE')
          ) = 0
        );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS job_completion_trigger ON job_orders;

CREATE TRIGGER job_completion_trigger
  AFTER UPDATE ON job_orders
  FOR EACH ROW
  EXECUTE FUNCTION handle_job_completion();

-- Test: Show current status before trigger
SELECT 
  (SELECT COUNT(*) FROM md_drivers WHERE is_working = true) as working_drivers,
  (SELECT COUNT(*) FROM md_fleets WHERE status = 'on_road') as on_road_fleets,
  (SELECT COUNT(*) FROM job_orders WHERE status = 'PAID') as paid_jobs;