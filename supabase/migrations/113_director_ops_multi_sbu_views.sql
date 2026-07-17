-- Migration 113: Director Operations Multi-SBU Exception Views Expansion
-- Expands vw_director_exceptions to detect cross-SBU anomalies across all 4 Strategic Pillars:
-- 1. Trucking (SLA_DEADLOCK, VENDOR_ANOMALY)
-- 2. Warehouse (WAREHOUSE_STAGNATION, INVENTORY_DISCREPANCY)
-- 3. Customs Clearance (CLEARANCE_DEMURRAGE_RISK)
-- 4. Finance, Commercial, HRD (Maintained from Migration 112)

CREATE OR REPLACE VIEW public.vw_director_exceptions AS

-- ==========================================
-- 1. OPERASIONAL (OPS) CLUSTER - MULTI-SBU
-- ==========================================

-- 1A. Trucking SLA Deadlock (JO Stuck in in_progress > 24 hours)
SELECT 
    gen_random_uuid() as id,
    jo.tenant_id,
    'OPS' as cluster,
    'SLA_DEADLOCK' as anomaly_type,
    'CRITICAL' as severity,
    jo.id as reference_id,
    jo.jo_number as reference_number,
    'Job Order stuck in progress for over 24 hours without milestone update. Last active: ' || jo.updated_at as description,
    NOW() as detected_at
FROM public.job_orders jo
WHERE jo.status = 'in_progress' 
  AND EXTRACT(EPOCH FROM (NOW() - jo.updated_at))/3600 > 24

UNION ALL

-- 1B. Trucking Vendor Anomaly (JO given to vendor while internal fleet is available today)
SELECT 
    gen_random_uuid() as id,
    jo.tenant_id,
    'OPS' as cluster,
    'VENDOR_ANOMALY' as anomaly_type,
    'HIGH' as severity,
    jo.id as reference_id,
    jo.jo_number as reference_number,
    'Job Order allocated to Vendor (' || v.name || ') while internal fleets are sitting idle/available in garage.' as description,
    NOW() as detected_at
FROM public.job_orders jo
JOIN public.md_entities v ON jo.vendor_id = v.id
WHERE jo.status IN ('assigned', 'in_progress')
  AND jo.vendor_id IS NOT NULL
  AND EXISTS (
      SELECT 1 FROM public.md_fleets f 
      WHERE f.tenant_id = jo.tenant_id 
        AND f.status = 'available' 
        AND f.is_active = true
  )

UNION ALL

-- 1C. Warehouse Stagnation (WMS Tasks / Tally / Putaway pending/in_progress > 48 hours)
SELECT 
    gen_random_uuid() as id,
    t.tenant_id,
    'OPS' as cluster,
    'WAREHOUSE_STAGNATION' as anomaly_type,
    'HIGH' as severity,
    t.id as reference_id,
    t.task_number as reference_number,
    'Warehouse ' || t.task_type || ' task (' || t.task_number || ') stagnant in status ' || t.status || ' for over 48 hours without putaway/dispatch at ' || COALESCE(w.name, 'Gudang Utama') as description,
    t.created_at as detected_at
FROM public.wh_tasks t
LEFT JOIN public.md_warehouses w ON t.warehouse_id = w.id
WHERE t.status IN ('PENDING', 'ASSIGNED', 'IN_PROGRESS')
  AND EXTRACT(EPOCH FROM (NOW() - t.created_at))/3600 > 48

UNION ALL

-- 1D. Warehouse Inventory Discrepancy & Quarantine Alert (Damaged / Quarantine / Expired SKUs holding space)
SELECT 
    gen_random_uuid() as id,
    inv.tenant_id,
    'OPS' as cluster,
    'INVENTORY_DISCREPANCY' as anomaly_type,
    'HIGH' as severity,
    inv.id as reference_id,
    sku.sku_code || ' (' || sku.sku_name || ')' as reference_number,
    'Inventory anomaly at ' || COALESCE(w.name, 'Warehouse') || ': Status is ' || inv.status || ' with quantity ' || inv.quantity || ' (Stock Opname adjustment required)' as description,
    inv.updated_at as detected_at
FROM public.wh_inventory inv
JOIN public.md_product_skus sku ON inv.product_sku_id = sku.id
LEFT JOIN public.md_warehouses w ON inv.warehouse_id = w.id
WHERE inv.status IN ('QUARANTINE', 'DAMAGED', 'EXPIRED')
  AND inv.quantity > 0

UNION ALL

-- 1E. Customs Clearance Port Dwell Time & Demurrage Risk (Clearance orders active > 72h / 3 days at port)
SELECT 
    gen_random_uuid() as id,
    jo.tenant_id,
    'OPS' as cluster,
    'CLEARANCE_DEMURRAGE_RISK' as anomaly_type,
    'CRITICAL' as severity,
    jo.id as reference_id,
    jo.jo_number as reference_number,
    'Customs Clearance JO (' || jo.jo_number || ') active > 72 hours (Port Dwell Time Alarm). High risk of Demurrage & Detention penalties!' as description,
    jo.created_at as detected_at
FROM public.job_orders jo
JOIN public.wo_items wi ON jo.wo_item_id = wi.id
WHERE UPPER(wi.sbu_type) = 'CLEARANCE'
  AND jo.status NOT IN ('completed', 'completed_documents', 'cancelled')
  AND EXTRACT(EPOCH FROM (NOW() - jo.created_at))/3600 > 72

UNION ALL

-- ==========================================
-- 2. FINANCE (FIN) CLUSTER
-- ==========================================

-- 2A. Negative Margin (JO completed, base_price < purchase_price + driver_payment_amount)
SELECT 
    gen_random_uuid() as id,
    jo.tenant_id,
    'FIN' as cluster,
    'NEGATIVE_MARGIN' as anomaly_type,
    'CRITICAL' as severity,
    jo.id as reference_id,
    jo.jo_number as reference_number,
    'Negative or low margin detected. Revenue: ' || COALESCE(jo.base_price, 0) || ', Costs: ' || (COALESCE(jo.purchase_price, 0) + COALESCE(jo.driver_payment_amount, 0)) as description,
    jo.completed_at as detected_at
FROM public.job_orders jo
WHERE jo.status IN ('completed', 'completed_documents')
  AND COALESCE(jo.base_price, 0) < (COALESCE(jo.purchase_price, 0) + COALESCE(jo.driver_payment_amount, 0))

UNION ALL

-- 2B. Unbilled Revenue (JO completed > 7 days, no invoice)
SELECT 
    gen_random_uuid() as id,
    jo.tenant_id,
    'FIN' as cluster,
    'UNBILLED_REVENUE' as anomaly_type,
    'HIGH' as severity,
    jo.id as reference_id,
    jo.jo_number as reference_number,
    'Job Order completed > 7 days ago but not yet invoiced. Potential revenue leak.' as description,
    NOW() as detected_at
FROM public.job_orders jo
LEFT JOIN public.invoice_lines il ON jo.id = il.job_order_id
WHERE jo.status IN ('completed', 'completed_documents')
  AND jo.completed_at < NOW() - INTERVAL '7 days'
  AND il.id IS NULL

UNION ALL

-- 2C. AR Overdue (Invoices past due date > 14 days)
SELECT 
    gen_random_uuid() as id,
    wo.tenant_id,
    'FIN' as cluster,
    'AR_OVERDUE' as anomaly_type,
    'CRITICAL' as severity,
    i.id as reference_id,
    i.invoice_number as reference_number,
    'Invoice overdue by ' || DATE_PART('day', NOW() - i.due_date) || ' days. Amount: ' || i.total_billing as description,
    NOW() as detected_at
FROM public.invoices i
JOIN public.work_orders wo ON i.wo_id = wo.id
WHERE i.status = 'sent'
  AND i.due_date < NOW() - INTERVAL '14 days'

UNION ALL

-- ==========================================
-- 3. COMMERCIAL (COMM) CLUSTER
-- ==========================================

-- 3A. Churn Risk (Customers with JOs in past 90 days, but 0 in past 30 days)
SELECT 
    gen_random_uuid() as id,
    wo.tenant_id,
    'COMM' as cluster,
    'CHURN_RISK' as anomaly_type,
    'HIGH' as severity,
    c.id as reference_id,
    c.name as reference_number,
    'Customer ' || c.name || ' has not placed any orders in the last 30 days, but was active previously.' as description,
    NOW() as detected_at
FROM public.work_orders wo
JOIN public.md_entities c ON wo.customer_id = c.id
GROUP BY wo.tenant_id, c.id, c.name
HAVING MAX(wo.created_at) < NOW() - INTERVAL '30 days'
   AND MAX(wo.created_at) > NOW() - INTERVAL '90 days'

UNION ALL

-- ==========================================
-- 4. HRD / COMPLIANCE CLUSTER
-- ==========================================

-- 4A. SIM Expiry Compliance
SELECT 
    gen_random_uuid() as id,
    d.tenant_id,
    'HRD' as cluster,
    'SIM_EXPIRING' as anomaly_type,
    CASE WHEN d.sim_expiry < CURRENT_DATE THEN 'CRITICAL' ELSE 'HIGH' END as severity,
    d.id as reference_id,
    d.name as reference_number,
    'Driver SIM is expiring or expired. Expiry Date: ' || d.sim_expiry as description,
    NOW() as detected_at
FROM public.md_drivers d
WHERE d.is_active = true
  AND d.sim_expiry IS NOT NULL 
  AND d.sim_expiry <= CURRENT_DATE + INTERVAL '30 days'

UNION ALL

-- 4B. Fleet STNK Expiry Compliance
SELECT 
    gen_random_uuid() as id,
    f.tenant_id,
    'HRD' as cluster,
    'STNK_EXPIRING' as anomaly_type,
    CASE WHEN f.stnk_expiry < CURRENT_DATE THEN 'CRITICAL' ELSE 'HIGH' END as severity,
    f.id as reference_id,
    f.plate_number as reference_number,
    'Fleet STNK is expiring or expired. Expiry Date: ' || f.stnk_expiry as description,
    NOW() as detected_at
FROM public.md_fleets f
WHERE f.is_active = true
  AND f.stnk_expiry IS NOT NULL 
  AND f.stnk_expiry <= CURRENT_DATE + INTERVAL '30 days'

UNION ALL

-- 4C. Fleet KIR Expiry Compliance
SELECT 
    gen_random_uuid() as id,
    f.tenant_id,
    'HRD' as cluster,
    'KIR_EXPIRING' as anomaly_type,
    CASE WHEN f.kir_expiry < CURRENT_DATE THEN 'CRITICAL' ELSE 'HIGH' END as severity,
    f.id as reference_id,
    f.plate_number as reference_number,
    'Fleet KIR is expiring or expired. Expiry Date: ' || f.kir_expiry as description,
    NOW() as detected_at
FROM public.md_fleets f
WHERE f.is_active = true
  AND f.kir_expiry IS NOT NULL 
  AND f.kir_expiry <= CURRENT_DATE + INTERVAL '30 days';
