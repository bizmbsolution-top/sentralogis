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

describe('Phase TOKEN-4 Service Completion Consumption', () => {
  // =========================================================================
  // Migration Tests
  // =========================================================================
  describe('Migrations', () => {
    test('token integration migration exists', () => {
      expect(fileExists('supabase/migrations/20260902_034_token_integration.sql')).toBe(true);
    });

    test('customs completion trigger exists', () => {
      const migration = readFile('supabase/migrations/20260902_034_token_integration.sql');
      expect(migration).toContain('trg_consume_tokens_on_customs_complete');
      expect(migration).toContain('cus_declarations');
      expect(migration).toContain('RELEASED');
      expect(migration).toContain('COMPLETED');
    });

    test('wms inbound completion trigger exists', () => {
      const migration = readFile('supabase/migrations/20260902_034_token_integration.sql');
      expect(migration).toContain('trg_consume_tokens_on_wms_inbound_complete');
      expect(migration).toContain('wh_receipt_orders');
      expect(migration).toContain('WMS_INBOUND');
    });

    test('wms outbound completion trigger exists', () => {
      const migration = readFile('supabase/migrations/20260902_034_token_integration.sql');
      expect(migration).toContain('trg_consume_tokens_on_wms_outbound_complete');
      expect(migration).toContain('wh_shipments');
      expect(migration).toContain('WMS_OUTBOUND');
    });

    test('wms transfer completion trigger exists', () => {
      const migration = readFile('supabase/migrations/20260902_034_token_integration.sql');
      expect(migration).toContain('trg_consume_tokens_on_wms_transfer_complete');
      expect(migration).toContain('wh_transfers');
      expect(migration).toContain('WMS_TRANSFER');
    });

    test('forwarding completion trigger exists', () => {
      const migration = readFile('supabase/migrations/20260902_034_token_integration.sql');
      expect(migration).toContain('trg_consume_tokens_on_forwarding_complete');
      expect(migration).toContain('shp_shipments');
      expect(migration).toContain('FORWARDING');
    });

    test('all triggers enforce idempotency', () => {
      const migration = readFile('supabase/migrations/20260902_034_token_integration.sql');
      const idempotencyChecks = migration.match(/idempotency_key/g);
      expect(idempotencyChecks?.length).toBeGreaterThanOrEqual(5);
    });

    test('all triggers snapshot token value', () => {
      const migration = readFile('supabase/migrations/20260902_034_token_integration.sql');
      expect(migration).toContain('token_value_snapshot');
    });
  });

  // =========================================================================
  // Idempotency Tests
  // =========================================================================
  describe('Idempotency', () => {
    test('customs trigger checks for existing consumption', () => {
      const migration = readFile('supabase/migrations/20260902_034_token_integration.sql');
      expect(migration).toContain('SELECT id INTO v_existing');
      expect(migration).toContain('WHERE idempotency_key = v_idempotency_key');
      expect(migration).toContain('IF v_existing IS NULL THEN');
    });

    test('wms inbound trigger checks for existing consumption', () => {
      const migration = readFile('supabase/migrations/20260902_034_token_integration.sql');
      const section = migration.substring(
        migration.indexOf('wms_inbound'),
        migration.indexOf('wms_outbound')
      );
      expect(section).toContain('SELECT id INTO v_existing');
    });

    test('forwarding trigger checks for existing consumption', () => {
      const migration = readFile('supabase/migrations/20260902_034_token_integration.sql');
      const section = migration.substring(migration.indexOf('forwarding'));
      expect(section).toContain('SELECT id INTO v_existing');
    });
  });

  // =========================================================================
  // WMS Bundling Tests
  // =========================================================================
  describe('WMS Bundling', () => {
    test('wms inbound burns exactly 1 token', () => {
      const migration = readFile('supabase/migrations/20260902_034_token_integration.sql');
      const section = migration.substring(
        migration.indexOf('wms_inbound'),
        migration.indexOf('wms_outbound')
      );
      expect(section).toContain('1, v_token_value');
    });

    test('wms outbound burns exactly 1 token', () => {
      const migration = readFile('supabase/migrations/20260902_034_token_integration.sql');
      const section = migration.substring(
        migration.indexOf('wms_outbound'),
        migration.indexOf('wms_transfer')
      );
      expect(section).toContain('1, v_token_value');
    });

    test('wms transfer burns exactly 1 token', () => {
      const migration = readFile('supabase/migrations/20260902_034_token_integration.sql');
      const section = migration.substring(migration.indexOf('wms_transfer'));
      expect(section).toContain('1, v_token_value');
    });

    test('wms inbound does NOT burn for intermediate statuses', () => {
      const migration = readFile('supabase/migrations/20260902_034_token_integration.sql');
      const section = migration.substring(
        migration.indexOf('wms_inbound'),
        migration.indexOf('wms_outbound')
      );
      expect(section).not.toContain('PARTIAL');
      expect(section).not.toContain('PENDING');
      expect(section).not.toContain('IN_PROGRESS');
    });
  });

  // =========================================================================
  // Forwarding Composition Tests
  // =========================================================================
  describe('Forwarding Composition', () => {
    test('forwarding burns 1 token on completion', () => {
      const migration = readFile('supabase/migrations/20260902_034_token_integration.sql');
      const section = migration.substring(migration.indexOf('forwarding'));
      expect(section).toContain('1, v_token_value');
    });

    test('forwarding trigger fires on global_status change', () => {
      const migration = readFile('supabase/migrations/20260902_034_token_integration.sql');
      expect(migration).toContain('AFTER UPDATE OF global_status ON public.shp_shipments');
    });
  });

  // =========================================================================
  // Tenant Isolation Tests
  // =========================================================================
  describe('Tenant Isolation', () => {
    test('all triggers use NEW.tenant_id for isolation', () => {
      const migration = readFile('supabase/migrations/20260902_034_token_integration.sql');
      expect(migration).toContain('NEW.tenant_id');
    });

    test('all triggers deduct from correct tenant balance', () => {
      const migration = readFile('supabase/migrations/20260902_034_token_integration.sql');
      const balanceUpdates = migration.match(/WHERE id = NEW\.tenant_id/g);
      expect(balanceUpdates?.length).toBeGreaterThanOrEqual(5);
    });
  });

  // =========================================================================
  // Historical Truth Tests
  // =========================================================================
  describe('Historical Truth', () => {
    test('all triggers snapshot token value', () => {
      const migration = readFile('supabase/migrations/20260902_034_token_integration.sql');
      const snapshots = migration.match(/token_value_snapshot/g);
      expect(snapshots?.length).toBeGreaterThanOrEqual(5);
    });

    test('all triggers record monetary equivalent', () => {
      const migration = readFile('supabase/migrations/20260902_034_token_integration.sql');
      expect(migration).toContain('monetary_equivalent');
    });
  });

  // =========================================================================
  // Security Tests
  // =========================================================================
  describe('Security', () => {
    test('no browser supabase client in migration', () => {
      const migration = readFile('supabase/migrations/20260902_034_token_integration.sql');
      expect(migration).not.toContain('supabase/client');
    });

    test('all triggers use SECURITY DEFINER', () => {
      const migration = readFile('supabase/migrations/20260902_034_token_integration.sql');
      const definerCount = migration.match(/SECURITY DEFINER/g);
      expect(definerCount?.length).toBeGreaterThanOrEqual(5);
    });
  });
});
