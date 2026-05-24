# Sentralogis Enterprise Architecture — Foundation Design

## 1. High Level Architecture

### Core Principle: Separation of Concerns

```
┌─────────────────────────────────────────────────────────┐
│                    TENANT LAYER                          │
│  (PT ABC — company owner, billing, subscription)        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │            ORGANIZATION LAYER                     │   │
│  │  Business units with independent operations       │   │
│  │                                                    │   │
│  │  HQ (Global Visibility + Orchestration)            │   │
│  │  ├── SBU Warehouse Jakarta                         │   │
│  │  ├── SBU Warehouse Surabaya                        │   │
│  │  ├── SBU Trucking                                  │   │
│  │  └── SBU Forwarding                                │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │         WORK ORDER LAYER (Orchestration)          │   │
│  │  Created by HQ or any SBU. Orchestrates flow.    │   │
│  │  One WO → Multiple JOs                            │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │         JOB ORDER LAYER (Execution)               │   │
│  │  Each JO belongs to one Organization/SBU.        │   │
│  │  JO types: PICKING, TRUCKING, RECEIVING, etc.    │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │         INVENTORY LEDGER (Source of Truth)       │   │
│  │  Append-only. Every movement = 1 row.            │   │
│  │  Never UPDATE or DELETE. Only INSERT.            │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │         CROSS-CUTTING LAYER                       │   │
│  │  Audit Log │ Monitoring │ Status History         │   │
│  │  Correlation ID │ Workflow Engine │ Events       │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **WO ≠ JO** | WO = business intent ("move stock from JKT to SBY"). JO = operational execution ("pick pallet A, load truck B, receive at C"). Separates orchestration from execution. |
| **Organization as hierarchical entity** | Organizations form a tree under tenant. HQ is root. SBUs are children. Supports global visibility via recursive queries. |
| **Inventory ledgers are append-only** | Every stock movement is an INSERT. No UPDATEs on inventory records. Query performance via materialized snapshots. This is non-negotiable for audit compliance. |
| **Correlation ID across all entities** | A single UUID traces WO → JOs → movements → events → audit logs. Enables end-to-end observability. |
| **Status history as separate table** | Every state change on WO, JO, inventory, etc. is recorded in a generic `status_history` table. Enables state machine recovery, SLA tracking, and anomaly detection. |
| **Workflow engine as pluggable module** | Not hardcoded. Workflow definitions are data-driven (JSON config). Can be evolved without code changes. |
| **RLS at organization level, not just tenant** | Staff in SBU Warehouse Jakarta should NOT see SBU Warehouse Surabaya data by default. HQ sees all. |

---

## 2. Recommended Folder Structure

```
sentralogis/
├── app/                              # Next.js App Router
│   ├── (auth)/                       # Login, register, forgot password
│   ├── (dashboard)/
│   │   ├── hq/                       # HQ global pages
│   │   │   ├── business/             # Executive dashboard
│   │   │   ├── warehouse/            # HQ warehouse oversight
│   │   │   ├── work-orders/          # WO orchestration hub
│   │   │   ├── monitoring/           # System monitoring
│   │   │   └── reporting/            # Cross-org reports
│   │   ├── sbu/                      # SBU pages by module
│   │   │   ├── warehouse/            # SBU Warehouse ops
│   │   │   │   ├── inbound/
│   │   │   │   ├── outbound/
│   │   │   │   ├── inventory/
│   │   │   │   ├── stock-transfer/
│   │   │   │   └── billing/
│   │   │   ├── trucking/             # SBU Trucking ops
│   │   │   │   ├── work-orders/
│   │   │   │   ├── fleet/
│   │   │   │   ├── drivers/
│   │   │   │   └── tracking/
│   │   │   └── forwarding/           # SBU Forwarding ops
│   │   │       ├── shipments/
│   │   │       ├── containers/
│   │   │       └── documents/
│   │   └── tenant/                   # Tenant admin
│   │       ├── organizations/        # Org management
│   │       ├── staff/                # Staff + role mgmt
│   │       ├── master/               # Master data
│   │       └── settings/
│   └── api/                          # API routes (webhooks, edge funcs)
│       ├── webhooks/
│       └── cron/
│
├── components/                       # Shared UI components
│   ├── ui/                           # Design system (Card, Badge, Button, etc.)
│   ├── layout/                       # Sidebar, Header, Shell
│   └── shared/                       # Shared domain components
│
├── lib/                              # Core libraries
│   ├── supabase/
│   │   ├── client.ts                 # Browser client
│   │   ├── admin.ts                  # Service role client
│   │   └── middleware.ts             # Auth middleware
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useOrganization.ts
│   │   └── usePermissions.ts
│   ├── workflow/                     # Workflow engine
│   │   ├── engine.ts                 # Core workflow processor
│   │   ├── definitions/              # Workflow definitions (JSON)
│   │   │   ├── stock-transfer.ts
│   │   │   └── inbound-receiving.ts
│   │   ├── actions/                  # Workflow action handlers
│   │   └── evaluator.ts             # Condition evaluator
│   ├── monitoring/                   # Monitoring system
│   │   ├── metrics.ts
│   │   ├── alerts.ts
│   │   └── dashboard.ts
│   ├── audit/                        # Audit trail
│   │   ├── logger.ts
│   │   └── query.ts
│   ├── events/                       # Event bus
│   │   ├── bus.ts
│   │   ├── handlers/
│   │   └── types.ts
│   └── utils/
│       ├── correlation.ts
│       ├── organization.ts
│       └── permissions.ts
│
├── modules/                          # Domain modules (encapsulated logic)
│   ├── tenant/                       # Tenant management
│   │   ├── types.ts
│   │   ├── queries.ts
│   │   ├── mutations.ts
│   │   └── validations.ts
│   ├── organization/                 # Organization management
│   │   ├── types.ts
│   │   ├── queries.ts
│   │   ├── mutations.ts
│   │   └── hierarchy.ts             # Tree traversal
│   ├── work-order/                   # WO orchestration
│   │   ├── types.ts
│   │   ├── orchestrator.ts           # WO → JOs generator
│   │   ├── state-machine.ts
│   │   ├── queries.ts
│   │   └── mutations.ts
│   ├── job-order/                    # JO execution
│   │   ├── types.ts
│   │   ├── executor.ts
│   │   ├── queries.ts
│   │   └── mutations.ts
│   ├── inventory/                    # Inventory ledger
│   │   ├── types.ts
│   │   ├── ledger.ts                 # Append-only movement writer
│   │   ├── snapshot.ts               # Materialized snapshot builder
│   │   ├── queries.ts
│   │   ├── mutations.ts
│   │   └── valuation.ts              # Cost calculation
│   ├── warehouse/                    # Warehouse domain
│   │   ├── types.ts
│   │   ├── hierarchy.ts              # Area → Zone → Bin
│   │   ├── inbound/
│   │   ├── outbound/
│   │   ├── putaway/
│   │   ├── picking/
│   │   └── transfer/
│   ├── trucking/                     # Trucking domain
│   │   ├── types.ts
│   │   ├── dispatch.ts
│   │   ├── tracking.ts
│   │   └── fleet.ts
│   ├── forwarding/                   # Forwarding domain
│   │   ├── types.ts
│   │   ├── shipment.ts
│   │   ├── container.ts
│   │   └── milestone.ts
│   ├── finance/                      # Finance domain
│   │   ├── types.ts
│   │   ├── billing.ts
│   │   ├── costing.ts
│   │   └── invoice.ts
│   └── monitoring/                   # System monitoring module
│       ├── types.ts
│       ├── alert-rules.ts
│       └── anomaly.ts
│
├── services/                         # Business logic services (thin orchestration layer)
│   ├── stock-transfer.service.ts     # Orchestrates WO→JOs for transfers
│   ├── inbound-receiving.service.ts
│   ├── outbound-dispatch.service.ts
│   └── cross-docking.service.ts
│
├── types/                            # Shared TypeScript types
│   ├── supabase.ts                   # Generated Supabase types
│   ├── workflow.ts
│   ├── events.ts
│   └── common.ts                     # Shared enums, interfaces
│
├── supabase/
│   ├── migrations/                   # Database migrations
│   ├── seeds/                        # Seed data
│   └── functions/                    # PostgreSQL functions
│
└── .opencode/
    ├── design/                       # Architecture documents
    ├── skills/                       # PRD, user flows, schema docs
    └── AGENTS.md
```

---

## 3. Database ERD Explanation

### Core Entities & Relationships

```
tenants
  │
  ├──< organizations                    (tenant-scoped, hierarchical)
  │     │
  │     ├──< organization_users          (users linked to orgs with roles)
  │     │
  │     ├──< warehouses                 (physical locations, org-scoped)
  │     │     ├──< warehouse_areas
  │     │     │     └──< warehouse_zones
  │     │     │           └──< warehouse_bins
  │     │     ├──< storage_contracts
  │     │     └──< billing_rates
  │     │
  │     ├──< work_orders               (ORCHESTRATION LAYER)
  │     │     ├──< work_order_items
  │     │     └──< job_orders           (EXECUTION LAYER)
  │     │           └──< job_order_items
  │     │
  │     ├──< inventory_ledger           (APPEND-ONLY MOVEMENTS)
  │     │
  │     ├──< inventory_snapshots        (MATERIALIZED VIEW for queries)
  │     │
  │     └──< modules (trucking, forwarding, etc.)
  │           ├──< shipments
  │           ├──< containers
  │           ├──< trips
  │           └──< fleet_assignments
  │
  ├──< status_history                   (POLYMORPHIC — all entities)
  ├──< audit_logs                       (ALL mutations)
  ├──< monitoring_events
  ├──< workflow_instances
  └──< correlation_ids                  (tracing across entities)
```

### Key Relationship Rules

1. **Organization is the central authorization boundary.** All data is scoped to:
   - `tenant_id` for multi-tenant isolation
   - `org_id` for intra-tenant visibility (RLS filters on org_id)
   - HQ org has visibility into all child orgs via recursive CTE

2. **WO is always created at the org level** (usually HQ or lead org). It contains the WHAT and WHY.

3. **JOs are created by the workflow engine** based on WO type. Each JO is assigned to a specific org for execution.

4. **Inventory ledger is a flat, append-only table.** It does NOT belong to any specific org — stock movements across orgs are tracked via `from_org_id` / `to_org_id`.

5. **Status history is polymorphic** via `entity_type` + `entity_id` columns. Covers WO, JO, inventory, shipments, etc.

6. **Audit log captures every INSERT/UPDATE/DELETE** via database triggers.

---

## 4. Suggested PostgreSQL Table Structure

### 4.1 Tenant & Organization

```sql
-- tenants (company owner)
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  tax_id TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  logo_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- organizations (hierarchical business units)
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  parent_org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  org_type TEXT NOT NULL CHECK (org_type IN (
    'HQ', 'SBU_WAREHOUSE', 'SBU_TRUCKING', 'SBU_FORWARDING', 'SBU_FINANCE'
  )),
  address TEXT,
  city TEXT,
  province TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  settings JSONB DEFAULT '{}',
  org_path LTREE,  -- Materialized path for hierarchy queries
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, code)
);

-- organization_users (staff per org)
CREATE TABLE organization_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_code TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  assigned_warehouse_id UUID,  -- NULL means all warehouses in org
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, user_id, role_code)
);
```

### 4.2 Warehouse Hierarchy

```sql
-- warehouses (physical locations)
CREATE TABLE warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  province TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  warehouse_type TEXT CHECK (warehouse_type IN ('DC', 'SUB_DC', 'SHOP', 'DARK_STORE')),
  ownership TEXT CHECK (ownership IN ('OWN', '3PL_MANAGED', 'KONSINYASI')),
  parent_warehouse_id UUID REFERENCES warehouses(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'MAINTENANCE')),
  total_capacity_sqm NUMERIC(12,2),
  total_capacity_cbm NUMERIC(12,2),
  settings JSONB DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, code),
  UNIQUE (organization_id, code)
);

-- warehouse_areas (functional zones within a warehouse)
CREATE TABLE warehouse_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  area_code TEXT NOT NULL,
  area_name TEXT NOT NULL,
  area_type TEXT NOT NULL CHECK (area_type IN (
    'YARD', 'INDOOR_FLOOR', 'RACKING', 'COLD_FREEZER',
    'COLD_CHILLER', 'HAZMAT', 'BONDED', 'CROSS_DOCK'
  )),
  storage_type TEXT CHECK (storage_type IN (
    'BULK_FLOOR', 'PALLET_STACK', 'RACK_SELECTIVE',
    'RACK_DRIVE_IN', 'CANTILEVER', 'MEZZANINE'
  )),
  total_capacity NUMERIC(12,2),
  uom_capacity TEXT DEFAULT 'PALLET' CHECK (uom_capacity IN ('PALLET', 'CBM', 'SQM', 'KG')),
  temperature_min NUMERIC(8,2),
  temperature_max NUMERIC(8,2),
  humidity_max NUMERIC(8,2),
  is_hazmat_certified BOOLEAN DEFAULT false,
  is_bonded_zone BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (warehouse_id, area_code)
);

-- warehouse_zones (subdivisions within areas)
CREATE TABLE warehouse_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  area_id UUID NOT NULL REFERENCES warehouse_areas(id) ON DELETE CASCADE,
  zone_code TEXT NOT NULL,
  zone_name TEXT NOT NULL,
  zone_type TEXT CHECK (zone_type IN ('STORAGE', 'PICKING', 'RECEIVING', 'SHIPPING', 'QUARANTINE', 'RETURN')),
  max_weight_kg NUMERIC(10,2),
  max_height_cm NUMERIC(8,2),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (area_id, zone_code)
);

-- warehouse_bins (physical storage locations — the smallest unit)
CREATE TABLE warehouse_bins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  zone_id UUID NOT NULL REFERENCES warehouse_zones(id) ON DELETE CASCADE,
  bin_code TEXT NOT NULL,
  bin_type TEXT CHECK (bin_type IN ('PALLET', 'SHELF', 'BULK', 'FLOOR', 'TOTE')),
  max_quantity NUMERIC(12,2),
  uom TEXT DEFAULT 'PCS',
  is_slotting_enabled BOOLEAN DEFAULT true,
  current_status TEXT DEFAULT 'EMPTY' CHECK (current_status IN ('EMPTY', 'OCCUPIED', 'RESERVED', 'BLOCKED', 'MAINTENANCE')),
  last_occupied_at TIMESTAMPTZ,
  settings JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (zone_id, bin_code)
);
```

### 4.3 Work Order & Job Order (Orchestration + Execution)

```sql
-- work_orders (business orchestration — WHAT needs to happen)
CREATE TABLE work_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  correlation_id UUID NOT NULL DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  originating_org_id UUID NOT NULL REFERENCES organizations(id),
  assigned_org_id UUID REFERENCES organizations(id),  -- lead executing org
  wo_number TEXT NOT NULL,
  wo_type TEXT NOT NULL CHECK (wo_type IN (
    'STOCK_TRANSFER', 'INBOUND_RECEIVING', 'OUTBOUND_DISPATCH',
    'STOCK_OPNAME', 'TRANSFORMATION', 'CROSS_DOCK', 'RETURN'
  )),
  priority TEXT DEFAULT 'NORMAL' CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT', 'EMERGENCY')),
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN (
    'DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'IN_PROGRESS',
    'PARTIALLY_COMPLETED', 'COMPLETED', 'CANCELLED', 'REJECTED'
  )),
  reference_type TEXT,  -- e.g., 'SALES_ORDER', 'PURCHASE_ORDER'
  reference_id TEXT,     -- external system reference
  description TEXT,
  notes TEXT,
  requested_by UUID,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  target_date DATE,
  completed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, wo_number)
);

-- work_order_items (line items of the WO)
CREATE TABLE work_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  line_number INTEGER NOT NULL,
  product_sku_id UUID REFERENCES product_skus(id),
  item_description TEXT,
  requested_quantity NUMERIC(15,2),
  fulfilled_quantity NUMERIC(15,2) DEFAULT 0,
  uom TEXT DEFAULT 'PCS',
  from_warehouse_id UUID,
  from_bin_id UUID,
  to_warehouse_id UUID,
  to_bin_id UUID,
  batch_number TEXT,
  expiry_date DATE,
  unit_cost NUMERIC(15,2),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (work_order_id, line_number)
);

-- job_orders (operational execution — HOW it gets done)
CREATE TABLE job_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  correlation_id UUID NOT NULL,  -- same as parent WO correlation_id
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  work_order_item_id UUID REFERENCES work_order_items(id) ON DELETE SET NULL,
  originating_org_id UUID NOT NULL REFERENCES organizations(id),
  executing_org_id UUID NOT NULL REFERENCES organizations(id),
  assigned_warehouse_id UUID REFERENCES warehouses(id),
  jo_number TEXT NOT NULL,
  jo_type TEXT NOT NULL CHECK (jo_type IN (
    'PICKING', 'PUTAWAY', 'LOADING', 'UNLOADING',
    'TRUCKING', 'RECEIVING', 'STOWING', 'PACKING',
    'CROSS_DOCK_TRANSFER', 'STOCK_OPNAME_EXEC',
    'TRANSFORMATION_EXEC', 'RETURN_PROCESSING'
  )),
  sequence_order INTEGER NOT NULL DEFAULT 0,  -- execution order within WO
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN (
    'PENDING', 'READY', 'ASSIGNED', 'IN_PROGRESS',
    'COMPLETED', 'FAILED', 'CANCELLED', 'SKIPPED'
  )),
  assigned_to UUID,          -- user_id of assigned worker
  assigned_fleet_id UUID,
  assigned_driver_id UUID,
  scheduled_start TIMESTAMPTZ,
  actual_start TIMESTAMPTZ,
  actual_end TIMESTAMPTZ,
  sla_minutes INTEGER,
  requires_approval BOOLEAN DEFAULT false,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  notes TEXT,
  result JSONB DEFAULT '{}',  -- execution result data
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, jo_number)
);

-- job_order_items (operational line items — what was actually moved)
CREATE TABLE job_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_order_id UUID NOT NULL REFERENCES job_orders(id) ON DELETE CASCADE,
  inventory_id UUID,  -- link to inventory record (optional pre-move)
  product_sku_id UUID REFERENCES product_skus(id),
  from_bin_id UUID REFERENCES warehouse_bins(id),
  to_bin_id UUID REFERENCES warehouse_bins(id),
  requested_quantity NUMERIC(15,2),
  actual_quantity NUMERIC(15,2),
  uom TEXT DEFAULT 'PCS',
  batch_number TEXT,
  expiry_date DATE,
  lot_number TEXT,
  pallet_id TEXT,
  is_damaged BOOLEAN DEFAULT false,
  damage_notes TEXT,
  result JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 4.4 Inventory Ledger (Append-Only)

```sql
-- inventory_ledger (THE source of truth — never UPDATE, never DELETE)
CREATE TABLE inventory_ledger (
  id BIGSERIAL PRIMARY KEY,       -- sequential for ordering
  correlation_id UUID NOT NULL,    -- traceable to WO/JO
  tenant_id UUID NOT NULL,
  product_sku_id UUID NOT NULL REFERENCES product_skus(id),
  warehouse_id UUID NOT NULL REFERENCES warehouses(id),
  bin_id UUID REFERENCES warehouse_bins(id),

  -- Movement context
  movement_type TEXT NOT NULL CHECK (movement_type IN (
    'RECEIPT', 'PUTAWAY', 'PICK', 'PACK', 'LOAD',
    'UNLOAD', 'RECEIVE_AT_DEST', 'TRANSFER_OUT',
    'TRANSFER_IN', 'ADJUSTMENT_PLUS', 'ADJUSTMENT_MINUS',
    'OPNAME_PLUS', 'OPNAME_MINUS', 'RETURN_IN',
    'RETURN_OUT', 'DAMAGE', 'EXPIRY', 'TRANSFORMATION_IN',
    'TRANSFORMATION_OUT', 'REBALANCE'
  )),
  movement_reason TEXT,

  -- Quantity deltas (positive = in, negative = out)
  quantity_change NUMERIC(15,2) NOT NULL,
  quantity_before NUMERIC(15,2),
  quantity_after NUMERIC(15,2),

  -- Item attributes at time of movement
  batch_number TEXT,
  expiry_date DATE,
  lot_number TEXT,
  pallet_id TEXT,

  -- Financial
  unit_cost NUMERIC(15,2),
  total_cost NUMERIC(15,2),

  -- Links
  source_document_type TEXT,     -- 'WORK_ORDER', 'JOB_ORDER', 'ADJUSTMENT'
  source_document_id UUID,
  job_order_id UUID REFERENCES job_orders(id) ON DELETE SET NULL,
  job_order_item_id UUID REFERENCES job_order_items(id) ON DELETE SET NULL,

  -- Who
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (created_at);

-- Indexes for ledger queries
CREATE INDEX idx_ledger_sku ON inventory_ledger(product_sku_id, created_at DESC);
CREATE INDEX idx_ledger_warehouse ON inventory_ledger(warehouse_id, created_at DESC);
CREATE INDEX idx_ledger_bin ON inventory_ledger(bin_id, created_at DESC);
CREATE INDEX idx_ledger_correlation ON inventory_ledger(correlation_id);
CREATE INDEX idx_ledger_jo ON inventory_ledger(job_order_id);

-- Materialized snapshot for fast queries
CREATE MATERIALIZED VIEW inventory_snapshots AS
SELECT DISTINCT ON (tenant_id, warehouse_id, bin_id, product_sku_id, batch_number)
  tenant_id,
  warehouse_id,
  bin_id,
  product_sku_id,
  batch_number,
  expiry_date,
  lot_number,
  LAST_VALUE(quantity_after) OVER w AS current_quantity,
  LAST_VALUE(unit_cost) OVER w AS current_unit_cost,
  MAX(created_at) OVER w AS last_movement_at
FROM inventory_ledger
WHERE movement_type NOT IN ('ADJUSTMENT_MINUS', 'PICK', 'TRANSFER_OUT')
WINDOW w AS (
  PARTITION BY tenant_id, warehouse_id, bin_id, product_sku_id, batch_number
  ORDER BY created_at DESC
);
```

### 4.5 Cross-Cutting: Audit, Monitoring, Status History

```sql
-- audit_logs (all mutations — via database triggers)
CREATE TABLE audit_logs (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID,
  correlation_id UUID,
  entity_type TEXT NOT NULL,      -- 'WORK_ORDER', 'JOB_ORDER', 'INVENTORY_LEDGER', etc.
  entity_id UUID NOT NULL,
  operation TEXT NOT NULL,         -- 'INSERT', 'UPDATE', 'DELETE'
  old_data JSONB,
  new_data JSONB,
  changed_fields TEXT[],           -- list of changed column names
  performed_by UUID,               -- user who made the change
  performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT
) PARTITION BY RANGE (performed_at);

CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id, performed_at DESC);
CREATE INDEX idx_audit_correlation ON audit_logs(correlation_id);
CREATE INDEX idx_audit_tenant ON audit_logs(tenant_id, performed_at DESC);

-- status_history (polymorphic state machine log)
CREATE TABLE status_history (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  correlation_id UUID,
  entity_type TEXT NOT NULL,      -- 'WORK_ORDER', 'JOB_ORDER', 'INVENTORY', 'SHIPMENT'
  entity_id UUID NOT NULL,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  reason TEXT,
  trigger_source TEXT,             -- 'SYSTEM', 'USER', 'WORKFLOW', 'API', 'CRON'
  trigger_detail JSONB,
  performed_by UUID,
  duration_in_previous_state INTERVAL,  -- SLA tracking
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_status_entity ON status_history(entity_type, entity_id, created_at DESC);
CREATE INDEX idx_status_correlation ON status_history(correlation_id);

-- monitoring_events (system- and business-level events)
CREATE TABLE monitoring_events (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID,
  correlation_id UUID,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'SLA_BREACH', 'WORKFLOW_TIMEOUT', 'ANOMALY_DETECTED',
    'INVENTORY_THRESHOLD', 'TEMP_ALERT', 'SYSTEM_ERROR',
    'USER_ACTION_ANOMALY', 'DUPLICATE_DETECTED'
  )),
  severity TEXT NOT NULL CHECK (severity IN ('INFO', 'WARNING', 'ERROR', 'CRITICAL')),
  source TEXT,                     -- which module generated it
  title TEXT NOT NULL,
  description TEXT,
  affected_entity_type TEXT,
  affected_entity_id UUID,
  metric_name TEXT,
  metric_value NUMERIC(15,2),
  threshold NUMERIC(15,2),
  payload JSONB,
  is_acknowledged BOOLEAN DEFAULT false,
  acknowledged_by UUID,
  acknowledged_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_monitoring_tenant ON monitoring_events(tenant_id, created_at DESC);
CREATE INDEX idx_monitoring_unresolved ON monitoring_events(is_acknowledged, severity, created_at DESC);

-- workflow_instances (tracking active workflow executions)
CREATE TABLE workflow_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  correlation_id UUID NOT NULL,
  workflow_name TEXT NOT NULL,
  workflow_version TEXT NOT NULL,
  trigger_entity_type TEXT,
  trigger_entity_id UUID,
  status TEXT NOT NULL CHECK (status IN (
    'PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'ROLLED_BACK', 'PAUSED'
  )),
  current_step TEXT,
  steps_completed INTEGER DEFAULT 0,
  steps_total INTEGER DEFAULT 0,
  context JSONB,                   -- workflow execution context
  result JSONB,
  error_message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_workflow_correlation ON workflow_instances(correlation_id);
CREATE INDEX idx_workflow_status ON workflow_instances(status, created_at DESC);
```

---

## 5. Workflow Diagrams

### 5.1 Stock Transfer (WO → Multiple JOs)

```
┌────────────────────────────────────────────────────────────┐
│                    WORK ORDER                               │
│  STOCK_TRANSFER JKT→SBY                                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Line 1: SKU-B001, 100 pcs, JKT Rack A1 → SBY Rack B2│  │
│  │ Line 2: SKU-C002, 50 pcs, JKT Freezer F3 → SBY F1   │  │
│  └──────────────────────────────────────────────────────┘  │
│  Status: APPROVED                                          │
└──────────────────────────┬─────────────────────────────────┘
                           │
           ┌───────────────┴───────────────┐
           │        WORKFLOW ENGINE         │
           │  Generates JOs in sequence      │
           └───────────────┬───────────────┘
                           │
     ┌─────────────────────┼─────────────────────┐
     │                     │                     │
     ▼                     ▼                     ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  JOB ORDER 1 │  │  JOB ORDER 2 │  │  JOB ORDER 3 │
│  PICKING     │  │  LOADING     │  │  TRUCKING    │
│  Org: WH JKT │  │  Org: WH JKT │  │  Org: TRK    │
│  Status: DONE│  │  Status: DONE│  │  Status: DONE│
└──────────────┘  └──────────────┘  └──────────────┘
                          │
                          ▼
                    ┌──────────────┐  ┌──────────────┐
                    │  JOB ORDER 4 │  │  JOB ORDER 5 │
                    │  UNLOADING   │  │  PUTAWAY     │
                    │  Org: WH SBY │  │  Org: WH SBY │
                    │  Status: DONE│  │  Status: DONE│
                    └──────────────┘  └──────────────┘

INVENTORY LEDGER ENTRIES:
─────────────────────────
1. JKT - PICK - SKU-B001 -100  (quantity_change: -100)
2. JKT - LOAD - SKU-B001 -100
3. SBY - UNLOAD - SKU-B001 +100
4. SBY - PUTAWAY - SKU-B001 +100  (to bin B2)

All 4 ledger entries share the same correlation_id.
```

### 5.2 Inbound Receiving Flow

```
PURCHASE_ORDER
      │
      ▼
┌──────────────┐
│  WORK ORDER  │  INBOUND_RECEIVING
│  Status: APR │
└──────┬───────┘
       │
       ▼
┌──────────────────────────────────────────────────┐
│              WORKFLOW ENGINE                      │
└──────────────────────────────────────────────────┘
       │
       ├──────────────────┐
       ▼                  ▼
┌──────────────┐  ┌──────────────┐
│  JO: RECV    │  │  JO: PUTAWAY │
│  RECEIVING   │  │  STOWING     │
│  Scan items  │  │  Move to bin │
│  Qty check   │  │  Confirm loc │
│  Damage cek  │  │  Update bin  │
└──────┬───────┘  └──────┬──────┘
       │                 │
       ▼                 ▼
  LEDGER: RECEIPT    LEDGER: PUTAWAY
  quantity: +500     quantity: +500
  unit_cost: 15000   at bin A-01-02
```

### 5.3 Organization Hierarchy

```
Tenant: PT ABC (tenant_id: T-001)
│
├── Organization: HQ (org_type: HQ)
│   ├── org_path: "T-001.HQ"
│   │
│   ├── Organization: SBU Warehouse Jakarta (org_type: SBU_WAREHOUSE)
│   │   ├── org_path: "T-001.HQ.WH-JKT"
│   │   ├── Warehouse: Jakarta DC (code: JKT-DC)
│   │   │   ├── Area: Receiving Dock
│   │   │   ├── Area: Cold Storage
│   │   │   │   ├── Zone: Freezer A (zone_type: STORAGE)
│   │   │   │   │   ├── Bin: F-A-01
│   │   │   │   │   ├── Bin: F-A-02
│   │   │   │   │   └── ...
│   │   │   │   └── Zone: Chiller B
│   │   │   └── Area: Racking
│   │   │       ├── Zone: Rack A (zone_type: PICKING)
│   │   │       └── Zone: Rack B (zone_type: STORAGE)
│   │   │
│   │   └── Organization Users:
│   │       ├── user-A (sbu_manager_wh, assigned_warehouse: JKT-DC)
│   │       ├── user-B (sbu_ops_wh, assigned_warehouse: JKT-DC)
│   │       └── user-C (sbu_ops_wh, assigned_warehouse: JKT-DC)
│   │
│   ├── Organization: SBU Warehouse Surabaya (org_type: SBU_WAREHOUSE)
│   │   ├── org_path: "T-001.HQ.WH-SBY"
│   │   └── Warehouse: Surabaya DC (code: SBY-DC)
│   │
│   ├── Organization: SBU Trucking (org_type: SBU_TRUCKING)
│   │   └── org_path: "T-001.HQ.TRK"
│   │
│   └── Organization: SBU Forwarding (org_type: SBU_FORWARDING)
│       └── org_path: "T-001.HQ.FWD"
│
└── HQ Users (cross-org visibility via RLS):
    ├── user-X (hq_ops, no assigned_warehouse → sees all)
    └── user-Y (hq_finance, no assigned_warehouse → sees all)
```

---

## 6. Monitoring Architecture

```
┌────────────────────────────────────────────────────────────┐
│                   MONITORING SYSTEM                         │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ┌────────────┐  ┌────────────┐  ┌────────────────────┐   │
│  │ SLA TRACKER│  │ THRESHOLD  │  │ ANOMALY DETECTOR   │   │
│  │            │  │ MONITOR    │  │                    │   │
│  │ WO pending │  │ Stock < min│  │ Velocity anomaly   │   │
│  │ > 4 hours  │  │ Temp > max │  │ Spike detection    │   │
│  │ JO overdue │  │ Capacity>95│  │ Duplicate scan     │   │
│  └──────┬─────┘  └──────┬─────┘  └────────┬───────────┘   │
│         │               │                 │               │
│         └───────────────┼─────────────────┘               │
│                         │                                 │
│                         ▼                                 │
│              ┌─────────────────────┐                       │
│              │  MONITORING EVENTS  │                       │
│              │  (insert into table) │                       │
│              └──────────┬──────────┘                       │
│                         │                                 │
│              ┌──────────┴──────────┐                       │
│              │                     │                       │
│              ▼                     ▼                       │
│  ┌──────────────────┐  ┌────────────────────┐             │
│  │  NOTIFICATION    │  │  HQ DASHBOARD      │             │
│  │  (in-app, email) │  │  (metrics, charts) │             │
│  └──────────────────┘  └────────────────────┘             │
│                                                            │
└────────────────────────────────────────────────────────────┘

Monitoring Metrics (collected per tenant):
├── Business Metrics
│   ├── WO created/hour, WO completion rate
│   ├── JO cycle time (picking, putaway, trucking)
│   ├── Inventory turns
│   └── SLA breach rate
│
├── Operational Metrics
│   ├── Stock-out SKUs
│   ├── Expiring inventory (7, 14, 30 days)
│   ├── Bin utilization %
│   ├── Open JOs by type
│   └── Worker productivity (JO/hour)
│
├── System Metrics
│   ├── API response times
│   ├── Query performance (slow queries)
│   ├── Error rates
│   └── Database connection pool
│
└── Alert Rules (configurable per tenant/org):
    ├── SLA: WO not progressed > 4 hours → WARNING
    ├── SLA: JO not started > 2 hours → WARNING
    ├── Inventory: any SKU hits zero → INFO
    ├── Temperature: breach > 15 minutes → CRITICAL
    ├── Duplicate: same bin + SKU scan < 1 min apart → ANOMALY
    └── Velocity: stock drop > 30% in 1 hour → ALERT
```

---

## 7. Execution Flow — How it all connects

### Full Stock Transfer Walkthrough

```
STEP 1: HQ creates WO
───────────────
User: HQ Ops creates "Stock Transfer WO"
Input: From WH Jakarta → To WH Surabaya
Items: SKU-B001, 100 pcs
System: INSERT INTO work_orders (wo_type: 'STOCK_TRANSFER', status: 'DRAFT')
        INSERT INTO work_order_items
        Log: audit_logs (INSERT), status_history (DRAFT)

STEP 2: WO Approved
───────────────
User: HQ Manager approves
System: UPDATE work_orders SET status = 'APPROVED'
        Log: status_history (DRAFT → APPROVED)

STEP 3: Workflow Engine Executes
───────────────
System: INSERT INTO workflow_instances
        Workflow definition: stock-transfer.v1.json

        Step 3a: Generate PICKING JO
        → INSERT INTO job_orders (jo_type: 'PICKING', executing_org: WH_JKT, sequence: 1)
        → INSERT INTO job_order_items (from_bin: JKT-RACK-A1, quantity: 100)
        → Status: READY → ASSIGNED

        Step 3b: Generate LOADING JO
        → INSERT INTO job_orders (jo_type: 'LOADING', executing_org: WH_JKT, sequence: 2)

        Step 3c: Generate TRUCKING JO
        → INSERT INTO job_orders (jo_type: 'TRUCKING', executing_org: TRK, sequence: 3)

        Step 3d: Generate UNLOADING JO
        → INSERT INTO job_orders (jo_type: 'UNLOADING', executing_org: WH_SBY, sequence: 4)

        Step 3e: Generate PUTAWAY JO
        → INSERT INTO job_orders (jo_type: 'PUTAWAY', executing_org: WH_SBY, sequence: 5)

        Log: status_history for each JO (PENDING → READY)

STEP 4: SBU Warehouse Jakarta executes PICKING
───────────────
User (sbu_ops_wh): Opens picking JO, scans bin A1, picks 100 pcs
System: UPDATE job_orders (status: COMPLETED, actual_end: NOW())
        INSERT INTO inventory_ledger (
          movement_type: 'PICK',
          quantity_change: -100,
          quantity_before: 150, quantity_after: 50,
          correlation_id: (same as WO),
          job_order_id: (picking JO id)
        )
        Insert: status_history (IN_PROGRESS → COMPLETED)
        Update: warehouse_bins (current_status: check if empty)

STEP 5: SBU Warehouse Jakarta executes LOADING
───────────────
User: Confirms loading into truck
System: UPDATE job_orders (status: COMPLETED)
        INSERT INTO inventory_ledger (movement_type: 'LOAD', quantity_change: -100)
        TRIGGERS: TRUCKING JO → status: READY

STEP 6: SBU Trucking executes TRUCKING
───────────────
System: driver_assigned, fleet_assigned, departure, arrival
        INSERT INTO trip_events (checkpoint, timestamp, location)
        UPDATE job_orders (status: COMPLETED)

STEP 7: SBU Warehouse Surabaya executes UNLOADING + PUTAWAY
───────────────
User: Receives truck, scans items, confirms quantity
System: INSERT INTO inventory_ledger (
          movement_type: 'RECEIVE_AT_DEST', quantity_change: +100
        )
        INSERT INTO inventory_ledger (
          movement_type: 'PUTAWAY', quantity_change: 0 (100 at new bin),
          quantity_after: 100 at bin SBY-RACK-B2
        )
        UPDATE job_orders (status: COMPLETED)
        Log: status_history

STEP 8: WO Completion
───────────────
System: All JOs completed → UPDATE work_orders SET status = 'COMPLETED'
        Log: status_history (IN_PROGRESS → COMPLETED)
        workflow_instances (RUNNING → COMPLETED)
        Monitoring: log WO cycle time
```

---

## 8. Recommended Implementation Phases

| Phase | Scope | Duration (est) |
|-------|-------|----------------|
| **P1: Foundation** | Tenant + Organization + User/RBAC schema; Migration 030; RLS policies; Folder restructure; Core types | 2 weeks |
| **P2: WO/JO Engine** | Work Order + Job Order schema; CRUD pages (HQ); Workflow engine v1 (hardcoded flows); Status history binding | 3 weeks |
| **P3: Inventory Ledger** | Append-only ledger; Materialized snapshot; Inventory queries; Audit log triggers; Migration of existing wh_inventory | 2 weeks |
| **P4: WMS Ops** | Rewrite inbound/outbound using WO→JO pattern; Picking + Putaway flows; Bin status automation | 3 weeks |
| **P5: Trucking Integration** | Migrate existing trucking to JO model; Link WO→JO for stock transfers; Driver/fleet assignment via workflow | 2 weeks |
| **P6: Monitoring** | SLA tracker; Alert rules; Dashboard metrics; Anomaly detection v1 | 2 weeks |
| **P7: Forwarding** | Shipment + Container + Milestone tables; Forwarding WO/JO types; Document management | 3 weeks |
| **P8: Finance** | Billing integration with WO/JO data; Cost calculation; Invoice generation from ledger | 2 weeks |
| **P9: Workflow Engine v2** | Data-driven workflow definitions; Visual workflow builder (future); Plugins | 3 weeks |
| **Total** | | **~22 weeks** |

---

## 9. Enterprise Best Practices

### 9.1 Architecture Principles

1. **Command-Query Responsibility Segregation (CQRS)**
   - Commands: `modules/*/mutations.ts` — write operations that go through the workflow engine
   - Queries: `modules/*/queries.ts` — read operations that use materialized views/snapshots
   - Never query the ledger directly for dashboards. Use snapshots.

2. **Event-Driven Communication**
   - Modules communicate via events, not direct function calls
   - `lib/events/bus.ts` publishes events like `inventory.moved`, `jo.completed`
   - Handlers in `lib/events/handlers/` react to events (e.g., `jo.completed` → check if all sibling JOs done → complete parent WO)

3. **Idempotent Operations**
   - Every mutation should be safe to retry
   - Use `correlation_id` + `movement_type` as unique constraint on ledger to prevent double-posting
   - JO status transitions should be idempotent (already COMPLETED? Skip)

4. **Temporal Tracking**
   - All tables have `created_at` and `updated_at`
   - Status history tracks duration in each state using `duration_in_previous_state`
   - Enables SLA computation: `SELECT AVG(duration) FROM status_history WHERE entity_type = 'JOB_ORDER' AND new_status = 'COMPLETED'`

5. **Soft Deletes**
   - No hard DELETEs. Use `is_active = false` or status = 'CANCELLED'
   - Audit log captures the before/after of any status change

### 9.2 PostgreSQL Patterns

1. **Partitioning**: Partition large tables by time range
   - `inventory_ledger` by `created_at` (monthly)
   - `audit_logs` by `performed_at` (monthly)
   - `status_history` by `created_at` (monthly)

2. **LTREE for Hierarchy**: Use LTREE extension for org hierarchy queries
   - `SELECT * FROM organizations WHERE org_path @> 'T-001.HQ'` — finds all children of HQ

3. **Materialized Views**: Refresh periodically
   - `inventory_snapshots` — refresh every 5 minutes or on-demand after batch operations
   - `v_org_stock_summary` — pre-aggregated stock per org

4. **RLS Strategy**:
   - HQ users: see all orgs where `org_path @> (SELECT org_path FROM orgs WHERE user = auth.uid())`
   - SBU users: see only their org_id and assigned_warehouse_id
   - Use `organization_users` for the permission look-up

### 9.3 TypeScript Patterns

1. **Typed Supabase queries**: Generate types from schema
2. **Module encapsulation**: Each module exposes only `types.ts`, `queries.ts`, `mutations.ts`
3. **Service layer**: Thin orchestration that calls multiple modules
4. **Validation**: Zod schemas for all API inputs
5. **Error handling**: Custom error types with `correlation_id` for tracing

---

## 10. Risks and Anti-Patterns to Avoid

| Anti-Pattern | Risk | Solution |
|---|---|---|
| **Updating inventory quantities in place** | Lost audit trail, no traceability | Always use append-only ledger. Never UPDATE quantity. |
| **Mixing WO and JO in one table** | Cannot separate orchestration from execution; status complexity explodes | Keep WO and JO as separate tables with clear status enums |
| **Hardcoding workflow logic in pages** | Business logic scattered across UI; cannot change flow without deploying | Workflow engine with data-driven definitions |
| **RLS only at tenant level** | Intra-tenant data leak between warehouses | RLS at org_id + warehouse_id level |
| **Using JSONB for everything** | No referential integrity; query complexity | JSONB only for metadata/settings. Core fields are normalized. |
| **Cascading deletes for audit tables** | Accidental data loss | Use soft deletes. Never CASCADE to audit/log tables. |
| **One role = one org assumption** | Staff cannot work across orgs | `organization_users` supports multiple org assignments per user |
| **Inventory count stored in table row** | Race conditions on concurrent updates | Use SERIALIZABLE isolation for inventory operations |
| **No partition strategy** | Query degradation on large tables | Partition ledger, audit, status history by time |
| **Tightly coupled modules** | Changes in WMS break Trucking | Event-driven communication; modules know event contracts, not each other |

---

## 11. Suggested Naming Conventions

### Database
| Convention | Example |
|------------|---------|
| Tables: `snake_case`, plural | `work_orders`, `inventory_ledger` |
| Columns: `snake_case`, singular | `created_at`, `product_sku_id` |
| Primary keys: `id` | Always `UUID PRIMARY KEY DEFAULT gen_random_uuid()` |
| Foreign keys: `referenced_table_singular_id` | `warehouse_id`, `product_sku_id` |
| Indexes: `idx_table_column` | `idx_work_orders_tenant` |
| Unique constraints: `table_column1_column2_key` | `work_orders_tenant_wo_number_key` |
| Functions: `fn_verb_noun` | `fn_calculate_storage_charge` |
| Triggers: `trg_table_action` | `trg_inventory_ledger_update_bin` |
| Views: `v_subject_detail` | `v_inventory_snapshots` |

### TypeScript / Code
| Convention | Example |
|------------|---------|
| Files: `kebab-case` | `work-order.service.ts` |
| Modules: `kebab-case` directory | `inventory/`, `work-order/` |
| Types/Interfaces: `PascalCase` | `WorkOrder`, `JobOrderItem` |
| Functions: `camelCase` | `createWorkOrder()`, `getJoById()` |
| Constants: `UPPER_SNAKE_CASE` | `WO_TYPE.STOCK_TRANSFER` |
| Enums: `PascalCase` with string values | `enum WoStatus { DRAFT = 'DRAFT', APPROVED = 'APPROVED' }` |
| React components: `PascalCase` | `WorkOrderCard`, `InboundForm` |
| React hooks: `useCamelCase` | `useWorkOrder`, `useOrganization` |
| Props interface: `ComponentNameProps` | `WorkOrderCardProps` |

### API Routes
| Convention | Example |
|------------|---------|
| RESTful: `api/{module}/{action}` | `api/work-orders/create` |
| Webhooks: `api/webhooks/{provider}/{event}` | `api/webhooks/supabase/db-change` |
| Cron: `api/cron/{job-name}` | `api/cron/refresh-snapshots` |

### Workflow Definitions
| Convention | Example |
|------------|---------|
| Workflow name: `kebab-case` | `stock-transfer` |
| Version: `semver` | `v1` |
| Steps: `UPPER_SNAKE_CASE` | `GENERATE_PICKING_JO`, `WAIT_FOR_COMPLETION` |
| Actions: `camelCase` | `createJobOrder`, `checkAllSiblingJOs` |

---

## Appendix A: Migration 030 — Enterprise Schema

See `supabase/migrations/030_enterprise_schema.sql` for the full migration implementing all core entities described in section 4.

The migration includes:
- All tables from sections 4.1–4.5
- RLS policies at org + warehouse level
- LTREE extension for hierarchy queries
- Audit log trigger function
- Status history trigger function
- Partitioned table setup for ledger, audit, status
- Indexes for all query patterns
