-- Seed Data WMS untuk Tenant HALU
-- tenant_id: 78846049-fb63-45a9-93da-3af3fea5b587
-- user_id:   191edf81-400c-4551-8c19-2bcb8a511835

-- ============================================
-- 1. WAREHOUSE
-- ============================================
INSERT INTO md_warehouses (id, tenant_id, code, name, address, city, province,
  warehouse_type, ownership, status, total_capacity_sqm, total_capacity_cbm,
  is_active, created_by)
SELECT '9f82b2f9-d6ea-4eac-91d0-332b0fd07559', '78846049-fb63-45a9-93da-3af3fea5b587',
  'WH-HALU-01', 'Gudang Utama HALU', 'Jl. Logistik Raya No. 99', 'Jakarta', 'DKI Jakarta',
  'DC', 'OWN', 'ACTIVE', 5000, 15000,
  true, '191edf81-400c-4551-8c19-2bcb8a511835'
WHERE NOT EXISTS (SELECT 1 FROM md_warehouses WHERE id = '9f82b2f9-d6ea-4eac-91d0-332b0fd07559');

-- ============================================
-- 2. AREAS
-- ============================================
INSERT INTO md_warehouse_areas (id, warehouse_id, tenant_id, area_code, area_name, area_type,
  area_category, storage_type, total_capacity, uom_capacity,
  temperature_min, temperature_max, humidity_max, is_active, created_by)
VALUES
  (gen_random_uuid(), '9f82b2f9-d6ea-4eac-91d0-332b0fd07559', '78846049-fb63-45a9-93da-3af3fea5b587',
   'AREA-YARD', 'Lapangan Penyimpanan', 'YARD', 'GENERAL', 'BULK_FLOOR',
   500, 'SQM', NULL, NULL, NULL, true, '191edf81-400c-4551-8c19-2bcb8a511835'),
  (gen_random_uuid(), '9f82b2f9-d6ea-4eac-91d0-332b0fd07559', '78846049-fb63-45a9-93da-3af3fea5b587',
   'AREA-FLOOR', 'Lantai Indoor A', 'INDOOR_FLOOR', 'FOOD_GRADE', 'PALLET_STACK',
   2000, 'PALLET', NULL, NULL, NULL, true, '191edf81-400c-4551-8c19-2bcb8a511835'),
  (gen_random_uuid(), '9f82b2f9-d6ea-4eac-91d0-332b0fd07559', '78846049-fb63-45a9-93da-3af3fea5b587',
   'AREA-RACK-A', 'Racking A — Dry Storage', 'RACKING', 'FOOD_GRADE', 'RACK_SELECTIVE',
   1500, 'PALLET', NULL, NULL, NULL, true, '191edf81-400c-4551-8c19-2bcb8a511835'),
  (gen_random_uuid(), '9f82b2f9-d6ea-4eac-91d0-332b0fd07559', '78846049-fb63-45a9-93da-3af3fea5b587',
   'AREA-COLD-A', 'Cold Storage — Frozen', 'COLD_FREEZER', 'FOOD_GRADE', 'RACK_SELECTIVE',
   300, 'PALLET', -25, -18, 85, true, '191edf81-400c-4551-8c19-2bcb8a511835'),
  (gen_random_uuid(), '9f82b2f9-d6ea-4eac-91d0-332b0fd07559', '78846049-fb63-45a9-93da-3af3fea5b587',
   'AREA-COLD-B', 'Cold Storage — Chiller', 'COLD_CHILLER', 'FOOD_GRADE', 'RACK_SELECTIVE',
   200, 'PALLET', 0, 5, 90, true, '191edf81-400c-4551-8c19-2bcb8a511835');

-- ============================================
-- 3. ZONES
-- ============================================
DO $$
DECLARE
  v_warehouse_id UUID := '9f82b2f9-d6ea-4eac-91d0-332b0fd07559';
  v_tenant_id    UUID := '78846049-fb63-45a9-93da-3af3fea5b587';
  v_user_id      UUID := '191edf81-400c-4551-8c19-2bcb8a511835';
  v_yard_id      UUID; v_floor_id UUID; v_rack_id UUID;
  v_cold_f_id    UUID; v_cold_c_id UUID;
BEGIN
  SELECT id INTO v_yard_id   FROM md_warehouse_areas WHERE area_code = 'AREA-YARD';
  SELECT id INTO v_floor_id  FROM md_warehouse_areas WHERE area_code = 'AREA-FLOOR';
  SELECT id INTO v_rack_id   FROM md_warehouse_areas WHERE area_code = 'AREA-RACK-A';
  SELECT id INTO v_cold_f_id FROM md_warehouse_areas WHERE area_code = 'AREA-COLD-A';
  SELECT id INTO v_cold_c_id FROM md_warehouse_areas WHERE area_code = 'AREA-COLD-B';

  INSERT INTO md_warehouse_zones (id, area_id, tenant_id, zone_code, zone_name, zone_status, created_by) VALUES
    (gen_random_uuid(), v_yard_id,   v_tenant_id, 'YARD-A',  'Yard Sisi A',  'ACTIVE', v_user_id),
    (gen_random_uuid(), v_yard_id,   v_tenant_id, 'YARD-B',  'Yard Sisi B',  'ACTIVE', v_user_id),
    (gen_random_uuid(), v_floor_id,  v_tenant_id, 'FLR-A',   'Lantai A Blok 1-10',  'ACTIVE', v_user_id),
    (gen_random_uuid(), v_floor_id,  v_tenant_id, 'FLR-B',   'Lantai A Blok 11-20', 'ACTIVE', v_user_id),
    (gen_random_uuid(), v_rack_id,   v_tenant_id, 'RACK-A1', 'Rack A — Gang 1',  'ACTIVE', v_user_id),
    (gen_random_uuid(), v_rack_id,   v_tenant_id, 'RACK-A2', 'Rack A — Gang 2',  'ACTIVE', v_user_id),
    (gen_random_uuid(), v_rack_id,   v_tenant_id, 'RACK-A3', 'Rack A — Gang 3',  'ACTIVE', v_user_id),
    (gen_random_uuid(), v_cold_f_id, v_tenant_id, 'CFZ-A',   'Cold Freezer A',   'ACTIVE', v_user_id),
    (gen_random_uuid(), v_cold_f_id, v_tenant_id, 'CFZ-B',   'Cold Freezer B',   'ACTIVE', v_user_id),
    (gen_random_uuid(), v_cold_c_id, v_tenant_id, 'CHL-A',   'Cold Chiller A',   'ACTIVE', v_user_id);
END $$;

-- ============================================
-- 4. BINS (sample bins per zone)
-- ============================================
DO $$
DECLARE
  v_wh_id UUID := '9f82b2f9-d6ea-4eac-91d0-332b0fd07559';
  v_ten_id UUID := '78846049-fb63-45a9-93da-3af3fea5b587';
  v_rec RECORD;
  v_aisle TEXT; v_bay TEXT; v_level TEXT; v_pos TEXT;
BEGIN
  FOR v_rec IN SELECT z.id, z.zone_code FROM md_warehouse_zones z WHERE area_id IN (
    SELECT id FROM md_warehouse_areas WHERE warehouse_id = v_wh_id
  ) LOOP
    IF v_rec.zone_code LIKE 'RACK%' THEN
      FOR i IN 1..4 LOOP
        v_aisle := 'A'; v_bay := LPAD(i::TEXT, 2, '0');
        FOR j IN 1..3 LOOP
          v_level := j::TEXT; v_pos := 'A';
          INSERT INTO md_warehouse_locations (id, warehouse_id, tenant_id, code, zone_id,
            bin_type, aisle, bay, level, position, location_type,
            max_weight_kg, max_volume_m3, bin_status, is_active)
          VALUES (gen_random_uuid(), v_wh_id, v_ten_id,
            v_rec.zone_code || '-' || v_aisle || '-' || v_bay || '-' || v_level || '-' || v_pos,
            v_rec.id, 'RACK', v_aisle, v_bay, v_level, v_pos,
            'STORAGE', 1000, 2.0, 'EMPTY', true);
        END LOOP;
      END LOOP;
    ELSIF v_rec.zone_code LIKE 'FLR%' THEN
      FOR i IN 1..6 LOOP
        INSERT INTO md_warehouse_locations (id, warehouse_id, tenant_id, code, zone_id,
          bin_type, aisle, bay, level, position, location_type,
          max_weight_kg, max_volume_m3, bin_status, is_active)
        VALUES (gen_random_uuid(), v_wh_id, v_ten_id,
          v_rec.zone_code || '-FLOOR-' || LPAD(i::TEXT, 2, '0'),
          v_rec.id, 'FLOOR', NULL, LPAD(i::TEXT, 2, '0'), '0', 'A',
          'STORAGE', 5000, 10.0, 'EMPTY', true);
      END LOOP;
    ELSIF v_rec.zone_code LIKE 'YARD%' THEN
      FOR i IN 1..4 LOOP
        INSERT INTO md_warehouse_locations (id, warehouse_id, tenant_id, code, zone_id,
          bin_type, aisle, bay, level, position, location_type,
          max_weight_kg, max_volume_m3, bin_status, is_active)
        VALUES (gen_random_uuid(), v_wh_id, v_ten_id,
          v_rec.zone_code || '-GRID-' || LPAD(i::TEXT, 2, '0'),
          v_rec.id, 'YARD_GRID', NULL, LPAD(i::TEXT, 2, '0'), '0', 'A',
          'STORAGE', 20000, 50.0, 'EMPTY', true);
      END LOOP;
    ELSIF v_rec.zone_code LIKE 'CFZ%' OR v_rec.zone_code LIKE 'CHL%' THEN
      FOR i IN 1..3 LOOP
        INSERT INTO md_warehouse_locations (id, warehouse_id, tenant_id, code, zone_id,
          bin_type, aisle, bay, level, position, location_type,
          max_weight_kg, max_volume_m3, bin_status, is_active)
        VALUES (gen_random_uuid(), v_wh_id, v_ten_id,
          v_rec.zone_code || '-RACK-' || LPAD(i::TEXT, 2, '0'),
          v_rec.id, 'RACK', 'A', LPAD(i::TEXT, 2, '0'), '1', 'A',
          'STORAGE', 500, 1.0, 'EMPTY', true);
      END LOOP;
    END IF;
  END LOOP;
END $$;

-- ============================================
-- 5. PRODUCT SKUs
-- ============================================
DO $$
DECLARE
  v_ten_id UUID := '78846049-fb63-45a9-93da-3af3fea5b587';
  v_user   UUID := '191edf81-400c-4551-8c19-2bcb8a511835';
  v_master UUID; v_inner UUID;
BEGIN
  -- DRY category — Minyak Goreng
  INSERT INTO md_product_skus (id, tenant_id, sku_code, name, category, unit,
    commodity_type, sku_level, storage_rule, conversion_to_base,
    weight_kg, volume_m3, is_hazardous, requires_cold_storage,
    is_sellable, is_stockable, stack_limit, min_stock_level, max_stock_level,
    is_active, created_by)
  VALUES (gen_random_uuid(), v_ten_id, 'MYK-MASTER', 'Minyak Goreng 1L — Master (4 Inner)',
    'FOOD_BEVERAGE', 'PALLET', 'DRY', 'MASTER_CASE', 'FEFO', 48,
    19.2, 0.096, false, false, true, true, 4, 10, 100, true, v_user)
  RETURNING id INTO v_master;

  INSERT INTO md_product_skus (id, tenant_id, sku_code, name, category, unit,
    parent_sku_id, commodity_type, sku_level, storage_rule, conversion_to_base,
    weight_kg, volume_m3, is_hazardous, requires_cold_storage,
    is_sellable, is_stockable, stack_limit, min_stock_level, max_stock_level,
    is_active, created_by)
  VALUES
    (gen_random_uuid(), v_ten_id, 'MYK-INNER', 'Minyak Goreng 1L — Inner Pack (12 Pcs)',
     'FOOD_BEVERAGE', 'BOX', v_master, 'DRY', 'INNER_PACK', 'FEFO', 12,
     4.8, 0.024, false, false, true, true, 6, 20, 200, true, v_user),
    (gen_random_uuid(), v_ten_id, 'MYK-PCS', 'Minyak Goreng 1L — Pcs',
     'FOOD_BEVERAGE', 'PCS', NULL, 'DRY', 'BASE_UNIT', 'FEFO', 1,
     0.4, 0.002, false, false, true, true, 12, 50, 500, true, v_user);

  -- FROZEN category — Nugget
  INSERT INTO md_product_skus (id, tenant_id, sku_code, name, category, unit,
    commodity_type, sku_level, storage_rule, conversion_to_base,
    weight_kg, volume_m3, is_hazardous, requires_cold_storage,
    is_sellable, is_stockable, stack_limit, min_stock_level, max_stock_level,
    is_active, created_by)
  VALUES
    (gen_random_uuid(), v_ten_id, 'NUG-CASE', 'Nugget Ayam 500g — Karton (20 Pack)',
     'FROZEN_FOOD', 'BOX', 'FROZEN', 'MASTER_CASE', 'FEFO', 20,
     10.0, 0.05, false, true, true, true, 4, 5, 50, true, v_user),
    (gen_random_uuid(), v_ten_id, 'NUG-PACK', 'Nugget Ayam 500g — Pack',
     'FROZEN_FOOD', 'PCS', 'FROZEN', 'BASE_UNIT', 'FEFO', 1,
     0.5, 0.0025, false, true, true, true, 8, 20, 200, true, v_user);

  -- CHILL category — Yogurt
  INSERT INTO md_product_skus (id, tenant_id, sku_code, name, category, unit,
    commodity_type, sku_level, storage_rule, conversion_to_base,
    weight_kg, volume_m3, is_hazardous, requires_cold_storage,
    is_sellable, is_stockable, stack_limit, min_stock_level, max_stock_level,
    is_active, created_by)
  VALUES
    (gen_random_uuid(), v_ten_id, 'YOG-CASE', 'Yogurt CUP 150ml — Karton (24 Cup)',
     'DAIRY', 'BOX', 'CHILL', 'MASTER_CASE', 'FEFO', 24,
     3.6, 0.036, false, true, true, true, 4, 5, 30, true, v_user),
    (gen_random_uuid(), v_ten_id, 'YOG-CUP', 'Yogurt CUP 150ml — Cup',
     'DAIRY', 'PCS', 'CHILL', 'BASE_UNIT', 'FEFO', 1,
     0.15, 0.00015, false, true, true, true, 8, 10, 100, true, v_user);

  -- HAZMAT — Cleaning Chemical
  INSERT INTO md_product_skus (id, tenant_id, sku_code, name, category, unit,
    commodity_type, sku_level, storage_rule, conversion_to_base,
    weight_kg, volume_m3, is_hazardous, requires_cold_storage,
    is_sellable, is_stockable, stack_limit, min_stock_level, max_stock_level,
    is_active, created_by)
  VALUES
    (gen_random_uuid(), v_ten_id, 'CHM-PAIL', 'Cleaning Acid 5L — Pail (4 Pail)',
     'CHEMICAL', 'PALLET', 'HAZMAT', 'MASTER_CASE', 'FIFO', 4,
     20.0, 0.08, true, false, true, true, 2, 2, 20, true, v_user),
    (gen_random_uuid(), v_ten_id, 'CHM-5L', 'Cleaning Acid 5L — Pail',
     'CHEMICAL', 'PCS', 'HAZMAT', 'BASE_UNIT', 'FIFO', 1,
     5.0, 0.02, true, false, true, true, 3, 5, 50, true, v_user);
END $$;

-- ============================================
-- 6. STORAGE CONTRACT & BILLING RATES
-- ============================================
DO $$
DECLARE
  v_ten_id  UUID := '78846049-fb63-45a9-93da-3af3fea5b587';
  v_user    UUID := '191edf81-400c-4551-8c19-2bcb8a511835';
  v_wh_id   UUID := '9f82b2f9-d6ea-4eac-91d0-332b0fd07559';
  v_area    UUID;
  v_contract UUID;
BEGIN
  SELECT id INTO v_area FROM md_warehouse_areas
    WHERE warehouse_id = v_wh_id AND area_code = 'AREA-RACK-A';

  INSERT INTO md_storage_contracts (id, tenant_id, contract_number, customer_id,
    warehouse_id, area_id, start_date, end_date,
    committed_space, uom_space, max_overflow, billing_method, status,
    notes, created_by)
  VALUES (gen_random_uuid(), v_ten_id, 'SC-HALU-2026-001',
    NULL, v_wh_id, v_area,
    '2026-01-01', '2026-12-31',
    500, 'PALLET', 50, 'HYBRID', 'ACTIVE',
    'Kontrak gudang HALU — dry storage area RACK A', v_user)
  RETURNING id INTO v_contract;

  INSERT INTO md_billing_rates (id, contract_id, tenant_id, charge_code, rate_value, uom,
    valid_from, valid_to, is_active, created_by) VALUES
    (gen_random_uuid(), v_contract, v_ten_id, 'STR-FIX', 500000, 'PAL/MONTH',
     '2026-01-01', '2026-12-31', true, v_user),
    (gen_random_uuid(), v_contract, v_ten_id, 'HD-IN', 25000, 'PAL',
     '2026-01-01', '2026-12-31', true, v_user),
    (gen_random_uuid(), v_contract, v_ten_id, 'HD-OUT', 25000, 'PAL',
     '2026-01-01', '2026-12-31', true, v_user),
    (gen_random_uuid(), v_contract, v_ten_id, 'HD-PICK', 5000, 'PICK',
     '2026-01-01', '2026-12-31', true, v_user);
END $$;

-- ============================================
-- 7. INVENTORY (sample stock)
-- ============================================
DO $$
DECLARE
  v_wh_id   UUID := '9f82b2f9-d6ea-4eac-91d0-332b0fd07559';
  v_ten_id  UUID := '78846049-fb63-45a9-93da-3af3fea5b587';
  v_location UUID;
  v_sku     UUID;
  v_inv     UUID;
BEGIN
  -- Ambil sample location dan SKU
  SELECT ml.id, mp.id INTO v_location, v_sku
  FROM md_warehouse_locations ml, md_product_skus mp
  WHERE ml.warehouse_id = v_wh_id AND ml.bin_status = 'EMPTY'
    AND mp.tenant_id = v_ten_id AND mp.sku_code = 'MYK-PCS'
  LIMIT 1;

  -- Insert inventory
  INSERT INTO wh_inventory (id, tenant_id, warehouse_id, location_id, product_sku_id,
    quantity, reserved_quantity, batch_number, expiry_date, received_date,
    unit_cost, status, inventory_code)
  VALUES (gen_random_uuid(), v_ten_id, v_wh_id, v_location, v_sku,
    240, 0, 'BATCH-MYK-0526', '2026-11-20', CURRENT_DATE,
    12000.00, 'AVAILABLE', 'INV-HALU-00001')
  RETURNING id INTO v_inv;

  -- Record movement
  INSERT INTO wh_inventory_movements (id, tenant_id, inventory_id, movement_type,
    to_location_id, quantity, reference_type, notes, created_by)
  VALUES (gen_random_uuid(), v_ten_id, v_inv, 'INBOUND',
    v_location, 240, 'RECEIPT', 'Initial stock seed', '191edf81-400c-4551-8c19-2bcb8a511835');

  -- Update location status
  UPDATE md_warehouse_locations SET bin_status = 'OCCUPIED'
    WHERE id = v_location;
END $$;

-- ============================================
-- 8. SAMPLE TASK
-- ============================================
DO $$
DECLARE
  v_wh_id  UUID := '9f82b2f9-d6ea-4eac-91d0-332b0fd07559';
  v_ten_id UUID := '78846049-fb63-45a9-93da-3af3fea5b587';
  v_user   UUID := '191edf81-400c-4551-8c19-2bcb8a511835';
  v_task   UUID;
  v_sku    UUID;
BEGIN
  SELECT id INTO v_sku FROM md_product_skus
    WHERE tenant_id = v_ten_id AND sku_code = 'NUG-PACK' LIMIT 1;

  INSERT INTO wh_tasks (id, tenant_id, warehouse_id, task_number, task_type, status,
    priority, assigned_to, notes, created_by)
  VALUES (gen_random_uuid(), v_ten_id, v_wh_id, 'TASK-HALU-001', 'INBOUND', 'PENDING',
    'NORMAL', v_user, 'Penerimaan stok nugget — 50 karton', v_user)
  RETURNING id INTO v_task;

  INSERT INTO wh_task_items (id, task_id, product_sku_id,
    expected_quantity, notes)
  VALUES (gen_random_uuid(), v_task, v_sku,
    50, 'Nugget Ayam 500g — 50 pack');
END $$;
