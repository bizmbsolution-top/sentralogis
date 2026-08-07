-- GPS Quality Scoring Function
-- Calculates GPS reliability score per driver (0-100)

CREATE OR REPLACE FUNCTION calc_gps_quality(p_driver_id UUID)
RETURNS TABLE (
  quality_score NUMERIC,
  avg_interval_sec NUMERIC,
  coverage_pct NUMERIC,
  last_gps_age_min NUMERIC,
  total_pings BIGINT,
  gps_source VARCHAR(50)
) AS $$
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
$$ LANGUAGE plpgsql;

-- Batch function: get GPS quality for all drivers in a tenant
CREATE OR REPLACE FUNCTION calc_tenant_gps_quality(p_tenant_id UUID)
RETURNS TABLE (
  driver_id UUID,
  driver_name VARCHAR(255),
  quality_score NUMERIC,
  avg_interval_sec NUMERIC,
  coverage_pct NUMERIC,
  last_gps_age_min NUMERIC,
  total_pings BIGINT,
  gps_source VARCHAR(50)
) AS $$
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
$$ LANGUAGE plpgsql;
