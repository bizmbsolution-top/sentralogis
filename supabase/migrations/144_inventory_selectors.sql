-- Migration 144: RPCs for Role & Inventory-Based Selectors

-- 1. Get Customers with active inventory in a specific warehouse
CREATE OR REPLACE FUNCTION get_active_customers_in_warehouse(p_warehouse_id UUID)
RETURNS TABLE (
    id UUID,
    name TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT e.id, e.name
    FROM wh_inventory i
    JOIN md_product_skus ps ON i.product_sku_id = ps.id
    JOIN md_entities e ON COALESCE(i.customer_id, ps.customer_id) = e.id
    WHERE i.warehouse_id = p_warehouse_id
      AND i.quantity > 0
      AND i.status = 'AVAILABLE';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Get Products with active inventory in a specific warehouse for a specific customer
CREATE OR REPLACE FUNCTION get_active_products_in_warehouse(p_warehouse_id UUID, p_customer_id UUID)
RETURNS TABLE (
    id UUID,
    name TEXT,
    sku_code TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT p.id, p.name, p.sku_code
    FROM wh_inventory i
    JOIN md_product_skus p ON i.product_sku_id = p.id
    WHERE i.warehouse_id = p_warehouse_id
      AND COALESCE(i.customer_id, p.customer_id) = p_customer_id
      AND i.quantity > 0
      AND i.status = 'AVAILABLE';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
