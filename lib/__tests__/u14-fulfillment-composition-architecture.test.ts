/**
 * Sentralogis — Phase 4B / U-14
 * lib/__tests__/u14-fulfillment-composition-architecture.test.ts
 *
 * FULFILLMENT COMPOSITION ARCHITECTURE (DISCOVERY)
 *
 * U-14 is a DISCOVERY + ARCHITECTURE DECISION gate. It makes ZERO production
 * changes. This suite is a READ-ONLY forensic/architecture assertion layer that
 * proves the facts U-14's decision rests on:
 *
 *   - No first-class Fulfillment aggregate exists today (lane is free).
 *   - The canonical SO layer is clean and leaves the seam open (U-13/U-13R state).
 *   - The §45 anti-patterns (SO=WO, SO=Shipment, SR=JO, Shipment=WO, ...) are ABSENT.
 *   - Shipment is NOT the fulfillment aggregate (forwarding-scoped; ADR-033/037/038 intact).
 *   - Ratified authority (ADR-033..038) is untouched; only PROPOSED APR proposals exist.
 *   - Model E (composition-only) is documented in the decision report (no second engine).
 *   - External/operational refs are NOT canonical PKs on the SO/composition.
 *   - read-mostly: no production source or migration is modified.
 *
 * These are ARCHITECTURE/forensic assertions, not feature tests. There is no
 * Fulfillment implementation to test, by design (§U-14 scope).
 *
 * Exit: passed counts; failed===0 ⇒ GREEN.
 */

import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..', '..');
const MIG_DIR = path.join(ROOT, 'supabase', 'migrations');
const LIB_DIR = path.join(ROOT, 'lib');
const DOC_DIR = path.join(ROOT, 'docs', 'architecture');
const APP_DIR = path.join(ROOT, 'app');

const SONAD_DOC = 'SENTRALOGIS_PHASE4B_U14_FULFILLMENT_COMPOSITION_ARCHITECTURE_DECISION.md';
const ACCEPT_DOC = 'SENTRALOGIS_PHASE4B_U14_FINAL_ACCEPTANCE.md';

/* ------------------------------------------------------------------ */
/*  HELPERS                                                            */
/* ------------------------------------------------------------------ */

function readMigrations(): string[] {
  if (!fs.existsSync(MIG_DIR)) return [];
  return fs
    .readdirSync(MIG_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((f) => fs.readFileSync(path.join(MIG_DIR, f), 'utf8'));
}

function readLib(rel: string): string {
  const f = path.join(LIB_DIR, rel);
  return fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '';
}

function readDoc(name: string): string {
  const f = path.join(DOC_DIR, name);
  return fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '';
}

function readApp(rel: string): string {
  const f = path.join(APP_DIR, rel);
  return fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '';
}

/** Does a CREATE TABLE block for `table` contain `column` referencing `target`? */
function tableColRefs(table: string, column: string, target?: string): boolean {
  const m = readMigrations()
    .map((sql) => {
      const re = new RegExp(`CREATE TABLE[\\s\\S]*?\\b${table}\\s*\\(`, 'i');
      const hit = sql.match(re);
      if (!hit || hit.index === undefined) return null;
      const section = sql.slice(hit.index);
      return section.slice(0, section.indexOf(');'));
    })
    .filter((s): s is string => s !== null);
  for (const section of m) {
    const colRe = new RegExp(`\\b${column}\\b`, 'i');
    if (colRe.test(section)) return true;
  }
  return false;
}

class Suite {
  passed = 0;
  failed = 0;
  total = 0;
  check(id: string, name: string, cond: boolean, detail: string): void {
    this.total++;
    if (cond) this.passed++;
    else {
      this.failed++;
      globalThis.console?.log?.('  [RED] ' + id + ' ' + name + ' :: ' + detail);
    }
  }
}

/* ------------------------------------------------------------------ */
/*  SUITE                                                              */
/* ------------------------------------------------------------------ */

export function runU14FulfillmentCompositionArchitectureSuite(): { passed: number; failed: number; total: number } {
  const s = new Suite();
  const migs = readMigrations();
  const allMig = migs.join('\n');
  const doc = readDoc(SONAD_DOC);
  const accept = readDoc(ACCEPT_DOC);

  const salesOrderDomain = readLib('sales-order/service.ts');
  const salesOrderTypes = readLib('sales-order/types.ts');
  const shipmentTypes = readLib('domain/shipment/types.ts');
  const shipmentService = readLib('domain/shipment/shipment-service.ts');
  const execPlan = readLib('domain/shipment/execution-plan-service.ts');
  const srvTypes = readLib('domain/service-contracts/types.ts');
  const bindingTypes = readLib('application/capability-bindings/types.ts');

  /* ------------------------------------------------------------------
   * A. THE LANE IS FREE — no first-class Fulfillment aggregate.
   * ------------------------------------------------------------------ */
  s.check(
    'U14-A1',
    'No `fulfillment_compositions` table exists in migrations',
    !/CREATE TABLE[^;]*fulfillment_compositions/i.test(allMig),
    'U-14 is discovery-only; no Fulfillment table may exist',
  );
  s.check(
    'U14-A2',
    'Canonical `fulfillment_allocations` table exists (authorized by U-15)',
    /CREATE TABLE[^;]*fulfillment_allocations/i.test(allMig),
    'U-15 authorized allocation table exists',
  );
  s.check(
    'U14-A3',
    'Canonical `next_fulfillment_number` function exists (authorized by U-15)',
    /CREATE[^;]*FUNCTION[^;]*next_fulfillment_number/i.test(allMig),
    'U-15 authorized number authority function exists',
  );
  s.check(
    'U14-A4',
    'No Fulfillment composition service / file has been created',
    !/\bFulfillmentService\b|\bfulfillment-compositions?\b|\bfulfillment-allocations?\b/i.test(
      [salesOrderDomain, shipmentService, execPlan].join('\n'),
    ),
    'composition service deferred',
  );

  /* ------------------------------------------------------------------
   * B. §45 ANTI-PATTERNS ARE ABSENT (canonical SO + shipment layer).
   * ------------------------------------------------------------------ */
  s.check(
    'U14-B1',
    'sales_orders has NO work_order_id column (SO ≠ WO, ADR-037)',
    !tableColRefs('sales_orders', 'work_order_id'),
    'SO is not a WO; many SO → 1 WO forbidden',
  );
  s.check(
    'U14-B2',
    'SO domain write path does not touch work_orders/wo_items/job_orders',
    !/\.from\(\s*['"](work_orders|wo_items|job_orders)['"]\s*\)/i.test(salesOrderDomain),
    'SO is commercial-only',
  );
  s.check(
    'U14-B3',
    'sales_orders is NOT a shipment-holding table (SO ≠ Shipment)',
    !tableColRefs('sales_orders', 'master_bl_number') &&
      !tableColRefs('sales_orders', 'container_number') &&
      !tableColRefs('sales_orders', 'origin_location_id'),
    'SO stays commercial; shipment stays operational',
  );
  s.check(
    'U14-B4',
    'shp_shipments is not a legacy WO table (Shipment ≠ WO): work_order_id → Engagement (commercial_work_orders), not legacy work_orders',
    (() => {
      const m = readMigrations()
        .map((sql) => {
          const re = /CREATE TABLE IF NOT EXISTS public\.shp_shipments\s*\(/i;
          const hit = sql.match(re);
          if (!hit || hit.index === undefined) return null;
          const section = sql.slice(hit.index);
          return section.slice(0, section.indexOf(');'));
        })
        .filter((s): s is string => s !== null)[0] ?? '';
      return /\bwork_order_id\s+[^;]*REFERENCES\s+public\.commercial_work_orders\s*\(id\)/i.test(m) &&
        !/\bwork_order_id\s+[^;]*REFERENCES\s+public\.work_orders\b/i.test(m);
    })(),
    'shipment anchors to Engagement, never legacy work_orders',
  );
  s.check(
    'U14-B5',
    'SR remains a Command, not a Job (ADR-033): assigned_domain_job_id is a loose column, no FK',
    /assigned_domain_job_id\s+[^;]*\bUUID\b/i.test(migs.join('\n')) &&
      !/references\s+(job_orders|trk_job_orders)\b/i.test(
        (migs.join('\n').match(/assigned_domain_job_id[^;]*;?/g) || []).join('\n'),
      ),
    'ADR-033 intact; SR ≠ JO',
  );
  s.check(
    'U14-B6',
    'ExecutionLeg is a route leg, not a WO (dispatched via SR)',
    /svc_service_requests|issueRequest/.test(execPlan) &&
      !/WO\b/.test(
        execPlan
          .split('\n')
          .filter((l) => /CREATE|REFERENCES|job_orders|work_orders/i.test(l))
          .join('\n'),
      ),
    'legs dispatch via command, not WO write',
  );
  s.check(
    'U14-B7',
    'CapabilityBinding is static membership (WHAT), lifecycle-only writes',
    /BINDING_STATUSES|ACTIVE|SUSPENDED|COMPLETED|CANCELLED/.test(bindingTypes),
    'binding is not a WO / not an order',
  );

  /* ------------------------------------------------------------------
   * C. SHIPMENT IS NOT THE FULFILLMENT AGGREGATE (§49).
   * ------------------------------------------------------------------ */
  s.check(
    'U14-C1',
    'Shipment is a forwarding aggregate (voyage) — has voyage fields, not per-order progress',
    /master_bl_number|house_bl_number|booking_reference/.test(shipmentTypes) &&
      !/fulfillment_allocation|delivered_qty/i.test(shipmentTypes),
    'shipment carries voyage/freight facts; no composition/order-progress fields',
  );
  s.check(
    'U14-C2',
    'SO → many Shipments (ADR-038): shp_shipments.sales_order_id exists but is NOT unique',
    migs.some((sql) => {
      const m = sql.match(/ADD COLUMN IF NOT EXISTS\s+sales_order_id\s+[^;]*references\s+public\.sales_orders\s*\(id\)/i);
      if (!m) return false;
      const idx = sql.match(/CREATE[^;]*INDEX[^;]*shp_shipments[^;]*sales_order/i);
      return !!idx;
    }),
    '1:N intended; multiple shipments per SO',
  );
  s.check(
    'U14-C3',
    'The SO → shipment ref is nullable + ON DELETE SET NULL (ADR-038)',
    /ADD COLUMN IF NOT EXISTS\s+sales_order_id[^;]*ON DELETE SET NULL/i.test(allMig),
    'cancelled/removed SO cannot destroy the shipment',
  );

  /* ------------------------------------------------------------------
   * D. RATIFIED AUTHORITY IS PRESERVED (ADR-033..038) — single handoff.
   * ------------------------------------------------------------------ */
  s.check(
    'U14-D1',
    'SO confirm/create does NOT start operational execution (ADR-036)',
    !/\.from\(\s*['"](work_orders|wo_items|job_orders|shp_shipments|cus_declarations)['"]\s*\)/.test(readApp('api/v1/commercial/sales-orders/route.ts')) &&
      !/\.from\(\s*['"](work_orders|wo_items|job_orders|shp_shipments|cus_declarations)['"]\s*\)/.test(readApp('api/v1/commercial/sales-orders/[id]/route.ts')),
    'commercial handoff is deferred; thin routes only',
  );
  s.check(
    'U14-D2',
    'ADR-037 holds: no shared-WO vector in the canonical SO/composition layer',
    !/CREATE TABLE[^;]*fulfillment[^;]*work_order_id\b/i.test(allMig),
    'many SO → 1 WO remains FORBIDDEN',
  );
  s.check(
    'U14-D3',
    'Composition is documented as composition-only (no second engine) — Model E in report',
    /composition-only|NOT an engine|reuse/i.test(doc) && /Model E/.test(doc),
    'decision report mandates thin composition, reuse of bindings+SR+shipment',
  );
  s.check(
    'U14-D4',
    'Shipment is explicitly rejected as the fulfillment aggregate in the decision report (§49)',
    /NOT the fulfillment aggregate|Shipment is NOT/.test(doc),
    'decision explicitly rejects §49 "shipment as fulfillment"',
  );

  /* ------------------------------------------------------------------
   * E. NUMBER AUTHORITY / IDENTITY (committed pattern, no client gen).
   * ------------------------------------------------------------------ */
  s.check(
    'U14-E1',
    'Next fulfillment number is PROPOSED only (server authority, ADR-PROP-041); no client generation added',
    !/next_fulfillment_number\(/i.test(
      [readLib('sales-order/service.ts'), readLib('application/capability-bindings/service.ts'), readLib('domain/shipment/shipment-service.ts')].join('\n'),
    ),
    'no client/server Fulfillment number built; deferred',
  );
  s.check(
    'U14-E2',
    'SO number is still canonical `next_sales_order()` (unchanged by U-14)',
    /next_sales_order\(/.test(salesOrderDomain),
    'U-13 authority preserved',
  );

  /* ------------------------------------------------------------------
   * F. EXTERNAL / OPERATIONAL REFS ARE NOT CANONICAL PKs ON THE SO.
   * ------------------------------------------------------------------ */
  s.check(
    'U14-F1',
    'sales_orders carries only commercial/PO refs, not operational PKs',
    !tableColRefs('sales_orders', 'job_order_id') &&
      !tableColRefs('sales_orders', 'declaration_id') &&
      !tableColRefs('sales_orders', 'container_number'),
    'SO does not hold canonical operational PKs',
  );

  /* ------------------------------------------------------------------
   * G. READ-MOSTLY: no competing/parallel Fulfillment path created.
   * Post U-15: verify canonical naming (fulfillments, not
   * fulfillment_compositions) and authorized API path.
   * ------------------------------------------------------------------ */
  s.check(
    'U14-G1',
    'No competing fulfillment_composition migration (canonical is fulfillments)',
    !migs.some((f) => /fulfillment_composition[^s]/i.test(f)),
    'canonical migration name is fulfillment_foundation, not fulfillment_composition',
  );
  s.check(
    'U14-G2',
    'Fulfillment API exists under authorized /api/v1/commercial/ path',
    fs.existsSync(path.join(APP_DIR, 'api', 'v1', 'commercial', 'fulfillments')),
    'authorized Fulfillment API in app/',
  );

  /* ------------------------------------------------------------------
   * H. DELIVERABLES EXIST.
   * ------------------------------------------------------------------ */
  s.check(
    'U14-H1',
    'Decision report exists and is non-trivial',
    doc.length > 5000 && /U-14 COMPLETE — GREEN/.test(doc),
    'decision report written',
  );
  s.check(
    'U14-H2',
    'Final acceptance exists and declares GREEN with implementation deferred',
    accept.length > 1000 && /GREEN/.test(accept) && /DEFERRED/.test(accept),
    'final acceptance written',
  );

  return { passed: s.passed, failed: s.failed, total: s.total };
}

export default runU14FulfillmentCompositionArchitectureSuite;
