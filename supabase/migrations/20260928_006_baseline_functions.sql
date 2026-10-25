-- ============================================================================
-- SENTRALOGIS MODULAR LAYERED BASELINE MIGRATION
-- Layer:         006 Functions
-- Architecture:  D8-02 Option B2 / D8-30 Ratified
-- Baseline:      9bd2c04ce64b5e5c1d4b71451e4bab4a03c93999
-- Generation:    Deterministic Static Formation (Delivery Unit 2 / D8-33)
-- Total Objects: 127
-- Description:   Stored procedures and trigger functions
-- ============================================================================
-- ============================================================================
-- Object:        public.activate_repacking_order
-- Layer:         006 Functions
-- Source:        supabase/schemas/public/functions/activate_repacking_order.sql
-- Dependencies:  none
-- ============================================================================
CREATE OR REPLACE FUNCTION public.activate_repacking_order (
  p_order_id uuid,
  p_user_id  uuid
)
  RETURNS uuid
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
DECLARE
    v_order RECORD;
    v_src_item RECORD;
    v_res_item RECORD;
    v_wo_number TEXT;
    v_wo_id UUID;
    v_jo_number TEXT;
    v_wo_item_id UUID;
    v_jo_id UUID;
BEGIN
    SELECT * INTO v_order FROM wh_repacking_orders WHERE id = p_order_id AND status = 'CREATED' FOR UPDATE;
    IF v_order IS NULL THEN RAISE EXCEPTION 'Order not found or already activated'; END IF;
    
    UPDATE wh_repacking_orders SET status = 'IN_PROGRESS' WHERE id = p_order_id;
    
    v_wo_number := 'WO-RPK-' || to_char(NOW(), 'YYMMDD') || '-' || SUBSTRING(gen_random_uuid()::text, 1, 4);
    v_jo_number := 'JO-RPK-' || to_char(NOW(), 'YYMMDD') || '-' || SUBSTRING(gen_random_uuid()::text, 1, 4);
    
    INSERT INTO work_orders (tenant_id, wo_number, customer_id, order_date, execution_date, status)
    VALUES (v_order.tenant_id, v_wo_number, v_order.customer_id, CURRENT_DATE, CURRENT_DATE, 'pending') RETURNING id INTO v_wo_id;
    
    INSERT INTO wo_items (tenant_id, wo_id, item_code, sbu_type, status, item_data) 
    VALUES (v_order.tenant_id, v_wo_id, 'ITM-' || v_jo_number, 'WAREHOUSE', 'pending', jsonb_build_object('order_id', p_order_id, 'warehouse_id', v_order.warehouse_id, 'customer_id', v_order.customer_id, 'operation_type', v_order.order_type, 'direction', 'REPACKING')) RETURNING id INTO v_wo_item_id;
    
    INSERT INTO job_orders (tenant_id, wo_item_id, jo_number, status, sbu_type, notes) 
    VALUES (v_order.tenant_id, v_wo_item_id, v_jo_number, 'pending', 'WAREHOUSE', v_order.order_type || ' Order: ' || v_order.order_number) RETURNING id INTO v_jo_id;
    
    FOR v_src_item IN SELECT * FROM wh_repacking_items WHERE repacking_order_id = p_order_id AND item_type = 'SOURCE' LOOP
        INSERT INTO jo_warehouse_assignments (tenant_id, job_order_id, warehouse_location_id, allocated_cbm, allocated_kg)
        VALUES (v_order.tenant_id, v_jo_id, v_src_item.source_location_id, 0, 0);
    END LOOP;
    
    FOR v_res_item IN SELECT * FROM wh_repacking_items WHERE repacking_order_id = p_order_id AND item_type = 'RESULT' LOOP
        INSERT INTO jo_warehouse_assignments (tenant_id, job_order_id, warehouse_location_id, allocated_cbm, allocated_kg)
        VALUES (v_order.tenant_id, v_jo_id, v_res_item.target_location_id, 0, 0);
    END LOOP;
    
    UPDATE wh_repacking_orders SET reference_id = v_jo_id::TEXT WHERE id = p_order_id;
    
    RETURN p_order_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."activate_repacking_order"(uuid, uuid) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

-- ============================================================================
-- Object:        public.add_tenant_staff
-- Layer:         006 Functions
-- Source:        supabase/schemas/public/functions/add_tenant_staff.sql
-- Dependencies:  none
-- ============================================================================
CREATE OR REPLACE FUNCTION public.add_tenant_staff (
  p_tenant_code   character varying,
  p_email         text,
  p_full_name     text,
  p_role_code     character varying,
  p_sbu_code      character varying DEFAULT NULL::character varying,
  p_whatsapp      character varying DEFAULT NULL::character varying,
  p_temp_password text              DEFAULT NULL::text
)
  RETURNS json
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
DECLARE
    v_tenant_id UUID;
    v_sbu_id UUID;
    v_user_id UUID;
BEGIN
    -- 1. Dapatkan Tenant ID berdasarkan Code (Tanpa cek auth.uid() agar bisa dipanggil dari server)
    SELECT id INTO v_tenant_id FROM public.tenants WHERE tenant_code = p_tenant_code;
    
    IF v_tenant_id IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'Tenant code tidak valid');
    END IF;
    
    -- 2. Dapatkan SBU ID jika ada
    IF p_sbu_code IS NOT NULL THEN
        SELECT id INTO v_sbu_id FROM public.tenant_sbus 
        WHERE tenant_id = v_tenant_id AND sbu_code = p_sbu_code;
    END IF;
    
    -- 3. Cari atau Update User di Auth
    SELECT id INTO v_user_id FROM auth.users WHERE email = p_email;
    
    -- Jika user belum ada (Hanya cadangan, karena Server Action sudah membuatnya)
    IF v_user_id IS NULL THEN
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, aud, role)
        VALUES (gen_random_uuid(), p_email, crypt(COALESCE(p_temp_password, 'Sentralogis123!'), gen_salt('bf')), NOW(), 'authenticated', 'authenticated')
        RETURNING id INTO v_user_id;
    END IF;
    
    -- 4. PASTIKAN MASUK KE tenant_users (Ini bagian yang sering terlewat)
    INSERT INTO public.tenant_users (user_id, tenant_id, role_code, sbu_id, full_name, whatsapp)
    VALUES (v_user_id, v_tenant_id, p_role_code, v_sbu_id, p_full_name, p_whatsapp)
    ON CONFLICT (user_id) DO UPDATE SET
        tenant_id = EXCLUDED.tenant_id,
        role_code = EXCLUDED.role_code,
        sbu_id = EXCLUDED.sbu_id,
        full_name = EXCLUDED.full_name,
        updated_at = NOW();

    -- 5. Pastikan Profile juga update
    INSERT INTO public.profiles (id, full_name, email, role)
    VALUES (v_user_id, p_full_name, p_email, p_role_code)
    ON CONFLICT (id) DO UPDATE SET
        role = EXCLUDED.role,
        full_name = EXCLUDED.full_name;
    
    RETURN json_build_object('success', true, 'message', 'Staff authorized and synced successfully');
END;
$function$;

GRANT EXECUTE
  ON FUNCTION "public"."add_tenant_staff"(character varying, text, text, character varying, character varying, character varying, text)
  TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

-- ============================================================================
-- Object:        public.auto_deduct_token_on_job_complete
-- Layer:         006 Functions
-- Source:        supabase/schemas/public/functions/auto_deduct_token_on_job_complete.sql
-- Dependencies:  none
-- ============================================================================
CREATE OR REPLACE FUNCTION public.auto_deduct_token_on_job_complete()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
DECLARE
    v_tenant_id UUID;
    v_token_cost INTEGER;
    v_new_balance INTEGER;
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        SELECT tenant_id INTO v_tenant_id FROM public.tenant_sbus WHERE id = NEW.sbu_id;
        
        v_token_cost := NEW.unit_count;
        
        SELECT token_balance INTO v_new_balance FROM public.tenants WHERE id = v_tenant_id;
        
        IF v_new_balance < v_token_cost THEN
            RAISE EXCEPTION 'Token tidak mencukupi. Sisa: %, Dibutuhkan: %', v_new_balance, v_token_cost;
        END IF;
        
        UPDATE public.tenants
        SET token_balance = token_balance - v_token_cost,
            updated_at = NOW()
        WHERE id = v_tenant_id
        RETURNING token_balance INTO v_new_balance;
        
        INSERT INTO public.token_transactions (
            tenant_id, tenant_code, amount, transaction_type, description
        ) VALUES (
            v_tenant_id, 
            (SELECT tenant_code FROM public.tenants WHERE id = v_tenant_id),
            -v_token_cost, 
            'USE', 
            format('Auto deduct: Job Order %s completed', NEW.id)
        );
        
        NEW.token_deducted := v_token_cost;
        NEW.completed_at := NOW();
    END IF;
    
    RETURN NEW;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."auto_deduct_token_on_job_complete"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

-- ============================================================================
-- Object:        public.auto_log_token_transaction
-- Layer:         006 Functions
-- Source:        supabase/schemas/public/functions/auto_log_token_transaction.sql
-- Dependencies:  none
-- ============================================================================
CREATE OR REPLACE FUNCTION public.auto_log_token_transaction()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
DECLARE
    v_amount INTEGER;
    v_type VARCHAR(20);
    v_description TEXT;
BEGIN
    v_amount := NEW.token_balance - OLD.token_balance;
    IF v_amount > 0 THEN
        v_type := 'GRANT';
        v_description := 'Token grant from owner';
    ELSIF v_amount < 0 THEN
        v_type := 'USE';
        v_description := 'Token usage (1 TKN = Rp 1.000)';
    ELSE
        RETURN NEW;
    END IF;
    
    INSERT INTO public.token_transactions (id, tenant_id, tenant_code, amount, transaction_type, description, created_at)
    VALUES (gen_random_uuid(), NEW.id, NEW.tenant_code, v_amount, v_type, COALESCE(v_description, 'Auto-logged'), NOW());
    
    RETURN NEW;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."auto_log_token_transaction"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

-- ============================================================================
-- Object:        public.backfill_driver_distances
-- Layer:         006 Functions
-- Source:        supabase/schemas/public/functions/backfill_driver_distances.sql
-- Dependencies:  none
-- ============================================================================
CREATE OR REPLACE FUNCTION public.backfill_driver_distances()
  RETURNS TABLE (
    jobs_processed  integer,
    total_km_added  numeric,
    drivers_updated integer
  )
  LANGUAGE plpgsql
  AS $function$
DECLARE
  v_jobs_processed INT := 0;
  v_total_km NUMERIC := 0;
  v_drivers_updated INT := 0;
  v_job RECORD;
  v_job_distance NUMERIC;
  v_driver_km NUMERIC;
BEGIN
  FOR v_job IN 
    SELECT jo.id, jo.driver_id, jo.status
    FROM job_orders jo
    WHERE jo.driver_id IS NOT NULL
      AND jo.status IN ('SELESAI', 'COMPLETED', 'PEKERJAAN SELESAI')
      AND NOT EXISTS (
        SELECT 1 FROM driver_performance_logs dpl
        WHERE dpl.job_order_id = jo.id AND dpl.type = 'KM_LOG'
      )
  LOOP
    SELECT COALESCE(distance_km, 0) INTO v_job_distance
    FROM job_routes
    WHERE job_order_id = v_job.id
    ORDER BY sequence DESC
    LIMIT 1;
    
    IF v_job_distance = 0 OR v_job_distance IS NULL THEN
      SELECT COALESCE((wi.item_data->>'est_distance_km')::NUMERIC, 0) INTO v_job_distance
      FROM job_orders jo
      LEFT JOIN wo_items wi ON wi.id = jo.wo_item_id
      WHERE jo.id = v_job.id;
    END IF;
    
    IF v_job_distance > 0 THEN
      SELECT COALESCE(total_km_driven, 0) INTO v_driver_km
      FROM md_drivers WHERE id = v_job.driver_id;
      
      UPDATE md_drivers
      SET total_km_driven = v_driver_km + v_job_distance,
          total_distance_km = v_driver_km + v_job_distance,
          updated_at = NOW()
      WHERE id = v_job.driver_id;
      
      INSERT INTO driver_performance_logs (driver_id, job_order_id, type, total_km)
      VALUES (v_job.driver_id, v_job.id, 'KM_LOG', v_job_distance);
      
      v_jobs_processed := v_jobs_processed + 1;
      v_total_km := v_total_km + v_job_distance;
    END IF;
  END LOOP;
  
  SELECT COUNT(DISTINCT driver_id) INTO v_drivers_updated
  FROM driver_performance_logs
  WHERE type = 'KM_LOG' AND job_order_id IN (
    SELECT id FROM job_orders WHERE status IN ('SELESAI', 'COMPLETED', 'PEKERJAAN SELESAI')
  );
  
  jobs_processed := v_jobs_processed;
  total_km_added := v_total_km;
  drivers_updated := v_drivers_updated;
  
  RETURN NEXT;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."backfill_driver_distances"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

-- ============================================================================
-- Object:        public.calc_gps_quality
-- Layer:         006 Functions
-- Source:        supabase/schemas/public/functions/calc_gps_quality.sql
-- Dependencies:  none
-- ============================================================================
CREATE OR REPLACE FUNCTION public.calc_gps_quality (
  p_driver_id uuid
)
  RETURNS TABLE (
    quality_score    numeric,
    avg_interval_sec numeric,
    coverage_pct     numeric,
    last_gps_age_min numeric,
    total_pings      bigint,
    gps_source       character varying
  )
  LANGUAGE plpgsql
  AS $function$
BEGIN
  RETURN QUERY
  WITH pings AS (
    -- Raw pings with interval to previous ping (LAG must be here, outside aggregates)
    SELECT
      jt.created_at,
      jt.source,
      EXTRACT(EPOCH FROM (
        jt.created_at - LAG(jt.created_at) OVER (ORDER BY jt.created_at)
      )) AS interval_sec
    FROM job_tracking jt
    JOIN job_orders jo ON jt.job_order_id = jo.id
    WHERE jo.driver_id = p_driver_id
      AND jt.created_at > NOW() - INTERVAL '7 days'
      AND jt.latitude IS NOT NULL
  ),
  stats AS (
    -- Now aggregate from the CTE (no window functions inside aggregates)
    SELECT
      COUNT(*) AS total_pings,
      COUNT(DISTINCT DATE(created_at))::NUMERIC /
        GREATEST(EXTRACT(DAY FROM MAX(created_at) - MIN(created_at)) + 1, 1) AS coverage_pct,
      AVG(interval_sec) AS avg_interval,
      EXTRACT(EPOCH FROM (NOW() - MAX(created_at))) / 60 AS last_gps_age,
      MODE() WITHIN GROUP (ORDER BY source) AS most_common_source
    FROM pings
  )
  SELECT
    ROUND(
      GREATEST(0, LEAST(100,
        (CASE WHEN s.coverage_pct > 0.8 THEN 100
              WHEN s.coverage_pct > 0.5 THEN 75
              WHEN s.coverage_pct > 0.3 THEN 50
              ELSE 25 END * 0.40) +
        (CASE WHEN s.avg_interval < 60 THEN 100
              WHEN s.avg_interval < 120 THEN 75
              WHEN s.avg_interval < 300 THEN 50
              ELSE 25 END * 0.35) +
        (CASE WHEN s.last_gps_age < 5 THEN 100
              WHEN s.last_gps_age < 30 THEN 75
              WHEN s.last_gps_age < 60 THEN 50
              ELSE 0 END * 0.25)
      )),
    1) AS quality_score,
    ROUND(s.avg_interval, 1) AS avg_interval_sec,
    ROUND(COALESCE(s.coverage_pct, 0) * 100, 1) AS coverage_pct,
    ROUND(COALESCE(s.last_gps_age, 999), 1) AS last_gps_age_min,
    COALESCE(s.total_pings, 0) AS total_pings,
    s.most_common_source AS gps_source
  FROM stats s;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."calc_gps_quality"(uuid) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

-- ============================================================================
-- Object:        public.calc_tenant_gps_quality
-- Layer:         006 Functions
-- Source:        supabase/schemas/public/functions/calc_tenant_gps_quality.sql
-- Dependencies:  none
-- ============================================================================
CREATE OR REPLACE FUNCTION public.calc_tenant_gps_quality (
  p_tenant_id uuid
)
  RETURNS TABLE (
    driver_id        uuid,
    driver_name      character varying,
    quality_score    numeric,
    avg_interval_sec numeric,
    coverage_pct     numeric,
    last_gps_age_min numeric,
    total_pings      bigint,
    gps_source       character varying
  )
  LANGUAGE plpgsql
  AS $function$
BEGIN
  RETURN QUERY
  SELECT
    md.id AS driver_id,
    md.name AS driver_name,
    gq.quality_score,
    gq.avg_interval_sec,
    gq.coverage_pct,
    gq.last_gps_age_min,
    gq.total_pings,
    gq.gps_source
  FROM md_drivers md
  LEFT JOIN LATERAL calc_gps_quality(md.id) gq ON true
  WHERE md.tenant_id = p_tenant_id
    AND md.is_active = true
  ORDER BY gq.quality_score DESC NULLS LAST;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."calc_tenant_gps_quality"(uuid) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

-- ============================================================================
-- Object:        public.calculate_sla_compliance
-- Layer:         006 Functions
-- Source:        supabase/schemas/public/functions/calculate_sla_compliance.sql
-- Dependencies:  none
-- ============================================================================
CREATE OR REPLACE FUNCTION public.calculate_sla_compliance (
  p_tenant_id uuid,
  p_days_back integer DEFAULT 30
)
  RETURNS TABLE (
    sla_stage      text,
    total_count    integer,
    pass_count     integer,
    fail_count     integer,
    compliance_pct numeric,
    target_minutes integer
  )
  LANGUAGE plpgsql
  AS $function$
DECLARE
  v_cutoff TIMESTAMPTZ := NOW() - (p_days_back || ' days')::INTERVAL;
BEGIN
  -- SLA 1
  RETURN QUERY
  SELECT 'SLA 1: WO Draft → Submit'::TEXT, COUNT(*)::INT,
    SUM(CASE WHEN EXTRACT(EPOCH FROM (submitted_at - created_at)) / 60 <= 30 THEN 1 ELSE 0 END)::INT,
    SUM(CASE WHEN EXTRACT(EPOCH FROM (submitted_at - created_at)) / 60 > 30 THEN 1 ELSE 0 END)::INT,
    ROUND(100.0 * SUM(CASE WHEN EXTRACT(EPOCH FROM (submitted_at - created_at)) / 60 <= 30 THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 2), 30
  FROM work_orders WHERE tenant_id = p_tenant_id AND submitted_at IS NOT NULL AND created_at >= v_cutoff;
  -- SLA 2
  RETURN QUERY
  SELECT 'SLA 2: Submit → SBU Assigned'::TEXT, COUNT(*)::INT,
    SUM(CASE WHEN EXTRACT(EPOCH FROM (sbu_assigned_at - wo.submitted_at)) / 60 <= 60 THEN 1 ELSE 0 END)::INT,
    SUM(CASE WHEN EXTRACT(EPOCH FROM (sbu_assigned_at - wo.submitted_at)) / 60 > 60 THEN 1 ELSE 0 END)::INT,
    ROUND(100.0 * SUM(CASE WHEN EXTRACT(EPOCH FROM (sbu_assigned_at - wo.submitted_at)) / 60 <= 60 THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 2), 60
  FROM job_orders jo JOIN wo_items wi ON wi.id = jo.wo_item_id JOIN work_orders wo ON wo.id = wi.wo_id
  WHERE wo.tenant_id = p_tenant_id AND jo.sbu_assigned_at IS NOT NULL AND wo.submitted_at IS NOT NULL AND wo.created_at >= v_cutoff;
  -- SLA 3
  RETURN QUERY
  SELECT 'SLA 3: Done → Ready for Billing'::TEXT, COUNT(*)::INT,
    SUM(CASE WHEN EXTRACT(EPOCH FROM (ready_for_billing_at - completed_at)) / 60 <= 4320 THEN 1 ELSE 0 END)::INT,
    SUM(CASE WHEN EXTRACT(EPOCH FROM (ready_for_billing_at - completed_at)) / 60 > 4320 THEN 1 ELSE 0 END)::INT,
    ROUND(100.0 * SUM(CASE WHEN EXTRACT(EPOCH FROM (ready_for_billing_at - completed_at)) / 60 <= 4320 THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 2), 4320
  FROM job_orders WHERE tenant_id = p_tenant_id AND ready_for_billing_at IS NOT NULL AND completed_at IS NOT NULL AND completed_at >= v_cutoff;
  -- SLA 4
  RETURN QUERY
  SELECT 'SLA 4: Ready → Invoiced'::TEXT, COUNT(*)::INT,
    SUM(CASE WHEN EXTRACT(EPOCH FROM (i.sent_at - wo.ready_for_billing_at)) / 60 <= 1440 THEN 1 ELSE 0 END)::INT,
    SUM(CASE WHEN EXTRACT(EPOCH FROM (i.sent_at - wo.ready_for_billing_at)) / 60 > 1440 THEN 1 ELSE 0 END)::INT,
    ROUND(100.0 * SUM(CASE WHEN EXTRACT(EPOCH FROM (i.sent_at - wo.ready_for_billing_at)) / 60 <= 1440 THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 2), 1440
  FROM invoices i JOIN work_orders wo ON wo.id = i.wo_id
  WHERE wo.tenant_id = p_tenant_id AND i.sent_at IS NOT NULL AND wo.ready_for_billing_at IS NOT NULL AND wo.created_at >= v_cutoff;
  -- SLA 5
  RETURN QUERY
  SELECT 'SLA 5: Accepted → Paid'::TEXT, COUNT(*)::INT,
    SUM(CASE WHEN EXTRACT(EPOCH FROM (i.paid_at - i.customer_accepted_invoice_at)) / 86400 <= e.payment_terms_days THEN 1 ELSE 0 END)::INT,
    SUM(CASE WHEN EXTRACT(EPOCH FROM (i.paid_at - i.customer_accepted_invoice_at)) / 86400 > e.payment_terms_days THEN 1 ELSE 0 END)::INT,
    ROUND(100.0 * SUM(CASE WHEN EXTRACT(EPOCH FROM (i.paid_at - i.customer_accepted_invoice_at)) / 86400 <= e.payment_terms_days THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 2),
    (SELECT AVG(payment_terms_days)::INT FROM md_entities WHERE is_customer = true)::INT
  FROM invoices i JOIN work_orders wo ON wo.id = i.wo_id JOIN md_entities e ON e.id = wo.customer_id
  WHERE wo.tenant_id = p_tenant_id AND i.paid_at IS NOT NULL AND i.customer_accepted_invoice_at IS NOT NULL AND i.created_at >= v_cutoff;
  -- SLA 6
  RETURN QUERY
  SELECT 'SLA 6: Vendor Invoice → Paid'::TEXT, COUNT(*)::INT,
    SUM(CASE WHEN EXTRACT(EPOCH FROM (vi.paid_at - vi.received_at)) / 86400 <= e.payment_terms_days THEN 1 ELSE 0 END)::INT,
    SUM(CASE WHEN EXTRACT(EPOCH FROM (vi.paid_at - vi.received_at)) / 86400 > e.payment_terms_days THEN 1 ELSE 0 END)::INT,
    ROUND(100.0 * SUM(CASE WHEN EXTRACT(EPOCH FROM (vi.paid_at - vi.received_at)) / 86400 <= e.payment_terms_days THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 2),
    (SELECT AVG(payment_terms_days)::INT FROM md_entities WHERE is_vendor = true)::INT
  FROM vendor_invoices vi JOIN md_entities e ON e.id = vi.vendor_id
  WHERE vi.paid_at IS NOT NULL AND vi.received_at IS NOT NULL AND vi.created_at >= v_cutoff;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."calculate_sla_compliance"(uuid, integer) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

-- ============================================================================
-- Object:        public.capture_sla_snapshot
-- Layer:         006 Functions
-- Source:        supabase/schemas/public/functions/capture_sla_snapshot.sql
-- Dependencies:  none
-- ============================================================================
CREATE OR REPLACE FUNCTION public.capture_sla_snapshot (
  p_tenant_id uuid,
  p_date      date DEFAULT CURRENT_DATE
)
  RETURNS void
  LANGUAGE plpgsql
  AS $function$
DECLARE
  v_total INTEGER;
  v_pass INTEGER;
  v_fail INTEGER;
  v_pct NUMERIC;
BEGIN
  -- ── SLA 1: WO Draft → Submit (target: 30 min = 1800 sec) ──
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE EXTRACT(EPOCH FROM (submitted_at - created_at)) <= 1800)
  INTO v_total, v_pass
  FROM public.work_orders
  WHERE tenant_id = p_tenant_id
    AND submitted_at IS NOT NULL
    AND status != 'cancelled';
  v_fail := v_total - v_pass;
  v_pct := CASE WHEN v_total > 0 THEN ROUND((v_pass::NUMERIC / v_total) * 100, 2) ELSE 0 END;
  INSERT INTO public.sla_daily_snapshots (tenant_id, snapshot_date, sla_stage, total_count, pass_count, fail_count, compliance_pct)
  VALUES (p_tenant_id, p_date, 'SLA 1', v_total, v_pass, v_fail, v_pct)
  ON CONFLICT (tenant_id, snapshot_date, sla_stage) DO UPDATE SET
    total_count = EXCLUDED.total_count,
    pass_count = EXCLUDED.pass_count,
    fail_count = EXCLUDED.fail_count,
    compliance_pct = EXCLUDED.compliance_pct;
  -- ── SLA 2: Submit → SBU Assigned (target: 60 min = 3600 sec) ──
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE EXTRACT(EPOCH FROM (assigned_at - submitted_at)) <= 3600)
  INTO v_total, v_pass
  FROM public.work_orders
  WHERE tenant_id = p_tenant_id
    AND assigned_at IS NOT NULL
    AND submitted_at IS NOT NULL
    AND status != 'cancelled';
  v_fail := v_total - v_pass;
  v_pct := CASE WHEN v_total > 0 THEN ROUND((v_pass::NUMERIC / v_total) * 100, 2) ELSE 0 END;
  INSERT INTO public.sla_daily_snapshots (tenant_id, snapshot_date, sla_stage, total_count, pass_count, fail_count, compliance_pct)
  VALUES (p_tenant_id, p_date, 'SLA 2', v_total, v_pass, v_fail, v_pct)
  ON CONFLICT (tenant_id, snapshot_date, sla_stage) DO UPDATE SET
    total_count = EXCLUDED.total_count,
    pass_count = EXCLUDED.pass_count,
    fail_count = EXCLUDED.fail_count,
    compliance_pct = EXCLUDED.compliance_pct;
  -- ── SLA 3: Assigned → Completed (target per SBU) ──
  -- TRUCKING: 3 days (259200 s), WAREHOUSE: 1 day (86400 s), CLEARANCE: 2 days (172800 s), FORWARDING: 4 days (345600 s)
  WITH wo_sbu AS (
    SELECT 
      wo.id,
      wo.assigned_at,
      wo.completed_at,
      COALESCE(
        (
          SELECT CASE 
            WHEN wi.sbu_type = 'WAREHOUSE' THEN 86400
            WHEN wi.sbu_type = 'CLEARANCE' THEN 172800
            WHEN wi.sbu_type = 'FORWARDING' THEN 345600
            ELSE 259200
          END
          FROM public.wo_items wi
          WHERE wi.wo_id = wo.id AND wi.sbu_type IS NOT NULL
          GROUP BY wi.sbu_type
          ORDER BY COUNT(*) DESC
          LIMIT 1
        ),
        259200
      ) AS target_seconds
    FROM public.work_orders wo
    WHERE wo.tenant_id = p_tenant_id
      AND wo.assigned_at IS NOT NULL
      AND wo.completed_at IS NOT NULL
      AND wo.status != 'cancelled'
  )
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE EXTRACT(EPOCH FROM (completed_at - assigned_at)) <= target_seconds)
  INTO v_total, v_pass
  FROM wo_sbu;
  v_fail := v_total - v_pass;
  v_pct := CASE WHEN v_total > 0 THEN ROUND((v_pass::NUMERIC / v_total) * 100, 2) ELSE 0 END;
  INSERT INTO public.sla_daily_snapshots (tenant_id, snapshot_date, sla_stage, total_count, pass_count, fail_count, compliance_pct)
  VALUES (p_tenant_id, p_date, 'SLA 3', v_total, v_pass, v_fail, v_pct)
  ON CONFLICT (tenant_id, snapshot_date, sla_stage) DO UPDATE SET
    total_count = EXCLUDED.total_count,
    pass_count = EXCLUDED.pass_count,
    fail_count = EXCLUDED.fail_count,
    compliance_pct = EXCLUDED.compliance_pct;
  -- ── SLA 4: Done → Ready Billing (target: 3 days = 259200 sec) ──
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE EXTRACT(EPOCH FROM (ready_billing_at - completed_at)) <= 259200)
  INTO v_total, v_pass
  FROM public.work_orders
  WHERE tenant_id = p_tenant_id
    AND completed_at IS NOT NULL
    AND ready_billing_at IS NOT NULL
    AND status != 'cancelled';
  v_fail := v_total - v_pass;
  v_pct := CASE WHEN v_total > 0 THEN ROUND((v_pass::NUMERIC / v_total) * 100, 2) ELSE 0 END;
  INSERT INTO public.sla_daily_snapshots (tenant_id, snapshot_date, sla_stage, total_count, pass_count, fail_count, compliance_pct)
  VALUES (p_tenant_id, p_date, 'SLA 4', v_total, v_pass, v_fail, v_pct)
  ON CONFLICT (tenant_id, snapshot_date, sla_stage) DO UPDATE SET
    total_count = EXCLUDED.total_count,
    pass_count = EXCLUDED.pass_count,
    fail_count = EXCLUDED.fail_count,
    compliance_pct = EXCLUDED.compliance_pct;
  -- ── SLA 5: Ready → Invoiced (target: 1 day = 86400 sec) ──
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE EXTRACT(EPOCH FROM (invoiced_at - ready_billing_at)) <= 86400)
  INTO v_total, v_pass
  FROM public.work_orders
  WHERE tenant_id = p_tenant_id
    AND ready_billing_at IS NOT NULL
    AND invoiced_at IS NOT NULL
    AND status != 'cancelled';
  v_fail := v_total - v_pass;
  v_pct := CASE WHEN v_total > 0 THEN ROUND((v_pass::NUMERIC / v_total) * 100, 2) ELSE 0 END;
  INSERT INTO public.sla_daily_snapshots (tenant_id, snapshot_date, sla_stage, total_count, pass_count, fail_count, compliance_pct)
  VALUES (p_tenant_id, p_date, 'SLA 5', v_total, v_pass, v_fail, v_pct)
  ON CONFLICT (tenant_id, snapshot_date, sla_stage) DO UPDATE SET
    total_count = EXCLUDED.total_count,
    pass_count = EXCLUDED.pass_count,
    fail_count = EXCLUDED.fail_count,
    compliance_pct = EXCLUDED.compliance_pct;
  -- ── SLA 6: Customer Invoice → Paid (simplified: paid = passed) ──
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE i.status = 'paid')
  INTO v_total, v_pass
  FROM public.invoices i
  JOIN public.work_orders wo ON i.wo_id = wo.id
  WHERE wo.tenant_id = p_tenant_id
    AND i.status IN ('sent', 'accepted', 'paid', 'overdue');
  v_fail := v_total - v_pass;
  v_pct := CASE WHEN v_total > 0 THEN ROUND((v_pass::NUMERIC / v_total) * 100, 2) ELSE 0 END;
  INSERT INTO public.sla_daily_snapshots (tenant_id, snapshot_date, sla_stage, total_count, pass_count, fail_count, compliance_pct)
  VALUES (p_tenant_id, p_date, 'SLA 6', v_total, v_pass, v_fail, v_pct)
  ON CONFLICT (tenant_id, snapshot_date, sla_stage) DO UPDATE SET
    total_count = EXCLUDED.total_count,
    pass_count = EXCLUDED.pass_count,
    fail_count = EXCLUDED.fail_count,
    compliance_pct = EXCLUDED.compliance_pct;
  -- ── SLA 7: Vendor Invoice → Paid (simplified: paid = passed in last 30 days) ──
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'paid')
  INTO v_total, v_pass
  FROM public.vendor_invoices
  WHERE tenant_id = p_tenant_id
    AND status IN ('submitted', 'verified', 'approved', 'paid')
    AND received_at >= NOW() - INTERVAL '30 days';
  v_fail := v_total - v_pass;
  v_pct := CASE WHEN v_total > 0 THEN ROUND((v_pass::NUMERIC / v_total) * 100, 2) ELSE 0 END;
  INSERT INTO public.sla_daily_snapshots (tenant_id, snapshot_date, sla_stage, total_count, pass_count, fail_count, compliance_pct)
  VALUES (p_tenant_id, p_date, 'SLA 7', v_total, v_pass, v_fail, v_pct)
  ON CONFLICT (tenant_id, snapshot_date, sla_stage) DO UPDATE SET
    total_count = EXCLUDED.total_count,
    pass_count = EXCLUDED.pass_count,
    fail_count = EXCLUDED.fail_count,
    compliance_pct = EXCLUDED.compliance_pct;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."capture_sla_snapshot"(uuid, date) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

-- ============================================================================
-- Object:        public.check_and_update_wo_status
-- Layer:         006 Functions
-- Source:        supabase/schemas/public/functions/check_and_update_wo_status.sql
-- Dependencies:  none
-- ============================================================================
CREATE OR REPLACE FUNCTION public.check_and_update_wo_status()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $function$
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
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."check_and_update_wo_status"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

-- ============================================================================
-- Object:        public.check_wo_readiness
-- Layer:         006 Functions
-- Source:        supabase/schemas/public/functions/check_wo_readiness.sql
-- Dependencies:  none
-- ============================================================================
CREATE OR REPLACE FUNCTION public.check_wo_readiness (
  p_wo_id uuid
)
  RETURNS TABLE (
    wo_id              uuid,
    total_jo           integer,
    completed_jo       integer,
    doc_complete_jo    integer,
    cost_complete_jo   integer,
    all_ready          boolean,
    missing_jo_details text
  )
  LANGUAGE plpgsql
  AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    wo.id,
    COUNT(jo.id)::INT,
    COUNT(jo.id) FILTER (WHERE jo.status IN ('completed', 'COMPLETED', 'PEKERJAAN SELESAI', 'awaiting_audit', 'AWAITING_AUDIT'))::INT,
    COUNT(jo.id) FILTER (WHERE jo.is_doc_finished = true)::INT,
    COUNT(jo.id) FILTER (WHERE jo.is_cost_finished = true)::INT,
    BOOL_AND(jo.is_doc_finished AND jo.is_cost_finished),
    STRING_AGG(
      CASE 
        WHEN NOT jo.is_doc_finished THEN 'JO ' || jo.jo_number || ': doc incomplete'
        WHEN NOT jo.is_cost_finished THEN 'JO ' || jo.jo_number || ': cost incomplete'
        ELSE NULL
      END, '; '
    ) FILTER (WHERE NOT (jo.is_doc_finished AND jo.is_cost_finished))
  FROM work_orders wo
  LEFT JOIN wo_items wi ON wi.work_order_id = wo.id
  LEFT JOIN job_orders jo ON jo.wo_item_id = wi.id
  WHERE wo.id = p_wo_id
  GROUP BY wo.id;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."check_wo_readiness"(uuid) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

-- ============================================================================
-- Object:        public.complete_repacking_order
-- Layer:         006 Functions
-- Source:        supabase/schemas/public/functions/complete_repacking_order.sql
-- Dependencies:  none
-- ============================================================================
CREATE OR REPLACE FUNCTION public.complete_repacking_order (
  p_order_id uuid,
  p_user_id  uuid
)
  RETURNS uuid
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
DECLARE
    v_order RECORD;
    v_src_item RECORD;
    v_res_item RECORD;
    v_source_inv RECORD;
    v_dest_inv_id UUID;
    v_qty_remaining NUMERIC;
    v_deduct NUMERIC;
BEGIN
    SELECT * INTO v_order FROM wh_repacking_orders WHERE id = p_order_id AND status = 'IN_PROGRESS' FOR UPDATE;
    IF v_order IS NULL THEN RAISE EXCEPTION 'Order not found or not in progress'; END IF;
    
    FOR v_src_item IN SELECT * FROM wh_repacking_items WHERE repacking_order_id = p_order_id AND item_type = 'SOURCE' LOOP
        v_qty_remaining := v_src_item.quantity;
        FOR v_source_inv IN SELECT * FROM wh_inventory WHERE tenant_id = v_order.tenant_id AND warehouse_id = v_order.warehouse_id AND product_sku_id = v_src_item.product_sku_id AND location_id = v_src_item.source_location_id AND quantity > 0 ORDER BY received_date ASC, created_at ASC FOR UPDATE LOOP
            IF v_qty_remaining <= 0 THEN EXIT; END IF;
            IF v_source_inv.quantity <= v_qty_remaining THEN v_deduct := v_source_inv.quantity; ELSE v_deduct := v_qty_remaining; END IF;
            UPDATE wh_inventory SET quantity = quantity - v_deduct, updated_at = NOW() WHERE id = v_source_inv.id;
            
            INSERT INTO wh_inventory_movements (tenant_id, inventory_id, movement_type, from_location_id, quantity, reference_type, reference_id, notes, created_by) 
            VALUES (v_order.tenant_id, v_source_inv.id, 'KITTING_CONSUME', v_src_item.source_location_id, v_deduct, v_order.order_type, v_order.id, 'Consumed for ' || v_order.order_type || ' order: ' || v_order.order_number, p_user_id);
            
            v_qty_remaining := v_qty_remaining - v_deduct;
        END LOOP;
        IF v_qty_remaining > 0 THEN RAISE EXCEPTION 'Insufficient stock in source location % for SKU %', v_src_item.source_location_id, v_src_item.product_sku_id; END IF;
    END LOOP;
    
    FOR v_res_item IN SELECT * FROM wh_repacking_items WHERE repacking_order_id = p_order_id AND item_type = 'RESULT' LOOP
        SELECT id INTO v_dest_inv_id FROM wh_inventory WHERE tenant_id = v_order.tenant_id AND warehouse_id = v_order.warehouse_id AND product_sku_id = v_res_item.product_sku_id AND location_id = v_res_item.target_location_id AND status = 'AVAILABLE' AND (customer_id = v_order.customer_id OR customer_id IS NULL) ORDER BY created_at DESC LIMIT 1;
        IF v_dest_inv_id IS NULL THEN
            INSERT INTO wh_inventory (
                tenant_id, warehouse_id, customer_id, location_id, product_sku_id, quantity,
                batch_number, expiry_date, received_date, unit_cost, status
            ) VALUES (
                v_order.tenant_id, v_order.warehouse_id, v_order.customer_id, v_res_item.target_location_id, v_res_item.product_sku_id, v_res_item.quantity,
                v_res_item.batch_number, v_res_item.expiry_date, CURRENT_DATE, v_res_item.unit_cost, 'AVAILABLE'
            ) RETURNING id INTO v_dest_inv_id;
        ELSE
            UPDATE wh_inventory SET quantity = quantity + v_res_item.quantity, updated_at = NOW() WHERE id = v_dest_inv_id;
        END IF;
        
        INSERT INTO wh_inventory_movements (tenant_id, inventory_id, movement_type, to_location_id, quantity, reference_type, reference_id, notes, created_by) 
        VALUES (v_order.tenant_id, v_dest_inv_id, 'KITTING_OUTPUT', v_res_item.target_location_id, v_res_item.quantity, v_order.order_type, v_order.id, 'Result from ' || v_order.order_type || ' order: ' || v_order.order_number, p_user_id);
    END LOOP;
    
    -- UPDATE JO TO COMPLETED
    UPDATE job_orders SET status = 'completed', updated_at = NOW() WHERE id = v_order.reference_id::UUID;
    
    -- UPDATE WO_ITEMS TO COMPLETED
    UPDATE wo_items SET status = 'completed', updated_at = NOW() WHERE id = (SELECT wo_item_id FROM job_orders WHERE id = v_order.reference_id::UUID);
    
    -- UPDATE WORK_ORDERS TO COMPLETED
    UPDATE work_orders SET status = 'completed', updated_at = NOW() WHERE id = (SELECT wo_id FROM wo_items WHERE id = (SELECT wo_item_id FROM job_orders WHERE id = v_order.reference_id::UUID));
    
    UPDATE wh_repacking_orders SET status = 'COMPLETED', executed_by = p_user_id, executed_at = NOW(), completed_at = NOW() WHERE id = p_order_id;
    
    RETURN p_order_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."complete_repacking_order"(uuid, uuid) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

-- ============================================================================
-- Object:        public.create_customer_v2
-- Layer:         006 Functions
-- Source:        supabase/schemas/public/functions/create_customer_v2.sql
-- Dependencies:  none
-- ============================================================================
CREATE OR REPLACE FUNCTION public.create_customer_v2 (
  p_tenant_id       uuid,
  p_auth_user_id    uuid,
  p_customer_code   text,
  p_name            text,
  p_email           text,
  p_phone           text,
  p_address         text,
  p_billing_address text,
  p_city            text,
  p_pic_name        text,
  p_created_by      uuid
)
  RETURNS json
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
DECLARE
    v_customer JSON;
BEGIN
    INSERT INTO public.customers (
        tenant_id, 
        auth_user_id, 
        customer_code, 
        name, 
        email, 
        phone, 
        address, 
        billing_address, 
        city, 
        pic_name, 
        created_by
    ) VALUES (
        p_tenant_id, 
        p_auth_user_id, 
        UPPER(p_customer_code), 
        p_name, 
        p_email, 
        p_phone, 
        p_address, 
        COALESCE(p_billing_address, p_address), 
        p_city, 
        p_pic_name, 
        p_created_by
    )
    RETURNING row_to_json(public.customers.*) INTO v_customer;
    
    RETURN v_customer;
END;
$function$;

GRANT EXECUTE
  ON FUNCTION "public"."create_customer_v2"(uuid, uuid, text, text, text, text, text, text, text, text, uuid)
  TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

-- ============================================================================
-- Object:        public.create_driver
-- Layer:         006 Functions
-- Source:        supabase/schemas/public/functions/create_driver.sql
-- Dependencies:  none
-- ============================================================================
CREATE OR REPLACE FUNCTION public.create_driver (
  p_tenant_id   uuid,
  p_entity_id   uuid,
  p_name        text,
  p_whatsapp    text,
  p_pin         text,
  p_address     text,
  p_sim_number  text,
  p_sim_class   text,
  p_sim_expiry  text,
  p_status      text,
  p_is_active   boolean,
  p_driver_code text
)
  RETURNS json
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
DECLARE
  v_normalized_phone TEXT;
  v_profile_id UUID;
  v_driver_id UUID;
  v_link_id UUID;
BEGIN
  -- Strict Internal Authorization
  IF NOT public.has_tenant_access(p_tenant_id) THEN
    RAISE EXCEPTION 'FORBIDDEN_TENANT_ACCESS: User is not authorized for this tenant';
  END IF;

  v_normalized_phone := public.normalize_phone(p_whatsapp);

  IF v_normalized_phone IS NULL OR v_normalized_phone = '' THEN
    RAISE EXCEPTION 'Invalid phone number format';
  END IF;

  -- Concurrency-safe Profile Creation/Resolution (using expression index)
  SELECT id INTO v_profile_id
  FROM public.driver_profiles
  WHERE public.normalize_phone(phone) = v_normalized_phone
  LIMIT 1;

  IF v_profile_id IS NULL THEN
    BEGIN
      INSERT INTO public.driver_profiles (phone, full_name, pin_hash, is_active)
      VALUES (v_normalized_phone, p_name, p_pin, true)
      RETURNING id INTO v_profile_id;
    EXCEPTION WHEN unique_violation THEN
      -- Handled race condition: another transaction created the profile just now
      SELECT id INTO v_profile_id
      FROM public.driver_profiles
      WHERE public.normalize_phone(phone) = v_normalized_phone
      LIMIT 1;
    END;
  END IF;

  -- Ensure not already linked in this tenant
  IF EXISTS (
    SELECT 1 FROM public.driver_tenant_links
    WHERE profile_id = v_profile_id AND tenant_id = p_tenant_id
  ) THEN
    RAISE EXCEPTION 'PROFILE_CONFLICT: Driver already exists in this tenant';
  END IF;

  -- Insert into md_drivers
  INSERT INTO public.md_drivers (
    tenant_id, entity_id, name, whatsapp, pin, address, 
    sim_number, sim_class, sim_expiry, status, is_active, driver_code
  )
  VALUES (
    p_tenant_id, p_entity_id, p_name, p_whatsapp, p_pin, p_address,
    p_sim_number, p_sim_class, p_sim_expiry, p_status, p_is_active, p_driver_code
  )
  RETURNING id INTO v_driver_id;

  -- Link profile and driver
  INSERT INTO public.driver_tenant_links (profile_id, tenant_id, driver_id, is_active)
  VALUES (v_profile_id, p_tenant_id, v_driver_id, true)
  RETURNING id INTO v_link_id;

  RETURN json_build_object(
    'driver_id', v_driver_id,
    'profile_id', v_profile_id,
    'link_id', v_link_id
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."create_driver"(uuid, uuid, text, text, text, text, text, text, text, text, boolean, text) TO "authenticated", "postgres", "service_role";

REVOKE ALL ON FUNCTION "public"."create_driver"(uuid, uuid, text, text, text, text, text, text, text, text, boolean, text) FROM PUBLIC;

-- ============================================================================
-- Object:        public.create_stock_opname
-- Layer:         006 Functions
-- Source:        supabase/schemas/public/functions/create_stock_opname.sql
-- Dependencies:  none
-- ============================================================================
CREATE OR REPLACE FUNCTION public.create_stock_opname (
  p_tenant_id     uuid,
  p_warehouse_id  uuid,
  p_opname_type   text,
  p_schedule_date date,
  p_user_id       uuid,
  p_notes         text DEFAULT NULL::text,
  p_location_id   uuid DEFAULT NULL::uuid
)
  RETURNS uuid
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
DECLARE
    v_opname_id UUID;
    v_opname_number TEXT;
BEGIN
    -- Generate Number: SO-YYMMDD-NNN
    v_opname_number := 'SO-' || to_char(NOW(), 'YYMMDD') || '-' || LPAD(CAST(CAST(random() * 1000 AS INT) AS TEXT), 3, '0');

    -- Create Header
    INSERT INTO wh_stock_opname (
        tenant_id, warehouse_id, opname_number, status, opname_type, schedule_date, notes, created_by
    ) VALUES (
        p_tenant_id, p_warehouse_id, v_opname_number, 'DRAFT', p_opname_type, p_schedule_date, p_notes, p_user_id
    ) RETURNING id INTO v_opname_id;

    -- Snapshot Inventory
    IF p_location_id IS NOT NULL THEN
        -- Only specific location
        INSERT INTO wh_stock_opname_items (
            opname_id, tenant_id, product_sku_id, location_id, system_qty, batch_number
        )
        SELECT 
            v_opname_id, p_tenant_id, product_sku_id, location_id, quantity, batch_number
        FROM wh_inventory
        WHERE tenant_id = p_tenant_id 
          AND warehouse_id = p_warehouse_id 
          AND location_id = p_location_id
          AND status = 'AVAILABLE';
    ELSE
        -- All locations in warehouse
        INSERT INTO wh_stock_opname_items (
            opname_id, tenant_id, product_sku_id, location_id, system_qty, batch_number
        )
        SELECT 
            v_opname_id, p_tenant_id, product_sku_id, location_id, quantity, batch_number
        FROM wh_inventory
        WHERE tenant_id = p_tenant_id 
          AND warehouse_id = p_warehouse_id
          AND status = 'AVAILABLE';
    END IF;

    RETURN v_opname_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."create_stock_opname"(uuid, uuid, text, date, uuid, text, uuid) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

-- ============================================================================
-- Object:        public.create_transfer_from_hq_wo
-- Layer:         006 Functions
-- Source:        supabase/schemas/public/functions/create_transfer_from_hq_wo.sql
-- Dependencies:  none
-- ============================================================================
CREATE OR REPLACE FUNCTION public.create_transfer_from_hq_wo (
  p_tenant_id         uuid,
  p_wo_id             uuid,
  p_wo_number         text,
  p_from_warehouse_id uuid,
  p_to_warehouse_id   uuid,
  p_items             jsonb,
  p_notes             text,
  p_user_id           uuid,
  p_sbu_type          text,
  p_deal_price        numeric
)
  RETURNS uuid
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
DECLARE
    v_transfer_id UUID;
    v_transfer_number TEXT;
    v_outbound_id UUID;
    v_inbound_id UUID;
    v_outbound_number TEXT;
    v_inbound_number TEXT;
    v_item JSONB;

    -- WO/JO vars
    v_wo_item_outbound_id UUID;
    v_wo_item_inbound_id UUID;
    v_jo_outbound_number TEXT;
    v_jo_inbound_number TEXT;
BEGIN
    -- 1. Generate Numbers
    v_transfer_number := 'TRF-' || TO_CHAR(NOW(), 'YYMMDD') || '-' || SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4);
    v_outbound_number := 'OUT-' || v_transfer_number;
    v_inbound_number := 'RCV-' || v_transfer_number;
    
    v_jo_outbound_number := p_wo_number || '-OUT';
    v_jo_inbound_number := p_wo_number || '-IN';

    -- 2. Create Transfer Order First (so we have v_transfer_id for the JSON fields)
    INSERT INTO wh_transfer_orders (
        tenant_id, transfer_number, from_warehouse_id, to_warehouse_id,
        status, notes, created_by
    ) VALUES (
        p_tenant_id, v_transfer_number, p_from_warehouse_id, p_to_warehouse_id,
        'CREATED', p_notes, p_user_id
    ) RETURNING id INTO v_transfer_id;

    -- 3. WO Item — Outbound (Picking/Loading at source)
    INSERT INTO wo_items (tenant_id, wo_id, sbu_type, item_data, status, max_jo_count, item_code, unit_price, total_revenue)
    VALUES (p_tenant_id, p_wo_id, p_sbu_type,
      jsonb_build_object(
        'transfer_id', v_transfer_id, 
        'direction', 'OUTBOUND', 
        'warehouse_id', p_from_warehouse_id, 
        'operation_type', 'STOCK_TRANSFER',
        'notes', p_notes
      ),
      'need_assignment', 1, p_wo_number || '-OUT', p_deal_price, p_deal_price)
    RETURNING id INTO v_wo_item_outbound_id;

    -- JO — Outbound
    INSERT INTO job_orders (tenant_id, wo_item_id, jo_number, status, sbu_type, notes)
    VALUES (p_tenant_id, v_wo_item_outbound_id, v_jo_outbound_number, 'pending', p_sbu_type, 'Transfer OUT: ' || v_transfer_number);

    -- 4. WO Item — Inbound (Receiving/Putaway at destination)
    INSERT INTO wo_items (tenant_id, wo_id, sbu_type, item_data, status, max_jo_count, item_code, unit_price, total_revenue)
    VALUES (p_tenant_id, p_wo_id, p_sbu_type,
      jsonb_build_object(
        'transfer_id', v_transfer_id, 
        'direction', 'INBOUND', 
        'warehouse_id', p_to_warehouse_id,
        'operation_type', 'STOCK_TRANSFER',
        'notes', p_notes
      ),
      'need_assignment', 1, p_wo_number || '-IN', 0, 0)
    RETURNING id INTO v_wo_item_inbound_id;

    -- JO — Inbound
    INSERT INTO job_orders (tenant_id, wo_item_id, jo_number, status, sbu_type, notes)
    VALUES (p_tenant_id, v_wo_item_inbound_id, v_jo_inbound_number, 'pending', p_sbu_type, 'Transfer IN: ' || v_transfer_number);

    -- 5. Create Outbound Shipment (for origin warehouse)
    INSERT INTO wh_outbound_shipments (
        tenant_id, warehouse_id, transfer_id, wo_item_id, shipment_number,
        status, notes, created_by
    ) VALUES (
        p_tenant_id, p_from_warehouse_id, v_transfer_id, v_wo_item_outbound_id, v_outbound_number,
        'PLANNED', 'Auto-generated for Transfer ' || v_transfer_number, p_user_id
    ) RETURNING id INTO v_outbound_id;

    -- 6. Create Inbound Receipt (for destination warehouse)
    INSERT INTO wh_inbound_receipts (
        tenant_id, warehouse_id, transfer_id, wo_item_id, receipt_number,
        status, notes, created_by
    ) VALUES (
        p_tenant_id, p_to_warehouse_id, v_transfer_id, v_wo_item_inbound_id, v_inbound_number,
        'PLANNED', 'Auto-generated for Transfer ' || v_transfer_number, p_user_id
    ) RETURNING id INTO v_inbound_id;

    -- 7. Create Transfer Details + Outbound/Inbound items + Manifests
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        -- Insert Transfer Details
        INSERT INTO wh_transfer_details (
            tenant_id, transfer_id, inventory_id, product_sku_id, quantity
        ) VALUES (
            p_tenant_id, v_transfer_id, 
            NULLIF(v_item->>'inventory_id', '')::UUID, 
            (v_item->>'product_sku_id')::UUID, 
            (v_item->>'quantity')::NUMERIC
        );

        -- Insert Outbound Item
        INSERT INTO wh_outbound_shipment_items (
            tenant_id, shipment_id, product_sku_id, planned_qty, picked_qty, status
        ) VALUES (
            p_tenant_id, v_outbound_id, (v_item->>'product_sku_id')::UUID, (v_item->>'quantity')::NUMERIC, 0, 'PENDING'
        );

        -- Insert Inbound Item
        INSERT INTO wh_inbound_receipt_items (
            tenant_id, receipt_id, product_sku_id, expected_qty, actual_good_qty, status
        ) VALUES (
            p_tenant_id, v_inbound_id, (v_item->>'product_sku_id')::UUID, (v_item->>'quantity')::NUMERIC, 0, 'PENDING'
        );

        -- Insert Manifest for Outbound WO Item
        INSERT INTO wo_item_manifests (
            wo_item_id, tenant_id, product_sku_id, quantity, unit_weight_kg, unit_volume_m3, notes
        ) VALUES (
            v_wo_item_outbound_id, p_tenant_id, (v_item->>'product_sku_id')::UUID, (v_item->>'quantity')::NUMERIC, 
            COALESCE((v_item->>'unit_weight_kg')::NUMERIC, 0), 
            COALESCE((v_item->>'unit_volume_m3')::NUMERIC, 0), 
            v_item->>'notes'
        );

        -- Insert Manifest for Inbound WO Item
        INSERT INTO wo_item_manifests (
            wo_item_id, tenant_id, product_sku_id, quantity, unit_weight_kg, unit_volume_m3, notes
        ) VALUES (
            v_wo_item_inbound_id, p_tenant_id, (v_item->>'product_sku_id')::UUID, (v_item->>'quantity')::NUMERIC, 
            COALESCE((v_item->>'unit_weight_kg')::NUMERIC, 0), 
            COALESCE((v_item->>'unit_volume_m3')::NUMERIC, 0), 
            v_item->>'notes'
        );
    END LOOP;

    RETURN v_transfer_id;
END;
$function$;

GRANT EXECUTE
  ON FUNCTION "public"."create_transfer_from_hq_wo"(uuid, uuid, text, uuid, uuid, jsonb, text, uuid, text, numeric)
  TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

-- ============================================================================
-- Object:        public.create_warehouse_transfer
-- Layer:         006 Functions
-- Source:        supabase/schemas/public/functions/create_warehouse_transfer.sql
-- Dependencies:  none
-- ============================================================================
CREATE OR REPLACE FUNCTION public.create_warehouse_transfer (
  p_tenant_id         uuid,
  p_from_warehouse_id uuid,
  p_to_warehouse_id   uuid,
  p_items             jsonb,
  p_notes             text,
  p_user_id           uuid
)
  RETURNS uuid
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
DECLARE
    v_transfer_id UUID;
    v_transfer_number TEXT;
    v_outbound_id UUID;
    v_inbound_id UUID;
    v_outbound_number TEXT;
    v_inbound_number TEXT;
    v_item JSONB;

    -- WO/JO vars
    v_wo_id UUID;
    v_wo_number TEXT;
    v_wo_item_outbound_id UUID;
    v_wo_item_inbound_id UUID;
    v_jo_outbound_number TEXT;
    v_jo_inbound_number TEXT;
BEGIN
    -- 1. Generate Numbers
    v_transfer_number := 'TRF-' || TO_CHAR(NOW(), 'YYMMDD') || '-' || SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4);
    v_outbound_number := 'OUT-' || v_transfer_number;
    v_inbound_number := 'RCV-' || v_transfer_number;
    v_wo_number := 'WO-' || v_transfer_number;
    v_jo_outbound_number := 'JO-' || v_transfer_number || '-OUT';
    v_jo_inbound_number := 'JO-' || v_transfer_number || '-IN';

    -- ============== CREATE WORK ORDER ==============
    INSERT INTO work_orders (tenant_id, wo_number, status, notes, created_by)
    VALUES (p_tenant_id, v_wo_number, 'need_assignment', 'Transfer: ' || COALESCE(p_notes, ''), p_user_id)
    RETURNING id INTO v_wo_id;

    -- WO Item — Outbound (Picking/Loading at source)
    INSERT INTO wo_items (tenant_id, wo_id, sbu_type, item_data, status)
    VALUES (p_tenant_id, v_wo_id, 'WAREHOUSE',
      jsonb_build_object('transfer_id', v_transfer_id, 'direction', 'OUTBOUND', 'warehouse_id', p_from_warehouse_id),
      'need_assignment')
    RETURNING id INTO v_wo_item_outbound_id;

    -- JO — Outbound
    INSERT INTO job_orders (tenant_id, wo_item_id, jo_number, status, sbu_type, notes)
    VALUES (p_tenant_id, v_wo_item_outbound_id, v_jo_outbound_number, 'pending', 'WAREHOUSE', 'Transfer OUT: ' || v_transfer_number);

    -- WO Item — Inbound (Receiving/Putaway at destination)
    INSERT INTO wo_items (tenant_id, wo_id, sbu_type, item_data, status)
    VALUES (p_tenant_id, v_wo_id, 'WAREHOUSE',
      jsonb_build_object('transfer_id', v_transfer_id, 'direction', 'INBOUND', 'warehouse_id', p_to_warehouse_id),
      'need_assignment')
    RETURNING id INTO v_wo_item_inbound_id;

    -- JO — Inbound
    INSERT INTO job_orders (tenant_id, wo_item_id, jo_number, status, sbu_type, notes)
    VALUES (p_tenant_id, v_wo_item_inbound_id, v_jo_inbound_number, 'pending', 'WAREHOUSE', 'Transfer IN: ' || v_transfer_number);
    -- ===============================================

    -- 2. Create Transfer Order
    INSERT INTO wh_transfer_orders (
        tenant_id, transfer_number, from_warehouse_id, to_warehouse_id,
        status, notes, created_by
    ) VALUES (
        p_tenant_id, v_transfer_number, p_from_warehouse_id, p_to_warehouse_id,
        'CREATED', p_notes, p_user_id
    ) RETURNING id INTO v_transfer_id;

    -- 3. Create Outbound Shipment (for origin warehouse) — linked to outbound WO Item
    INSERT INTO wh_outbound_shipments (
        tenant_id, warehouse_id, transfer_id, wo_item_id, shipment_number,
        status, notes, created_by
    ) VALUES (
        p_tenant_id, p_from_warehouse_id, v_transfer_id, v_wo_item_outbound_id, v_outbound_number,
        'PLANNED', 'Auto-generated for Transfer ' || v_transfer_number, p_user_id
    ) RETURNING id INTO v_outbound_id;

    -- 4. Create Inbound Receipt (for destination warehouse) — linked to inbound WO Item
    INSERT INTO wh_inbound_receipts (
        tenant_id, warehouse_id, transfer_id, wo_item_id, receipt_number,
        status, notes, created_by
    ) VALUES (
        p_tenant_id, p_to_warehouse_id, v_transfer_id, v_wo_item_inbound_id, v_inbound_number,
        'PLANNED', 'Auto-generated for Transfer ' || v_transfer_number, p_user_id
    ) RETURNING id INTO v_inbound_id;

    -- 5. Create Transfer Details + Outbound/Inbound items
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        INSERT INTO wh_transfer_details (
            tenant_id, transfer_id, inventory_id, product_sku_id, quantity
        ) VALUES (
            p_tenant_id, v_transfer_id, (v_item->>'inventory_id')::UUID, (v_item->>'product_sku_id')::UUID, (v_item->>'quantity')::NUMERIC
        );

        INSERT INTO wh_outbound_shipment_items (
            tenant_id, shipment_id, product_sku_id, planned_qty, picked_qty, status
        ) VALUES (
            p_tenant_id, v_outbound_id, (v_item->>'product_sku_id')::UUID, (v_item->>'quantity')::NUMERIC, 0, 'PENDING'
        );

        INSERT INTO wh_inbound_receipt_items (
            tenant_id, receipt_id, product_sku_id, expected_qty, actual_good_qty, status
        ) VALUES (
            p_tenant_id, v_inbound_id, (v_item->>'product_sku_id')::UUID, (v_item->>'quantity')::NUMERIC, 0, 'PENDING'
        );
    END LOOP;

    RETURN v_transfer_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."create_warehouse_transfer"(uuid, uuid, uuid, jsonb, text, uuid) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

-- ============================================================================
-- Object:        public.current_tenant_id
-- Layer:         006 Functions
-- Source:        supabase/schemas/public/functions/current_tenant_id.sql
-- Dependencies:  none
-- ============================================================================
CREATE OR REPLACE FUNCTION public.current_tenant_id()
  RETURNS uuid
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  AS $function$
BEGIN
  RETURN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid() LIMIT 1);
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."current_tenant_id"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

-- ============================================================================
-- Object:        public.deactivate_driver
-- Layer:         006 Functions
-- Source:        supabase/schemas/public/functions/deactivate_driver.sql
-- Dependencies:  none
-- ============================================================================
CREATE OR REPLACE FUNCTION public.deactivate_driver (
  p_driver_id uuid,
  p_tenant_id uuid
)
  RETURNS json
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
BEGIN
  -- Strict Internal Authorization
  IF NOT public.has_tenant_access(p_tenant_id) THEN
    RAISE EXCEPTION 'FORBIDDEN_TENANT_ACCESS: User is not authorized for this tenant';
  END IF;

  -- Verify driver belongs to tenant
  IF NOT EXISTS (SELECT 1 FROM public.md_drivers WHERE id = p_driver_id AND tenant_id = p_tenant_id) THEN
    RAISE EXCEPTION 'Driver not found in tenant';
  END IF;

  -- Deactivate md_drivers
  UPDATE public.md_drivers
  SET is_active = false, updated_at = NOW()
  WHERE id = p_driver_id AND tenant_id = p_tenant_id;

  -- Deactivate driver_tenant_links
  UPDATE public.driver_tenant_links
  SET is_active = false, updated_at = NOW()
  WHERE driver_id = p_driver_id AND tenant_id = p_tenant_id;

  RETURN json_build_object('success', true);
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."deactivate_driver"(uuid, uuid) TO "authenticated", "postgres", "service_role";

REVOKE ALL ON FUNCTION "public"."deactivate_driver"(uuid, uuid) FROM PUBLIC;

-- ============================================================================
-- Object:        public.deduct_tokens_on_jo_complete
-- Layer:         006 Functions
-- Source:        supabase/schemas/public/functions/deduct_tokens_on_jo_complete.sql
-- Dependencies:  none
-- ============================================================================
CREATE OR REPLACE FUNCTION public.deduct_tokens_on_jo_complete()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
DECLARE
  v_sbu_type TEXT;
  v_tokens_per_jo INTEGER;
  v_new_balance INTEGER;
  v_tenant_code TEXT;
  v_tenant_name TEXT;
  v_admin_user_id UUID;
  v_admin_whatsapp TEXT;
BEGIN
  -- Only proceed if status changed to a completed/done state
  IF OLD.status IS DISTINCT FROM NEW.status
     AND NEW.status IN ('COMPLETED', 'PEKERJAAN SELESAI', 'SELESAI', 'DONE', 'PAID', 'completed', 'RECEIVED')
  THEN

    -- 1. Determine SBU type from JO (fallback: wo_items)
    v_sbu_type := NEW.sbu_type;
    IF v_sbu_type IS NULL THEN
      SELECT sbu_type INTO v_sbu_type
      FROM wo_items
      WHERE id = NEW.wo_item_id;
    END IF;
    IF v_sbu_type IS NULL THEN
      v_sbu_type := 'TRUCKING';
    END IF;

    -- 2. Get token rate for this SBU type
    SELECT tokens_per_jo INTO v_tokens_per_jo
    FROM public.sbu_token_rates
    WHERE sbu_type = v_sbu_type;

    IF v_tokens_per_jo IS NULL OR v_tokens_per_jo <= 0 THEN
      v_tokens_per_jo := 1;
    END IF;

    -- 3. Get tenant code
    SELECT tenant_code, name INTO v_tenant_code, v_tenant_name
    FROM public.tenants
    WHERE id = NEW.tenant_id;

    -- 4. Deduct tokens from tenant balance
    UPDATE public.tenants
    SET token_balance = GREATEST(COALESCE(token_balance, 0) - v_tokens_per_jo, 0),
        updated_at = NOW()
    WHERE id = NEW.tenant_id
    RETURNING token_balance INTO v_new_balance;

    -- 5. Record CONSUME transaction (positive amount = tokens spent)
    INSERT INTO public.token_transactions (
      tenant_id, tenant_code, amount, transaction_type, description, created_at
    ) VALUES (
      NEW.tenant_id, v_tenant_code, v_tokens_per_jo, 'CONSUME',
      v_sbu_type || ' - JO ' || COALESCE(NEW.jo_number, NEW.id::text),
      NOW()
    );

    -- 6. Check low balance and notify tenant admin
    IF v_new_balance <= 5 THEN
      -- Find tenant admin user via tenant_users (profiles has no tenant_id)
      SELECT tu.user_id INTO v_admin_user_id
      FROM public.tenant_users tu
      WHERE tu.tenant_id = NEW.tenant_id
        AND tu.is_active = true
        AND tu.role_code IN ('tenant_superadmin', 'tenant_admin', 'superadmin', 'admin_wo', 'director')
      ORDER BY CASE WHEN tu.role_code IN ('tenant_superadmin', 'tenant_admin') THEN 0 ELSE 1 END
      LIMIT 1;

      IF v_admin_user_id IS NOT NULL THEN
        IF v_new_balance <= 0 THEN
          -- Critical: balance exhausted
          INSERT INTO public.notifications (
            user_id, tenant_id, role, title, message, type, link, created_at
          ) VALUES (
            v_admin_user_id, NEW.tenant_id, 'tenant_admin',
            'Token Balance Habis',
            'Saldo token ' || COALESCE(v_tenant_name, v_tenant_code) || ' habis (0 TKN). JO baru tidak dapat berjalan hingga top-up dilakukan.',
            'token_critical', '/tenant/token', NOW()
          );
        ELSE
          -- Warning: balance nearly empty
          INSERT INTO public.notifications (
            user_id, tenant_id, role, title, message, type, link, created_at
          ) VALUES (
            v_admin_user_id, NEW.tenant_id, 'tenant_admin',
            'Token Hampir Habis',
            'Sisa saldo token ' || COALESCE(v_tenant_name, v_tenant_code) || ': ' || v_new_balance || ' TKN. Segera lakukan top-up agar JO dapat terus berjalan.',
            'token_warning', '/tenant/token', NOW()
          );
        END IF;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."deduct_tokens_on_jo_complete"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

-- ============================================================================
-- Object:        public.detect_stale_gps
-- Layer:         006 Functions
-- Source:        supabase/schemas/public/functions/detect_stale_gps.sql
-- Dependencies:  none
-- ============================================================================
CREATE OR REPLACE FUNCTION public.detect_stale_gps (
  p_tenant_id uuid
)
  RETURNS TABLE (
    driver_id     uuid,
    driver_name   character varying,
    driver_phone  character varying,
    jo_id         uuid,
    jo_number     character varying,
    jo_status     character varying,
    last_gps_time timestamp with time zone,
    stale_minutes numeric,
    last_lat      double precision,
    last_lng      double precision,
    gps_source    character varying,
    alert_level   character varying
  )
  LANGUAGE plpgsql
  AS $function$
BEGIN
  RETURN QUERY
  SELECT
    md.id AS driver_id,
    md.name AS driver_name,
    md.phone AS driver_phone,
    jo.id AS jo_id,
    jo.jo_number AS jo_number,
    jo.status AS jo_status,
    last_ping.created_at AS last_gps_time,
    ROUND(EXTRACT(EPOCH FROM (NOW() - last_ping.created_at)) / 60, 1) AS stale_minutes,
    last_ping.latitude AS last_lat,
    last_ping.longitude AS last_lng,
    last_ping.source AS gps_source,
    CASE
      WHEN EXTRACT(EPOCH FROM (NOW() - last_ping.created_at)) / 60 > 60 THEN 'CRITICAL'
      WHEN EXTRACT(EPOCH FROM (NOW() - last_ping.created_at)) / 60 > 30 THEN 'WARNING'
      ELSE 'NORMAL'
    END AS alert_level
  FROM job_orders jo
  JOIN md_drivers md ON jo.driver_id = md.id
  JOIN LATERAL (
    SELECT jt.latitude, jt.longitude, jt.source, jt.created_at
    FROM job_tracking jt
    WHERE jt.job_order_id = jo.id
      AND jt.latitude IS NOT NULL
    ORDER BY jt.created_at DESC
    LIMIT 1
  ) last_ping ON true
  WHERE jo.tenant_id = p_tenant_id
    AND jo.status IN ('ASSIGNED', 'DALAM PERJALANAN', 'DISPATCHED', 
                       'BERANGKAT DARI LOKASI MUAT', 'TIBA DI LOKASI MUAT',
                       'TIBA DI LOKASI BONGKAR', 'MENUJU PALUGADA',
                       'MENUJU TAM', 'LOADING', 'UNLOADING')
    AND EXTRACT(EPOCH FROM (NOW() - last_ping.created_at)) / 60 > 15
  ORDER BY stale_minutes DESC;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."detect_stale_gps"(uuid) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

-- ============================================================================
-- Object:        public.exec_raw_query
-- Layer:         006 Functions
-- Source:        supabase/schemas/public/functions/exec_raw_query.sql
-- Dependencies:  none
-- ============================================================================
CREATE OR REPLACE FUNCTION public.exec_raw_query (
  sql_query text
)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
DECLARE
    result jsonb;
BEGIN
    EXECUTE 'SELECT jsonb_agg(t) FROM (' || sql_query || ') t' INTO result;
    RETURN COALESCE(result, '[]'::jsonb);
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."exec_raw_query"(text) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

-- ============================================================================
-- Object:        public.exec_sql_manual
-- Layer:         006 Functions
-- Source:        supabase/schemas/public/functions/exec_sql_manual.sql
-- Dependencies:  none
-- ============================================================================
CREATE OR REPLACE FUNCTION public.exec_sql_manual (
  sql_query text
)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
DECLARE
    result jsonb;
BEGIN
    EXECUTE 'SELECT jsonb_agg(t) FROM (' || sql_query || ') t' INTO result;
    RETURN COALESCE(result, '[]'::jsonb);
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."exec_sql_manual"(text) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

-- ============================================================================
-- Object:        public.execute_internal_movement
-- Layer:         006 Functions
-- Source:        supabase/schemas/public/functions/execute_internal_movement.sql
-- Dependencies:  none
-- ============================================================================
CREATE OR REPLACE FUNCTION public.execute_internal_movement (
  p_movement_id uuid
)
  RETURNS uuid
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
DECLARE
  v_mov RECORD;
  v_qty_remaining NUMERIC;
  v_deduct NUMERIC;
  v_dest_inv_id UUID;
  v_source_inv RECORD;
  v_wo_id UUID;
  v_wo_item_id UUID;
  v_jo_number TEXT;
BEGIN
  -- Lock & fetch the PENDING movement
  SELECT * INTO v_mov FROM wh_internal_movements
  WHERE id = p_movement_id AND status = 'PENDING'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Movement not found or already executed';
  END IF;

  -- Mark IN_PROGRESS
  UPDATE wh_internal_movements SET status = 'IN_PROGRESS' WHERE id = p_movement_id;

  -- ============== AUTO-GENERATE JO ==============
  v_jo_number := 'IM-' || TO_CHAR(NOW(), 'YYMMDD') || '-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4));

  INSERT INTO work_orders (tenant_id, wo_number, status, notes, created_by)
  VALUES (v_mov.tenant_id, v_jo_number, 'completed', 'Auto-generated for Internal Movement', v_mov.created_by)
  RETURNING id INTO v_wo_id;

  INSERT INTO wo_items (tenant_id, wo_id, sbu_type, item_data, status)
  VALUES (v_mov.tenant_id, v_wo_id, 'WAREHOUSE',
    jsonb_build_object('movement_id', p_movement_id, 'from_location', v_mov.from_location_id, 'to_location', v_mov.to_location_id),
    'completed')
  RETURNING id INTO v_wo_item_id;

  INSERT INTO job_orders (tenant_id, wo_item_id, jo_number, status, sbu_type, notes)
  VALUES (v_mov.tenant_id, v_wo_item_id, v_jo_number, 'completed', 'WAREHOUSE', 'Internal Movement: ' || p_movement_id);

  -- Store wo_item_id in reference_id so StockCardModal can look up JO number
  UPDATE wh_internal_movements SET reference_id = v_wo_item_id::TEXT WHERE id = p_movement_id;
  -- ===============================================

  v_qty_remaining := v_mov.quantity;

  -- Deduct from source (FIFO)
  FOR v_source_inv IN
    SELECT * FROM wh_inventory
    WHERE tenant_id = v_mov.tenant_id
      AND warehouse_id = v_mov.warehouse_id
      AND product_sku_id = v_mov.product_sku_id
      AND location_id = v_mov.from_location_id
      AND quantity > 0
    ORDER BY received_date ASC, created_at ASC
    FOR UPDATE
  LOOP
    EXIT WHEN v_qty_remaining <= 0;

    v_deduct := LEAST(v_source_inv.quantity, v_qty_remaining);

    UPDATE wh_inventory SET quantity = quantity - v_deduct, updated_at = NOW()
    WHERE id = v_source_inv.id;

    -- Find or create destination record
    SELECT id INTO v_dest_inv_id FROM wh_inventory
    WHERE tenant_id = v_mov.tenant_id
      AND warehouse_id = v_mov.warehouse_id
      AND product_sku_id = v_mov.product_sku_id
      AND location_id = v_mov.to_location_id
      AND status = v_source_inv.status
      AND COALESCE(batch_number, '') = COALESCE(v_source_inv.batch_number, '')
      AND COALESCE(expiry_date, '1970-01-01') = COALESCE(v_source_inv.expiry_date, '1970-01-01')
    LIMIT 1 FOR UPDATE;

    IF v_dest_inv_id IS NOT NULL THEN
      UPDATE wh_inventory SET quantity = quantity + v_deduct, updated_at = NOW()
      WHERE id = v_dest_inv_id;
    ELSE
      INSERT INTO wh_inventory (
        tenant_id, warehouse_id, location_id, product_sku_id, quantity,
        batch_number, expiry_date, received_date, unit_cost, status
      ) VALUES (
        v_mov.tenant_id, v_mov.warehouse_id, v_mov.to_location_id, v_mov.product_sku_id, v_deduct,
        v_source_inv.batch_number, v_source_inv.expiry_date, v_source_inv.received_date, v_source_inv.unit_cost, v_source_inv.status
      ) RETURNING id INTO v_dest_inv_id;
    END IF;

    -- Audit log
    INSERT INTO wh_inventory_movements (
      tenant_id, inventory_id, movement_type, from_location_id, to_location_id,
      quantity, reference_type, notes, created_by
    ) VALUES (
      v_mov.tenant_id, v_dest_inv_id, 'TRANSFER', v_mov.from_location_id, v_mov.to_location_id,
      v_deduct, 'INTERNAL_MOVEMENT', 'Executed movement order', v_mov.executed_by
    );

    v_qty_remaining := v_qty_remaining - v_deduct;
  END LOOP;

  IF v_qty_remaining > 0 THEN
    RAISE EXCEPTION 'Insufficient stock in source location';
  END IF;

  -- Mark COMPLETED
  UPDATE wh_internal_movements
  SET status = 'COMPLETED', executed_at = NOW()
  WHERE id = p_movement_id;

  RETURN p_movement_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."execute_internal_movement"(uuid) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

-- ============================================================================
-- Object:        public.execute_repacking_order
-- Layer:         006 Functions
-- Source:        supabase/schemas/public/functions/execute_repacking_order.sql
-- Dependencies:  none
-- ============================================================================
CREATE OR REPLACE FUNCTION public.execute_repacking_order (
  p_order_id uuid,
  p_user_id  uuid
)
  RETURNS uuid
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
DECLARE
    v_order RECORD;
    v_src_item RECORD;
    v_res_item RECORD;
    v_source_inv RECORD;
    v_dest_inv_id UUID;
    v_qty_remaining NUMERIC;
    v_deduct NUMERIC;
    v_wo_number TEXT;
    v_wo_id UUID;
    v_jo_number TEXT;
    v_wo_item_id UUID;
    v_jo_id UUID;
BEGIN
    SELECT * INTO v_order FROM wh_repacking_orders WHERE id = p_order_id AND status IN ('CREATED', 'IN_PROGRESS') FOR UPDATE;
    IF v_order IS NULL THEN RAISE EXCEPTION 'Order not found or already completed/cancelled'; END IF;
    UPDATE wh_repacking_orders SET status = 'IN_PROGRESS' WHERE id = p_order_id;
    
    FOR v_src_item IN SELECT * FROM wh_repacking_items WHERE repacking_order_id = p_order_id AND item_type = 'SOURCE' LOOP
        v_qty_remaining := v_src_item.quantity;
        FOR v_source_inv IN SELECT * FROM wh_inventory WHERE tenant_id = v_order.tenant_id AND warehouse_id = v_order.warehouse_id AND product_sku_id = v_src_item.product_sku_id AND location_id = v_src_item.source_location_id AND quantity > 0 ORDER BY received_date ASC, created_at ASC FOR UPDATE LOOP
            IF v_qty_remaining <= 0 THEN EXIT; END IF;
            IF v_source_inv.quantity <= v_qty_remaining THEN v_deduct := v_source_inv.quantity; ELSE v_deduct := v_qty_remaining; END IF;
            UPDATE wh_inventory SET quantity = quantity - v_deduct, updated_at = NOW() WHERE id = v_source_inv.id;
            
            INSERT INTO wh_inventory_movements (tenant_id, inventory_id, movement_type, from_location_id, quantity, reference_type, reference_id, notes, created_by) 
            VALUES (v_order.tenant_id, v_source_inv.id, 'KITTING_CONSUME', v_src_item.source_location_id, v_deduct, v_order.order_type, v_order.id, 'Consumed for ' || v_order.order_type || ' order: ' || v_order.order_number, p_user_id);
            
            v_qty_remaining := v_qty_remaining - v_deduct;
        END LOOP;
        IF v_qty_remaining > 0 THEN RAISE EXCEPTION 'Insufficient stock in source location % for SKU %', v_src_item.source_location_id, v_src_item.product_sku_id; END IF;
    END LOOP;
    
    FOR v_res_item IN SELECT * FROM wh_repacking_items WHERE repacking_order_id = p_order_id AND item_type = 'RESULT' LOOP
        SELECT id INTO v_dest_inv_id FROM wh_inventory WHERE tenant_id = v_order.tenant_id AND warehouse_id = v_order.warehouse_id AND product_sku_id = v_res_item.product_sku_id AND location_id = v_res_item.target_location_id AND status = 'AVAILABLE' AND (customer_id = v_order.customer_id OR customer_id IS NULL) ORDER BY created_at DESC LIMIT 1;
        IF v_dest_inv_id IS NULL THEN
            INSERT INTO wh_inventory (
                tenant_id, warehouse_id, customer_id, location_id, product_sku_id, quantity,
                batch_number, expiry_date, received_date, unit_cost, status
            ) VALUES (
                v_order.tenant_id, v_order.warehouse_id, v_order.customer_id, v_res_item.target_location_id, v_res_item.product_sku_id, v_res_item.quantity,
                v_res_item.batch_number, v_res_item.expiry_date, CURRENT_DATE, v_res_item.unit_cost, 'AVAILABLE'
            ) RETURNING id INTO v_dest_inv_id;
        ELSE
            UPDATE wh_inventory SET quantity = quantity + v_res_item.quantity, updated_at = NOW() WHERE id = v_dest_inv_id;
        END IF;
        
        INSERT INTO wh_inventory_movements (tenant_id, inventory_id, movement_type, to_location_id, quantity, reference_type, reference_id, notes, created_by) 
        VALUES (v_order.tenant_id, v_dest_inv_id, 'KITTING_OUTPUT', v_res_item.target_location_id, v_res_item.quantity, v_order.order_type, v_order.id, 'Result from ' || v_order.order_type || ' order: ' || v_order.order_number, p_user_id);
    END LOOP;
    
    v_wo_number := 'WO-RPK-' || to_char(NOW(), 'YYMMDD') || '-' || SUBSTRING(gen_random_uuid()::text, 1, 4);
    v_jo_number := 'JO-RPK-' || to_char(NOW(), 'YYMMDD') || '-' || SUBSTRING(gen_random_uuid()::text, 1, 4);
    
    INSERT INTO work_orders (tenant_id, wo_number, customer_id, order_date, execution_date, status)
    VALUES (v_order.tenant_id, v_wo_number, v_order.customer_id, CURRENT_DATE, CURRENT_DATE, 'completed') RETURNING id INTO v_wo_id;
    
    INSERT INTO wo_items (tenant_id, wo_id, item_code, sbu_type, status, item_data) 
    VALUES (v_order.tenant_id, v_wo_id, 'ITM-' || v_jo_number, 'WAREHOUSE', 'completed', jsonb_build_object('order_id', p_order_id, 'warehouse_id', v_order.warehouse_id, 'customer_id', v_order.customer_id, 'operation_type', v_order.order_type, 'direction', 'REPACKING')) RETURNING id INTO v_wo_item_id;
    
    -- PERBAIKAN: Mengganti description menjadi notes karena tabel job_orders menggunakan notes
    INSERT INTO job_orders (tenant_id, wo_item_id, jo_number, status, sbu_type, notes) 
    VALUES (v_order.tenant_id, v_wo_item_id, v_jo_number, 'completed', 'WAREHOUSE', v_order.order_type || ' Order: ' || v_order.order_number) RETURNING id INTO v_jo_id;
    
    FOR v_src_item IN SELECT * FROM wh_repacking_items WHERE repacking_order_id = p_order_id AND item_type = 'SOURCE' LOOP
        INSERT INTO jo_warehouse_assignments (tenant_id, job_order_id, warehouse_location_id, allocated_cbm, allocated_kg)
        VALUES (v_order.tenant_id, v_jo_id, v_src_item.source_location_id, 0, 0);
    END LOOP;
    
    FOR v_res_item IN SELECT * FROM wh_repacking_items WHERE repacking_order_id = p_order_id AND item_type = 'RESULT' LOOP
        INSERT INTO jo_warehouse_assignments (tenant_id, job_order_id, warehouse_location_id, allocated_cbm, allocated_kg)
        VALUES (v_order.tenant_id, v_jo_id, v_res_item.target_location_id, 0, 0);
    END LOOP;
    
    UPDATE wh_repacking_orders SET status = 'COMPLETED', executed_by = p_user_id, executed_at = NOW(), completed_at = NOW(), reference_id = v_jo_id::TEXT WHERE id = p_order_id;
    
    RETURN p_order_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."execute_repacking_order"(uuid, uuid) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

-- ============================================================================
-- Object:        public.finalize_stock_opname
-- Layer:         006 Functions
-- Source:        supabase/schemas/public/functions/finalize_stock_opname.sql
-- Dependencies:  none
-- ============================================================================
CREATE OR REPLACE FUNCTION public.finalize_stock_opname (
  p_opname_id uuid,
  p_user_id   uuid
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
DECLARE
    v_opname RECORD;
    v_item RECORD;
    v_inventory_id UUID;
    v_movement_type TEXT;
    v_adjustment_qty NUMERIC;
BEGIN
    -- Fetch Opname
    SELECT * INTO v_opname FROM wh_stock_opname
    WHERE id = p_opname_id AND status = 'REVIEW'
    FOR UPDATE;

    IF v_opname IS NULL THEN
        RAISE EXCEPTION 'Opname not found or not in REVIEW status';
    END IF;

    -- Loop through items with variance
    FOR v_item IN 
        SELECT * FROM wh_stock_opname_items
        WHERE opname_id = p_opname_id AND variance != 0
    LOOP
        v_adjustment_qty := ABS(v_item.variance);

        IF v_item.variance > 0 THEN
            v_movement_type := 'ADJUSTMENT_PLUS';
        ELSE
            v_movement_type := 'ADJUSTMENT_MINUS';
        END IF;

        -- Find the inventory record
        SELECT id INTO v_inventory_id FROM wh_inventory
        WHERE tenant_id = v_opname.tenant_id
          AND warehouse_id = v_opname.warehouse_id
          AND product_sku_id = v_item.product_sku_id
          AND location_id = v_item.location_id
          AND COALESCE(batch_number, '') = COALESCE(v_item.batch_number, '')
          AND status = 'AVAILABLE'
        LIMIT 1 FOR UPDATE;

        IF v_inventory_id IS NOT NULL THEN
            UPDATE wh_inventory
            SET quantity = quantity + v_item.variance, updated_at = NOW()
            WHERE id = v_inventory_id;
        ELSE
            -- Should only happen for ADJUSTMENT_PLUS if the item wasn't originally there
            IF v_item.variance > 0 THEN
                INSERT INTO wh_inventory (
                    tenant_id, warehouse_id, location_id, product_sku_id, quantity,
                    batch_number, received_date, status
                ) VALUES (
                    v_opname.tenant_id, v_opname.warehouse_id, v_item.location_id, v_item.product_sku_id, v_adjustment_qty,
                    v_item.batch_number, CURRENT_DATE, 'AVAILABLE'
                ) RETURNING id INTO v_inventory_id;
            ELSE
                RAISE EXCEPTION 'Cannot subtract from non-existent inventory for SKU %', v_item.product_sku_id;
            END IF;
        END IF;

        -- Log movement
        INSERT INTO wh_inventory_movements (
            tenant_id, inventory_id, movement_type, 
            from_location_id, to_location_id,
            quantity, reference_type, reference_id, notes, created_by
        ) VALUES (
            v_opname.tenant_id, v_inventory_id, v_movement_type, 
            CASE WHEN v_movement_type = 'ADJUSTMENT_MINUS' THEN v_item.location_id ELSE NULL END,
            CASE WHEN v_movement_type = 'ADJUSTMENT_PLUS' THEN v_item.location_id ELSE NULL END,
            v_adjustment_qty, 'STOCK_OPNAME', v_opname.opname_number, 
            'Variance adjustment from opname ' || v_opname.opname_number, p_user_id
        );
    END LOOP;

    -- Update Opname Status
    UPDATE wh_stock_opname 
    SET status = 'APPROVED', 
        approved_by = p_user_id, 
        approved_at = NOW(),
        updated_at = NOW()
    WHERE id = p_opname_id;

END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."finalize_stock_opname"(uuid, uuid) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

-- ============================================================================
-- Object:        public.fn_archive_jo_chat_on_complete
-- Layer:         006 Functions
-- Source:        supabase/schemas/public/functions/fn_archive_jo_chat_on_complete.sql
-- Dependencies:  none
-- ============================================================================
CREATE OR REPLACE FUNCTION public.fn_archive_jo_chat_on_complete()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
BEGIN
  IF (TG_OP = 'UPDATE') AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    IF NEW.status IN ('paid', 'completed', 'cancelled') THEN
      UPDATE public.chat_channels
      SET is_archived = true, archived_at = now(), archived_by = auth.uid()
      WHERE channel_type = 'job_order' AND channel_id = NEW.id AND is_archived = false;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."fn_archive_jo_chat_on_complete"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

-- ============================================================================
-- Object:        public.fn_archive_wo_chat_on_pay
-- Layer:         006 Functions
-- Source:        supabase/schemas/public/functions/fn_archive_wo_chat_on_pay.sql
-- Dependencies:  none
-- ============================================================================
CREATE OR REPLACE FUNCTION public.fn_archive_wo_chat_on_pay()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
BEGIN
  IF (TG_OP = 'UPDATE') AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    IF NEW.status IN ('paid', 'closed', 'cancelled') THEN
      UPDATE public.chat_channels
      SET is_archived = true, archived_at = now(), archived_by = auth.uid()
      WHERE channel_type = 'work_order' AND channel_id = NEW.id AND is_archived = false;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."fn_archive_wo_chat_on_pay"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

-- ============================================================================
-- Object:        public.fn_convert_quotation_to_contract
-- Layer:         006 Functions
-- Source:        supabase/schemas/public/functions/fn_convert_quotation_to_contract.sql
-- Dependencies:  none
-- ============================================================================
CREATE OR REPLACE FUNCTION public.fn_convert_quotation_to_contract (
  p_quotation_id    uuid,
  p_contract_number text DEFAULT NULL::text,
  p_start_date      date DEFAULT NULL::date,
  p_end_date        date DEFAULT NULL::date
)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
DECLARE
    v_tenant_id UUID;
    v_deal_id UUID;
    v_customer_id UUID;
    v_quote_number TEXT;
    v_contract_id UUID;
    v_contract_number TEXT;
    v_start_date DATE;
    v_end_date DATE;
    v_default_wh_id UUID;
    v_rates_count INT := 0;
    v_inserted_count INT := 0;
BEGIN
    SELECT tenant_id, deal_id, quote_number
    INTO v_tenant_id, v_deal_id, v_quote_number
    FROM public.crm_quotations
    WHERE id = p_quotation_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Quotation not found');
    END IF;

    IF v_deal_id IS NOT NULL THEN
        SELECT entity_id INTO v_customer_id
        FROM public.crm_deals
        WHERE id = v_deal_id;
    END IF;

    IF v_customer_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Customer entity not found for this deal/quotation');
    END IF;

    UPDATE public.md_entities
    SET is_customer = true,
        is_active = true
    WHERE id = v_customer_id;

    UPDATE public.crm_quotations
    SET status = 'ACCEPTED',
        updated_at = NOW()
    WHERE id = p_quotation_id AND status != 'ACCEPTED';

    IF v_deal_id IS NOT NULL THEN
        UPDATE public.crm_deals
        SET stage = 'WON',
            updated_at = NOW()
        WHERE id = v_deal_id AND stage != 'WON';
    END IF;

    v_contract_number := COALESCE(NULLIF(TRIM(p_contract_number), ''), 'CTR/' || COALESCE(v_quote_number, TO_CHAR(NOW(), 'YYYYMMDD-HH24MI')));
    v_start_date := COALESCE(p_start_date, CURRENT_DATE);
    v_end_date := COALESCE(p_end_date, CURRENT_DATE + INTERVAL '1 year');

    -- Look up default warehouse for tenant
    SELECT id INTO v_default_wh_id
    FROM public.md_warehouses
    WHERE tenant_id = v_tenant_id
    LIMIT 1;

    INSERT INTO public.md_storage_contracts (
        tenant_id,
        contract_number,
        customer_id,
        warehouse_id,
        start_date,
        end_date,
        committed_space,
        uom_space,
        billing_method,
        status,
        notes,
        created_by
    ) VALUES (
        v_tenant_id,
        v_contract_number,
        v_customer_id,
        v_default_wh_id,
        v_start_date,
        v_end_date,
        0,
        'PALLET',
        'HYBRID',
        'ACTIVE',
        'Auto-converted from Quotation ID: ' || p_quotation_id || ' (' || COALESCE(v_quote_number, '') || ')',
        auth.uid()
    )
    RETURNING id INTO v_contract_id;

    IF v_default_wh_id IS NOT NULL THEN
        INSERT INTO public.md_contract_warehouses (
            tenant_id,
            contract_id,
            warehouse_id,
            committed_space,
            uom_space
        ) VALUES (
            v_tenant_id,
            v_contract_id,
            v_default_wh_id,
            0,
            'PALLET'
        ) ON CONFLICT DO NOTHING;
    END IF;

    INSERT INTO public.md_billing_rates (
        contract_id,
        tenant_id,
        warehouse_id,
        charge_code,
        rate_value,
        uom,
        valid_from,
        valid_to,
        is_active,
        created_by
    )
    SELECT
        v_contract_id,
        v_tenant_id,
        v_default_wh_id,
        COALESCE(srv.charge_code, 'VAS'),
        COALESCE(qi.nego_price, qi.unit_price, 0),
        COALESCE(qi.uom, 'PCS'),
        v_start_date,
        v_end_date,
        true,
        auth.uid()
    FROM public.crm_quotation_items qi
    LEFT JOIN public.md_services srv ON qi.service_id = srv.id
    WHERE qi.quotation_id = p_quotation_id
      AND COALESCE(qi.nego_price, qi.unit_price, 0) > 0;

    GET DIAGNOSTICS v_rates_count = ROW_COUNT;

    IF v_rates_count = 0 THEN
        INSERT INTO public.md_billing_rates (
            contract_id,
            tenant_id,
            warehouse_id,
            charge_code,
            rate_value,
            uom,
            valid_from,
            valid_to,
            is_active,
            created_by
        )
        SELECT
            v_contract_id,
            v_tenant_id,
            v_default_wh_id,
            CASE 
                WHEN sbu_type = 'WAREHOUSE' THEN 'STR-FIX'
                WHEN sbu_type = 'TRUCKING' THEN 'TRK-TRIP'
                ELSE 'VAS'
            END,
            unit_price,
            COALESCE(uom, 'Unit'),
            v_start_date,
            v_end_date,
            true,
            auth.uid()
        FROM public.crm_sbu_customer_rates
        WHERE customer_id = v_customer_id
          AND tenant_id = v_tenant_id
          AND is_active = true
          AND unit_price > 0;

        GET DIAGNOSTICS v_inserted_count = ROW_COUNT;
        v_rates_count := v_rates_count + v_inserted_count;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'contract_id', v_contract_id,
        'contract_number', v_contract_number,
        'rates_count', v_rates_count
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."fn_convert_quotation_to_contract"(uuid, text, date, date) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

-- ============================================================================
-- Object:        public.fn_create_default_groups
-- Layer:         006 Functions
-- Source:        supabase/schemas/public/functions/fn_create_default_groups.sql
-- Dependencies:  none
-- ============================================================================
CREATE OR REPLACE FUNCTION public.fn_create_default_groups (
  tenant_uuid uuid
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
BEGIN
  INSERT INTO public.chat_groups (tenant_id, name, group_type, description)
  VALUES
    (tenant_uuid, 'SBU Trucking', 'sbu', 'Diskusi operasional trucking'),
    (tenant_uuid, 'SBU Warehouse', 'sbu', 'Diskusi operasional warehouse'),
    (tenant_uuid, 'SBU Clearance', 'sbu', 'Diskusi operasional customs clearance'),
    (tenant_uuid, 'SBU Forwarding', 'sbu', 'Diskusi operasional freight forwarding'),
    (tenant_uuid, 'HQ Operations', 'role', 'Diskusi operasional HQ'),
    (tenant_uuid, 'All Staff', 'custom', 'Semua staff dalam tenant')
  ON CONFLICT DO NOTHING;
  -- SBU groups
  INSERT INTO public.chat_group_members (group_id, user_id)
  SELECT g.id, tu.user_id FROM public.chat_groups g
  JOIN public.tenant_users tu ON tu.tenant_id = g.tenant_id AND tu.is_active = true
  JOIN public.profiles p ON p.id = tu.user_id
  WHERE g.tenant_id = tenant_uuid AND g.name = 'SBU Trucking' AND 'trucking' = ANY(p.sbu_access)
  ON CONFLICT DO NOTHING;
  INSERT INTO public.chat_group_members (group_id, user_id)
  SELECT g.id, tu.user_id FROM public.chat_groups g
  JOIN public.tenant_users tu ON tu.tenant_id = g.tenant_id AND tu.is_active = true
  JOIN public.profiles p ON p.id = tu.user_id
  WHERE g.tenant_id = tenant_uuid AND g.name = 'SBU Warehouse' AND 'warehouse' = ANY(p.sbu_access)
  ON CONFLICT DO NOTHING;
  INSERT INTO public.chat_group_members (group_id, user_id)
  SELECT g.id, tu.user_id FROM public.chat_groups g
  JOIN public.tenant_users tu ON tu.tenant_id = g.tenant_id AND tu.is_active = true
  JOIN public.profiles p ON p.id = tu.user_id
  WHERE g.tenant_id = tenant_uuid AND g.name = 'SBU Clearance' AND 'clearance' = ANY(p.sbu_access)
  ON CONFLICT DO NOTHING;
  INSERT INTO public.chat_group_members (group_id, user_id)
  SELECT g.id, tu.user_id FROM public.chat_groups g
  JOIN public.tenant_users tu ON tu.tenant_id = g.tenant_id AND tu.is_active = true
  JOIN public.profiles p ON p.id = tu.user_id
  WHERE g.tenant_id = tenant_uuid AND g.name = 'SBU Forwarding' AND 'forwarding' = ANY(p.sbu_access)
  ON CONFLICT DO NOTHING;
  -- HQ Operations
  INSERT INTO public.chat_group_members (group_id, user_id)
  SELECT g.id, tu.user_id FROM public.chat_groups g
  JOIN public.tenant_users tu ON tu.tenant_id = g.tenant_id AND tu.is_active = true
  WHERE g.tenant_id = tenant_uuid AND g.name = 'HQ Operations'
    AND tu.role_code IN ('admin_wo', 'admin_finance', 'director', 'tenant_admin', 'superadmin', 'viewer')
  ON CONFLICT DO NOTHING;
  -- All Staff
  INSERT INTO public.chat_group_members (group_id, user_id)
  SELECT g.id, tu.user_id FROM public.chat_groups g
  JOIN public.tenant_users tu ON tu.tenant_id = g.tenant_id AND tu.is_active = true
  WHERE g.tenant_id = tenant_uuid AND g.name = 'All Staff'
  ON CONFLICT DO NOTHING;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."fn_create_default_groups"(uuid) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

-- ============================================================================
-- Object:        public.fn_get_sanitized_customer_tracking
-- Layer:         006 Functions
-- Source:        supabase/schemas/public/functions/fn_get_sanitized_customer_tracking.sql
-- Dependencies:  none
-- ============================================================================
CREATE OR REPLACE FUNCTION public.fn_get_sanitized_customer_tracking (
  p_tracking_token text
)
  RETURNS TABLE (
    shipment_id         uuid,
    shipment_number     text,
    global_status       text,
    origin_name         text,
    origin_city         text,
    destination_name    text,
    destination_city    text,
    etd                 timestamp with time zone,
    eta                 timestamp with time zone,
    actual_departure_at timestamp with time zone,
    actual_delivery_at  timestamp with time zone,
    milestones          jsonb,
    manifest_items      jsonb
  )
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    s.id AS shipment_id,
    s.shipment_number,
    s.global_status::TEXT,
    orig.name AS origin_name,
    orig.city AS origin_city,
    dest.name AS destination_name,
    dest.city AS destination_city,
    s.etd,
    s.eta,
    s.actual_departure_at,
    s.actual_delivery_at,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'code', m.milestone_code,
            'label', m.milestone_label,
            'occurred_at', m.occurred_at
          ) ORDER BY m.occurred_at ASC
        )
        FROM public.shp_milestones m 
        WHERE m.shipment_id = s.id
      ),
      '[]'::jsonb
    ) AS milestones,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'commodity', mi.commodity_name,
            'packages', mi.package_quantity,
            'package_type', mi.package_type,
            'gross_weight_kg', mi.gross_weight_kg,
            'volume_cbm', mi.volume_cbm
          ) ORDER BY mi.item_sequence ASC
        )
        FROM public.shp_manifest_items mi 
        WHERE mi.shipment_id = s.id
      ),
      '[]'::jsonb
    ) AS manifest_items
  FROM public.shp_shipments s
  JOIN public.md_locations orig ON s.origin_location_id = orig.id
  JOIN public.md_locations dest ON s.destination_location_id = dest.id
  WHERE s.tracking_token = p_tracking_token;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."fn_get_sanitized_customer_tracking"(text) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

-- ============================================================================
-- Object:        public.fn_get_user_tenant_id
-- Layer:         006 Functions
-- Source:        supabase/schemas/public/functions/fn_get_user_tenant_id.sql
-- Dependencies:  none
-- ============================================================================
CREATE OR REPLACE FUNCTION public.fn_get_user_tenant_id()
  RETURNS uuid
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
DECLARE
  v_tenant_id UUID;
BEGIN
  SELECT tenant_id INTO v_tenant_id FROM public.tenant_users WHERE user_id = auth.uid() AND is_active = true LIMIT 1;
  RETURN v_tenant_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."fn_get_user_tenant_id"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

-- ============================================================================
-- Object:        public.fn_pricing_set_updated_at
-- Layer:         006 Functions
-- Source:        supabase/schemas/public/functions/fn_pricing_set_updated_at.sql
-- Dependencies:  none
-- ============================================================================
CREATE OR REPLACE FUNCTION public.fn_pricing_set_updated_at()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."fn_pricing_set_updated_at"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

-- ============================================================================
-- Object:        public.fn_process_inbound_stock
-- Layer:         006 Functions
-- Source:        supabase/schemas/public/functions/fn_process_inbound_stock.sql
-- Dependencies:  none
-- ============================================================================
CREATE OR REPLACE FUNCTION public.fn_process_inbound_stock()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $function$
DECLARE
    assignment_record RECORD;
    v_location_code TEXT;
    v_warehouse_id UUID;
    v_uom_id UUID;
BEGIN
    -- Only run when status transitions to 'completed'
    IF (NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status <> 'completed')) THEN
        
        -- Loop through all putaway assignments linked to this inbound
        FOR assignment_record IN 
            SELECT pa.*, idt.product_id, h.customer_id, h.tenant_id
            FROM public.putaway_assignments pa
            JOIN public.inbound_details idt ON pa.inbound_detail_id = idt.id
            JOIN public.inbound_headers h ON idt.inbound_id = h.id
            WHERE h.id = NEW.id
        LOOP
            -- 1. Get location details
            SELECT sl.code, z.warehouse_id INTO v_location_code, v_warehouse_id
            FROM public.storage_locations sl
            JOIN public.storage_zones z ON sl.zone_id = z.id
            WHERE sl.id = assignment_record.actual_location_id;
            
            -- 2. Get default UOM from product
            SELECT base_uom_id INTO v_uom_id
            FROM public.products
            WHERE id = assignment_record.product_id;

            -- 3. Upsert into inventory
            -- Note: We use COALESCE(lot_number, '') to match the unique index
            INSERT INTO public.inventory (
                product_id,
                warehouse_id,
                customer_id,
                quantity,
                status,
                location_barcode,
                uom_id,
                updated_at
            )
            VALUES (
                assignment_record.product_id,
                v_warehouse_id,
                assignment_record.customer_id,
                assignment_record.quantity,
                assignment_record.condition,
                v_location_code,
                v_uom_id,
                NOW()
            )
            ON CONFLICT (product_id, warehouse_id, customer_id, location_barcode, status, COALESCE(lot_number, '')) 
            DO UPDATE SET 
                quantity = public.inventory.quantity + EXCLUDED.quantity,
                updated_at = NOW();

            -- 4. Log to inventory_movements
            INSERT INTO public.inventory_movements (
                tenant_id,
                product_id,
                warehouse_id,
                customer_id,
                location_from,
                location_to,
                quantity,
                movement_type,
                reference_id,
                notes
            )
            VALUES (
                assignment_record.tenant_id,
                assignment_record.product_id,
                v_warehouse_id,
                assignment_record.customer_id,
                'INBOUND_STAGING',
                v_location_code,
                assignment_record.quantity,
                'inbound',
                NEW.id,
                'Automatic Stock Update from Inbound: ' || NEW.asn_number
            );
        END LOOP;
    END IF;
    RETURN NEW;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."fn_process_inbound_stock"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

-- ============================================================================
-- Object:        public.fn_seed_channel_participants
-- Layer:         006 Functions
-- Source:        supabase/schemas/public/functions/fn_seed_channel_participants.sql
-- Dependencies:  none
-- ============================================================================
CREATE OR REPLACE FUNCTION public.fn_seed_channel_participants()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
DECLARE
  v_channel_type TEXT;
  v_channel_uuid UUID;
  v_tenant_id UUID;
  rec RECORD;
BEGIN
  v_channel_type := NEW.channel_type;
  
  -- Prevent errors if channel_id is not UUID
  BEGIN
    v_channel_uuid := NEW.channel_id::UUID;
  EXCEPTION WHEN OTHERS THEN
    RETURN NEW;
  END;
  IF v_channel_type = 'work_order' THEN
    SELECT wo.tenant_id INTO v_tenant_id
    FROM public.work_orders wo
    WHERE wo.id = v_channel_uuid
    LIMIT 1;
    -- Seed: created_by (CS who created)
    FOR rec IN SELECT wo.created_by AS uid FROM public.work_orders wo WHERE wo.id = v_channel_uuid AND wo.created_by IS NOT NULL LOOP
      INSERT INTO public.chat_participants (channel_id, user_id, role) VALUES (NEW.id, rec.uid, 'admin') ON CONFLICT DO NOTHING;
    END LOOP;
    -- Seed: ALL active tenant users
    IF v_tenant_id IS NOT NULL THEN
      FOR rec IN 
        SELECT tu.user_id AS uid FROM public.tenant_users tu
        WHERE tu.tenant_id = v_tenant_id 
          AND tu.is_active = true
      LOOP
        INSERT INTO public.chat_participants (channel_id, user_id, role) VALUES (NEW.id, rec.uid, 'member') ON CONFLICT DO NOTHING;
      END LOOP;
    END IF;
  ELSIF v_channel_type = 'job_order' THEN
    SELECT wo.tenant_id INTO v_tenant_id
    FROM public.job_orders jo
    JOIN public.wo_items wi ON wi.id = jo.wo_item_id
    JOIN public.work_orders wo ON wo.id = wi.wo_id
    WHERE jo.id = v_channel_uuid
    LIMIT 1;
    -- Seed: driver
    FOR rec IN SELECT jo.driver_id AS uid FROM public.job_orders jo WHERE jo.id = v_channel_uuid AND jo.driver_id IS NOT NULL LOOP
      INSERT INTO public.chat_participants (channel_id, user_id, role) VALUES (NEW.id, rec.uid, 'member') ON CONFLICT DO NOTHING;
    END LOOP;
    -- Seed: updated_by instead of assigned_by
    FOR rec IN SELECT jo.updated_by AS uid FROM public.job_orders jo WHERE jo.id = v_channel_uuid AND jo.updated_by IS NOT NULL LOOP
      INSERT INTO public.chat_participants (channel_id, user_id, role) VALUES (NEW.id, rec.uid, 'member') ON CONFLICT DO NOTHING;
    END LOOP;
    -- Seed: ALL active tenant users
    IF v_tenant_id IS NOT NULL THEN
      FOR rec IN 
        SELECT tu.user_id AS uid FROM public.tenant_users tu
        WHERE tu.tenant_id = v_tenant_id 
          AND tu.is_active = true
      LOOP
        INSERT INTO public.chat_participants (channel_id, user_id, role) VALUES (NEW.id, rec.uid, 'member') ON CONFLICT DO NOTHING;
      END LOOP;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."fn_seed_channel_participants"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

COMMENT ON FUNCTION "public"."fn_seed_channel_participants"() IS 'Auto-seeds ALL active tenant users as participants for WO/JO chat channels';

-- ============================================================================
-- Object:        public.fn_sync_deal_on_quotation_sent
-- Layer:         006 Functions
-- Source:        supabase/schemas/public/functions/fn_sync_deal_on_quotation_sent.sql
-- Dependencies:  none
-- ============================================================================
CREATE OR REPLACE FUNCTION public.fn_sync_deal_on_quotation_sent()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
DECLARE
  v_deal_stage TEXT;
  v_user_id UUID;
BEGIN
  -- Only run if status changed to SENT
  IF NEW.status = 'SENT' AND (OLD.status IS NULL OR OLD.status <> 'SENT') THEN
    v_user_id := auth.uid();
    
    -- If linked to a deal
    IF NEW.deal_id IS NOT NULL THEN
      SELECT stage INTO v_deal_stage FROM public.crm_deals WHERE id = NEW.deal_id;
      
      -- If deal is in PROSPECTING or NEW stage, advance to QUOTATION
      IF v_deal_stage IN ('NEW', 'PROSPECTING') THEN
        UPDATE public.crm_deals 
        SET stage = 'QUOTATION',
            updated_at = NOW()
        WHERE id = NEW.deal_id;
      END IF;

      -- Log activity in crm_activities
      INSERT INTO public.crm_activities (
        tenant_id,
        deal_id,
        type,
        title,
        description,
        activity_date,
        created_by
      ) VALUES (
        NEW.tenant_id,
        NEW.deal_id,
        'NOTE',
        'Quotation Dikirim: ' || NEW.quote_number,
        'Penawaran resmi nomor ' || NEW.quote_number || ' dengan total Rp ' || COALESCE(NEW.total_amount, 0) || ' telah dikirimkan kepada pelanggan.',
        NOW(),
        COALESCE(v_user_id, NEW.created_by)
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."fn_sync_deal_on_quotation_sent"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

-- ============================================================================
-- Object:        public.fn_sync_md_tenants
-- Layer:         006 Functions
-- Source:        supabase/schemas/public/functions/fn_sync_md_tenants.sql
-- Dependencies:  none
-- ============================================================================
CREATE OR REPLACE FUNCTION public.fn_sync_md_tenants()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
BEGIN
  -- Recursion guard: never act on nested trigger firings.
  IF pg_trigger_depth() > 1 THEN
    RETURN NULL;
  END IF;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.md_tenants (id, tenant_code, name, status, created_at, updated_at)
    VALUES (
      NEW.id,
      NEW.tenant_code,
      NEW.name,
      COALESCE(NEW.status, 'active'),
      COALESCE(NEW.created_at, NOW()),
      COALESCE(NEW.updated_at,  NOW())
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NULL;

  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE public.md_tenants
       SET tenant_code = NEW.tenant_code,
           name        = NEW.name,
           status      = COALESCE(NEW.status, 'active'),
           updated_at  = COALESCE(NEW.updated_at, NOW())
     WHERE id = NEW.id;
    RETURN NULL;

  ELSIF TG_OP = 'DELETE' THEN
    -- Mirror delete. If any canonical table already references md_tenants(id)
    -- with NO ACTION/RESTRICT (as 001→013 define), the database itself blocks
    -- the tenant deletion — preserving referential integrity end-to-end.
    -- ⚠️ Per header constraint: tenant DELETE is not a supported operation anyway.
    DELETE FROM public.md_tenants WHERE id = OLD.id;
    RETURN NULL;
  END IF;

  RETURN NULL;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."fn_sync_md_tenants"() TO "anon", "postgres", "service_role";

REVOKE ALL ON FUNCTION "public"."fn_sync_md_tenants"() FROM PUBLIC;

-- ============================================================================
-- Object:        public.fn_sync_user_to_sbu_groups
-- Layer:         006 Functions
-- Source:        supabase/schemas/public/functions/fn_sync_user_to_sbu_groups.sql
-- Dependencies:  none
-- ============================================================================
CREATE OR REPLACE FUNCTION public.fn_sync_user_to_sbu_groups()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
DECLARE
  v_tenant_id UUID;
BEGIN
  SELECT tenant_id INTO v_tenant_id FROM public.tenant_users WHERE user_id = NEW.id AND is_active = true LIMIT 1;
  IF v_tenant_id IS NULL THEN RETURN NEW; END IF;
  IF 'trucking' = ANY(NEW.sbu_access) THEN
    INSERT INTO public.chat_group_members (group_id, user_id)
    SELECT g.id, NEW.id FROM public.chat_groups g WHERE g.tenant_id = v_tenant_id AND g.group_type = 'sbu' AND g.name = 'SBU Trucking' ON CONFLICT DO NOTHING;
  END IF;
  IF 'warehouse' = ANY(NEW.sbu_access) THEN
    INSERT INTO public.chat_group_members (group_id, user_id)
    SELECT g.id, NEW.id FROM public.chat_groups g WHERE g.tenant_id = v_tenant_id AND g.group_type = 'sbu' AND g.name = 'SBU Warehouse' ON CONFLICT DO NOTHING;
  END IF;
  IF 'clearance' = ANY(NEW.sbu_access) THEN
    INSERT INTO public.chat_group_members (group_id, user_id)
    SELECT g.id, NEW.id FROM public.chat_groups g WHERE g.tenant_id = v_tenant_id AND g.group_type = 'sbu' AND g.name = 'SBU Clearance' ON CONFLICT DO NOTHING;
  END IF;
  IF 'forwarding' = ANY(NEW.sbu_access) THEN
    INSERT INTO public.chat_group_members (group_id, user_id)
    SELECT g.id, NEW.id FROM public.chat_groups g WHERE g.tenant_id = v_tenant_id AND g.group_type = 'sbu' AND g.name = 'SBU Forwarding' ON CONFLICT DO NOTHING;
  END IF;
  IF NEW.role IN ('admin_wo', 'admin_finance', 'director', 'tenant_admin', 'superadmin', 'viewer') THEN
    INSERT INTO public.chat_group_members (group_id, user_id)
    SELECT g.id, NEW.id FROM public.chat_groups g WHERE g.tenant_id = v_tenant_id AND g.group_type = 'role' AND g.name = 'HQ Operations' ON CONFLICT DO NOTHING;
  END IF;
  INSERT INTO public.chat_group_members (group_id, user_id)
  SELECT g.id, NEW.id FROM public.chat_groups g WHERE g.tenant_id = v_tenant_id AND g.group_type = 'custom' AND g.name = 'All Staff' ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."fn_sync_user_to_sbu_groups"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

-- ============================================================================
-- Object:        public.fn_wh_calculate_storage_charge
-- Layer:         006 Functions
-- Source:        supabase/schemas/public/functions/fn_wh_calculate_storage_charge.sql
-- Dependencies:  none
-- ============================================================================
CREATE OR REPLACE FUNCTION public.fn_wh_calculate_storage_charge (
  p_contract_id  uuid,
  p_period_start date,
  p_period_end   date
)
  RETURNS numeric
  LANGUAGE plpgsql
  AS $function$
DECLARE
  avg_daily_pallet NUMERIC;
  committed_space NUMERIC;
  overflow_space NUMERIC;
  fixed_rate NUMERIC;
  multiplier NUMERIC;
  total_charge NUMERIC(18, 2) := 0;
BEGIN
  SELECT AVG(total_pallets) INTO avg_daily_pallet
  FROM wh_daily_stock_snapshots
  WHERE contract_id = p_contract_id
    AND snapshot_date BETWEEN p_period_start AND p_period_end;

  SELECT sc.committed_space, sc.max_overflow
  INTO committed_space, overflow_space
  FROM md_storage_contracts sc
  WHERE sc.id = p_contract_id;

  SELECT rate_value INTO fixed_rate
  FROM md_billing_rates
  WHERE contract_id = p_contract_id
    AND charge_code = 'STR-FIX'
    AND is_active = true;

  IF avg_daily_pallet > committed_space THEN
    overflow_space := LEAST(avg_daily_pallet - committed_space, COALESCE(overflow_space, 0));
    total_charge := (committed_space * COALESCE(fixed_rate, 0)) + (overflow_space * COALESCE(fixed_rate, 0) * 1.5);
  ELSE
    total_charge := COALESCE(avg_daily_pallet * COALESCE(fixed_rate, 0), 0);
  END IF;

  RETURN total_charge;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."fn_wh_calculate_storage_charge"(uuid, date, date) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

-- ============================================================================
-- Object:        public.fn_wh_fefo_pick
-- Layer:         006 Functions
-- Source:        supabase/schemas/public/functions/fn_wh_fefo_pick.sql
-- Dependencies:  none
-- ============================================================================
CREATE OR REPLACE FUNCTION public.fn_wh_fefo_pick (
  p_sku_id   uuid,
  p_quantity numeric
)
  RETURNS TABLE (
    inventory_id  uuid,
    lot_number    text,
    expiry_date   date,
    location_id   uuid,
    available_qty numeric
  )
  LANGUAGE plpgsql
  AS $function$
BEGIN
  RETURN QUERY
  SELECT
    i.id,
    i.batch_number,
    i.expiry_date,
    i.location_id,
    i.available_quantity
  FROM wh_inventory i
  WHERE i.product_sku_id = p_sku_id
    AND i.status = 'AVAILABLE'
    AND i.available_quantity > 0
  ORDER BY i.expiry_date ASC NULLS LAST, i.received_date ASC
  LIMIT CEIL(p_quantity)::INTEGER;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."fn_wh_fefo_pick"(uuid, numeric) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

-- ============================================================================
-- Object:        public.fn_wh_log_movement
-- Layer:         006 Functions
-- Source:        supabase/schemas/public/functions/fn_wh_log_movement.sql
-- Dependencies:  none
-- ============================================================================
CREATE OR REPLACE FUNCTION public.fn_wh_log_movement()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $function$
BEGIN
  IF OLD.location_id IS DISTINCT FROM NEW.location_id
     OR OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO wh_inventory_movements (
      id, tenant_id, inventory_id, movement_type,
      from_location_id, to_location_id, quantity, notes, created_by
    ) VALUES (
      gen_random_uuid(),
      NEW.tenant_id,
      COALESCE(NEW.id, OLD.id),
      CASE
        WHEN OLD.location_id IS NULL THEN 'PUTAWAY'
        WHEN NEW.location_id IS NULL THEN 'OUTBOUND'
        WHEN OLD.status = 'RESERVED' AND NEW.status = 'AVAILABLE' THEN 'ADJUSTMENT_PLUS'
        ELSE 'TRANSFER'
      END,
      OLD.location_id,
      NEW.location_id,
      NEW.quantity,
      'Auto-logged by movement trigger',
      NULL
    );
  END IF;
  RETURN NEW;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."fn_wh_log_movement"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

-- ============================================================================
-- Object:        public.fn_wh_update_bin_status
-- Layer:         006 Functions
-- Source:        supabase/schemas/public/functions/fn_wh_update_bin_status.sql
-- Dependencies:  none
-- ============================================================================
CREATE OR REPLACE FUNCTION public.fn_wh_update_bin_status()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $function$
BEGIN
  IF OLD.location_id IS DISTINCT FROM NEW.location_id THEN
    IF OLD.location_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM wh_inventory
      WHERE location_id = OLD.location_id
        AND status IN ('AVAILABLE', 'RESERVED', 'QUARANTINE')
        AND id != COALESCE(NEW.id, OLD.id)
    ) THEN
      UPDATE md_warehouse_locations SET bin_status = 'EMPTY'
      WHERE id = OLD.location_id;
    END IF;

    IF NEW.location_id IS NOT NULL THEN
      UPDATE md_warehouse_locations SET bin_status = 'OCCUPIED'
      WHERE id = NEW.location_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."fn_wh_update_bin_status"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

-- ============================================================================
-- Object:        public.generate_fw_consol_number
-- Layer:         006 Functions
-- Source:        supabase/schemas/public/functions/generate_fw_consol_number.sql
-- Dependencies:  none
-- ============================================================================
CREATE OR REPLACE FUNCTION public.generate_fw_consol_number()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $function$ BEGIN IF NEW.consol_number IS NULL OR NEW.consol_number = '' THEN NEW.consol_number := 'FWD-' || TO_CHAR(NOW(), 'YYYYMM') || '-' || LPAD(nextval('fw_consolidation_seq')::TEXT, 3, '0'); END IF; RETURN NEW; END; $function$;

GRANT EXECUTE ON FUNCTION "public"."generate_fw_consol_number"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

-- ============================================================================
-- Object:        public.generate_invoice
-- Layer:         006 Functions
-- Source:        supabase/schemas/public/functions/generate_invoice.sql
-- Dependencies:  none
-- ============================================================================
CREATE OR REPLACE FUNCTION public.generate_invoice (
  p_tenant_id          uuid,
  p_sales_order_id     uuid,
  p_billable_event_ids uuid[],
  p_side               text,
  p_currency           text,
  p_subtotal           numeric,
  p_tax_percentage     numeric,
  p_total_amount       numeric,
  p_due_date           date,
  p_idempotency_key    text
)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
DECLARE
  v_customer_id UUID;
  v_invoice_number TEXT;
  v_invoice_id UUID;
  v_lines_created INTEGER := 0;
  v_billable_event UUID;
  v_description TEXT;
  v_quantity INTEGER;
  v_unit_of_measure TEXT;
  v_unit_amount NUMERIC;
  v_total_amount NUMERIC;
BEGIN
  -- 1. Resolve bill-to: sales_orders.engagement_id -> commercial_work_orders.customer_id
  SELECT customer_id INTO v_customer_id
  FROM public.commercial_work_orders
  WHERE id = (
    SELECT engagement_id FROM public.sales_orders WHERE id = p_sales_order_id
  );

  -- 2. Generate canonical invoice number atomically
  v_invoice_number := public.next_invoice_number(p_tenant_id);

  -- 3. Create invoice (atomic within this function transaction)
  --    Idempotency key stored for UNIQUE(tenant_id, idempotency_key) enforcement.
  INSERT INTO public.fin_invoices (
    tenant_id, invoice_number, sales_order_id, customer_id,
    side, status, invoice_date, due_date, currency,
    subtotal, tax_amount, total_amount, paid_amount,
    idempotency_key,
    created_by, updated_by
  ) VALUES (
    p_tenant_id, v_invoice_number, p_sales_order_id, v_customer_id,
    p_side::com_fin_ar_ap_side, 'DRAFT', CURRENT_DATE, p_due_date, p_currency,
    p_subtotal, p_tax_percentage * p_subtotal / 100, p_total_amount, 0,
    p_idempotency_key,
    gen_random_uuid(), gen_random_uuid()
  )
  RETURNING id INTO v_invoice_id;

  -- 4. Create invoice lines (one per billable event, with duplicate prevention)
  -- ABSOLUTE RULE: Copy committed values from billable_events, never recalculate
  FOREACH v_billable_event IN ARRAY p_billable_event_ids
  LOOP
    -- Fetch committed values from the billable event
    SELECT
      description,
      quantity,
      unit_of_measure,
      unit_amount,
      total_amount
    INTO
      v_description,
      v_quantity,
      v_unit_of_measure,
      v_unit_amount,
      v_total_amount
    FROM public.fin_billable_events
    WHERE id = v_billable_event AND tenant_id = p_tenant_id;

    -- Duplicate prevention: UNIQUE index ensures at most one line per billable_event_id
    INSERT INTO public.fin_invoice_lines (
      id, tenant_id, invoice_id, billable_event_id,
      description, quantity, unit_of_measure, unit_amount, amount, sort_order
    ) VALUES (
      gen_random_uuid(), p_tenant_id, v_invoice_id, v_billable_event,
      COALESCE(v_description, 'Invoice line for billable event'),
      COALESCE(v_quantity, 1),
      COALESCE(v_unit_of_measure, 'UNIT'),
      COALESCE(v_unit_amount, 0),
      COALESCE(v_total_amount, 0),
      v_lines_created
    );
    v_lines_created := v_lines_created + 1;
  END LOOP;

  -- 5. Transition billable event status where applicable (if all lines created successfully)
  IF v_lines_created = array_length(p_billable_event_ids, 1) THEN
    UPDATE public.fin_billable_events
    SET status = 'INVOICED'
    WHERE id = ANY(p_billable_event_ids);
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'invoice_id', v_invoice_id::text,
    'invoice_number', v_invoice_number,
    'customer_id', v_customer_id::text,
    'lines_created', v_lines_created,
    'billable_events_total', array_length(p_billable_event_ids, 1)
  );

EXCEPTION
  WHEN unique_violation THEN
    RAISE;
  WHEN OTHERS THEN
    -- Rollback everything on failure (transaction abort)
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Invoice generation failed: ' || SQLERRM,
      'invoice_id', NULL,
      'invoice_number', NULL
    );
END;
$function$;

GRANT EXECUTE
  ON FUNCTION "public"."generate_invoice"(uuid, uuid, uuid[], text, text, numeric, numeric, numeric, date, text)
  TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

-- ============================================================================
-- Object:        public.get_active_customers_in_warehouse
-- Layer:         006 Functions
-- Source:        supabase/schemas/public/functions/get_active_customers_in_warehouse.sql
-- Dependencies:  none
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_active_customers_in_warehouse (
  p_warehouse_id uuid
)
  RETURNS TABLE (
    id   uuid,
    name text
  )
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
BEGIN
    RETURN QUERY
    SELECT DISTINCT e.id::UUID, e.name::TEXT
    FROM wh_inventory i
    JOIN md_product_skus ps ON i.product_sku_id = ps.id
    JOIN md_entities e ON COALESCE(i.customer_id, ps.customer_id) = e.id
    WHERE i.warehouse_id = p_warehouse_id
      AND i.quantity > 0
      AND i.status = 'AVAILABLE';
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."get_active_customers_in_warehouse"(uuid) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

-- ============================================================================
-- Object:        public.get_active_products_in_warehouse
-- Layer:         006 Functions
-- Source:        supabase/schemas/public/functions/get_active_products_in_warehouse.sql
-- Dependencies:  none
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_active_products_in_warehouse (
  p_warehouse_id uuid,
  p_customer_id  uuid
)
  RETURNS TABLE (
    id       uuid,
    name     text,
    sku_code text
  )
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
BEGIN
    RETURN QUERY
    SELECT DISTINCT p.id::UUID, p.name::TEXT, p.sku_code::TEXT
    FROM wh_inventory i
    JOIN md_product_skus p ON i.product_sku_id = p.id
    WHERE i.warehouse_id = p_warehouse_id
      AND COALESCE(i.customer_id, p.customer_id) = p_customer_id
      AND i.quantity > 0
      AND i.status = 'AVAILABLE';
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."get_active_products_in_warehouse"(uuid, uuid) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

-- ============================================================================
-- Object:        public.get_active_sla_breaches
-- Layer:         006 Functions
-- Source:        supabase/schemas/public/functions/get_active_sla_breaches.sql
-- Dependencies:  none
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_active_sla_breaches (
  p_tenant_id uuid
)
  RETURNS TABLE (
    breach_id       uuid,
    breach_type     text,
    stage           text,
    wo_number       text,
    jo_number       text,
    overdue_minutes integer,
    customer_name   text,
    vendor_name     text,
    details         text,
    severity        text,
    created_at      timestamp with time zone
  )
  LANGUAGE plpgsql
  STABLE
  AS $function$
BEGIN
  RETURN QUERY
  SELECT
    e.id AS breach_id,
    e.breach_type,
    e.stage,
    e.wo_number,
    e.jo_number,
    e.overdue_minutes,
    e.customer_name,
    e.vendor_name,
    e.details,
    CASE
      WHEN e.overdue_minutes >= 480 THEN 'emergency'
      WHEN e.overdue_minutes >= 120 THEN 'critical'
      WHEN e.overdue_minutes >= 30 THEN 'breach'
      ELSE 'warning'
    END AS severity,
    e.created_at
  FROM sla_escalations e
  WHERE e.tenant_id = p_tenant_id
    AND e.resolved_at IS NULL
  ORDER BY e.overdue_minutes DESC
  LIMIT 20;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."get_active_sla_breaches"(uuid) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

-- ============================================================================
-- Object:        public.get_all_tenants
-- Layer:         006 Functions
-- Source:        supabase/schemas/public/functions/get_all_tenants.sql
-- Dependencies:  none
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_all_tenants()
  RETURNS TABLE (
    tenant_code       character varying,
    tenant_name       text,
    admin_email       text,
    admin_name        text,
    subscription_tier character varying,
    token_balance     integer,
    created_at        timestamp with time zone
  )
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
BEGIN
    -- Validasi owner
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin1@sentralogis.com' AND id = auth.uid()) THEN
        RAISE EXCEPTION 'Unauthorized: Hanya owner yang bisa melihat semua tenant';
    END IF;
    
    RETURN QUERY
    SELECT 
        t.tenant_code,
        t.name::TEXT,
        u.email::TEXT,
        COALESCE(u.raw_user_meta_data->>'full_name', '-')::TEXT,
        t.subscription_tier,
        t.token_balance,
        t.created_at
    FROM public.tenants t
    LEFT JOIN auth.users u ON t.user_id = u.id
    ORDER BY t.created_at DESC;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."get_all_tenants"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

-- ============================================================================
-- Object:        public.get_all_warehouses_for_test
-- Layer:         006 Functions
-- Source:        supabase/schemas/public/functions/get_all_warehouses_for_test.sql
-- Dependencies:  none
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_all_warehouses_for_test()
  RETURNS SETOF public.warehouses
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
BEGIN
  RETURN QUERY SELECT * FROM warehouses;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."get_all_warehouses_for_test"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

-- ============================================================================
-- Object:        public.get_auth_tenant_id
-- Layer:         006 Functions
-- Source:        supabase/schemas/public/functions/get_auth_tenant_id.sql
-- Dependencies:  none
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_auth_tenant_id()
  RETURNS uuid
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
BEGIN
  RETURN (
    SELECT tenant_id FROM public.tenant_users 
    WHERE user_id = auth.uid() 
    LIMIT 1
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."get_auth_tenant_id"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

-- ============================================================================
-- Object:        public.get_driver_performance_summary
-- Layer:         006 Functions
-- Source:        supabase/schemas/public/functions/get_driver_performance_summary.sql
-- Dependencies:  none
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_driver_performance_summary (
  p_driver_id uuid
)
  RETURNS TABLE (
    driver_id         uuid,
    driver_name       text,
    total_jobs        integer,
    total_km          numeric,
    avg_review        numeric,
    total_reviews     integer,
    last_job_date     timestamp with time zone,
    last_review_score smallint
  )
  LANGUAGE plpgsql
  AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    d.id, d.name, d.total_jobs_completed, d.total_km_driven,
    d.avg_review_score, d.total_reviews,
    (SELECT MAX(completed_at) FROM job_orders WHERE driver_id = d.id AND status IN ('SELESAI', 'COMPLETED')),
    (SELECT review_score FROM driver_performance_logs WHERE driver_id = d.id AND type = 'REVIEW' ORDER BY created_at DESC LIMIT 1)
  FROM md_drivers d WHERE d.id = p_driver_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."get_driver_performance_summary"(uuid) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

-- ============================================================================
-- Object:        public.get_hs_breadcrumb
-- Layer:         006 Functions
-- Source:        supabase/schemas/public/functions/get_hs_breadcrumb.sql
-- Dependencies:  none
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_hs_breadcrumb (
  target_code text
)
  RETURNS SETOF public.hs_codes
  LANGUAGE plpgsql
  AS $function$
BEGIN
    RETURN QUERY
    WITH RECURSIVE hierarchy AS (
        -- Start with the target code
        SELECT * FROM hs_codes WHERE code = target_code
        UNION ALL
        -- Go upwards to parents
        SELECT h.* FROM hs_codes h
        JOIN hierarchy ON (
            h.code = hierarchy.parent_code 
            OR 
            -- Fallback for cases where parent_code might be missing the dot or formatted differently
            -- but usually they should match exactly
            h.code = SUBSTRING(hierarchy.code, 1, LENGTH(hierarchy.code) - 2)
        )
    )
    SELECT * FROM hierarchy ORDER BY level ASC;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."get_hs_breadcrumb"(text) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

-- ============================================================================
-- Object:        public.get_hs_children
-- Layer:         006 Functions
-- Source:        supabase/schemas/public/functions/get_hs_children.sql
-- Dependencies:  none
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_hs_children (
  p_code text
)
  RETURNS SETOF public.hs_codes
  LANGUAGE plpgsql
  AS $function$
BEGIN
    RETURN QUERY
    SELECT *
    FROM hs_codes
    WHERE 
        (p_code IS NULL AND (parent_code IS NULL OR parent_code = '01'))
        OR 
        (parent_code = p_code)
    ORDER BY code;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."get_hs_children"(text) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

-- ============================================================================
-- Object:        public.get_my_tenant_id
-- Layer:         006 Functions
-- Source:        supabase/schemas/public/functions/get_my_tenant_id.sql
-- Dependencies:  none
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_my_tenant_id()
  RETURNS uuid
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
  SELECT COALESCE(
    -- 1. Check if the user is a registered staff member
    (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid() LIMIT 1),
    -- 2. Check if the user is the owner of a tenant
    (SELECT id FROM public.tenants WHERE user_id = auth.uid() LIMIT 1)
  );
$function$;

GRANT EXECUTE ON FUNCTION "public"."get_my_tenant_id"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

-- ============================================================================
-- Object:        public.get_pending_reset_requests
-- Layer:         006 Functions
-- Source:        supabase/schemas/public/functions/get_pending_reset_requests.sql
-- Dependencies:  none
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_pending_reset_requests()
  RETURNS TABLE (
    id           uuid,
    tenant_code  character varying,
    tenant_name  text,
    admin_email  character varying,
    requested_at timestamp with time zone,
    user_id      uuid
  )
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
BEGIN
    RETURN QUERY 
    SELECT r.id, r.tenant_code, r.tenant_name, r.admin_email, r.requested_at, t.user_id
    FROM public.reset_password_requests r 
    JOIN public.tenants t ON r.tenant_id = t.id
    WHERE r.status = 'pending' 
    ORDER BY r.requested_at ASC;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."get_pending_reset_requests"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

-- ============================================================================
-- Object:        public.get_rls_status_report
-- Layer:         006 Functions
-- Source:        supabase/schemas/public/functions/get_rls_status_report.sql
-- Dependencies:  none
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_rls_status_report()
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'rls_per_table', (
            SELECT jsonb_agg(jsonb_build_object(
                'table_name', tablename,
                'rowsecurity', rowsecurity
            ))
            FROM pg_tables t
            JOIN pg_class c ON c.relname = t.tablename
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE t.schemaname = 'public'
            AND t.tablename IN ('warehouses', 'staff', 'tenants', 'storage_zones')
        ),
        'policies', (
            SELECT jsonb_agg(jsonb_build_object(
                'table', tablename,
                'policy_name', policyname,
                'roles', roles,
                'cmd', cmd,
                'qual', qual,
                'with_check', with_check
            ))
            FROM pg_policies
            WHERE schemaname = 'public'
            AND tablename IN ('warehouses', 'staff', 'tenants', 'storage_zones')
        ),
        'current_user_info', (
            SELECT jsonb_build_object(
                'user', current_user,
                'role', current_role,
                'auth_role', auth.role()
            )
        )
    ) INTO result;
    
    RETURN result;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."get_rls_status_report"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

-- ============================================================================
-- Object:        public.get_sla_breach_summary
-- Layer:         006 Functions
-- Source:        supabase/schemas/public/functions/get_sla_breach_summary.sql
-- Dependencies:  none
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_sla_breach_summary (
  p_tenant_id uuid
)
  RETURNS TABLE (
    stage                 text,
    total_breaches        bigint,
    avg_overdue_minutes   numeric,
    worst_overdue_minutes integer,
    unresolved_count      bigint
  )
  LANGUAGE plpgsql
  STABLE
  AS $function$
BEGIN
  RETURN QUERY
  SELECT
    e.stage,
    COUNT(*) AS total_breaches,
    ROUND(AVG(e.overdue_minutes), 0) AS avg_overdue_minutes,
    MAX(e.overdue_minutes)::INTEGER AS worst_overdue_minutes,
    COUNT(*) FILTER (WHERE e.resolved_at IS NULL) AS unresolved_count
  FROM sla_escalations e
  WHERE e.tenant_id = p_tenant_id
    AND e.created_at >= NOW() - INTERVAL '30 days'
  GROUP BY e.stage
  ORDER BY total_breaches DESC;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."get_sla_breach_summary"(uuid) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

-- ============================================================================
-- Object:        public.grant_tokens_to_tenant
-- Layer:         006 Functions
-- Source:        supabase/schemas/public/functions/grant_tokens_to_tenant.sql
-- Dependencies:  none
-- ============================================================================
CREATE OR REPLACE FUNCTION public.grant_tokens_to_tenant (
  p_tenant_code  text,
  p_token_amount integer
)
  RETURNS json
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
DECLARE
    v_owner_id UUID;
    v_tenant RECORD;
BEGIN
    -- Validasi owner (tanpa auth.uid untuk testing)
    SELECT id INTO v_owner_id FROM auth.users 
    WHERE email = 'admin1@sentralogis.com';
    
    IF v_owner_id IS NULL THEN
        RETURN json_build_object(
            'success', false, 
            'message', 'Owner tidak ditemukan'
        );
    END IF;
    
    -- Validasi amount positif
    IF p_token_amount <= 0 THEN
        RETURN json_build_object('success', false, 'message', 'Token amount harus positif');
    END IF;
    
    -- Dapatkan tenant
    SELECT * INTO v_tenant FROM public.tenants 
    WHERE tenant_code = p_tenant_code;
    
    IF v_tenant IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'Tenant tidak ditemukan');
    END IF;
    
    -- Update token balance
    UPDATE public.tenants 
    SET 
        token_balance = token_balance + p_token_amount,
        updated_at = NOW()
    WHERE tenant_code = p_tenant_code
    RETURNING * INTO v_tenant;
    
    RETURN json_build_object(
        'success', true,
        'tenant_code', p_tenant_code,
        'tenant_name', v_tenant.name,
        'granted_amount', p_token_amount,
        'new_balance', v_tenant.token_balance,
        'message', format('%s token berhasil digrant ke tenant %s', p_token_amount, p_tenant_code)
    );
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."grant_tokens_to_tenant"(text, integer) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

-- ============================================================================
-- Object:        public.handle_job_completion
-- Layer:         006 Functions
-- Source:        supabase/schemas/public/functions/handle_job_completion.sql
-- Dependencies:  none
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_job_completion()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $function$
DECLARE
  completed_statuses TEXT[] := ARRAY[
    'SELESAI', 'COMPLETED', 'PEKERJAAN SELESAI', 'VERIFIED', 
    'READY_FOR_BILLING', 'PAID', 'INVOICED', 'DONE', 
    'AWAITING_AUDIT', 'DOC_COMPLETED', 'COST_COMPLETED'
  ];
BEGIN
  IF NEW.status = ANY(completed_statuses) AND (OLD.status != NEW.status) THEN
    
    -- Reset driver
    IF OLD.driver_id IS NOT NULL THEN
      UPDATE md_drivers 
      SET is_working = false, status = 'available', updated_at = NOW()
      WHERE id = OLD.driver_id 
        AND NOT EXISTS (
          SELECT 1 FROM job_orders 
          WHERE driver_id = OLD.driver_id 
            AND status != ALL(completed_statuses)
          LIMIT 1
        );
    END IF;
    
    -- Reset fleet
    IF OLD.fleet_id IS NOT NULL THEN
      UPDATE md_fleets 
      SET status = 'available', updated_at = NOW()
      WHERE id = OLD.fleet_id
        AND NOT EXISTS (
          SELECT 1 FROM job_orders 
          WHERE fleet_id = OLD.fleet_id 
            AND status != ALL(completed_statuses)
          LIMIT 1
        );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."handle_job_completion"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

-- ============================================================================
-- Object:        public.handle_job_status_change
-- Layer:         006 Functions
-- Source:        supabase/schemas/public/functions/handle_job_status_change.sql
-- Dependencies:  none
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_job_status_change()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $function$
DECLARE
  active_job_count_driver INT;
  active_job_count_fleet INT;
  has_active_shift BOOLEAN;
  v_job_distance NUMERIC;
  v_driver_current_km NUMERIC;
  v_driver_current_reviews INT;
  v_driver_current_avg DECIMAL;
  v_driver RECORD;
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  IF LOWER(NEW.status) IN ('selesai', 'completed', 'pekerjaan selesai', 'verified', 'ready_for_billing', 'paid', 'invoiced', 'done', 'cancelled', 'rejected', 'awaiting_audit') THEN
    
    -- DISTANCE ACCUMULATION
    IF NEW.driver_id IS NOT NULL AND LOWER(NEW.status) NOT IN ('cancelled', 'rejected') THEN
      
      SELECT COALESCE(distance_km, 0) INTO v_job_distance
      FROM job_routes
      WHERE job_order_id = NEW.id
      ORDER BY sequence DESC
      LIMIT 1;
      
      IF v_job_distance = 0 OR v_job_distance IS NULL THEN
        SELECT COALESCE((wi.item_data->>'est_distance_km')::NUMERIC, 0) INTO v_job_distance
        FROM job_orders jo
        LEFT JOIN wo_items wi ON wi.id = jo.wo_item_id
        WHERE jo.id = NEW.id;
      END IF;
      
      IF v_job_distance > 0 THEN
        SELECT total_km_driven, total_reviews, avg_review_score INTO v_driver
        FROM md_drivers WHERE id = NEW.driver_id;
        
        v_driver_current_km := COALESCE(v_driver.total_km_driven, 0);
        
        UPDATE md_drivers
        SET total_km_driven = v_driver_current_km + v_job_distance,
            total_distance_km = v_driver_current_km + v_job_distance,
            updated_at = NOW()
        WHERE id = NEW.driver_id;
        
        INSERT INTO driver_performance_logs (driver_id, job_order_id, type, total_km)
        VALUES (NEW.driver_id, NEW.id, 'KM_LOG', v_job_distance);
      END IF;
    END IF;
    
    -- CUSTOMER REVIEW ACCUMULATION
    IF NEW.driver_id IS NOT NULL AND NEW.customer_review_score IS NOT NULL AND NEW.customer_review_score > 0 THEN
      
      SELECT total_reviews, avg_review_score INTO v_driver
      FROM md_drivers WHERE id = NEW.driver_id;
      
      v_driver_current_reviews := COALESCE(v_driver.total_reviews, 0);
      v_driver_current_avg := COALESCE(v_driver.avg_review_score, 0);
      
      IF v_driver_current_reviews = 0 THEN
        v_driver_current_avg := NEW.customer_review_score;
      ELSE
        v_driver_current_avg := ((v_driver_current_avg * v_driver_current_reviews) + NEW.customer_review_score) / (v_driver_current_reviews + 1);
      END IF;
      
      UPDATE md_drivers
      SET total_reviews = v_driver_current_reviews + 1,
          avg_review_score = ROUND(v_driver_current_avg::NUMERIC, 2),
          updated_at = NOW()
      WHERE id = NEW.driver_id;
      
      INSERT INTO driver_performance_logs (driver_id, job_order_id, type, review_score, review_notes)
      VALUES (NEW.driver_id, NEW.id, 'REVIEW', NEW.customer_review_score, NEW.customer_review_notes);
    END IF;
    
    -- STATUS RESET
    IF NEW.driver_id IS NOT NULL THEN
      SELECT COUNT(*) INTO active_job_count_driver
      FROM job_orders 
      WHERE driver_id = NEW.driver_id 
        AND LOWER(status) NOT IN ('selesai', 'completed', 'pekerjaan selesai', 'verified', 'ready_for_billing', 'paid', 'invoiced', 'done', 'cancelled', 'rejected', 'draft', 'pending', 'awaiting_audit')
        AND id != NEW.id;

      SELECT EXISTS (
        SELECT 1 FROM driver_attendance
        WHERE driver_id = NEW.driver_id
          AND status = 'CHECK_IN'
          AND check_in::date = CURRENT_DATE
      ) INTO has_active_shift;

      IF active_job_count_driver = 0 AND NOT has_active_shift THEN
        UPDATE md_drivers 
        SET is_working = false, status = 'available', updated_at = NOW()
        WHERE id = NEW.driver_id;
      ELSIF active_job_count_driver = 0 AND has_active_shift THEN
        UPDATE md_drivers 
        SET status = 'available', updated_at = NOW()
        WHERE id = NEW.driver_id AND status != 'unavailable';
      END IF;
    END IF;
    
    IF NEW.fleet_id IS NOT NULL THEN
      SELECT COUNT(*) INTO active_job_count_fleet
      FROM job_orders 
      WHERE fleet_id = NEW.fleet_id 
        AND LOWER(status) NOT IN ('selesai', 'completed', 'pekerjaan selesai', 'verified', 'ready_for_billing', 'paid', 'invoiced', 'done', 'cancelled', 'rejected', 'draft', 'pending', 'awaiting_audit')
        AND id != NEW.id;

      IF active_job_count_fleet = 0 THEN
        UPDATE md_fleets SET status = 'available', updated_at = NOW() WHERE id = NEW.fleet_id;
      END IF;
    END IF;

  ELSIF NEW.status = 'assigned' AND (OLD.status = 'draft' OR OLD.status = 'pending') THEN
    
    IF NEW.driver_id IS NOT NULL THEN
      UPDATE md_drivers SET is_working = true, status = 'on_duty', updated_at = NOW()
      WHERE id = NEW.driver_id AND status != 'unavailable';
    END IF;
    
    IF NEW.fleet_id IS NOT NULL THEN
      UPDATE md_fleets SET status = 'on_road', updated_at = NOW() WHERE id = NEW.fleet_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."handle_job_status_change"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

-- ============================================================================
-- Object:        public.handle_job_status_change_v2
-- Layer:         006 Functions
-- Source:        supabase/schemas/public/functions/handle_job_status_change_v2.sql
-- Dependencies:  none
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_job_status_change_v2()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $function$
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
$function$;

GRANT EXECUTE ON FUNCTION "public"."handle_job_status_change_v2"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

-- ============================================================================
-- Object:        public.handle_new_user
-- Layer:         006 Functions
-- Source:        supabase/schemas/public/functions/handle_new_user.sql
-- Dependencies:  none
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
BEGIN
  -- Ambil role dari metadata jika ada, jika tidak ada baru gunakan 'viewer'
  INSERT INTO public.profiles (id, email, full_name, role, is_active)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'viewer'), -- <--- Perbaikan di sini
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    role = EXCLUDED.role,
    full_name = EXCLUDED.full_name;
    
  RETURN NEW;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."handle_new_user"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

-- ============================================================================
-- Object:        public.handle_updated_at
-- Layer:         006 Functions
-- Source:        supabase/schemas/public/functions/handle_updated_at.sql
-- Dependencies:  none
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $function$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $function$;

GRANT EXECUTE ON FUNCTION "public"."handle_updated_at"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

-- ============================================================================
-- Object:        public.has_tenant_access
-- Layer:         006 Functions
-- Source:        supabase/schemas/public/functions/has_tenant_access.sql
-- Dependencies:  none
-- ============================================================================
CREATE OR REPLACE FUNCTION public.has_tenant_access (
  p_tenant_id uuid
)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
  SELECT 
    current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
    OR EXISTS (
      SELECT 1 FROM public.tenant_users WHERE user_id = auth.uid() AND tenant_id = p_tenant_id AND is_active = true
    ) OR EXISTS (
      SELECT 1 FROM public.tenants WHERE user_id = auth.uid() AND id = p_tenant_id
    );
$function$;

GRANT EXECUTE ON FUNCTION "public"."has_tenant_access"(uuid) TO "authenticated", "postgres", "service_role";

REVOKE ALL ON FUNCTION "public"."has_tenant_access"(uuid) FROM PUBLIC;

-- ============================================================================
-- Object:        public.increment_hs_pattern
-- Layer:         006 Functions
-- Source:        supabase/schemas/public/functions/increment_hs_pattern.sql
-- Dependencies:  none
-- ============================================================================
CREATE OR REPLACE FUNCTION public.increment_hs_pattern (
  p_keyword text,
  p_hs      text
)
  RETURNS void
  LANGUAGE plpgsql
  AS $function$
begin
  insert into hs_pattern_memory (keyword, hs_code, weight, occurrence_count)
  values (lower(p_keyword), p_hs, 1.2, 1)
  on conflict (keyword) 
  do update set 
    occurrence_count = hs_pattern_memory.occurrence_count + 1,
    weight = hs_pattern_memory.weight + 0.1,
    last_used = now();
end;
$function$;

GRANT EXECUTE ON FUNCTION "public"."increment_hs_pattern"(text, text) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

-- ============================================================================
-- Object:        public.insert_new_customer
-- Layer:         006 Functions
-- Source:        supabase/schemas/public/functions/insert_new_customer.sql
-- Dependencies:  none
-- ============================================================================
CREATE OR REPLACE FUNCTION public.insert_new_customer (
  t_id      uuid,
  a_id      uuid,
  c_code    text,
  c_name    text,
  c_email   text,
  c_phone   text,
  c_address text,
  c_billing text,
  c_city    text,
  c_pic     text,
  c_by      uuid
)
  RETURNS json
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
DECLARE
    res JSON;
BEGIN
    INSERT INTO public.customers (
        tenant_id, auth_user_id, customer_code, name, email, phone, 
        address, billing_address, city, pic_name, created_by
    ) VALUES (
        t_id, a_id, UPPER(c_code), c_name, c_email, c_phone, 
        c_address, COALESCE(c_billing, c_address), c_city, c_pic, c_by
    )
    RETURNING row_to_json(public.customers.*) INTO res;
    RETURN res;
END;
$function$;

GRANT EXECUTE
  ON FUNCTION "public"."insert_new_customer"(uuid, uuid, text, text, text, text, text, text, text, text, uuid)
  TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

-- ============================================================================
-- Object:        public.insert_transporter
-- Layer:         006 Functions
-- Source:        supabase/schemas/public/functions/insert_transporter.sql
-- Dependencies:  none
-- ============================================================================
CREATE OR REPLACE FUNCTION public.insert_transporter (
  p_entity_code     character varying,
  p_name            character varying,
  p_phone           character varying,
  p_email           character varying,
  p_billing_address text,
  p_billing_method  character varying,
  p_tenant_id       uuid
)
  RETURNS uuid
  LANGUAGE plpgsql
  AS $function$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO md_entities (
    entity_code,
    name,
    phone,
    email,
    billing_address,
    billing_method,
    is_vendor,
    vendor_type,
    is_active,
    tenant_id,
    created_at
  ) VALUES (
    p_entity_code,
    p_name,
    p_phone,
    p_email,
    p_billing_address,
    p_billing_method,
    true,
    'transporter',
    true,
    p_tenant_id,
    NOW()
  )
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$function$;

GRANT EXECUTE
  ON FUNCTION "public"."insert_transporter"(character varying, character varying, character varying, character varying, text, character varying, uuid)
  TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

-- ============================================================================
-- Object:        public.is_auth_superadmin
-- Layer:         006 Functions
-- Source:        supabase/schemas/public/functions/is_auth_superadmin.sql
-- Dependencies:  none
-- ============================================================================
CREATE OR REPLACE FUNCTION public.is_auth_superadmin()
  RETURNS boolean
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.tenant_users 
    WHERE user_id = auth.uid() AND role_code = 'tenant_superadmin'
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."is_auth_superadmin"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

-- ============================================================================
-- Object:        public.is_driver_ready_for_assignment
-- Layer:         006 Functions
-- Source:        supabase/schemas/public/functions/is_driver_ready_for_assignment.sql
-- Dependencies:  none
-- ============================================================================
CREATE OR REPLACE FUNCTION public.is_driver_ready_for_assignment (
  p_driver_id uuid
)
  RETURNS TABLE (
    ready                   boolean,
    reason                  text,
    has_attendance_today    boolean,
    has_inspection_today    boolean,
    fleet_inspection_status text
  )
  LANGUAGE plpgsql
  AS $function$
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
  ELSE
    ready := true;
    reason := 'Driver ready for assignment';
  END IF;

  RETURN NEXT;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."is_driver_ready_for_assignment"(uuid) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

-- ============================================================================
-- Object:        public.is_superadmin
-- Layer:         006 Functions
-- Source:        supabase/schemas/public/functions/is_superadmin.sql
-- Dependencies:  none
-- ============================================================================
CREATE OR REPLACE FUNCTION public.is_superadmin()
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
  SELECT 
    current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
    OR EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('superadmin', 'owner')
    ) OR EXISTS (
      SELECT 1 FROM public.tenant_users WHERE user_id = auth.uid() AND role_code IN ('tenant_superadmin', 'superadmin', 'owner') AND is_active = true
    );
$function$;

GRANT EXECUTE ON FUNCTION "public"."is_superadmin"() TO "authenticated", "postgres", "service_role";

REVOKE ALL ON FUNCTION "public"."is_superadmin"() FROM PUBLIC;

-- ============================================================================
-- Object:        public.is_tenant_superadmin
-- Layer:         006 Functions
-- Source:        supabase/schemas/public/functions/is_tenant_superadmin.sql
-- Dependencies:  none
-- ============================================================================
CREATE OR REPLACE FUNCTION public.is_tenant_superadmin()
  RETURNS boolean
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.tenant_users
    WHERE user_id = auth.uid() 
    AND role_code = 'tenant_superadmin'
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."is_tenant_superadmin"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

-- ============================================================================
-- Object:        public.log_token_grant
-- Layer:         006 Functions
-- Source:        supabase/schemas/public/functions/log_token_grant.sql
-- Dependencies:  none
-- ============================================================================
CREATE OR REPLACE FUNCTION public.log_token_grant()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $function$
BEGIN
    IF NEW.token_balance > OLD.token_balance THEN
        INSERT INTO public.token_transactions (
            tenant_id, tenant_code, amount, transaction_type, description
        ) VALUES (
            NEW.id, NEW.tenant_code, 
            NEW.token_balance - OLD.token_balance, 
            'GRANT', 
            'Token grant from owner'
        );
    END IF;
    RETURN NEW;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."log_token_grant"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

-- ============================================================================
-- Object:        public.log_wo_jo_changes
-- Layer:         006 Functions
-- Source:        supabase/schemas/public/functions/log_wo_jo_changes.sql
-- Dependencies:  none
-- ============================================================================
CREATE OR REPLACE FUNCTION public.log_wo_jo_changes()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
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
$function$;

GRANT EXECUTE ON FUNCTION "public"."log_wo_jo_changes"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

-- ============================================================================
-- Object:        public.manual_reset_password
-- Layer:         006 Functions
-- Source:        supabase/schemas/public/functions/manual_reset_password.sql
-- Dependencies:  none
-- ============================================================================
CREATE OR REPLACE FUNCTION public.manual_reset_password (
  p_request_id   uuid,
  p_new_password text
)
  RETURNS json
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
DECLARE
    v_request RECORD;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND email = 'admin1@sentralogis.com') THEN
        RETURN json_build_object('success', false, 'message', 'Unauthorized: Hanya owner');
    END IF;
    
    SELECT * INTO v_request FROM public.reset_password_requests WHERE id = p_request_id AND status = 'pending';
    
    IF v_request IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'Request tidak ditemukan');
    END IF;
    
    UPDATE public.reset_password_requests
    SET 
        status = 'completed', 
        processed_by = auth.uid(), 
        processed_at = NOW(), 
        notes = p_new_password
    WHERE id = p_request_id;
    
    RETURN json_build_object(
        'success', true, 
        'new_password', p_new_password, 
        'admin_email', v_request.admin_email,
        'message', 'Password berhasil direset'
    );
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."manual_reset_password"(uuid, text) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

-- ============================================================================
-- Object:        public.manual_topup_tokens
-- Layer:         006 Functions
-- Source:        supabase/schemas/public/functions/manual_topup_tokens.sql
-- Dependencies:  none
-- ============================================================================
CREATE OR REPLACE FUNCTION public.manual_topup_tokens (
  p_tenant_code     text,
  p_amount_received integer,
  p_note            text    DEFAULT NULL::text
)
  RETURNS json
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
DECLARE
    v_owner_id UUID;
    v_tenant_id UUID;
    v_old_balance INTEGER;
    v_new_balance INTEGER;
    v_tokens_to_add INTEGER;
BEGIN
    -- Verifikasi Owner (admin1@sentralogis.com)
    SELECT id INTO v_owner_id FROM auth.users 
    WHERE id = auth.uid() AND email = 'admin1@sentralogis.com';
    
    IF v_owner_id IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'Akses ditolak: Hanya Executive Owner yang bisa menambah token');
    END IF;
    
    -- Hitung token (Rp 1.000 = 1 Token), pembulatan ke bawah (floor)
    v_tokens_to_add := FLOOR(p_amount_received / 1000);
    
    IF v_tokens_to_add <= 0 THEN
        RETURN json_build_object('success', false, 'message', 'Nominal terlalu kecil, minimal Rp 1.000 untuk 1 token');
    END IF;
    
    -- Ambil data tenant
    SELECT id, token_balance INTO v_tenant_id, v_old_balance
    FROM public.tenants WHERE tenant_code = p_tenant_code;
    
    IF v_tenant_id IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'Node cluster tidak ditemukan');
    END IF;
    
    -- Update Saldo
    UPDATE public.tenants
    SET token_balance = token_balance + v_tokens_to_add,
        updated_at = NOW()
    WHERE id = v_tenant_id
    RETURNING token_balance INTO v_new_balance;
    
    -- Catat Riwayat Transaksi
    INSERT INTO public.token_transactions (tenant_id, tenant_code, amount, transaction_type, description)
    VALUES (v_tenant_id, p_tenant_code, v_tokens_to_add, 'TOPUP', 
            COALESCE(p_note, format('Top-up Rp %s -> %s token', p_amount_received, v_tokens_to_add)));
    
    RETURN json_build_object(
        'success', true,
        'message', format('Berhasil menambahkan %s token (Rp %s)', v_tokens_to_add, p_amount_received),
        'tokens_added', v_tokens_to_add,
        'new_balance', v_new_balance
    );
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."manual_topup_tokens"(text, integer, text) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

-- ============================================================================
-- Object:        public.match_hs_embeddings
-- Layer:         006 Functions
-- Source:        supabase/schemas/public/functions/match_hs_embeddings.sql
-- Dependencies:  none
-- ============================================================================
CREATE OR REPLACE FUNCTION public.match_hs_embeddings (
  query_embedding public.vector,
  match_threshold double precision,
  match_count     integer
)
  RETURNS TABLE (
    hs_code     text,
    description text,
    similarity  double precision
  )
  LANGUAGE sql
  STABLE
  AS $function$
  select
    hs_code,
    description,
    1 - (embedding <=> query_embedding) as similarity
  from hs_embeddings
  where 1 - (embedding <=> query_embedding) > match_threshold
  order by embedding <=> query_embedding
  limit match_count;
$function$;

GRANT EXECUTE ON FUNCTION "public"."match_hs_embeddings"(public.vector, double precision, integer) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

-- ============================================================================
-- Object:        public.merge_driver_profile
-- Layer:         006 Functions
-- Source:        supabase/schemas/public/functions/merge_driver_profile.sql
-- Dependencies:  none
-- ============================================================================
CREATE OR REPLACE FUNCTION public.merge_driver_profile (
  p_source_profile_id uuid,
  p_target_profile_id uuid
)
  RETURNS json
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
BEGIN
  -- Strict Internal Authorization
  IF NOT public.is_superadmin() THEN
    RAISE EXCEPTION 'FORBIDDEN_SUPERADMIN: Only authorized superadmins can merge profiles';
  END IF;

  IF p_source_profile_id = p_target_profile_id THEN
    RAISE EXCEPTION 'Cannot merge profile to itself';
  END IF;

  -- Verify both profiles exist
  IF NOT EXISTS (SELECT 1 FROM public.driver_profiles WHERE id = p_source_profile_id) THEN
    RAISE EXCEPTION 'Source profile not found';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM public.driver_profiles WHERE id = p_target_profile_id) THEN
    RAISE EXCEPTION 'Target profile not found';
  END IF;

  -- Detect tenant conflict (driver has links in BOTH profiles for the SAME tenant)
  IF EXISTS (
    SELECT 1
    FROM public.driver_tenant_links l1
    JOIN public.driver_tenant_links l2 ON l1.tenant_id = l2.tenant_id
    WHERE l1.profile_id = p_source_profile_id AND l2.profile_id = p_target_profile_id
  ) THEN
    RAISE EXCEPTION 'TENANT_CONFLICT: Both profiles have links in the same tenant. Manual resolution required.';
  END IF;

  -- Move links to target profile
  UPDATE public.driver_tenant_links
  SET profile_id = p_target_profile_id, updated_at = NOW()
  WHERE profile_id = p_source_profile_id;

  -- Deactivate source profile
  UPDATE public.driver_profiles
  SET is_active = false, updated_at = NOW()
  WHERE id = p_source_profile_id;

  RETURN json_build_object('success', true);
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."merge_driver_profile"(uuid, uuid) TO "authenticated", "postgres", "service_role";

REVOKE ALL ON FUNCTION "public"."merge_driver_profile"(uuid, uuid) FROM PUBLIC;

-- ============================================================================
-- Object:        public.next_invoice_number
-- Layer:         006 Functions
-- Source:        supabase/schemas/public/functions/next_invoice_number.sql
-- Dependencies:  none
-- ============================================================================
CREATE OR REPLACE FUNCTION public.next_invoice_number (
  p_tenant_id uuid
)
  RETURNS text
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
DECLARE
  v_year TEXT;
  v_month TEXT;
  v_seq BIGINT;
  v_invoice_number TEXT;
BEGIN
  v_year := to_char(now(), 'YYYY');
  v_month := to_char(now(), 'MM');

  -- nextval is atomic and session-safe; safe under concurrency
  v_seq := nextval('seq_invoice_number');

  v_invoice_number := 'INV-' || v_year || '-' || v_month || '-' || lpad(v_seq::text, 4, '0');

  RETURN v_invoice_number;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."next_invoice_number"(uuid) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

COMMENT ON FUNCTION "public"."next_invoice_number"(uuid) IS 'U-25/ADR-064: Atomic server-side invoice number generator. Format: INV-YYYY-MM-NNNN. Per-tenant monthly sequence. Client MUST NOT generate canonical invoice numbers.';

-- ============================================================================
-- Object:        public.next_pricing_rate_version
-- Layer:         006 Functions
-- Source:        supabase/schemas/public/functions/next_pricing_rate_version.sql
-- Dependencies:  none
-- ============================================================================
CREATE OR REPLACE FUNCTION public.next_pricing_rate_version (
  p_rate_id   uuid,
  p_tenant_id uuid
)
  RETURNS integer
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
DECLARE
  next_version INTEGER;
BEGIN
  SELECT COALESCE(MAX(version_no), 0) + 1
  INTO next_version
  FROM public.pricing_rate_versions
  WHERE rate_id = p_rate_id
    AND tenant_id = p_tenant_id
  FOR UPDATE;

  RETURN next_version;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."next_pricing_rate_version"(uuid, uuid) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

COMMENT ON FUNCTION "public"."next_pricing_rate_version"(uuid, uuid) IS '5C-1R: Database-authoritative, concurrency-safe version number allocator. Uses SELECT ... FOR UPDATE to prevent duplicate version numbers under concurrent requests.';

-- ============================================================================
-- Object:        public.next_sales_order
-- Layer:         006 Functions
-- Source:        supabase/schemas/public/functions/next_sales_order.sql
-- Dependencies:  none
-- ============================================================================
CREATE OR REPLACE FUNCTION public.next_sales_order (
  p_tenant_id uuid
)
  RETURNS text
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
DECLARE
  v_year TEXT;
  v_month TEXT;
  v_seq BIGINT;
  v_so_number TEXT;
BEGIN
  v_year := to_char(now(), 'YYYY');
  v_month := to_char(now(), 'MM');
  v_seq := nextval('seq_sales_order');
  v_so_number := 'SO-' || v_year || '-' || v_month || '-' || lpad(v_seq::text, 4, '0');
  RETURN v_so_number;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."next_sales_order"(uuid) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

COMMENT ON FUNCTION "public"."next_sales_order"(uuid) IS 'U-13/ADR-035: Atomic server-side Sales Order number generator. Format: SO-YYYY-MM-NNNN. Client MUST NOT generate canonical SO numbers.';

-- ============================================================================
-- Object:        public.normalize_phone
-- Layer:         006 Functions
-- Source:        supabase/schemas/public/functions/normalize_phone.sql
-- Dependencies:  none
-- ============================================================================
CREATE OR REPLACE FUNCTION public.normalize_phone (
  p_phone text
)
  RETURNS text
  LANGUAGE plpgsql
  IMMUTABLE
  AS $function$
DECLARE
  v_clean TEXT;
BEGIN
  IF p_phone IS NULL OR p_phone = '' THEN
    RETURN NULL;
  END IF;
  v_clean := regexp_replace(p_phone, '[^0-9]', '', 'g');
  IF v_clean LIKE '0%' THEN
    v_clean := '62' || substring(v_clean from 2);
  ELSIF v_clean LIKE '8%' THEN
    v_clean := '62' || v_clean;
  END IF;
  RETURN v_clean;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."normalize_phone"(text) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

-- ============================================================================
-- Object:        public.notify_driver_payment
-- Layer:         006 Functions
-- Source:        supabase/schemas/public/functions/notify_driver_payment.sql
-- Dependencies:  none
-- ============================================================================
CREATE OR REPLACE FUNCTION public.notify_driver_payment()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $function$
DECLARE
  driver_phone TEXT;
  driver_name TEXT;
BEGIN
  SELECT md.phone, md.name INTO driver_phone, driver_name
  FROM md_drivers md
  WHERE md.id = NEW.driver_id;
  IF driver_phone IS NULL THEN
    RETURN NEW;
  END IF;
  IF OLD.advance_status IS DISTINCT FROM NEW.advance_status 
     AND NEW.advance_status = 'paid' 
     AND NEW.advance_amount > 0 THEN
    INSERT INTO notifications (role, title, message, type, metadata, created_at)
    VALUES (
      'driver_' || NEW.driver_id,
      'Uang Jalan Ditransfer',
      'Halo ' || COALESCE(driver_name, 'Driver') || ', uang jalan Rp ' || TO_CHAR(NEW.advance_amount, '999,999,999') || ' untuk job ' || NEW.jo_number || ' sudah ditransfer.',
      'payment',
      jsonb_build_object('jo_id', NEW.id, 'jo_number', NEW.jo_number, 'type', 'advance', 'amount', NEW.advance_amount),
      NOW()
    );
  END IF;
  IF OLD.driver_payment_status IS DISTINCT FROM NEW.driver_payment_status 
     AND NEW.driver_payment_status = 'paid' 
     AND NEW.driver_payment_amount > 0 THEN
    INSERT INTO notifications (role, title, message, type, metadata, created_at)
    VALUES (
      'driver_' || NEW.driver_id,
      'Pelunasan Ditransfer',
      'Halo ' || COALESCE(driver_name, 'Driver') || ', pelunasan Rp ' || TO_CHAR(NEW.driver_payment_amount, '999,999,999') || ' untuk job ' || NEW.jo_number || ' sudah ditransfer.',
      'payment',
      jsonb_build_object('jo_id', NEW.id, 'jo_number', NEW.jo_number, 'type', 'final', 'amount', NEW.driver_payment_amount),
      NOW()
    );
  END IF;
  RETURN NEW;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."notify_driver_payment"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

-- ============================================================================
-- Object:        public.on_job_order_completed_notif
-- Layer:         006 Functions
-- Source:        supabase/schemas/public/functions/on_job_order_completed_notif.sql
-- Dependencies:  none
-- ============================================================================
CREATE OR REPLACE FUNCTION public.on_job_order_completed_notif()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $function$
BEGIN
  -- Trigger hanya aktif saat status berubah menjadi 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    
    -- Notifikasi untuk SBU (Ops & Finance)
    INSERT INTO notifications (role, title, message, type, metadata)
    VALUES 
    ('sbu_ops_tr', 'Job Order Completed', 'JO ' || NEW.jo_number || ' selesai. Segera proses POD/Dokumen.', 'success', jsonb_build_object('link', '/sbu/trucking/completed?jo=' || NEW.jo_number)),
    ('sbu_fin_tr', 'Job Order Completed', 'JO ' || NEW.jo_number || ' selesai. Tambahkan biaya (add cost) & finalisasi.', 'success', jsonb_build_object('link', '/sbu/trucking/completed?jo=' || NEW.jo_number));

    -- Notifikasi untuk HQ (CS & Finance)
    INSERT INTO notifications (role, title, message, type, metadata)
    VALUES 
    ('hq_cs', 'Job Order Completed', 'JO ' || NEW.jo_number || ' selesai. Menunggu audit & penagihan.', 'success', jsonb_build_object('link', '/hq/finance/cost-audit?jo=' || NEW.jo_number)),
    ('hq_finance', 'Job Order Completed', 'JO ' || NEW.jo_number || ' selesai. Siapkan pembuatan invoice.', 'success', jsonb_build_object('link', '/hq/finance/cost-audit?jo=' || NEW.jo_number));
    
  END IF;
  RETURN NEW;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."on_job_order_completed_notif"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

-- ============================================================================
-- Object:        public.ops_reject_reassign_jo
-- Layer:         006 Functions
-- Source:        supabase/schemas/public/functions/ops_reject_reassign_jo.sql
-- Dependencies:  none
-- ============================================================================
CREATE OR REPLACE FUNCTION public.ops_reject_reassign_jo (
  p_jo_id              uuid,
  p_rejection_reason   text,
  p_new_transporter_id uuid,
  p_new_fleet_id       uuid,
  p_new_driver_id      uuid,
  p_rejection_note     text DEFAULT NULL::text
)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
DECLARE
  v_jo RECORD;
  v_new_token TEXT;
  v_result JSONB;
BEGIN
  -- Get current JO data
  SELECT * INTO v_jo FROM job_orders WHERE id = p_jo_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Job order not found');
  END IF;

  -- Generate new driver_link_token for the reassigned JO
  v_new_token := encode(gen_random_bytes(16), 'hex');

  -- Update the JO: reject old, assign new, generate new token
  UPDATE job_orders SET
    transporter_id = p_new_transporter_id,
    fleet_id = p_new_fleet_id,
    driver_id = p_new_driver_id,
    driver_link_token = v_new_token,
    driver_response = 'accepted',
    driver_response_at = NOW(),
    accepted_at = NOW(),
    status = 'ASSIGNED',
    rejection_note = COALESCE(p_rejection_note, '[' || p_rejection_reason || '] ' || COALESCE(rejection_note, '')),
    updated_at = NOW()
  WHERE id = p_jo_id;

  -- Log the change in job_tracking
  INSERT INTO job_tracking (job_order_id, status_update, notes, created_at)
  VALUES (
    p_jo_id,
    'OPS_REJECT_REASSIGN',
    'Driver/Transporter changed. Reason: ' || p_rejection_reason || COALESCE('. Note: ' || p_rejection_note, ''),
    NOW()
  );

  -- Release old fleet and driver back to available
  IF v_jo.fleet_id IS NOT NULL THEN
    UPDATE md_fleets SET status = 'available' WHERE id = v_jo.fleet_id AND status = 'on_duty';
  END IF;
  IF v_jo.driver_id IS NOT NULL THEN
    UPDATE md_drivers SET status = 'available', is_working = false WHERE id = v_jo.driver_id AND is_working = true;
  END IF;

  -- Mark new fleet and driver as on_duty
  UPDATE md_fleets SET status = 'on_duty' WHERE id = p_new_fleet_id;
  UPDATE md_drivers SET status = 'on_duty', is_working = true WHERE id = p_new_driver_id;

  RETURN jsonb_build_object(
    'success', true,
    'jo_id', p_jo_id,
    'new_driver_link_token', v_new_token
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."ops_reject_reassign_jo"(uuid, text, uuid, uuid, uuid, text) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

-- ============================================================================
-- Object:        public.penalize_hs_pattern
-- Layer:         006 Functions
-- Source:        supabase/schemas/public/functions/penalize_hs_pattern.sql
-- Dependencies:  none
-- ============================================================================
CREATE OR REPLACE FUNCTION public.penalize_hs_pattern (
  p_keyword text
)
  RETURNS void
  LANGUAGE plpgsql
  AS $function$
begin
  update hs_pattern_memory 
  set weight = weight - 0.2, 
      occurrence_count = greatest(0, occurrence_count - 1)
  where keyword = lower(p_keyword);
end;
$function$;

GRANT EXECUTE ON FUNCTION "public"."penalize_hs_pattern"(text) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

-- ============================================================================
-- Object:        public.process_internal_movement
-- Layer:         006 Functions
-- Source:        supabase/schemas/public/functions/process_internal_movement.sql
-- Dependencies:  none
-- ============================================================================
CREATE OR REPLACE FUNCTION public.process_internal_movement (
  p_tenant_id        uuid,
  p_warehouse_id     uuid,
  p_product_sku_id   uuid,
  p_from_location_id uuid,
  p_to_location_id   uuid,
  p_quantity         numeric,
  p_notes            text,
  p_user_id          uuid,
  p_reference_type   text    DEFAULT 'MANUAL'::text,
  p_reference_id     text    DEFAULT NULL::text
)
  RETURNS uuid
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
DECLARE
    v_movement_id UUID;
    v_source_inv RECORD;
    v_dest_inv_id UUID;
    v_qty_remaining NUMERIC := p_quantity;
    v_deduct NUMERIC;
BEGIN
    -- 1. Deduct from source locations
    -- We may have multiple inventory records for the same product at the source location.
    -- We loop through them and deduct until v_qty_remaining is 0.
    FOR v_source_inv IN 
        SELECT * FROM wh_inventory 
        WHERE tenant_id = p_tenant_id 
          AND warehouse_id = p_warehouse_id 
          AND product_sku_id = p_product_sku_id 
          AND location_id = p_from_location_id 
          AND quantity > 0
        ORDER BY received_date ASC, created_at ASC
        FOR UPDATE
    LOOP
        IF v_qty_remaining <= 0 THEN
            EXIT;
        END IF;
        IF v_source_inv.quantity <= v_qty_remaining THEN
            v_deduct := v_source_inv.quantity;
        ELSE
            v_deduct := v_qty_remaining;
        END IF;
        -- Deduct from source
        UPDATE wh_inventory 
        SET quantity = quantity - v_deduct, updated_at = NOW()
        WHERE id = v_source_inv.id;
        -- Find or create destination record matching the exact same batch, expiry, status
        SELECT id INTO v_dest_inv_id FROM wh_inventory
        WHERE tenant_id = p_tenant_id
          AND warehouse_id = p_warehouse_id
          AND product_sku_id = p_product_sku_id
          AND location_id = p_to_location_id
          AND status = v_source_inv.status
          AND COALESCE(batch_number, '') = COALESCE(v_source_inv.batch_number, '')
          AND COALESCE(expiry_date, '1970-01-01') = COALESCE(v_source_inv.expiry_date, '1970-01-01')
        LIMIT 1 FOR UPDATE;
        IF v_dest_inv_id IS NOT NULL THEN
            UPDATE wh_inventory
            SET quantity = quantity + v_deduct, updated_at = NOW()
            WHERE id = v_dest_inv_id;
        ELSE
            INSERT INTO wh_inventory (
                tenant_id, warehouse_id, location_id, product_sku_id, quantity,
                batch_number, expiry_date, received_date, unit_cost, status
            ) VALUES (
                p_tenant_id, p_warehouse_id, p_to_location_id, p_product_sku_id, v_deduct,
                v_source_inv.batch_number, v_source_inv.expiry_date, v_source_inv.received_date, v_source_inv.unit_cost, v_source_inv.status
            ) RETURNING id INTO v_dest_inv_id;
        END IF;
        -- We should also log into wh_inventory_movements for audit trail
        INSERT INTO wh_inventory_movements (
            tenant_id, inventory_id, movement_type, from_location_id, to_location_id, quantity, reference_type, notes, created_by
        ) VALUES (
            p_tenant_id, v_dest_inv_id, 'TRANSFER', p_from_location_id, p_to_location_id, v_deduct, 'INTERNAL_MOVEMENT', p_notes, p_user_id
        );
        v_qty_remaining := v_qty_remaining - v_deduct;
    END LOOP;
    IF v_qty_remaining > 0 THEN
        RAISE EXCEPTION 'Insufficient stock in source location % for SKU %', p_from_location_id, p_product_sku_id;
    END IF;
    -- 2. Create the movement record
    INSERT INTO wh_internal_movements (
        tenant_id, warehouse_id, product_sku_id, from_location_id, to_location_id,
        quantity, notes, reference_type, reference_id, created_by
    ) VALUES (
        p_tenant_id, p_warehouse_id, p_product_sku_id, p_from_location_id, p_to_location_id,
        p_quantity, p_notes, p_reference_type, p_reference_id, p_user_id
    ) RETURNING id INTO v_movement_id;
    RETURN v_movement_id;
END;
$function$;

GRANT EXECUTE
  ON FUNCTION "public"."process_internal_movement"(uuid, uuid, uuid, uuid, uuid, numeric, text, uuid, text, text)
  TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

-- ============================================================================
-- Object:        public.record_global_hs_pattern
-- Layer:         006 Functions
-- Source:        supabase/schemas/public/functions/record_global_hs_pattern.sql
-- Dependencies:  none
-- ============================================================================
CREATE OR REPLACE FUNCTION public.record_global_hs_pattern (
  p_wco     text,
  p_country text,
  p_local   text
)
  RETURNS void
  LANGUAGE plpgsql
  AS $function$
begin
  insert into hs_global_patterns (wco_code, country_code, local_hs)
  values (p_wco, p_country, p_local)
  on conflict (wco_code, country_code, local_hs) 
  do update set usage_frequency = hs_global_patterns.usage_frequency + 1;
end;
$function$;

GRANT EXECUTE ON FUNCTION "public"."record_global_hs_pattern"(text, text, text) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

-- ============================================================================
-- Object:        public.register_tenant
-- Layer:         006 Functions
-- Source:        supabase/schemas/public/functions/register_tenant.sql
-- Dependencies:  none
-- ============================================================================
CREATE OR REPLACE FUNCTION public.register_tenant (
  p_tenant_name       text,
  p_tenant_code       text,
  p_admin_email       text,
  p_admin_full_name   text,
  p_subscription_tier text DEFAULT 'free'::text
)
  RETURNS json
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
DECLARE
    v_owner_id UUID;
    v_tenant_id UUID;
    v_temp_password TEXT;
    v_new_user_id UUID;
BEGIN
    -- Validasi hanya owner_sentralogis yang bisa register tenant
    SELECT id INTO v_owner_id FROM auth.users 
    WHERE email = 'admin1@sentralogis.com' AND id = auth.uid();
    
    IF v_owner_id IS NULL THEN
        RETURN json_build_object(
            'success', false, 
            'message', 'Hanya owner Sentralogis yang bisa register tenant'
        );
    END IF;
    
    -- Cek tenant code unik
    IF EXISTS (SELECT 1 FROM public.tenants WHERE tenant_code = p_tenant_code) THEN
        RETURN json_build_object('success', false, 'message', 'Tenant code sudah digunakan');
    END IF;
    
    -- Cek email sudah terdaftar
    IF EXISTS (SELECT 1 FROM auth.users WHERE email = p_admin_email) THEN
        RETURN json_build_object('success', false, 'message', 'Email sudah terdaftar');
    END IF;
    
    -- Generate password sementara (12 karakter)
    v_temp_password := encode(gen_random_bytes(8), 'hex');
    
    -- Create user baru untuk admin tenant
    INSERT INTO auth.users (
        email,
        raw_user_meta_data,
        raw_app_meta_data,
        confirmed_at,
        created_at,
        updated_at
    ) VALUES (
        p_admin_email,
        jsonb_build_object(
            'full_name', p_admin_full_name,
            'role', 'tenant_admin',
            'tenant_code', p_tenant_code
        ),
        jsonb_build_object(
            'provider', 'email',
            'providers', ARRAY['email'],
            'role', 'tenant_admin'
        ),
        NOW(),
        NOW(),
        NOW()
    )
    RETURNING id INTO v_new_user_id;
    
    -- Buat tenant
    INSERT INTO public.tenants (
        tenant_code,
        name,
        user_id,
        subscription_tier,
        token_balance,
        total_tokens_used,
        created_at,
        updated_at
    ) VALUES (
        p_tenant_code,
        p_tenant_name,
        v_new_user_id,
        p_subscription_tier,
        100, -- Free token awal
        0,
        NOW(),
        NOW()
    ) RETURNING id INTO v_tenant_id;
    
    -- Buat profile untuk admin tenant
    INSERT INTO public.profiles (
        id,
        full_name,
        email,
        role,
        is_active,
        created_at,
        updated_at
    ) VALUES (
        v_new_user_id,
        p_admin_full_name,
        p_admin_email,
        'tenant_admin',
        true,
        NOW(),
        NOW()
    );
    
    RETURN json_build_object(
        'success', true,
        'tenant_id', v_tenant_id,
        'tenant_code', p_tenant_code,
        'admin_user_id', v_new_user_id,
        'temp_password', v_temp_password,
        'message', 'Tenant berhasil dibuat. Silakan login dengan password sementara.'
    );
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."register_tenant"(text, text, text, text, text) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

-- ============================================================================
-- Object:        public.register_tenant_test
-- Layer:         006 Functions
-- Source:        supabase/schemas/public/functions/register_tenant_test.sql
-- Dependencies:  none
-- ============================================================================
CREATE OR REPLACE FUNCTION public.register_tenant_test (
  p_tenant_name       text,
  p_tenant_code       text,
  p_admin_email       text,
  p_admin_full_name   text,
  p_subscription_tier text DEFAULT 'free'::text
)
  RETURNS json
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
DECLARE
    v_owner_id UUID;
    v_tenant_id UUID;
    v_temp_password TEXT;
    v_new_user_id UUID;
BEGIN
    -- Validasi owner
    SELECT id INTO v_owner_id FROM auth.users WHERE email = 'admin1@sentralogis.com';
    IF v_owner_id IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'Owner tidak ditemukan');
    END IF;
    
    -- Cek tenant code unik
    IF EXISTS (SELECT 1 FROM public.tenants WHERE tenant_code = p_tenant_code) THEN
        RETURN json_build_object('success', false, 'message', 'Tenant code sudah digunakan');
    END IF;
    
    -- Cek email sudah terdaftar
    SELECT id INTO v_new_user_id FROM auth.users WHERE email = p_admin_email;
    
    IF v_new_user_id IS NULL THEN
        -- Generate UUID dan password
        v_new_user_id := gen_random_uuid();
        v_temp_password := encode(gen_random_bytes(4), 'hex');
        
        -- INSERT ke auth.users
        INSERT INTO auth.users (
            id,
            email,
            encrypted_password,
            email_confirmed_at,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at
        ) VALUES (
            v_new_user_id,
            p_admin_email,
            crypt(v_temp_password, gen_salt('bf')),
            NOW(),
            '{"provider":"email","providers":["email"]}',
            jsonb_build_object('full_name', p_admin_full_name, 'role', 'tenant_admin', 'tenant_code', p_tenant_code),
            NOW(),
            NOW()
        );
        
        -- INSERT ke profiles
        INSERT INTO public.profiles (
            id, 
            full_name, 
            email, 
            role, 
            is_active,
            created_at,
            updated_at
        ) VALUES (
            v_new_user_id, 
            p_admin_full_name, 
            p_admin_email, 
            'tenant_admin', 
            true,
            NOW(),
            NOW()
        );
        
    ELSE
        -- User sudah ada
        v_temp_password := encode(gen_random_bytes(4), 'hex');
        UPDATE auth.users 
        SET encrypted_password = crypt(v_temp_password, gen_salt('bf')),
            email_confirmed_at = NOW(),
            updated_at = NOW()
        WHERE id = v_new_user_id;
    END IF;
    
    -- INSERT ke tenants
    INSERT INTO public.tenants (
        tenant_code, 
        name, 
        user_id, 
        subscription_tier, 
        token_balance, 
        status,
        created_at,
        updated_at
    ) VALUES (
        p_tenant_code, 
        p_tenant_name, 
        v_new_user_id, 
        p_subscription_tier,
        100,
        'active',
        NOW(),
        NOW()
    ) RETURNING id INTO v_tenant_id;
    
    RETURN json_build_object(
        'success', true,
        'tenant_id', v_tenant_id,
        'tenant_code', p_tenant_code,
        'admin_user_id', v_new_user_id,
        'temp_password', v_temp_password,
        'message', 'Tenant berhasil dibuat. Password: ' || v_temp_password
    );
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."register_tenant_test"(text, text, text, text, text) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

-- ============================================================================
-- Object:        public.replace_driver_atomic
-- Layer:         006 Functions
-- Source:        supabase/schemas/public/functions/replace_driver_atomic.sql
-- Dependencies:  none
-- ============================================================================
CREATE OR REPLACE FUNCTION public.replace_driver_atomic (
  p_tenant_id          uuid,
  p_job_order_id       uuid,
  p_new_driver_id      uuid,
  p_new_fleet_id       uuid DEFAULT NULL::uuid,
  p_new_transporter_id uuid DEFAULT NULL::uuid,
  p_reason             text DEFAULT NULL::text
)
  RETURNS TABLE (
    p_success   boolean,
    p_error     text,
    p_code      text,
    p_job_order jsonb
  )
  LANGUAGE plpgsql
  AS $function$
DECLARE
    v_jo job_orders%ROWTYPE;
    v_now TIMESTAMPTZ;
    v_new_token UUID;
    v_rejection_note TEXT;
    v_error_msg TEXT := NULL;
    v_error_code TEXT := NULL;
    v_success BOOLEAN := FALSE;
    v_result JSONB := NULL;
BEGIN
    v_now := NOW();
    v_new_token := gen_random_uuid();

    -- Fetch JO with tenant isolation + row lock for atomicity
    SELECT * INTO v_jo FROM job_orders
    WHERE id = p_job_order_id AND tenant_id = p_tenant_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN QUERY
            SELECT FALSE AS p_success,
                   'Job order not found'::TEXT AS p_error,
                   'NOT_FOUND'::TEXT AS p_code,
                   NULL::JSONB AS p_job_order;
        RETURN;
    END IF;

    -- ADR-091 D2: Source state must be ASSIGNED
    IF v_jo.status != 'ASSIGNED' THEN
        v_error_msg := format('Driver replacement not allowed from status: %s. Source state must be ASSIGNED.', v_jo.status);
        v_error_code := 'INVALID_STATE';
        RETURN QUERY
            SELECT v_success, v_error_msg, v_error_code, v_result;
        RETURN;
    END IF;

    -- ADR-091 D3: Cannot replace with the same driver/fleet/transporter
    IF v_jo.driver_id = p_new_driver_id
       AND ((v_jo.fleet_id = p_new_fleet_id) OR (v_jo.fleet_id IS NULL AND p_new_fleet_id IS NULL))
       AND ((v_jo.transporter_id = p_new_transporter_id) OR (v_jo.transporter_id IS NULL AND p_new_transporter_id IS NULL))
    THEN
        v_error_msg := 'Cannot replace with the same driver/fleet/transporter';
        v_error_code := 'SAME_DRIVER';
        RETURN QUERY
            SELECT v_success, v_error_msg, v_error_code, v_result;
        RETURN;
    END IF;

    -- Construct rejection note (matching service behavior)
    -- input.reason ? `[REPLACE] ${input.reason}` : (jo.rejectionNote || '[REPLACE] Driver replaced')
    IF p_reason IS NOT NULL AND p_reason <> '' THEN
        v_rejection_note := '[REPLACE] ' || p_reason;
    ELSIF v_jo.rejection_note IS NOT NULL AND v_jo.rejection_note <> '' THEN
        v_rejection_note := v_jo.rejection_note;
    ELSE
        v_rejection_note := '[REPLACE] Driver replaced';
    END IF;

    -- 1. UPDATE job_orders
    -- fleet_id / transporter_id only updated if non-null (preserving original COALESCE behavior)
    UPDATE job_orders SET
        driver_id = p_new_driver_id,
        driver_link_token = v_new_token,
        driver_response = 'accepted',
        driver_response_at = v_now,
        accepted_at = v_now,
        status = 'ASSIGNED',
        rejection_note = v_rejection_note,
        updated_at = v_now,
        fleet_id = COALESCE(p_new_fleet_id, v_jo.fleet_id),
        transporter_id = COALESCE(p_new_transporter_id, v_jo.transporter_id)
    WHERE id = p_job_order_id AND tenant_id = p_tenant_id;

    -- 2. Release old fleet (conditional, matches original .eq('status', 'on_duty') guard)
    IF v_jo.fleet_id IS NOT NULL THEN
        UPDATE md_fleets
        SET status = 'available'
        WHERE id = v_jo.fleet_id AND status = 'on_duty';
    END IF;

    -- 3. Release old driver (conditional, matches original .eq('is_working', true) guard)
    IF v_jo.driver_id IS NOT NULL THEN
        UPDATE md_drivers
        SET status = 'available', is_working = false
        WHERE id = v_jo.driver_id AND is_working = true;
    END IF;

    -- 4. Activate new fleet (conditional)
    IF p_new_fleet_id IS NOT NULL THEN
        UPDATE md_fleets
        SET status = 'on_duty'
        WHERE id = p_new_fleet_id;
    END IF;

    -- 5. Activate new driver
    UPDATE md_drivers
    SET status = 'on_duty', is_working = true
    WHERE id = p_new_driver_id;

    -- 6. INSERT job_tracking
    INSERT INTO job_tracking (
        job_order_id,
        status_update,
        notes,
        source,
        created_at
    ) VALUES (
        p_job_order_id,
        'OPS_REJECT_REASSIGN',
        'Driver replaced. Reason: ' || COALESCE(p_reason, 'N/A'),
        'copilot',
        v_now
    );

    -- Return the updated JO as JSONB
    SELECT to_jsonb(job_orders) INTO v_result
    FROM job_orders
    WHERE id = p_job_order_id;

    v_success := TRUE;
    RETURN QUERY
        SELECT v_success, v_error_msg, v_error_code, v_result;
    RETURN;

EXCEPTION
    WHEN OTHERS THEN
        -- Rollback is automatic on exception in plpgsql
        RETURN QUERY
            SELECT FALSE AS p_success,
                   SQLERRM::TEXT AS p_error,
                   'DATABASE_ERROR'::TEXT AS p_code,
                   NULL::JSONB AS p_job_order;
        RETURN;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."replace_driver_atomic"(uuid, uuid, uuid, uuid, uuid, text) TO "postgres", "service_role";

COMMENT ON FUNCTION "public"."replace_driver_atomic"(uuid, uuid, uuid, uuid, uuid, text) IS 'ADR-091 D5: Atomic driver replacement transaction. Wraps JO update + asset release/activate + tracking insert in a single PostgreSQL transaction. Called by DriverReplacementService.replaceDriver().';

REVOKE ALL ON FUNCTION "public"."replace_driver_atomic"(uuid, uuid, uuid, uuid, uuid, text) FROM PUBLIC;

-- ============================================================================
-- Object:        public.request_password_reset
-- Layer:         006 Functions
-- Source:        supabase/schemas/public/functions/request_password_reset.sql
-- Dependencies:  none
-- ============================================================================
CREATE OR REPLACE FUNCTION public.request_password_reset (
  p_email text
)
  RETURNS json
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
DECLARE
    v_tenant RECORD;
    v_request_id UUID;
BEGIN
    SELECT t.id, t.tenant_code, t.name INTO v_tenant
    FROM public.tenants t
    JOIN public.profiles p ON t.user_id = p.id
    WHERE p.email = p_email;
    
    IF v_tenant IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'Email tidak terdaftar');
    END IF;
    
    INSERT INTO public.reset_password_requests (tenant_id, tenant_code, tenant_name, admin_email)
    VALUES (v_tenant.id, v_tenant.tenant_code, v_tenant.name, p_email)
    RETURNING id INTO v_request_id;
    
    RETURN json_build_object('success', true, 'message', 'Permintaan terkirim ke Owner');
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."request_password_reset"(text) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

-- ============================================================================
-- Object:        public.request_password_reset_v2
-- Layer:         006 Functions
-- Source:        supabase/schemas/public/functions/request_password_reset_v2.sql
-- Dependencies:  none
-- ============================================================================
CREATE OR REPLACE FUNCTION public.request_password_reset_v2 (
  p_email text
)
  RETURNS json
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
DECLARE
    v_tenant RECORD;
BEGIN
    -- 1. HUNTING UUID & DATA CLUSTER BERDASARKAN EMAIL
    SELECT t.id as tenant_id, t.tenant_code, t.name as tenant_name, t.admin_email 
    INTO v_tenant
    FROM public.tenants t
    WHERE t.admin_email = p_email
    LIMIT 1;

    IF v_tenant.tenant_id IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'Email tidak terdaftar di cluster manapun.');
    END IF;

    -- 2. INSERT DATA LENGKAP KE NOTIFIKASI OWNER
    INSERT INTO public.reset_password_requests (
        tenant_id,
        tenant_code,
        tenant_name,
        admin_email,
        status,
        notes
    ) VALUES (
        v_tenant.tenant_id,
        v_tenant.tenant_code,
        v_tenant.tenant_name,
        v_tenant.admin_email,
        'pending',
        'Sistem Hunting: UUID & Cluster Verified'
    );

    RETURN json_build_object('success', true, 'message', 'Permintaan reset telah dikirim ke Owner.');
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."request_password_reset_v2"(text) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

-- ============================================================================
-- Object:        public.resolve_driver_collision
-- Layer:         006 Functions
-- Source:        supabase/schemas/public/functions/resolve_driver_collision.sql
-- Dependencies:  none
-- ============================================================================
CREATE OR REPLACE FUNCTION public.resolve_driver_collision (
  p_driver_id             uuid,
  p_tenant_id             uuid,
  p_action                text,
  p_reason                text,
  p_conflicting_driver_id uuid,
  p_new_phone             text DEFAULT NULL::text
)
  RETURNS json
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
DECLARE
    v_operator_id UUID;
    v_old_phone TEXT;
    v_canonical_new_phone TEXT;
BEGIN
    -- Check tenant access
    IF NOT public.has_tenant_access(p_tenant_id) THEN
        RAISE EXCEPTION 'FORBIDDEN_TENANT_ACCESS: User is not authorized for this tenant';
    END IF;

    v_operator_id := auth.uid();
    IF v_operator_id IS NULL THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Operator ID not found';
    END IF;

    -- Get current phone
    SELECT whatsapp INTO v_old_phone
    FROM public.md_drivers
    WHERE id = p_driver_id AND tenant_id = p_tenant_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'NOT_FOUND: Driver not found in this tenant';
    END IF;

    IF p_action = 'CORRECT_PHONE' THEN
        v_canonical_new_phone := public.normalize_phone(p_new_phone);
        
        -- Check if new phone is also conflicting with ANOTHER active active driver? 
        -- Actually, we'll let the application validation handle pre-flight, but do a quick check here.
        IF v_canonical_new_phone IS NOT NULL AND v_canonical_new_phone <> '' THEN
            IF EXISTS (
                SELECT 1 FROM public.md_drivers 
                WHERE tenant_id = p_tenant_id 
                  AND id <> p_driver_id 
                  AND public.normalize_phone(whatsapp) = v_canonical_new_phone
            ) THEN
                RAISE EXCEPTION 'CONFLICT: The new phone is also used by another driver in this tenant';
            END IF;
        END IF;

        UPDATE public.md_drivers
        SET whatsapp = p_new_phone
        WHERE id = p_driver_id AND tenant_id = p_tenant_id;

    ELSIF p_action = 'DEACTIVATE' THEN
        UPDATE public.md_drivers
        SET is_active = false
        WHERE id = p_driver_id AND tenant_id = p_tenant_id;
    ELSE
        RAISE EXCEPTION 'INVALID_ACTION: Unknown action %', p_action;
    END IF;

    -- Audit Log
    INSERT INTO public.driver_resolution_audit_logs (
        operator_id,
        tenant_id,
        driver_id,
        old_phone,
        new_phone,
        reason,
        action,
        conflicting_driver_id
    ) VALUES (
        v_operator_id,
        p_tenant_id,
        p_driver_id,
        v_old_phone,
        p_new_phone,
        p_reason,
        p_action,
        p_conflicting_driver_id
    );

    RETURN json_build_object('success', true);
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."resolve_driver_collision"(uuid, uuid, text, text, uuid, text) TO "anon", "authenticated", "postgres", "service_role";

REVOKE ALL ON FUNCTION "public"."resolve_driver_collision"(uuid, uuid, text, text, uuid, text) FROM PUBLIC;

-- ============================================================================
-- Object:        public.rpc_guest_get_messages
-- Layer:         006 Functions
-- Source:        supabase/schemas/public/functions/rpc_guest_get_messages.sql
-- Dependencies:  none
-- ============================================================================
CREATE OR REPLACE FUNCTION public.rpc_guest_get_messages (
  p_token uuid
)
  RETURNS SETOF public.chat_messages
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
DECLARE
  v_channel_id UUID;
BEGIN
  SELECT channel_id INTO v_channel_id 
  FROM public.crm_guest_links 
  WHERE token = p_token AND is_active = true;
  IF v_channel_id IS NULL THEN
    RETURN;
  END IF;
  RETURN QUERY 
    SELECT * FROM public.chat_messages 
    WHERE channel_id = v_channel_id 
    ORDER BY created_at ASC;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."rpc_guest_get_messages"(uuid) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

-- ============================================================================
-- Object:        public.rpc_guest_send_message
-- Layer:         006 Functions
-- Source:        supabase/schemas/public/functions/rpc_guest_send_message.sql
-- Dependencies:  none
-- ============================================================================
CREATE OR REPLACE FUNCTION public.rpc_guest_send_message (
  p_token   uuid,
  p_message text
)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
DECLARE
  v_link RECORD;
  v_entity RECORD;
  v_channel_id UUID;
  v_message_id UUID;
BEGIN
  -- Validate Token
  SELECT * INTO v_link FROM public.crm_guest_links 
  WHERE token = p_token AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired chat token';
  END IF;
  -- Get Entity Details
  SELECT * INTO v_entity FROM public.md_entities WHERE id = v_link.entity_id;
  -- Ensure Channel Exists
  IF v_link.channel_id IS NULL THEN
    INSERT INTO public.chat_channels (channel_type, channel_id, title)
    VALUES ('lead', v_entity.id, 'Chat: ' || v_entity.name)
    RETURNING id INTO v_channel_id;
    -- Update the link with the new channel
    UPDATE public.crm_guest_links SET channel_id = v_channel_id WHERE id = v_link.id;
    -- Add the Sales Rep as participant
    IF v_entity.sales_rep_id IS NOT NULL THEN
      INSERT INTO public.chat_participants (channel_id, user_id, role)
      VALUES (v_channel_id, v_entity.sales_rep_id, 'admin');
    END IF;
  ELSE
    v_channel_id := v_link.channel_id;
  END IF;
  -- Insert the Message
  INSERT INTO public.chat_messages (channel_id, message, guest_sender_name)
  VALUES (v_channel_id, p_message, v_entity.name)
  RETURNING id INTO v_message_id;
  RETURN jsonb_build_object('success', true, 'message_id', v_message_id);
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."rpc_guest_send_message"(uuid, text) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

-- ============================================================================
-- Object:        public.search_hs_code
-- Layer:         006 Functions
-- Source:        supabase/schemas/public/functions/search_hs_code.sql
-- Dependencies:  none
-- ============================================================================
CREATE OR REPLACE FUNCTION public.search_hs_code (
  query_text text
)
  RETURNS SETOF public.hs_codes
  LANGUAGE plpgsql
  AS $function$
BEGIN
    RETURN QUERY
    SELECT *
    FROM hs_codes
    WHERE (
        -- If query is numeric, prioritize code match
        (query_text ~ '^[0-9.]+$' AND code ILIKE query_text || '%')
        OR
        -- Otherwise search description
        (NOT (query_text ~ '^[0-9.]+$') AND description ILIKE '%' || query_text || '%')
    )
    -- Only show level 4 by default for search search
    AND level = 4
    ORDER BY 
        CASE 
            WHEN query_text ~ '^[0-9.]+$' THEN code 
            ELSE description 
        END
    LIMIT 20;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."search_hs_code"(text) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

-- ============================================================================
-- Object:        public.set_batch_priority
-- Layer:         006 Functions
-- Source:        supabase/schemas/public/functions/set_batch_priority.sql
-- Dependencies:  none
-- ============================================================================
CREATE OR REPLACE FUNCTION public.set_batch_priority()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $function$
BEGIN
  IF NEW.expiry_date IS NOT NULL THEN
    NEW.expiry_priority := EXTRACT(DOY FROM NEW.expiry_date);
  END IF;
  NEW.received_priority := EXTRACT(EPOCH FROM NEW.received_date);
  RETURN NEW;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."set_batch_priority"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

-- ============================================================================
-- Object:        public.set_invoice_timestamps
-- Layer:         006 Functions
-- Source:        supabase/schemas/public/functions/set_invoice_timestamps.sql
-- Dependencies:  none
-- ============================================================================
CREATE OR REPLACE FUNCTION public.set_invoice_timestamps()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $function$
BEGIN
  IF NEW.status = 'sent' AND OLD.status != 'sent' THEN NEW.sent_at = NOW(); END IF;
  IF NEW.status = 'accepted' AND OLD.status != 'accepted' THEN NEW.customer_accepted_invoice_at = NOW(); END IF;
  IF NEW.status = 'paid' AND OLD.status != 'paid' THEN NEW.paid_at = NOW(); END IF;
  RETURN NEW;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."set_invoice_timestamps"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

-- ============================================================================
-- Object:        public.set_updated_by_and_time
-- Layer:         006 Functions
-- Source:        supabase/schemas/public/functions/set_updated_by_and_time.sql
-- Dependencies:  none
-- ============================================================================
CREATE OR REPLACE FUNCTION public.set_updated_by_and_time()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
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
$function$;

GRANT EXECUTE ON FUNCTION "public"."set_updated_by_and_time"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

-- ============================================================================
-- Object:        public.set_wo_invoiced_at
-- Layer:         006 Functions
-- Source:        supabase/schemas/public/functions/set_wo_invoiced_at.sql
-- Dependencies:  none
-- ============================================================================
CREATE OR REPLACE FUNCTION public.set_wo_invoiced_at()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $function$
BEGIN
  -- When an invoice is created (status != 'cancelled'), set invoiced_at on the WO
  IF NEW.wo_id IS NOT NULL AND NEW.status != 'cancelled' THEN
    UPDATE work_orders
    SET invoiced_at = COALESCE(invoiced_at, NOW())
    WHERE id = NEW.wo_id
      AND invoiced_at IS NULL;
  END IF;
  RETURN NEW;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."set_wo_invoiced_at"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

-- ============================================================================
-- Object:        public.set_wo_invoiced_at_on_status_change
-- Layer:         006 Functions
-- Source:        supabase/schemas/public/functions/set_wo_invoiced_at_on_status_change.sql
-- Dependencies:  none
-- ============================================================================
CREATE OR REPLACE FUNCTION public.set_wo_invoiced_at_on_status_change()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $function$
BEGIN
  -- When invoice status changes to 'sent' or 'accepted', set invoiced_at
  IF OLD.status = 'draft' AND NEW.status IN ('sent', 'accepted') AND NEW.wo_id IS NOT NULL THEN
    UPDATE work_orders
    SET invoiced_at = COALESCE(invoiced_at, NOW())
    WHERE id = NEW.wo_id
      AND invoiced_at IS NULL;
  END IF;
  RETURN NEW;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."set_wo_invoiced_at_on_status_change"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

-- ============================================================================
-- Object:        public.set_wo_ready_billing_at
-- Layer:         006 Functions
-- Source:        supabase/schemas/public/functions/set_wo_ready_billing_at.sql
-- Dependencies:  none
-- ============================================================================
CREATE OR REPLACE FUNCTION public.set_wo_ready_billing_at()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $function$
DECLARE
  v_wo_id UUID;
  v_all_ready BOOLEAN;
BEGIN
  -- Get the work_order_id from wo_item
  SELECT wi.wo_id INTO v_wo_id
  FROM wo_items wi
  WHERE wi.id = NEW.wo_item_id;

  IF v_wo_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Check if ALL job_orders in this WO have is_doc_finished=true AND is_cost_finished=true
  SELECT NOT EXISTS (
    SELECT 1
    FROM wo_items wi
    JOIN job_orders jo ON jo.wo_item_id = wi.id
    WHERE wi.wo_id = v_wo_id
      AND (jo.is_doc_finished = false OR jo.is_cost_finished = false)
  ) INTO v_all_ready;

  -- If all ready and ready_billing_at not yet set, set it now
  IF v_all_ready THEN
    UPDATE work_orders
    SET ready_billing_at = COALESCE(ready_billing_at, NOW())
    WHERE id = v_wo_id
      AND ready_billing_at IS NULL;
  END IF;

  RETURN NEW;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."set_wo_ready_billing_at"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

-- ============================================================================
-- Object:        public.set_wo_sla_timestamps
-- Layer:         006 Functions
-- Source:        supabase/schemas/public/functions/set_wo_sla_timestamps.sql
-- Dependencies:  none
-- ============================================================================
CREATE OR REPLACE FUNCTION public.set_wo_sla_timestamps()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $function$
BEGIN
  -- Only fire when status actually changed
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  -- SLA 1: Draft → Submitted (need_assignment / pending / menunggu_wh_eksekusi)
  IF OLD.status = 'draft' AND NEW.status IN ('need_assignment', 'pending', 'menunggu_wh_eksekusi') THEN
    NEW.submitted_at := COALESCE(NEW.submitted_at, NOW());
  END IF;

  -- SLA 2: Submitted → Assigned
  IF OLD.status IN ('need_assignment', 'pending', 'menunggu_wh_eksekusi', 'handover_pending') 
     AND NEW.status IN ('assigned', 'in_progress') THEN
    NEW.assigned_at := COALESCE(NEW.assigned_at, NOW());
  END IF;

  -- WO completed (auto-completed by trigger 097 when all JOs done)
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    NEW.completed_at := COALESCE(NEW.completed_at, NOW());
  END IF;

  -- WO paid
  IF NEW.status = 'paid' AND OLD.status != 'paid' THEN
    NEW.paid_at := COALESCE(NEW.paid_at, NOW());
  END IF;

  RETURN NEW;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."set_wo_sla_timestamps"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

-- ============================================================================
-- Object:        public.sync_mission_status
-- Layer:         006 Functions
-- Source:        supabase/schemas/public/functions/sync_mission_status.sql
-- Dependencies:  none
-- ============================================================================
CREATE OR REPLACE FUNCTION public.sync_mission_status()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
DECLARE
    v_new_asset_status TEXT;
    v_tenant_id UUID;
BEGIN
    -- Sync status ke WO Item
    UPDATE wo_items SET status = CASE
        WHEN NEW.status IN ('completed', 'verified', 'ready_for_billing', 'awaiting_audit') THEN 'completed'
        WHEN NEW.status IN ('active', 'in_progress', 'arrived', 'accepted') THEN 'in_progress'
        WHEN NEW.status = 'handover_rejected' THEN 'handover_rejected'
        WHEN NEW.status = 'assigned' THEN 'assigned'
        ELSE status
    END WHERE id = NEW.wo_item_id;

    -- Sync ketersediaan armada & driver
    v_new_asset_status := CASE
        WHEN NEW.status IN ('assigned', 'accepted', 'active', 'in_progress', 'arrived') THEN 'on_road'
        WHEN NEW.status IN ('completed', 'cancelled', 'handover_rejected') THEN 'available'
        ELSE NULL
    END;

    IF NEW.driver_response = 'rejected' THEN v_new_asset_status := 'available'; END IF;

    IF v_new_asset_status IS NOT NULL THEN
        IF NEW.fleet_id IS NOT NULL THEN UPDATE md_fleets SET status = v_new_asset_status WHERE id = NEW.fleet_id; END IF;
        IF NEW.driver_id IS NOT NULL THEN UPDATE md_drivers SET status = v_new_asset_status WHERE id = NEW.driver_id; END IF;
    END IF;

    -- LOGIKA POTONG TOKEN (BARU)
    -- Trigger ketika status berubah jadi SELESAI dan belum dipotong tokennya
    IF (NEW.status IN ('completed', 'done', 'PEKERJAAN SELESAI', 'READY_FOR_BILLING', 'VERIFIED')) 
       AND (OLD.status IS NULL OR OLD.status NOT IN ('completed', 'done', 'PEKERJAAN SELESAI', 'READY_FOR_BILLING', 'VERIFIED'))
       AND (NEW.is_monetized = false) THEN
        
        -- Cari tenant_id dari WO induk
        SELECT tenant_id INTO v_tenant_id FROM public.wo_items WHERE id = NEW.wo_item_id;
        
        IF v_tenant_id IS NOT NULL THEN
            -- Potong 1 token dari saldo tenant
            UPDATE public.tenants SET token_balance = token_balance - 1, updated_at = NOW() WHERE id = v_tenant_id;
            -- Tandai sudah terbayar agar tidak double charge
            NEW.is_monetized := true;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."sync_mission_status"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

-- ============================================================================
-- Object:        public.sync_stuck_statuses
-- Layer:         006 Functions
-- Source:        supabase/schemas/public/functions/sync_stuck_statuses.sql
-- Dependencies:  none
-- ============================================================================
CREATE OR REPLACE FUNCTION public.sync_stuck_statuses()
  RETURNS TABLE (
    drivers_reset integer,
    fleets_reset  integer,
    details       json
  )
  LANGUAGE plpgsql
  AS $function$
DECLARE
  v_drivers_reset INT := 0;
  v_fleets_reset INT := 0;
  v_details JSON;
BEGIN
  -- [AI] Reset drivers that are on_duty or on_road but have no active jobs
  WITH stuck_drivers AS (
    SELECT d.id
    FROM md_drivers d
    WHERE d.status IN ('on_duty', 'on_road')
      AND NOT EXISTS (
        SELECT 1 FROM job_orders jo
        WHERE jo.driver_id = d.id
          AND LOWER(jo.status) NOT IN ('selesai', 'completed', 'pekerjaan selesai', 'verified', 'ready_for_billing', 'paid', 'invoiced', 'done', 'cancelled', 'rejected', 'draft', 'pending', 'awaiting_audit')
      )
  )
  UPDATE md_drivers d
  SET 
    status = 'available',
    is_working = false,
    updated_at = NOW()
  FROM stuck_drivers sd
  WHERE d.id = sd.id
    AND d.status != 'unavailable';
  
  GET DIAGNOSTICS v_drivers_reset = ROW_COUNT;

  -- Reset fleets that are on_road but have no active jobs
  WITH stuck_fleets AS (
    SELECT f.id
    FROM md_fleets f
    WHERE f.status = 'on_road'
      AND NOT EXISTS (
        SELECT 1 FROM job_orders jo
        WHERE jo.fleet_id = f.id
          AND LOWER(jo.status) NOT IN ('selesai', 'completed', 'pekerjaan selesai', 'verified', 'ready_for_billing', 'paid', 'invoiced', 'done', 'cancelled', 'rejected', 'draft', 'pending', 'awaiting_audit')
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
$function$;

GRANT EXECUTE ON FUNCTION "public"."sync_stuck_statuses"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

-- ============================================================================
-- Object:        public.sync_user_role
-- Layer:         006 Functions
-- Source:        supabase/schemas/public/functions/sync_user_role.sql
-- Dependencies:  none
-- ============================================================================
CREATE OR REPLACE FUNCTION public.sync_user_role()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
BEGIN
  -- Sinkronisasi Role dari Profiles ke Tenant_Users jika ada
  UPDATE public.tenant_users 
  SET role_code = NEW.role
  WHERE user_id = NEW.id;
  
  RETURN NEW;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."sync_user_role"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

-- ============================================================================
-- Object:        public.sync_warehouse_staff_roles
-- Layer:         006 Functions
-- Source:        supabase/schemas/public/functions/sync_warehouse_staff_roles.sql
-- Dependencies:  none
-- ============================================================================
CREATE OR REPLACE FUNCTION public.sync_warehouse_staff_roles()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $function$
    BEGIN
        IF NEW.roles IS NOT NULL AND ARRAY_LENGTH(NEW.roles, 1) > 0 THEN
            IF NEW.role IS NULL OR NOT (NEW.role = ANY(NEW.roles)) THEN
                NEW.role := NEW.roles[1];
            END IF;
        ELSIF NEW.role IS NOT NULL THEN
            NEW.roles := ARRAY[NEW.role];
        END IF;
        RETURN NEW;
    END;
    $function$;

GRANT EXECUTE ON FUNCTION "public"."sync_warehouse_staff_roles"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

-- ============================================================================
-- Object:        public.traverse_hs_graph
-- Layer:         006 Functions
-- Source:        supabase/schemas/public/functions/traverse_hs_graph.sql
-- Dependencies:  none
-- ============================================================================
CREATE OR REPLACE FUNCTION public.traverse_hs_graph (
  start_node_name text,
  max_depth       integer DEFAULT 3
)
  RETURNS TABLE (
    path             text[],
    target_node_name text,
    target_hs_code   text,
    total_weight     double precision,
    depth            integer
  )
  LANGUAGE plpgsql
  STABLE
  AS $function$
begin
  return query
  with recursive graph_path as (
    -- Anchor: find the starting product node
    select 
      array[n.name] as path,
      n.id as last_node_id,
      n.name as last_node_name,
      null::text as found_hs,
      1.0::float as total_weight,
      0 as depth
    from hs_nodes n
    where n.name ilike '%' || start_node_name || '%'
    
    union all
    
    -- Recursive step: follow edges
    select
      gp.path || n.name,
      n.id,
      n.name,
      case when n.type = 'HS_CODE' then n.name else null::text end,
      gp.total_weight * e.weight,
      gp.depth + 1
    from graph_path gp
    join hs_edges e on gp.last_node_id = e.from_node
    join hs_nodes n on e.to_node = n.id
    where gp.depth < max_depth
  )
  select 
    gp.path,
    gp.last_node_name,
    case when n.type = 'HS_CODE' then n.name else null::text end as target_hs_code,
    gp.total_weight,
    gp.depth
  from graph_path gp
  join hs_nodes n on gp.last_node_id = n.id
  where n.type = 'HS_CODE' or n.type = 'REGULATION'
  order by gp.total_weight desc, gp.depth asc;
end;
$function$;

GRANT EXECUTE ON FUNCTION "public"."traverse_hs_graph"(text, integer) TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

-- ============================================================================
-- Object:        public.trg_auto_create_coa_for_service
-- Layer:         006 Functions
-- Source:        supabase/schemas/public/functions/trg_auto_create_coa_for_service.sql
-- Dependencies:  none
-- ============================================================================
CREATE OR REPLACE FUNCTION public.trg_auto_create_coa_for_service()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $function$
DECLARE
  v_new_coa_id UUID;
  v_account_number TEXT;
  v_retry INT;
BEGIN
  -- If income_account_id is not provided, auto-create one
  IF NEW.income_account_id IS NULL THEN
    
    FOR v_retry IN 1..10 LOOP
      v_account_number := '4-4' || LPAD(floor(random() * 10000)::TEXT, 4, '0');
      
      BEGIN
        INSERT INTO public.finance_coa (account_number, account_name, category)
        VALUES (
          v_account_number,
          'Pendapatan - ' || NEW.service_name,
          'Revenue'
        ) RETURNING id INTO v_new_coa_id;
        
        NEW.income_account_id := v_new_coa_id;
        EXIT; -- Exit loop if successful
      EXCEPTION WHEN unique_violation THEN
        -- Continue loop and try a new random number
      END;
    END LOOP;

  END IF;
  
  RETURN NEW;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."trg_auto_create_coa_for_service"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

-- ============================================================================
-- Object:        public.trg_fn_auto_convert_lead_to_customer
-- Layer:         006 Functions
-- Source:        supabase/schemas/public/functions/trg_fn_auto_convert_lead_to_customer.sql
-- Dependencies:  none
-- ============================================================================
CREATE OR REPLACE FUNCTION public.trg_fn_auto_convert_lead_to_customer()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
DECLARE
  v_lead RECORD;
  v_new_entity_id UUID;
BEGIN
  IF NEW.stage = 'WON' AND OLD.stage != 'WON' THEN
    SELECT * INTO v_lead FROM public.crm_leads WHERE id = NEW.lead_id;
    IF NEW.converted_entity_id IS NULL THEN
      INSERT INTO public.md_entities (
        tenant_id, 
        entity_type, 
        name, 
        phone_number, 
        email, 
        address,
        is_active,
        created_by
      ) VALUES (
        NEW.tenant_id,
        'CUSTOMER',
        v_lead.company_name,
        v_lead.phone_number,
        v_lead.email,
        v_lead.address,
        true,
        COALESCE(auth.uid(), NEW.created_by)
      ) RETURNING id INTO v_new_entity_id;
      NEW.converted_entity_id := v_new_entity_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."trg_fn_auto_convert_lead_to_customer"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

-- ============================================================================
-- Object:        public.trg_fn_before_quotation_items_section
-- Layer:         006 Functions
-- Source:        supabase/schemas/public/functions/trg_fn_before_quotation_items_section.sql
-- Dependencies:  none
-- ============================================================================
CREATE OR REPLACE FUNCTION public.trg_fn_before_quotation_items_section()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $function$
DECLARE
  v_sbu_type VARCHAR(50);
  v_section_id UUID;
BEGIN
  IF NEW.section_id IS NULL THEN
    v_sbu_type := COALESCE(NEW.sbu_cluster, 'GENERAL');
    
    
    SELECT id INTO v_section_id 
    FROM public.crm_quotation_sections 
    WHERE quotation_id = NEW.quotation_id AND sbu_type = v_sbu_type;
    
    IF v_section_id IS NULL THEN
      INSERT INTO public.crm_quotation_sections (tenant_id, quotation_id, sbu_type, section_order)
      VALUES (NEW.tenant_id, NEW.quotation_id, v_sbu_type, 0)
      RETURNING id INTO v_section_id;
    END IF;
    
    NEW.section_id := v_section_id;
  END IF;
  RETURN NEW;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."trg_fn_before_quotation_items_section"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

-- ============================================================================
-- Object:        public.trg_fn_calc_quotation_item_total
-- Layer:         006 Functions
-- Source:        supabase/schemas/public/functions/trg_fn_calc_quotation_item_total.sql
-- Dependencies:  none
-- ============================================================================
CREATE OR REPLACE FUNCTION public.trg_fn_calc_quotation_item_total()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $function$
BEGIN
  -- If nego_price is set, it overrides unit_price for the subtotal calculation
  NEW.subtotal := NEW.qty * COALESCE(NEW.nego_price, NEW.unit_price);
  NEW.tax_amount := (NEW.subtotal * COALESCE(NEW.tax_percent, 0)) / 100;
  NEW.total_price := NEW.subtotal + NEW.tax_amount;
  RETURN NEW;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."trg_fn_calc_quotation_item_total"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

-- ============================================================================
-- Object:        public.trg_fn_check_all_sections_approved
-- Layer:         006 Functions
-- Source:        supabase/schemas/public/functions/trg_fn_check_all_sections_approved.sql
-- Dependencies:  none
-- ============================================================================
CREATE OR REPLACE FUNCTION public.trg_fn_check_all_sections_approved()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $function$
DECLARE
  v_total_sections INT;
  v_approved_sections INT;
  v_quote_status VARCHAR(50);
BEGIN
  
  SELECT COUNT(*), COUNT(*) FILTER (WHERE approval_status = 'APPROVED')
  INTO v_total_sections, v_approved_sections
  FROM public.crm_quotation_sections
  WHERE quotation_id = NEW.quotation_id;

  
  SELECT status INTO v_quote_status FROM public.crm_quotations WHERE id = NEW.quotation_id;

  
  
  IF v_total_sections > 0 AND v_total_sections = v_approved_sections THEN
    IF v_quote_status IN ('DRAFT', 'WAITING_APPROVAL') THEN
      UPDATE public.crm_quotations 
      SET status = 'READY_TO_SEND' 
      WHERE id = NEW.quotation_id;
    END IF;
  ELSIF NEW.approval_status = 'REJECTED' THEN
    UPDATE public.crm_quotations 
    SET status = 'REJECTED' 
    WHERE id = NEW.quotation_id;
  ELSIF v_approved_sections < v_total_sections THEN
    
    IF v_quote_status = 'READY_TO_SEND' THEN
      UPDATE public.crm_quotations 
      SET status = 'WAITING_APPROVAL' 
      WHERE id = NEW.quotation_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."trg_fn_check_all_sections_approved"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

-- ============================================================================
-- Object:        public.trg_fn_rollup_quotation_sections_and_totals
-- Layer:         006 Functions
-- Source:        supabase/schemas/public/functions/trg_fn_rollup_quotation_sections_and_totals.sql
-- Dependencies:  none
-- ============================================================================
CREATE OR REPLACE FUNCTION public.trg_fn_rollup_quotation_sections_and_totals()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $function$
DECLARE
  v_quote_id UUID;
  v_section_id UUID;
  v_sbu_type VARCHAR(50);
  v_tenant_id UUID;
BEGIN
  
  IF TG_OP = 'DELETE' THEN
    v_quote_id := OLD.quotation_id;
    v_section_id := OLD.section_id;
    v_tenant_id := OLD.tenant_id;
  ELSE
    v_quote_id := NEW.quotation_id;
    v_section_id := NEW.section_id;
    v_tenant_id := NEW.tenant_id;
  END IF;

  
  IF v_section_id IS NULL AND NOT (TG_OP = 'DELETE') THEN
    v_sbu_type := COALESCE(NEW.sbu_cluster, 'GENERAL');
    
    
    SELECT id INTO v_section_id 
    FROM public.crm_quotation_sections 
    WHERE quotation_id = v_quote_id AND sbu_type = v_sbu_type;
    
    
    IF v_section_id IS NULL THEN
      INSERT INTO public.crm_quotation_sections (tenant_id, quotation_id, sbu_type, section_order)
      VALUES (v_tenant_id, v_quote_id, v_sbu_type, 0)
      RETURNING id INTO v_section_id;
    END IF;
    
    
    NEW.section_id := v_section_id;
    v_section_id := NEW.section_id;
  END IF;

  
  IF v_section_id IS NOT NULL THEN
    UPDATE public.crm_quotation_sections
    SET subtotal = (
      SELECT COALESCE(SUM(total_price), 0) 
      FROM public.crm_quotation_items 
      WHERE section_id = v_section_id
    )
    WHERE id = v_section_id;
  END IF;

  
  
  UPDATE public.crm_quotations
  SET 
    subtotal_amount = (
      SELECT COALESCE(SUM(subtotal), 0) 
      FROM public.crm_quotation_items 
      WHERE quotation_id = v_quote_id
    ),
    tax_amount = (
      SELECT COALESCE(SUM(tax_amount), 0) 
      FROM public.crm_quotation_items 
      WHERE quotation_id = v_quote_id
    ),
    total_amount = (
      SELECT COALESCE(SUM(total_price), 0) 
      FROM public.crm_quotation_items 
      WHERE quotation_id = v_quote_id
    ),
    onetime_total = (
      SELECT COALESCE(SUM(total_price), 0) 
      FROM public.crm_quotation_items 
      WHERE quotation_id = v_quote_id AND (pricing_type = 'ONE_TIME' OR pricing_type IS NULL)
    ),
    recurring_total = (
      SELECT COALESCE(SUM(total_price), 0) 
      FROM public.crm_quotation_items 
      WHERE quotation_id = v_quote_id AND (pricing_type = 'RECURRING_MONTHLY')
    )
  WHERE id = v_quote_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."trg_fn_rollup_quotation_sections_and_totals"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

-- ============================================================================
-- Object:        public.trg_fn_rollup_quotation_totals
-- Layer:         006 Functions
-- Source:        supabase/schemas/public/functions/trg_fn_rollup_quotation_totals.sql
-- Dependencies:  none
-- ============================================================================
CREATE OR REPLACE FUNCTION public.trg_fn_rollup_quotation_totals()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $function$
DECLARE
  v_quote_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_quote_id := OLD.quotation_id;
  ELSE
    v_quote_id := NEW.quotation_id;
  END IF;
  UPDATE public.crm_quotations
  SET 
    subtotal_amount = (SELECT COALESCE(SUM(subtotal), 0) FROM public.crm_quotation_items WHERE quotation_id = v_quote_id),
    tax_amount = (SELECT COALESCE(SUM(tax_amount), 0) FROM public.crm_quotation_items WHERE quotation_id = v_quote_id),
    total_amount = (SELECT COALESCE(SUM(total_price), 0) FROM public.crm_quotation_items WHERE quotation_id = v_quote_id)
  WHERE id = v_quote_id;
  RETURN NULL;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."trg_fn_rollup_quotation_totals"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

-- ============================================================================
-- Object:        public.trg_fn_update_entity_on_deal_won
-- Layer:         006 Functions
-- Source:        supabase/schemas/public/functions/trg_fn_update_entity_on_deal_won.sql
-- Dependencies:  none
-- ============================================================================
CREATE OR REPLACE FUNCTION public.trg_fn_update_entity_on_deal_won()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
BEGIN
  IF NEW.stage = 'WON' AND OLD.stage != 'WON' THEN
    UPDATE public.md_entities 
    SET 
      is_customer = true,
      is_active = true
    WHERE id = NEW.entity_id;
  END IF;
  RETURN NEW;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."trg_fn_update_entity_on_deal_won"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

-- ============================================================================
-- Object:        public.update_agent_weights
-- Layer:         006 Functions
-- Source:        supabase/schemas/public/functions/update_agent_weights.sql
-- Dependencies:  none
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_agent_weights (
  p_ai     double precision,
  p_vector double precision,
  p_btki   double precision,
  p_graph  double precision
)
  RETURNS void
  LANGUAGE plpgsql
  AS $function$
begin
  update hs_agent_config
  set ai_weight = p_ai,
      vector_weight = p_vector,
      btki_weight = p_btki,
      graph_weight = p_graph,
      last_optimized = now()
  where id = 'default_agent';
end;
$function$;

GRANT EXECUTE
  ON FUNCTION "public"."update_agent_weights"(double precision, double precision, double precision, double precision)
  TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

-- ============================================================================
-- Object:        public.update_driver
-- Layer:         006 Functions
-- Source:        supabase/schemas/public/functions/update_driver.sql
-- Dependencies:  none
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_driver (
  p_driver_id  uuid,
  p_tenant_id  uuid,
  p_name       text,
  p_whatsapp   text,
  p_is_active  boolean,
  p_address    text,
  p_sim_number text,
  p_sim_class  text,
  p_sim_expiry text,
  p_status     text,
  p_entity_id  uuid
)
  RETURNS json
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
DECLARE
  v_normalized_phone TEXT;
  v_profile_id UUID;
  v_old_whatsapp TEXT;
  v_conflicting_profile_id UUID;
BEGIN
  -- Strict Internal Authorization
  IF NOT public.has_tenant_access(p_tenant_id) THEN
    RAISE EXCEPTION 'FORBIDDEN_TENANT_ACCESS: User is not authorized for this tenant';
  END IF;

  -- Verify driver belongs to tenant
  SELECT whatsapp INTO v_old_whatsapp
  FROM public.md_drivers
  WHERE id = p_driver_id AND tenant_id = p_tenant_id;

  IF v_old_whatsapp IS NULL THEN
    RAISE EXCEPTION 'Driver not found in tenant';
  END IF;

  -- Get associated profile
  SELECT profile_id INTO v_profile_id
  FROM public.driver_tenant_links
  WHERE driver_id = p_driver_id AND tenant_id = p_tenant_id;

  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'Orphan driver: No profile linked';
  END IF;

  v_normalized_phone := public.normalize_phone(p_whatsapp);

  -- Check if phone changed
  IF v_normalized_phone != public.normalize_phone(v_old_whatsapp) THEN
    -- Make sure new phone is not already taken by ANOTHER profile
    SELECT id INTO v_conflicting_profile_id
    FROM public.driver_profiles
    WHERE public.normalize_phone(phone) = v_normalized_phone AND id != v_profile_id
    LIMIT 1;

    IF v_conflicting_profile_id IS NOT NULL THEN
      RAISE EXCEPTION 'PROFILE_CONFLICT: Phone number already used by another profile';
    END IF;

    -- Update profile phone
    UPDATE public.driver_profiles
    SET phone = v_normalized_phone, full_name = p_name
    WHERE id = v_profile_id;
  END IF;

  -- Update md_drivers
  UPDATE public.md_drivers
  SET
    name = p_name,
    whatsapp = p_whatsapp,
    is_active = p_is_active,
    address = p_address,
    sim_number = p_sim_number,
    sim_class = p_sim_class,
    sim_expiry = p_sim_expiry,
    status = p_status,
    entity_id = p_entity_id,
    updated_at = NOW()
  WHERE id = p_driver_id AND tenant_id = p_tenant_id;

  RETURN json_build_object('success', true);
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."update_driver"(uuid, uuid, text, text, boolean, text, text, text, text, text, uuid) TO "authenticated", "postgres", "service_role";

REVOKE ALL ON FUNCTION "public"."update_driver"(uuid, uuid, text, text, boolean, text, text, text, text, text, uuid) FROM PUBLIC;

-- ============================================================================
-- Object:        public.update_fw_tables_updated_at
-- Layer:         006 Functions
-- Source:        supabase/schemas/public/functions/update_fw_tables_updated_at.sql
-- Dependencies:  none
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_fw_tables_updated_at()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $function$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $function$;

GRANT EXECUTE ON FUNCTION "public"."update_fw_tables_updated_at"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

-- ============================================================================
-- Object:        public.update_jo_payments_updated_at
-- Layer:         006 Functions
-- Source:        supabase/schemas/public/functions/update_jo_payments_updated_at.sql
-- Dependencies:  none
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_jo_payments_updated_at()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."update_jo_payments_updated_at"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

-- ============================================================================
-- Object:        public.update_md_product_categories_modtime
-- Layer:         006 Functions
-- Source:        supabase/schemas/public/functions/update_md_product_categories_modtime.sql
-- Dependencies:  none
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_md_product_categories_modtime()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."update_md_product_categories_modtime"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

-- ============================================================================
-- Object:        public.update_party_tables_updated_at
-- Layer:         006 Functions
-- Source:        supabase/schemas/public/functions/update_party_tables_updated_at.sql
-- Dependencies:  none
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_party_tables_updated_at()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."update_party_tables_updated_at"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

-- ============================================================================
-- Object:        public.update_product_cbm
-- Layer:         006 Functions
-- Source:        supabase/schemas/public/functions/update_product_cbm.sql
-- Dependencies:  none
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_product_cbm()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $function$
BEGIN
  IF NEW.length_cm IS NOT NULL AND NEW.width_cm IS NOT NULL AND NEW.height_cm IS NOT NULL THEN
    NEW.cbm := (NEW.length_cm * NEW.width_cm * NEW.height_cm) / 1000000;
  END IF;
  RETURN NEW;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."update_product_cbm"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

-- ============================================================================
-- Object:        public.update_updated_at_column
-- Layer:         006 Functions
-- Source:        supabase/schemas/public/functions/update_updated_at_column.sql
-- Dependencies:  none
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."update_updated_at_column"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

-- ============================================================================
-- Object:        public.update_wo_status_on_handover
-- Layer:         006 Functions
-- Source:        supabase/schemas/public/functions/update_wo_status_on_handover.sql
-- Dependencies:  none
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_wo_status_on_handover()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $function$
DECLARE
    v_wo_id UUID;
    v_all_handover_pending BOOLEAN;
BEGIN
    -- Dapatkan WO ID
    SELECT wi.wo_id INTO v_wo_id
    FROM wo_items wi
    WHERE wi.id = NEW.id;
    
    -- Cek apakah semua wo_items dalam WO sudah di-handover
    SELECT COUNT(*) = COUNT(CASE WHEN handover_status = 'pending' THEN 1 END)
    INTO v_all_handover_pending
    FROM wo_items
    WHERE wo_id = v_wo_id;
    
    -- Update WO status
    IF NEW.handover_status = 'pending' THEN
        UPDATE work_orders 
        SET status = 'need_approval_handover', handover_status = 'pending', updated_at = NOW()
        WHERE id = v_wo_id;
    ELSIF NEW.handover_status = 'approved' THEN
        UPDATE work_orders 
        SET status = 'in_progress', handover_status = 'approved', updated_at = NOW()
        WHERE id = v_wo_id;
    ELSIF NEW.handover_status = 'rejected' THEN
        UPDATE work_orders 
        SET status = 'need_assignment', handover_status = NULL, updated_at = NOW()
        WHERE id = v_wo_id;
    END IF;
    
    RETURN NEW;
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."update_wo_status_on_handover"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

-- ============================================================================
-- Object:        public.update_wo_status_on_job_complete
-- Layer:         006 Functions
-- Source:        supabase/schemas/public/functions/update_wo_status_on_job_complete.sql
-- Dependencies:  none
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_wo_status_on_job_complete()
  RETURNS TRIGGER
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

GRANT EXECUTE ON FUNCTION "public"."update_wo_status_on_job_complete"() TO PUBLIC, "anon", "authenticated", "postgres", "service_role";

-- ============================================================================
-- Object:        public.vendor_job_confirmation
-- Layer:         006 Functions
-- Source:        supabase/schemas/public/functions/vendor_job_confirmation.sql
-- Dependencies:  none
-- ============================================================================
CREATE OR REPLACE FUNCTION public.vendor_job_confirmation (
  p_jo_id            uuid,
  p_is_accepted      boolean,
  p_is_timeout       boolean,
  p_rejection_reason text    DEFAULT NULL::text,
  p_lat              numeric DEFAULT NULL::numeric,
  p_lng              numeric DEFAULT NULL::numeric
)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $function$
DECLARE
    v_jo record;
    v_new_status VARCHAR;
    v_method VARCHAR;
    v_now TIMESTAMPTZ := now();
BEGIN
    SELECT * INTO v_jo FROM public.job_orders WHERE id = p_jo_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Job Order tidak ditemukan');
    END IF;
    IF v_jo.status IN (
        'accepted', 'in_progress', 'completed', 'rejected', 'cancelled',
        'PEKERJAAN SELESAI', 'SELESAI', 'COMPLETED', 'DONE', 'IN_PROGRESS',
        'DALAM PERJALANAN', 'REJECTED', 'CANCELLED', 'MENUNGGU SELESAI'
    ) OR v_jo.status ILIKE 'MENUJU %' OR v_jo.status ILIKE 'TIBA DI %' THEN
        RETURN jsonb_build_object('success', false, 'error',
            'Job Order sudah diproses sebelumnya (' || COALESCE(v_jo.status, '') || ')');
    END IF;
    IF p_is_timeout THEN
        v_new_status := 'accepted'; v_method := 'AUTO_TIMEOUT';
    ELSIF p_is_accepted THEN
        v_new_status := 'accepted'; v_method := 'DRIVER_CONFIRMATION';
    ELSE
        v_new_status := 'rejected'; v_method := 'DRIVER_REJECTION';
    END IF;
    UPDATE public.job_orders
    SET status = v_new_status,
        driver_response = CASE WHEN p_is_accepted THEN 'accepted' ELSE 'rejected' END,
        accepted_at = CASE WHEN p_is_accepted THEN v_now ELSE accepted_at END,
        rejection_note = p_rejection_reason,
        updated_at = v_now
    WHERE id = p_jo_id;
    INSERT INTO public.job_tracking (job_order_id, status_update, notes, latitude, longitude, source)
    VALUES (p_jo_id,
        CASE WHEN p_is_accepted THEN 'Konfirmasi Tugas' ELSE 'Driver Menolak' END,
        CASE WHEN p_is_timeout THEN 'Auto Confirmed by System Timeout'
             WHEN p_is_accepted THEN 'Tugas diterima oleh driver'
             ELSE COALESCE(p_rejection_reason, 'Tugas ditolak oleh driver') END,
        p_lat, p_lng,
        CASE WHEN p_is_timeout THEN 'auto' ELSE 'pwa' END);
    RETURN jsonb_build_object('success', true, 'new_status', v_new_status, 'method', v_method);
END;
$function$;

GRANT EXECUTE ON FUNCTION "public"."vendor_job_confirmation"(uuid, boolean, boolean, text, numeric, numeric) TO "anon", "authenticated", "postgres", "service_role";

REVOKE ALL ON FUNCTION "public"."vendor_job_confirmation"(uuid, boolean, boolean, text, numeric, numeric) FROM PUBLIC;
