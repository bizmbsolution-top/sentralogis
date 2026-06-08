-- Function: auto-complete work order when all job orders are completed
-- This function does NOT require any table locks to create/replace
CREATE OR REPLACE FUNCTION check_and_update_wo_status()
RETURNS TRIGGER AS $$
DECLARE
  v_wo_id UUID;
  v_incomplete_count INTEGER;
BEGIN
  -- Only proceed if the status actually changed to completed or cancelled
  IF NEW.status IN ('completed', 'cancelled') AND OLD.status IS DISTINCT FROM NEW.status THEN
    
    -- Find the wo_id via wo_items
    SELECT wi.wo_id INTO v_wo_id
    FROM wo_items wi
    WHERE wi.id = NEW.wo_item_id;

    IF v_wo_id IS NOT NULL THEN
      -- Count incomplete job_orders under the same work order
      SELECT count(*) INTO v_incomplete_count
      FROM job_orders jo
      JOIN wo_items wi ON jo.wo_item_id = wi.id
      WHERE wi.wo_id = v_wo_id
        AND jo.status NOT IN ('completed', 'cancelled');

      -- If all done, mark the work order as completed
      IF v_incomplete_count = 0 THEN
        UPDATE work_orders
        SET status = 'completed'
        WHERE id = v_wo_id AND status != 'completed';
      END IF;

      -- Count incomplete job_orders under the specific wo_item
      SELECT count(*) INTO v_incomplete_count
      FROM job_orders
      WHERE wo_item_id = NEW.wo_item_id
        AND status NOT IN ('completed', 'cancelled');
        
      IF v_incomplete_count = 0 THEN
        UPDATE wo_items
        SET status = 'completed'
        WHERE id = NEW.wo_item_id AND status != 'completed';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Use CREATE OR REPLACE TRIGGER (PostgreSQL 14+, supported by Supabase)
-- This avoids DROP TRIGGER which requires AccessExclusiveLock and causes deadlocks
CREATE OR REPLACE TRIGGER trg_auto_complete_wo
AFTER UPDATE OF status ON job_orders
FOR EACH ROW
EXECUTE FUNCTION check_and_update_wo_status();
