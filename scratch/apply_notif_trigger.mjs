import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://nsvkewvmzivudkcczhnk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zdmtld3Zteml2dWRrY2N6aG5rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc3Mjc2MywiZXhwIjoyMDkwMzQ4NzYzfQ.7ZDrwe28fRKFsbxZMzvpAqwDE39Iwk5ZZXWX_pLp8T8'
);

async function applyTrigger() {
  const sql = `
    CREATE OR REPLACE FUNCTION on_job_order_completed_notif()
    RETURNS TRIGGER AS $$
    BEGIN
      -- Trigger when status becomes 'completed'
      IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
        -- Notify SBU Staff
        INSERT INTO notifications (role, title, message, type, metadata)
        VALUES 
        ('sbu_ops_tr', 'Job Order Completed', 'JO ' || NEW.jo_number || ' completed. Process POD/Documents.', 'success', jsonb_build_object('link', '/sbu/trucking/completed?jo=' || NEW.jo_number)),
        ('sbu_fin_tr', 'Job Order Completed', 'JO ' || NEW.jo_number || ' completed. Add extra costs and finalize.', 'success', jsonb_build_object('link', '/sbu/trucking/completed?jo=' || NEW.jo_number));

        -- Notify HQ Staff
        INSERT INTO notifications (role, title, message, type, metadata)
        VALUES 
        ('hq_cs', 'Job Order Completed', 'JO ' || NEW.jo_number || ' completed. Awaiting audit/billing.', 'success', jsonb_build_object('link', '/hq/finance/cost-audit?jo=' || NEW.jo_number)),
        ('hq_finance', 'Job Order Completed', 'JO ' || NEW.jo_number || ' completed. Prepare for invoicing.', 'success', jsonb_build_object('link', '/hq/finance/cost-audit?jo=' || NEW.jo_number));
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS tr_job_order_completed_notif ON job_orders;
    CREATE TRIGGER tr_job_order_completed_notif
    AFTER UPDATE ON job_orders
    FOR EACH ROW
    EXECUTE FUNCTION on_job_order_completed_notif();
  `;

  const { error } = await supabase.rpc('exec_sql_manual', { sql_query: sql });
  if (error) console.error(error);
  else console.log('Trigger Applied Success');
}

applyTrigger();
