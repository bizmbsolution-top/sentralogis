-- Migration 113: Auto-inject updated_by using auth.uid()
-- This ensures that any update via Supabase automatically records the user ID
-- without requiring the frontend to explicitly send updated_by in the payload.

CREATE OR REPLACE FUNCTION set_updated_by_and_time()
RETURNS TRIGGER AS $$
BEGIN
    -- Set updated_at timestamp automatically
    NEW.updated_at = NOW();
    
    -- Auto-inject the user making the request if auth.uid() is available
    -- If auth.uid() is null (e.g. system backend), it keeps whatever was passed, or old.
    IF auth.uid() IS NOT NULL THEN
        NEW.updated_by = auth.uid();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply BEFORE trigger to job_orders
DROP TRIGGER IF EXISTS trg_job_orders_set_updated_by ON job_orders;
CREATE TRIGGER trg_job_orders_set_updated_by
    BEFORE UPDATE ON job_orders
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_by_and_time();

-- Apply BEFORE trigger to work_orders
DROP TRIGGER IF EXISTS trg_work_orders_set_updated_by ON work_orders;
CREATE TRIGGER trg_work_orders_set_updated_by
    BEFORE UPDATE ON work_orders
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_by_and_time();
