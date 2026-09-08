// SENTRALOGIS — DATA-4E X2
// Targeted unit tests for dual-write RoleMutationService
// NO FULL REGRESSION. NO DB CALLS (mocked Supabase client).

import * as path from 'path';

function requireFromRoot(relativePath: string) {
  const projectRoot = process.cwd();
  return require(path.join(projectRoot, relativePath));
}

function buildCanonicalInsertMock(role: any) {
  return {
    insert: () => ({
      select: () => ({
        single: async () => ({ data: role, error: null as any }),
      }),
    }),
  };
}

function buildCanonicalRevokeMock(existing: any, updated: any) {
  return {
    select: () => {
      const chain: any = {};
      chain.eq = () => chain;
      chain.is = () => chain;
      chain.maybeSingle = async () => ({ data: existing, error: null as any });
      return chain;
    },
    update: () => ({
      eq: () => ({
        select: () => ({
          single: async () => ({ data: updated, error: null as any }),
        }),
      }),
    }),
  };
}

function buildLegacyUpdateMock(captured: { field?: string | null; value?: boolean | null; error?: any }) {
  return {
    update: (payload: any) => {
      captured.field = Object.keys(payload)[0] ?? null;
      captured.value = payload[captured.field as string] ?? null;
      const chain: any = { eq: () => chain };
      const terminal: any = async () => captured.error
        ? { data: null, error: captured.error }
        : { data: null, error: null };
      chain.eq = () => { chain.then = terminal; return chain; };
      // Make the await at the end of the .update().eq().eq() chain resolve
      // by returning a Promise-like that resolves to {data, error}
      const promiseLike: any = {
        then: (resolve: any) => resolve(captured.error
          ? { data: null, error: captured.error }
          : { data: null, error: null }),
      };
      // The service calls: const { error } = await this.supabase.from('md_entities').update(...).eq(...).eq(...)
      // So we return a thenable from the final .eq()
      const makeThenable = () => {
        const t: any = {};
        t.then = (resolve: any) => resolve(captured.error
          ? { data: null, error: captured.error }
          : { data: null, error: null });
        return t;
      };
      const finalChain: any = {};
      finalChain.eq = () => makeThenable();
      return { eq: () => finalChain };
    },
  };
}

export async function runX2RoleMutationServiceSuite() {
  const results: Array<{ testId: string; description: string; pass: boolean; error?: string }> = [];

  function addResult(testId: string, description: string, pass: boolean, error?: string) {
    results.push({ testId, description, pass, error });
    if (!pass) {
      console.log(`[FAIL] ${testId}: ${description}${error ? ' - ' + error : ''}`);
    } else {
      console.log(`[PASS] ${testId}: ${description}`);
    }
  }

  // ---------- T1: assignRole performs dual-write ----------
  try {
    const { RoleMutationService } = requireFromRoot('lib/domain/party/role-mutation-service');
    const canonicalRole = { id: 'r1', tenant_id: 't1', party_id: 'p1', role_type: 'VENDOR', context_type: 'GLOBAL', context_id: null, is_active: true };
    const captured: any = {};
    const fakeSupabase: any = {
      from: (table: string) => {
        if (table === 'party_roles') return buildCanonicalInsertMock(canonicalRole);
        if (table === 'md_entities') return buildLegacyUpdateMock(captured);
        return {};
      },
    };
    const svc = new RoleMutationService(fakeSupabase);
    const role = await svc.assignRole('t1', { party_id: 'p1', role_type: 'VENDOR', context_type: 'GLOBAL' });
    addResult('X2-T1', 'compatibility write updates is_vendor field', captured.field === 'is_vendor');
    addResult('X2-T2', 'compatibility write sets is_vendor=true', captured.value === true);
    addResult('X2-T3', 'assignRole returns canonical role', role?.id === 'r1');
    const log = svc.getAuditLog();
    addResult('X2-T4', 'audit entry has legacy_projection=SUCCESS', log[0]?.legacy_projection === 'SUCCESS');
  } catch (e: any) {
    addResult('X2-T1', 'dual-write happy path', false, e.message);
  }

  // ---------- T2: assignRole handles legacy failure ----------
  try {
    const { RoleMutationService, RoleMutationError } = requireFromRoot('lib/domain/party/role-mutation-service');
    const canonicalRole = { id: 'r1', is_active: true };
    const captured: any = { error: { message: 'simulated legacy failure' } };
    const fakeSupabase: any = {
      from: (table: string) => {
        if (table === 'party_roles') return buildCanonicalInsertMock(canonicalRole);
        if (table === 'md_entities') return buildLegacyUpdateMock(captured);
        return {};
      },
    };
    const svc = new RoleMutationService(fakeSupabase);
    let threw = false;
    let errMsg = '';
    try {
      await svc.assignRole('t1', { party_id: 'p1', role_type: 'VENDOR', context_type: 'GLOBAL' });
    } catch (e: any) {
      threw = e instanceof RoleMutationError;
      errMsg = e.message;
    }
    addResult('X2-T5', 'legacy failure throws RoleMutationError', threw);
    addResult('X2-T6', 'error message mentions legacy projection FAILED', errMsg.includes('legacy projection FAILED'));
    const compLog = svc.getCompensationLog();
    addResult('X2-T7', 'compensation log records the failed projection', compLog[0]?.legacy_projection === 'FAILED');
    addResult('X2-T8', 'compensation log includes the error', compLog[0]?.error?.includes('simulated legacy failure') ?? false);
  } catch (e: any) {
    addResult('X2-T2', 'legacy failure handling', false, e.message);
  }

  // ---------- T3: revokeRole performs dual-write ----------
  try {
    const { RoleMutationService } = requireFromRoot('lib/domain/party/role-mutation-service');
    let updateCalled = false;
    const captured: any = {};
    const fakeSupabase: any = {
      from: (table: string) => {
        if (table === 'party_roles') {
          return buildCanonicalRevokeMock(
            { id: 'r1', is_active: true },
            { id: 'r1', is_active: false }
          );
        }
        if (table === 'md_entities') return buildLegacyUpdateMock(captured);
        return {};
      },
    };
    const svc = new RoleMutationService(fakeSupabase);
    await svc.revokeRole('t1', { party_id: 'p1', role_type: 'VENDOR', context_type: 'GLOBAL' });
    addResult('X2-T9', 'revoke sets is_vendor=false', captured.value === false);
    const log = svc.getAuditLog();
    addResult('X2-T10', 'revoke audit records legacy_projection=SUCCESS', log[0]?.legacy_projection === 'SUCCESS');
    addResult('X2-T11', 'revoke audit records action=REVOKE', log[0]?.action === 'REVOKE');
  } catch (e: any) {
    addResult('X2-T3', 'revoke dual-write', false, e.message);
  }

  // ---------- T4: 4 legacy role types map to correct boolean fields ----------
  try {
    const { RoleMutationService } = requireFromRoot('lib/domain/party/role-mutation-service');
    const mappings: Array<{ role: 'CUSTOMER'|'SUPPLIER'|'VENDOR'|'BROKER'; field: string }> = [
      { role: 'CUSTOMER', field: 'is_customer' },
      { role: 'SUPPLIER', field: 'is_supplier' },
      { role: 'VENDOR', field: 'is_vendor' },
      { role: 'BROKER', field: 'is_broker' },
    ];
    let allCorrect = true;
    for (const m of mappings) {
      const captured: any = {};
      const fakeSupabase: any = {
        from: (table: string) => {
          if (table === 'party_roles') return buildCanonicalInsertMock({ id: 'r1', is_active: true });
          if (table === 'md_entities') return buildLegacyUpdateMock(captured);
          return {};
        },
      };
      const svc = new RoleMutationService(fakeSupabase);
      await svc.assignRole('t1', { party_id: 'p1', role_type: m.role, context_type: 'GLOBAL' });
      if (captured.field !== m.field) {
        allCorrect = false;
        addResult(`X2-T12-${m.role}`, `${m.role} maps to ${m.field}`, false, `got ${captured.field}`);
      } else {
        addResult(`X2-T12-${m.role}`, `${m.role} maps to ${m.field}`, true);
      }
    }
    addResult('X2-T13', 'all 4 legacy role types map correctly', allCorrect);
  } catch (e: any) {
    addResult('X2-T4', 'role-type mapping', false, e.message);
  }

  // ---------- T5: non-legacy role types (CARRIER, BILL_TO) do not project ----------
  try {
    const { RoleMutationService } = requireFromRoot('lib/domain/party/role-mutation-service');
    let legacyCalled = false;
    const fakeSupabase: any = {
      from: (table: string) => {
        if (table === 'party_roles') return buildCanonicalInsertMock({ id: 'r1', is_active: true });
        if (table === 'md_entities') {
          legacyCalled = true;
          return buildLegacyUpdateMock({});
        }
        return {};
      },
    };
    const svc = new RoleMutationService(fakeSupabase);
    await svc.assignRole('t1', { party_id: 'p1', role_type: 'CARRIER', context_type: 'GLOBAL' });
    addResult('X2-T14', 'CARRIER role does not trigger legacy projection (no legacy field)', !legacyCalled);
  } catch (e: any) {
    addResult('X2-T5', 'non-legacy role', false, e.message);
  }

  // ---------- T6: Server action file ----------
  try {
    const fs = require('fs');
    const src = fs.readFileSync(path.join(process.cwd(), 'lib/actions/role-mutation-actions.ts'), 'utf8');
    addResult('X2-T15', 'server action file has use server directive', src.includes("'use server'"));
    addResult('X2-T16', 'server action exports assignRoleAction', /export async function assignRoleAction/.test(src));
    addResult('X2-T17', 'server action exports revokeRoleAction', /export async function revokeRoleAction/.test(src));
    addResult('X2-T18', 'server action exports assignVendorRoleAction', /export async function assignVendorRoleAction/.test(src));
    addResult('X2-T19', 'server action exports revokeVendorRoleAction', /export async function revokeVendorRoleAction/.test(src));
    addResult('X2-T20', 'server action uses createAdminClient', /createAdminClient/.test(src));
  } catch (e: any) {
    addResult('X2-T6', 'server action module', false, e.message);
  }

  return results;
}

if (require.main === module) {
  (async () => {
    const results = await runX2RoleMutationServiceSuite();
    const failed = results.filter(r => !r.pass).length;
    console.log(`\nX2 total: ${results.length - failed}/${results.length} PASS`);
    if (failed > 0) process.exit(1);
  })();
}
