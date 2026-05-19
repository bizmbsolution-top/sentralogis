-- Fix trigger function - remove tenant_id
CREATE OR REPLACE FUNCTION notify_driver_payment()
RETURNS TRIGGER AS $$
DECLARE
  driver_phone TEXT;
  driver_name TEXT;
  amount NUMERIC;
BEGIN
  -- Get driver info
  SELECT md.phone, md.name INTO driver_phone, driver_name
  FROM md_drivers md
  WHERE md.id = NEW.driver_id;

  IF driver_phone IS NULL THEN
    RETURN NEW;
  END IF;

  -- Notify on advance payment
  IF OLD.advance_status IS DISTINCT FROM NEW.advance_status
     AND NEW.advance_status = 'paid'
     AND NEW.advance_amount > 0 THEN
    INSERT INTO notifications (role, title, message, type, metadata, created_at)
    VALUES (
      'driver_' || NEW.driver_id,
      'Uang Jalan Ditransfer',
      'Halo ' || COALESCE(driver_name, 'Driver') || ', uang jalan Rp ' || TO_CHAR(NEW.advance_amount, '999,999,999') || ' untuk job ' || NEW.jo_number || ' sudah ditransfer. Silakan cek rekening Anda.',
      'payment',
      jsonb_build_object('jo_id', NEW.id, 'jo_number', NEW.jo_number, 'type', 'advance', 'amount', NEW.advance_amount),
      NOW()
    );
  END IF;

  -- Notify on final payment (pelunasan)
  IF OLD.driver_payment_status IS DISTINCT FROM NEW.driver_payment_status
     AND NEW.driver_payment_status = 'paid'
     AND NEW.driver_payment_amount > 0 THEN
    INSERT INTO notifications (role, title, message, type, metadata, created_at)
    VALUES (
      'driver_' || NEW.driver_id,
      'Pelunasan Ditransfer',
      'Halo ' || COALESCE(driver_name, 'Driver') || ', pelunasan Rp ' || TO_CHAR(NEW.driver_payment_amount, '999,999,999') || ' untuk job ' || NEW.jo_number || ' sudah ditransfer. Terima kasih!',
      'payment',
      jsonb_build_object('jo_id', NEW.id, 'jo_number', NEW.jo_number, 'type', 'final', 'amount', NEW.driver_payment_amount),
      NOW()
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger
DROP TRIGGER IF EXISTS tr_notify_driver_payment ON job_orders;
CREATE TRIGGER tr_notify_driver_payment
  AFTER UPDATE ON job_orders
  FOR EACH ROW
  WHEN (OLD.advance_status IS DISTINCT FROM NEW.advance_status OR OLD.driver_payment_status IS DISTINCT FROM NEW.driver_payment_status)
  EXECUTE FUNCTION notify_driver_payment();