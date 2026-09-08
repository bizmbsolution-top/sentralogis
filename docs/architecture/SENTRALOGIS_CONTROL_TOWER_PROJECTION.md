# SENTRALOGIS — CONTROL TOWER PROJECTION ARCHITECTURE v1.0
## Tri-Layer CQRS Projections & AI Copilot Intelligence
**Document Version:** 1.0.0-CONTROL-TOWER  
**Status:** APPROVED ARCHITECTURAL STANDARD  
**Classification:** Internal Technical Standard  

---

# 1. CQRS READ MODEL TOPOLOGY

To maintain high query performance and absolute security isolation, Control Tower views do not query transactional tables directly. Dedicated background workers consume canonical integration events and populate asynchronous read projections:

```
+----------------------------------------------------------------------------------------------------+
|                                    CQRS PROJECTION PIPELINE                                        |
+----------------------------------------------------------------------------------------------------+
|                                                                                                    |
|    [TRANSACTIONAL CORE] (shp_*, trk_*, cus_*, wh_*, fin_*)                                         |
|             │                                                                                      |
|             ▼ (Emits)                                                                              |
|    [CANONICAL EVENT OUTBOX]                                                                        |
|             │                                                                                      |
|             ▼ (Kafka / Supabase Realtime Consumer)                                                 |
|    [PROJECTION TRANSFORM WORKER]                                                                   |
|             │                                                                                      |
|     ┌───────┴───────────────────────────────┬───────────────────────────────┐                      |
|     ▼                                       ▼                               ▼                      |
| [LAYER 1: INTERNAL OPS PROJECTION]   [LAYER 2: CUSTOMER PORTAL PROJ]  [LAYER 3: AI INTELLIGENCE]   |
| - Unrestricted Financials & P&L      - Sanitized Milestones           - Risk Scoring & Demurrage   |
| - Driver/Fleet/Vendor Telemetry      - Zero Internal Cost Exposure    - Prescriptive Copilot Graph |
|                                                                                                    |
+----------------------------------------------------------------------------------------------------+
```

---

# 2. LAYER 1: INTERNAL OPERATIONS PROJECTION

### Purpose
Provides HQ Executives, SBU Ops Managers, and Finance Directors with real-time operational visibility, live margin tracking, bottleneck heatmaps, and SLA escalations.

### Schema Specification (`int_ops_shipment_overview`)
```sql
CREATE TABLE int_ops_shipment_overview (
  shipment_id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  shipment_number TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  current_status TEXT NOT NULL,
  origin_name TEXT NOT NULL,
  destination_name TEXT NOT NULL,
  total_units_count INTEGER NOT NULL,
  total_cbm NUMERIC(15, 4),
  total_weight_kg NUMERIC(15, 3),
  commercial_revenue_idr NUMERIC(18, 2) NOT NULL DEFAULT 0,
  actual_cogs_idr NUMERIC(18, 2) NOT NULL DEFAULT 0,
  projected_gross_margin_idr NUMERIC(18, 2) NOT NULL DEFAULT 0,
  gross_margin_percentage NUMERIC(5, 2) NOT NULL DEFAULT 0,
  active_leg_code TEXT,
  active_executor_name TEXT,
  active_driver_name TEXT,
  active_vehicle_plate TEXT,
  demurrage_free_time_remaining_hours NUMERIC(6, 1),
  is_sla_breached BOOLEAN DEFAULT FALSE,
  active_exception_count INTEGER DEFAULT 0,
  last_milestone_label TEXT,
  last_event_timestamp TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

# 3. LAYER 2: CUSTOMER SUCCESS PROJECTION

### Purpose
Powers B2B customer self-service portals and public tracking links (`/track/fwd/[token]`). It guarantees absolute zero-cost exposure.

### Security Definer Function Projection
```sql
CREATE OR REPLACE FUNCTION fn_get_sanitized_customer_tracking(p_tracking_token TEXT)
RETURNS TABLE (
  shipment_number TEXT,
  global_status TEXT,
  origin_city TEXT,
  destination_city TEXT,
  etd TIMESTAMPTZ,
  eta TIMESTAMPTZ,
  milestones JSONB,
  cargo_summary JSONB,
  public_documents JSONB
) SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.shipment_number,
    s.global_status::TEXT,
    orig.city,
    dest.city,
    s.etd,
    s.eta,
    (
      SELECT jsonb_agg(jsonb_build_object(
        'code', m.milestone_code,
        'label', m.milestone_label,
        'time', m.occurred_at
      ) ORDER BY m.occurred_at ASC)
      FROM shp_milestones m WHERE m.shipment_id = s.id
    ),
    (
      SELECT jsonb_agg(jsonb_build_object(
        'commodity', mi.commodity_name,
        'packages', mi.package_quantity,
        'weight_kg', mi.gross_weight_kg,
        'volume_cbm', mi.volume_cbm
      ))
      FROM shp_manifest_items mi WHERE mi.shipment_id = s.id
    ),
    '[]'::jsonb -- Filtered public documents only
  FROM shp_shipments s
  JOIN md_locations orig ON s.origin_location_id = orig.id
  JOIN md_locations dest ON s.destination_location_id = dest.id
  WHERE s.tracking_token = p_tracking_token;
END;
$$ LANGUAGE plpgsql;
```

---

# 4. LAYER 3: AI INTELLIGENCE & DEMURRAGE WATCHDOG

### Cognitive Question Resolution Engine

| Cognitive Question | Underlying Data Stream | AI Evaluation Logic |
| :--- | :--- | :--- |
| **"Where is my cargo?"** | GPS Telemetry & Port Geofences | Haversine distance matching against active leg destination. |
| **"Why is the shipment delayed?"** | `shp_exceptions` & CEISA Channel Logs | Identifies root causes (e.g. Customs Red Channel physical inspection, vessel blank sailing). |
| **"What is the predicted ETA?"** | Historical corridor transit times + live traffic | ML transit estimation dynamically recalculates ETA on milestone delays. |
| **"Which shipment is at demurrage risk?"** | Port discharge timestamps vs. Shipping Line Free Time | Triggers high-priority alert when $\text{Free Time Remaining} < 24\text{ hours}$. |
| **"What action should be taken?"** | Prescriptive Action Graph | Recommends immediate action (e.g. dispatch overnight container haulage, request free time extension). |

---
*Approved by Intelligence & Control Tower Architecture Group*
