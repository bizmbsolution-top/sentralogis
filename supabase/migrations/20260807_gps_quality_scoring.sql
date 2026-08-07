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
  SELECT
    -- Score: 0-100 (higher is better)
    ROUND(
      GREATEST(0, LEAST(100,
        (COALESCE(coverage_score, 0) * 40) +     -- 40% weight: daily coverage
        (COALESCE(frequency_score, 0) * 35) +    -- 35% weight: ping frequency
        (COALESCE(recency_score, 0) * 25)        -- 25% weight: last ping freshness
      )),
    1) AS quality_score,
    ROUND(avg_interval, 1) AS avg_interval_sec,
    ROUND(COALESCE(coverage_pct, 0) * 100, 1) AS coverage_pct,
    ROUND(COALESCE(last_gps_age, 999), 1) AS last_gps_age_min,
    COALESCE(total_pings, 0) AS total_pings,
    most_common_source AS gps_source
  FROM (
    SELECT
      -- Coverage: days with GPS / total days in period
      COUNT(DISTINCT DATE(jt.created_at))::NUMERIC / 
        GREATEST(EXTRACT(DAY FROM MAX(jt.created_at) - MIN(jt.created_at)) + 1, 1) AS coverage_pct,
      
      -- Coverage score: 100 if >80%, 50 if >50%, else proportional
      CASE 
        WHEN COUNT(DISTINCT DATE(jt.created_at))::NUMERIC / 
          GREATEST(EXTRACT(DAY FROM MAX(jt.created_at) - MIN(jt.created_at)) + 1, 1) > 0.8 THEN 100
        WHEN COUNT(DISTINCT DATE(jt.created_at))::NUMERIC / 
          GREATEST(EXTRACT(DAY FROM MAX(jt.created_at) - MIN(jt.created_at)) + 1, 1) > 0.5 THEN 75
        WHEN COUNT(DISTINCT DATE(jt.created_at))::NUMERIC / 
          GREATEST(EXTRACT(DAY FROM MAX(jt.created_at) - MIN(jt.created_at)) + 1, 1) > 0.3 THEN 50
        ELSE 25
      END AS coverage_score,
      
      -- Average interval between pings
      AVG(EXTRACT(EPOCH FROM (
        jt.created_at - LAG(jt.created_at) OVER (ORDER BY jt.created_at)
      ))) AS avg_interval,
      
      -- Frequency score: 100 if <60s, 75 if <120s, 50 if <300s, else 25
      CASE 
        WHEN AVG(EXTRACT(EPOCH FROM (jt.created_at - LAG(jt.created_at) OVER (ORDER BY jt.created_at)))) < 60 THEN 100
        WHEN AVG(EXTRACT(EPOCH FROM (jt.created_at - LAG(jt.created_at) OVER (ORDER BY jt.created_at)))) < 120 THEN 75
        WHEN AVG(EXTRACT(EPOCH FROM (jt.created_at - LAG(jt.created_at) OVER (ORDER BY jt.created_at)))) < 300 THEN 50
        ELSE 25
      END AS frequency_score,
      
      -- Last GPS ping age in minutes
      EXTRACT(EPOCH FROM (NOW() - MAX(jt.created_at))) / 60 AS last_gps_age,
      
      -- Recency score: 100 if <5min, 75 if <30min, 50 if <60min, 0 if >60min
      CASE 
        WHEN EXTRACT(EPOCH FROM (NOW() - MAX(jt.created_at))) / 60 < 5 THEN 100
        WHEN EXTRACT(EPOCH FROM (NOW() - MAX(jt.created_at))) / 60 < 30 THEN 75
        WHEN EXTRACT(EPOCH FROM (NOW() - MAX(jt.created_at))) / 60 < 60 THEN 50
        ELSE 0
      END AS recency_score,
      
      -- Total pings in period
      COUNT(*) AS total_pings,
      
      -- Most common GPS source
      MODE() WITHIN GROUP (ORDER BY jt.source) AS most_common_source
      
    FROM job_tracking jt
    JOIN job_orders jo ON jt.job_order_id = jo.id
    WHERE jo.driver_id = p_driver_id
      AND jt.created_at > NOW() - INTERVAL '7 days'
      AND jt.latitude IS NOT NULL
  ) stats;
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
