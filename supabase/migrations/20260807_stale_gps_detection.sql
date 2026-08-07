-- Stale GPS Detection Function
-- Detects drivers with no GPS ping for >15 minutes during active JO

CREATE OR REPLACE FUNCTION detect_stale_gps(p_tenant_id UUID)
RETURNS TABLE (
  driver_id UUID,
  driver_name VARCHAR(255),
  driver_phone VARCHAR(50),
  jo_id UUID,
  jo_number VARCHAR(255),
  jo_status VARCHAR(100),
  last_gps_time TIMESTAMPTZ,
  stale_minutes NUMERIC,
  last_lat DOUBLE PRECISION,
  last_lng DOUBLE PRECISION,
  gps_source VARCHAR(50),
  alert_level VARCHAR(20) -- WARNING, CRITICAL, DEAD
) AS $$
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
$$ LANGUAGE plpgsql;

-- View for dashboard: GPS status overview per tenant
CREATE OR REPLACE VIEW v_gps_status_overview AS
SELECT
  jo.tenant_id,
  t.name AS tenant_name,
  COUNT(DISTINCT jo.id) AS active_jos,
  COUNT(DISTINCT CASE WHEN last_ping.age_min < 5 THEN jo.driver_id END) AS gps_active,
  COUNT(DISTINCT CASE WHEN last_ping.age_min >= 5 AND last_ping.age_min < 15 THEN jo.driver_id END) AS gps_weak,
  COUNT(DISTINCT CASE WHEN last_ping.age_min >= 15 THEN jo.driver_id END) AS gps_stale,
  COUNT(DISTINCT CASE WHEN last_ping.age_min IS NULL THEN jo.driver_id END) AS gps_no_signal,
  ROUND(
    COUNT(DISTINCT CASE WHEN last_ping.age_min < 5 THEN jo.driver_id END)::NUMERIC / 
    GREATEST(COUNT(DISTINCT jo.driver_id), 1) * 100,
    1
  ) AS gps_health_pct
FROM job_orders jo
JOIN tenants t ON jo.tenant_id = t.id
LEFT JOIN LATERAL (
  SELECT EXTRACT(EPOCH FROM (NOW() - jt.created_at)) / 60 AS age_min
  FROM job_tracking jt
  WHERE jt.job_order_id = jo.id
    AND jt.latitude IS NOT NULL
  ORDER BY jt.created_at DESC
  LIMIT 1
) last_ping ON true
WHERE jo.status IN ('ASSIGNED', 'DALAM PERJALANAN', 'DISPATCHED',
                     'BERANGKAT DARI LOKASI MUAT', 'TIBA DI LOKASI MUAT',
                     'TIBA DI LOKASI BONGKAR', 'MENUJU PALUGADA',
                     'MENUJU TAM', 'LOADING', 'UNLOADING')
GROUP BY jo.tenant_id, t.name;
