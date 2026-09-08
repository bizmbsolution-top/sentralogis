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

describe('Phase TOKEN-3 Token Foundation', () => {
  // =========================================================================
  // Migration Tests
  // =========================================================================
  describe('Migrations', () => {
    test('token foundation migration exists', () => {
      expect(fileExists('supabase/migrations/20260902_032_token_foundation.sql')).toBe(true);
    });

    test('tenant_token_prices table is created', () => {
      const migration = readFile('supabase/migrations/20260902_032_token_foundation.sql');
      expect(migration).toContain('CREATE TABLE IF NOT EXISTS public.tenant_token_prices');
      expect(migration).toContain('tenant_id');
      expect(migration).toContain('price_per_token');
      expect(migration).toContain('effective_from');
      expect(migration).toContain('effective_to');
      expect(migration).toContain('is_active');
    });

    test('tenant_service_rates table is created', () => {
      const migration = readFile('supabase/migrations/20260902_032_token_foundation.sql');
      expect(migration).toContain('CREATE TABLE IF NOT EXISTS public.tenant_service_rates');
      expect(migration).toContain('service_type');
      expect(migration).toContain('tokens_per_completion');
    });

    test('token_consumption_events table is created', () => {
      const migration = readFile('supabase/migrations/20260902_032_token_foundation.sql');
      expect(migration).toContain('CREATE TABLE IF NOT EXISTS public.token_consumption_events');
      expect(migration).toContain('source_type');
      expect(migration).toContain('source_id');
      expect(migration).toContain('service_type');
      expect(migration).toContain('tokens_consumed');
      expect(migration).toContain('token_value_snapshot');
      expect(migration).toContain('monetary_equivalent');
      expect(migration).toContain('idempotency_key');
    });

    test('idempotency unique constraint exists', () => {
      const migration = readFile('supabase/migrations/20260902_032_token_foundation.sql');
      expect(migration).toContain('UNIQUE (tenant_id, source_type, source_id, service_type)');
    });

    test('RLS is enabled on all tables', () => {
      const migration = readFile('supabase/migrations/20260902_032_token_foundation.sql');
      expect(migration).toContain('ALTER TABLE public.tenant_token_prices ENABLE ROW LEVEL SECURITY');
      expect(migration).toContain('ALTER TABLE public.tenant_service_rates ENABLE ROW LEVEL SECURITY');
      expect(migration).toContain('ALTER TABLE public.token_consumption_events ENABLE ROW LEVEL SECURITY');
    });

    test('tenant isolation policies exist', () => {
      const migration = readFile('supabase/migrations/20260902_032_token_foundation.sql');
      expect(migration).toContain('tenant_id = get_my_tenant_id()');
    });
  });

  // =========================================================================
  // Domain Types Tests
  // =========================================================================
  describe('Domain Types', () => {
    test('token types file exists', () => {
      expect(fileExists('lib/token/types.ts')).toBe(true);
    });

    test('TenantTokenPrice interface exists', () => {
      const types = readFile('lib/token/types.ts');
      expect(types).toContain('export interface TenantTokenPrice');
    });

    test('TenantServiceRate interface exists', () => {
      const types = readFile('lib/token/types.ts');
      expect(types).toContain('export interface TenantServiceRate');
    });

    test('TokenConsumptionEvent interface exists', () => {
      const types = readFile('lib/token/types.ts');
      expect(types).toContain('export interface TokenConsumptionEvent');
    });

    test('TokenServiceType enum exists', () => {
      const types = readFile('lib/token/types.ts');
      expect(types).toContain("'TRUCKING'");
      expect(types).toContain("'CUSTOMS'");
      expect(types).toContain("'WMS_INBOUND'");
      expect(types).toContain("'WMS_OUTBOUND'");
      expect(types).toContain("'WMS_TRANSFER'");
      expect(types).toContain("'FORWARDING'");
    });

    test('TokenSourceType enum exists', () => {
      const types = readFile('lib/token/types.ts');
      expect(types).toContain("'JO'");
      expect(types).toContain("'SHP'");
      expect(types).toContain("'CUS_DECLARATION'");
      expect(types).toContain("'WH_INBOUND'");
      expect(types).toContain("'WH_OUTBOUND'");
      expect(types).toContain("'WH_TRANSFER'");
    });
  });

  // =========================================================================
  // Repository Tests
  // =========================================================================
  describe('Repository', () => {
    test('token repository file exists', () => {
      expect(fileExists('lib/token/repository.ts')).toBe(true);
    });

    test('createTenantTokenPrice function exists', () => {
      const repo = readFile('lib/token/repository.ts');
      expect(repo).toContain('export async function createTenantTokenPrice');
    });

    test('getActiveTokenPrice function exists', () => {
      const repo = readFile('lib/token/repository.ts');
      expect(repo).toContain('export async function getActiveTokenPrice');
    });

    test('createTenantServiceRate function exists', () => {
      const repo = readFile('lib/token/repository.ts');
      expect(repo).toContain('export async function createTenantServiceRate');
    });

    test('getActiveServiceRate function exists', () => {
      const repo = readFile('lib/token/repository.ts');
      expect(repo).toContain('export async function getActiveServiceRate');
    });

    test('recordConsumptionEvent function exists', () => {
      const repo = readFile('lib/token/repository.ts');
      expect(repo).toContain('export async function recordConsumptionEvent');
    });

    test('getBalance function exists', () => {
      const repo = readFile('lib/token/repository.ts');
      expect(repo).toContain('export async function getTokenBalance');
    });

    test('deductTokenBalance function exists', () => {
      const repo = readFile('lib/token/repository.ts');
      expect(repo).toContain('export async function deductTokenBalance');
    });

    test('assertPermission is used for authorization', () => {
      const repo = readFile('lib/token/repository.ts');
      expect(repo).toContain('assertPermission');
    });
  });

  // =========================================================================
  // Service Tests
  // =========================================================================
  describe('Service', () => {
    test('token service file exists', () => {
      expect(fileExists('lib/token/service.ts')).toBe(true);
    });

    test('TokenService class exists', () => {
      const service = readFile('lib/token/service.ts');
      expect(service).toContain('export class TokenService');
    });

    test('consumeToken method exists', () => {
      const service = readFile('lib/token/service.ts');
      expect(service).toContain('async consumeToken');
    });

    test('getBalance method exists', () => {
      const service = readFile('lib/token/service.ts');
      expect(service).toContain('async getBalance');
    });

    test('insufficient balance is handled', () => {
      const service = readFile('lib/token/service.ts');
      expect(service).toContain('TOKEN_INSUFFICIENT_BALANCE');
    });

    test('duplicate consumption is rejected', () => {
      const service = readFile('lib/token/service.ts');
      expect(service).toContain('TOKEN_DUPLICATE_CONSUMPTION');
    });
  });

  // =========================================================================
  // Security Tests
  // =========================================================================
  describe('Security', () => {
    test('no browser supabase client in token code', () => {
      const repo = readFile('lib/token/repository.ts');
      const service = readFile('lib/token/service.ts');
      expect(repo).not.toContain('supabase/client');
      expect(service).not.toContain('supabase/client');
    });

    test('no client tenant authority in token code', () => {
      const repo = readFile('lib/token/repository.ts');
      const service = readFile('lib/token/service.ts');
      expect(repo).not.toMatch(/body\.tenant_id/);
      expect(service).not.toMatch(/body\.tenant_id/);
    });
  });
});
