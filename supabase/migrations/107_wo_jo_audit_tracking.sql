-- Migration 107: Audit Tracking for Work Orders & Job Orders

-- 1. Add updated_by columns
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS updated_by UUID;
ALTER TABLE job_orders ADD COLUMN IF NOT EXISTS updated_by UUID;

-- 1b. Add FK to wo_audit_logs
ALTER TABLE wo_audit_logs DROP CONSTRAINT IF EXISTS fk_audit_logs_user;
ALTER TABLE wo_audit_logs DROP CONSTRAINT IF EXISTS fk_audit_performed_by;
ALTER TABLE wo_audit_logs ADD CONSTRAINT fk_audit_performed_by FOREIGN KEY (performed_by) REFERENCES profiles(id) ON DELETE SET NULL;

-- 2. Create the generic trigger function
CREATE OR REPLACE FUNCTION log_wo_jo_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_operation TEXT;
  v_old_data JSONB;
  v_new_data JSONB;
  v_changed_fields TEXT[];
  v_performed_by UUID;
  v_entity_type TEXT;
  v_tenant_id UUID;
  v_correlation_id UUID;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_operation := 'INSERT';
    v_old_data := NULL;
    v_new_data := to_jsonb(NEW);
    v_performed_by := COALESCE(NEW.updated_by, auth.uid());
  ELSIF TG_OP = 'UPDATE' THEN
    v_operation := 'UPDATE';
    v_old_data := to_jsonb(OLD);
    v_new_data := to_jsonb(NEW);
    v_performed_by := COALESCE(NEW.updated_by, OLD.updated_by, auth.uid());
    
    -- Calculate changed fields
    SELECT array_agg(key)
    INTO v_changed_fields
    FROM (
      SELECT key FROM jsonb_each(v_old_data)
      EXCEPT
      SELECT key FROM jsonb_each(v_new_data)
      UNION
      SELECT key FROM jsonb_each(v_new_data)
      EXCEPT
      SELECT key FROM jsonb_each(v_old_data)
    ) AS diffs;
    
    -- If no changes, skip logging (though updated_at might change, we ignore empty changes)
    IF array_length(v_changed_fields, 1) IS NULL THEN
      RETURN NEW;
    END IF;
    
    -- Filter out purely metadata updates like updated_at to reduce noise
    IF array_length(v_changed_fields, 1) = 1 AND v_changed_fields[1] = 'updated_at' THEN
      RETURN NEW;
    END IF;
  END IF;

  -- Determine entity type and standard fields
  IF TG_TABLE_NAME = 'work_orders' THEN
    v_entity_type := 'work_order';
    v_tenant_id := NEW.tenant_id;
  ELSIF TG_TABLE_NAME = 'job_orders' THEN
    v_entity_type := 'job_order';
    v_tenant_id := NEW.tenant_id;
  ELSE
    v_entity_type := TG_TABLE_NAME;
    v_tenant_id := NEW.tenant_id;
  END IF;

  -- Insert into audit logs
  INSERT INTO wo_audit_logs (
    tenant_id,
    correlation_id,
    entity_type,
    entity_id,
    operation,
    old_data,
    new_data,
    changed_fields,
    performed_by,
    performed_at
  ) VALUES (
    v_tenant_id,
    v_correlation_id,
    v_entity_type,
    NEW.id,
    v_operation,
    v_old_data,
    v_new_data,
    v_changed_fields,
    v_performed_by,
    NOW()
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Apply triggers to tables
DROP TRIGGER IF EXISTS trg_audit_work_orders ON work_orders;
CREATE TRIGGER trg_audit_work_orders
  AFTER INSERT OR UPDATE ON work_orders
  FOR EACH ROW
  EXECUTE FUNCTION log_wo_jo_changes();

DROP TRIGGER IF EXISTS trg_audit_job_orders ON job_orders;
CREATE TRIGGER trg_audit_job_orders
  AFTER INSERT OR UPDATE ON job_orders
  FOR EACH ROW
  EXECUTE FUNCTION log_wo_jo_changes();

SELECT 'Migration 107 applied successfully' as result;
