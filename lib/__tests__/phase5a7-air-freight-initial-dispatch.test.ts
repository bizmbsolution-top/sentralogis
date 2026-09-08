import fs from 'fs';
import path from 'path';
import { describe, test, expect } from 'vitest';

const ROOT = process.cwd();

function readFile(relPath: string): string {
  const abs = path.isAbsolute(relPath) ? relPath : path.join(ROOT, relPath);
  return fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8') : '';
}

function fileExists(relPath: string): boolean {
  const abs = path.isAbsolute(relPath) ? relPath : path.join(ROOT, relPath);
  return fs.existsSync(abs);
}

describe('Phase 5A Wave 7 — Air Freight Initial Dispatch', () => {
  // =========================================================================
  // A. BASIC AIR FREIGHT DATA — TYPE CONTRACT
  // =========================================================================
  describe('Air Freight Type Contract', () => {
    test('ExecutionLeg interface includes aircraft_name and flight_number', () => {
      const src = readFile('lib/domain/shipment/types.ts');
      expect(src).toContain('aircraft_name?: string | null');
      expect(src).toContain('flight_number?: string | null');
    });

    test('CreateExecutionLegDTO includes aircraft_name and flight_number', () => {
      const src = readFile('lib/domain/shipment/types.ts');
      expect(src).toContain('aircraft_name?: string');
      expect(src).toContain('flight_number?: string');
    });

    test('TransportMode union includes AIR_FREIGHT', () => {
      const src = readFile('lib/domain/shipment/types.ts');
      expect(src).toContain("'AIR_FREIGHT'");
    });
  });

  // =========================================================================
  // B. DOMAIN LAYER PASS-THROUGH
  // =========================================================================
  describe('Domain Layer Pass-Through', () => {
    test('execution-plan-service preserves aircraft_name and flight_number', () => {
      const src = readFile('lib/domain/shipment/execution-plan-service.ts');
      expect(src).toContain('aircraft_name: l.aircraft_name || null');
      expect(src).toContain('flight_number: l.flight_number || null');
    });

    test('repository inserts aircraft_name and flight_number', () => {
      const src = readFile('lib/domain/shipment/repository.ts');
      expect(src).toContain('aircraft_name: l.aircraft_name');
      expect(src).toContain('flight_number: l.flight_number');
    });
  });

  // =========================================================================
  // C. API ROUTE ACCEPTANCE
  // =========================================================================
  describe('API Route Acceptance', () => {
    test('POST /api/v1/forwarding/shipments/[id]/legs accepts air freight fields', () => {
      const src = readFile('app/api/v1/forwarding/shipments/[id]/legs/route.ts');
      expect(src).toContain('aircraft_name: body.aircraft_name || null');
      expect(src).toContain('flight_number: body.flight_number || null');
    });

    test('PATCH /api/v1/forwarding/shipments/[id]/legs/[legId] allows updating air freight fields', () => {
      const src = readFile('app/api/v1/forwarding/shipments/[id]/legs/[legId]/route.ts');
      expect(src).toContain("if (body.aircraft_name !== undefined) allowedUpdates.aircraft_name = body.aircraft_name;");
      expect(src).toContain("if (body.flight_number !== undefined) allowedUpdates.flight_number = body.flight_number;");
    });

    test('POST /api/v1/forwarding/shipments/[id]/execution-plan includes air freight fields in bulk insert', () => {
      const src = readFile('app/api/v1/forwarding/shipments/[id]/execution-plan/route.ts');
      expect(src).toContain('aircraft_name: l.aircraft_name');
      expect(src).toContain('flight_number: l.flight_number');
    });
  });

  // =========================================================================
  // D. UI CONDITIONAL RENDERING
  // =========================================================================
  describe('UI Conditional Rendering', () => {
    test('ExecutionLegEditor shows aircraft_name and flight_number for AIR_FREIGHT', () => {
      const src = readFile('components/workspaces/forwarding/ExecutionPlanBuilder/ExecutionLegEditor.tsx');
      expect(src).toContain("transportMode === 'AIR_FREIGHT'");
      expect(src).toContain('setAircraftName(initialLeg.aircraft_name || \'\')');
      expect(src).toContain('setFlightNumber(initialLeg.flight_number || \'\')');
      expect(src).toContain('aircraft_name: aircraftName.trim() || undefined');
      expect(src).toContain('flight_number: flightNumber.trim() || undefined');
    });

    test('ExecutionLegCard displays aircraft_name and flight_number for AIR_FREIGHT', () => {
      const src = readFile('components/workspaces/forwarding/ExecutionPlanBuilder/ExecutionLegCard.tsx');
      expect(src).toContain("leg.transport_mode === 'AIR_FREIGHT'");
      expect(src).toContain('leg.aircraft_name');
      expect(src).toContain('leg.flight_number');
    });

    test('ExecutionPlanBuilder maps air freight fields when saving plan', () => {
      const src = readFile('components/workspaces/forwarding/ExecutionPlanBuilder/ExecutionPlanBuilder.tsx');
      expect(src).toContain('aircraft_name: l.aircraft_name || undefined');
      expect(src).toContain('flight_number: l.flight_number || undefined');
    });
  });

  // =========================================================================
  // E. SEA FREIGHT UNCHANGED
  // =========================================================================
  describe('Sea Freight Unchanged', () => {
    test('OCEAN_VESSEL option still exists in transport mode dropdown', () => {
      const src = readFile('components/workspaces/forwarding/ExecutionPlanBuilder/ExecutionLegEditor.tsx');
      expect(src).toContain('value="OCEAN_VESSEL"');
    });

    test('OCEAN_VESSEL rendering unchanged in ExecutionLegCard', () => {
      const src = readFile('components/workspaces/forwarding/ExecutionPlanBuilder/ExecutionLegCard.tsx');
      expect(src).toContain("case 'OCEAN_VESSEL':");
      expect(src).toContain('OCEAN VESSEL');
    });

    test('vessel_name still on fw_consolidations (Sea Freight legacy)', () => {
      const migDir = path.join(ROOT, 'supabase', 'migrations');
      const files = fs.readdirSync(migDir).filter((f: string) => f.endsWith('.sql'));
      const hasVessel = files.some(f => {
        const content = fs.readFileSync(path.join(migDir, f), 'utf8');
        return content.includes('vessel_name') && content.includes('fw_consolidations');
      });
      expect(hasVessel).toBe(true);
    });
  });

  // =========================================================================
  // F. SERVER AUTHORITY & TENANT ISOLATION
  // =========================================================================
  describe('Server Authority & Tenant Isolation', () => {
    test('leg API routes use resolveApiAuthContext (server-derived tenant)', () => {
      const postSrc = readFile('app/api/v1/forwarding/shipments/[id]/legs/route.ts');
      const patchSrc = readFile('app/api/v1/forwarding/shipments/[id]/legs/[legId]/route.ts');
      expect(postSrc).toContain('resolveApiAuthContext');
      expect(patchSrc).toContain('resolveApiAuthContext');
      expect(postSrc).toContain('auth.tenantId');
      expect(patchSrc).toContain('auth.tenantId');
    });

    test('leg mutations filter by tenant_id in UPDATE/DELETE', () => {
      const patchSrc = readFile('app/api/v1/forwarding/shipments/[id]/legs/[legId]/route.ts');
      expect(patchSrc).toContain(".eq('tenant_id', auth.tenantId)");
    });

    test('RLS policy exists on shp_execution_legs', () => {
      const migDir = path.join(ROOT, 'supabase', 'migrations');
      const files = fs.readdirSync(migDir).filter((f: string) => f.endsWith('.sql'));
      const hasRLS = files.some(f => {
        const content = fs.readFileSync(path.join(migDir, f), 'utf8');
        return content.includes('shp_execution_legs') && content.includes('RLS');
      });
      expect(hasRLS).toBe(true);
    });
  });

  // =========================================================================
  // G. MIGRATION
  // =========================================================================
  describe('Migration', () => {
    test('Wave 7 migration exists and adds air freight columns', () => {
      const migDir = path.join(ROOT, 'supabase', 'migrations');
      const files = fs.readdirSync(migDir).filter((f: string) => f.endsWith('.sql'));
      const wave7 = files.find((f: string) => f.includes('054_air_freight_initial_dispatch'));
      expect(wave7).toBeDefined();
      if (wave7) {
        const content = fs.readFileSync(path.join(migDir, wave7), 'utf8');
        expect(content).toContain('ALTER TABLE public.shp_execution_legs');
        expect(content).toContain('aircraft_name TEXT');
        expect(content).toContain('flight_number TEXT');
      }
    });
  });

  // =========================================================================
  // H. SCOPE CONTAINMENT — OUT OF SCOPE VERIFICATION
  // =========================================================================
  describe('Scope Containment', () => {
    test('NO AWB columns in shp_shipments', () => {
      const migDir = path.join(ROOT, 'supabase', 'migrations');
      const files = fs.readdirSync(migDir).filter((f: string) => f.endsWith('.sql'));
      const hasAWB = files.some(f => {
        const content = fs.readFileSync(path.join(migDir, f), 'utf8');
        return content.includes('shp_shipments') && /awb|mawb|hawb/i.test(content);
      });
      expect(hasAWB).toBe(false);
    });

    test('NO airline columns in any migration', () => {
      const migDir = path.join(ROOT, 'supabase', 'migrations');
      const files = fs.readdirSync(migDir).filter((f: string) => f.endsWith('.sql'));
      const hasAirline = files.some(f => {
        const content = fs.readFileSync(path.join(migDir, f), 'utf8');
        return /airline|iata|icao|aircraft_registration|aircraft_type/i.test(content);
      });
      expect(hasAirline).toBe(false);
    });

    test('NO airport master table', () => {
      const migDir = path.join(ROOT, 'supabase', 'migrations');
      const files = fs.readdirSync(migDir).filter((f: string) => f.endsWith('.sql'));
      const hasAirportMaster = files.some(f => {
        const content = fs.readFileSync(path.join(migDir, f), 'utf8');
        return content.includes('md_airports') || content.includes('md_aircraft');
      });
      expect(hasAirportMaster).toBe(false);
    });

    test('NO ULD or air cargo manifest columns', () => {
      const migDir = path.join(ROOT, 'supabase', 'migrations');
      const files = fs.readdirSync(migDir).filter((f: string) => f.endsWith('.sql'));
      const hasULD = files.some(f => {
        const content = fs.readFileSync(path.join(migDir, f), 'utf8');
        return /\buld\b|unit_load_device|air_cargo_manifest/i.test(content);
      });
      expect(hasULD).toBe(false);
    });

    test('NO new Air Freight capability code added to registry', () => {
      const src = readFile('lib/application/capabilities/types.ts');
      expect(src).not.toContain('AIR_FREIGHT');
      const regSrc = readFile('lib/application/capabilities/registry.ts');
      expect(regSrc).not.toContain('AIR_FREIGHT');
    });

    test('NO new Air Freight domain or service files', () => {
      const airFiles = [
        'lib/domain/air-freight',
        'lib/domain/air_freight',
        'lib/application/air-freight',
        'lib/application/air_freight'
      ];
      for (const rel of airFiles) {
        const abs = path.join(ROOT, rel);
        expect(fs.existsSync(abs)).toBe(false);
      }
    });
  });

  // =========================================================================
  // I. SEMANTIC COMPATIBILITY WITH SEA FREIGHT
  // =========================================================================
  describe('Semantic Compatibility with Sea Freight', () => {
    test('Air Freight uses same route representation as Sea Freight (origin_location_id, destination_location_id)', () => {
      const src = readFile('lib/domain/shipment/types.ts');
      expect(src).toContain('origin_location_id: string');
      expect(src).toContain('destination_location_id: string');
    });

    test('Air Freight uses same schedule representation as Sea Freight (planned_start_at, planned_end_at)', () => {
      const src = readFile('lib/domain/shipment/types.ts');
      expect(src).toContain('planned_start_at?: string | null');
      expect(src).toContain('planned_end_at?: string | null');
    });

    test('Air Freight uses same transport mode enum as Sea Freight', () => {
      const src = readFile('lib/domain/shipment/types.ts');
      expect(src).toContain("'OCEAN_VESSEL'");
      expect(src).toContain("'AIR_FREIGHT'");
    });
  });
});
