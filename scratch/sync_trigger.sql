-- REFINED MISSION & ASSET SYNC TRIGGER
CREATE OR REPLACE FUNCTION sync_mission_status()
RETURNS TRIGGER AS $$
DECLARE
    v_new_asset_status TEXT;
BEGIN
    -- 1. Sync WO Item Status
    UPDATE wo_items
    SET status = CASE
        WHEN NEW.status IN ('completed', 'verified', 'ready_for_billing', 'awaiting_audit') THEN 'completed'
        WHEN NEW.status IN ('active', 'in_progress', 'arrived', 'accepted') THEN 'in_progress'
        WHEN NEW.status = 'handover_rejected' THEN 'handover_rejected'
        WHEN NEW.status = 'assigned' THEN 'assigned'
        ELSE status
    END
    WHERE id = NEW.wo_item_id;

    -- 2. Sync Fleet & Driver Availability
    -- If status is active/on-road, set to 'on_road'
    -- If status is finished/cancelled/rejected, set back to 'available'
    v_new_asset_status := CASE
        WHEN NEW.status IN ('assigned', 'accepted', 'active', 'in_progress', 'arrived') THEN 'on_road'
        WHEN NEW.status IN ('completed', 'cancelled', 'handover_rejected') THEN 'available'
        ELSE NULL
    END;

    -- If driver response is rejected, also set back to 'available'
    IF NEW.driver_response = 'rejected' THEN
        v_new_asset_status := 'available';
    END IF;

    IF v_new_asset_status IS NOT NULL THEN
        -- Update Fleet
        IF NEW.fleet_id IS NOT NULL THEN
            UPDATE md_fleets 
            SET status = v_new_asset_status 
            WHERE id = NEW.fleet_id;
        END IF;

        -- Update Driver
        IF NEW.driver_id IS NOT NULL THEN
            UPDATE md_drivers 
            SET status = v_new_asset_status 
            WHERE id = NEW.driver_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger remains the same
DROP TRIGGER IF EXISTS trg_sync_mission_status ON job_orders;
CREATE TRIGGER trg_sync_mission_status
AFTER INSERT OR UPDATE ON job_orders
FOR EACH ROW
EXECUTE FUNCTION sync_mission_status();
