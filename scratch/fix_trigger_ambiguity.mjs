import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [k, v] = line.split('=');
  if (k && v) env[k.trim()] = v.trim();
});

const supabase = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['SUPABASE_SERVICE_ROLE_KEY']);

const sql = `
CREATE OR REPLACE FUNCTION public.update_wo_status_on_job_complete()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_wo_id uuid;
    v_total_jobs integer;
    v_completed_jobs integer;
    v_in_progress_jobs integer;
BEGIN
    -- Ambil WO ID dari wo_items
    SELECT wo_id INTO v_wo_id FROM wo_items WHERE id = NEW.wo_item_id;
    
    IF v_wo_id IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Hitung status semua JO dalam WO (Gunakan jo.status untuk menghindari ambiguity)
    SELECT 
        COUNT(*),
        COUNT(CASE WHEN jo.status = 'completed' THEN 1 END),
        COUNT(CASE WHEN jo.status = 'in_progress' THEN 1 END)
    INTO v_total_jobs, v_completed_jobs, v_in_progress_jobs
    FROM job_orders jo
    JOIN wo_items wi ON jo.wo_item_id = wi.id
    WHERE wi.wo_id = v_wo_id;
    
    -- Update WO status berdasarkan kondisi
    IF v_total_jobs = v_completed_jobs AND v_total_jobs > 0 THEN
        UPDATE work_orders SET status = 'completed', updated_at = NOW() WHERE id = v_wo_id;
    ELSIF v_completed_jobs > 0 OR v_in_progress_jobs > 0 THEN
        UPDATE work_orders SET status = 'in_progress', updated_at = NOW() WHERE id = v_wo_id;
    END IF;
    
    RETURN NEW;
END;
$function$;
`;

async function run() {
  console.log('Applying fix to database trigger function...');
  const { data, error } = await supabase.rpc('exec_sql_manual', { sql_query: sql });
  if (error) {
    console.error('Error applying fix:', error);
  } else {
    console.log('Fix applied successfully!');
  }
}

run();
