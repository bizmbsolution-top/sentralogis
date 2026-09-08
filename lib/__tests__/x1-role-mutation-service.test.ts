// SENTRALOGIS — DATA-4E X1
// Targeted unit tests for RoleMutationService
// NO FULL REGRESSION. NO DB CALLS (mocked Supabase client).

import * as path from 'path';

function requireFromRoot(relativePath: string) {
  const projectRoot = process.cwd();
  return require(path.join(projectRoot, relativePath));
}

export async function runX1RoleMutationServiceSuite() {
  const results: Array<{ testId: string; description: string; pass: boolean; error?: string }> = [];

  function addResult(testId: string, description: string, pass: boolean, error?: string) {
    results.push({ testId, description, pass, error });
    if (!pass) {
      console.log(`[FAIL] ${testId}: ${description}${error ? ' - ' + error : ''}`);
    } else {
      console.log(`[PASS] ${testId}: ${description}`);
    }
  }

  // ---------- T1: Service module loads ----------
  try {
    const mod = requireFromRoot('lib/domain/party/role-mutation-service');
    addResult('X1-T1', 'RoleMutationService module exports RoleMutationService', typeof mod.RoleMutationService === 'function');
    addResult('X1-T2', 'RoleMutationService module exports RoleMutationError', typeof mod.RoleMutationError === 'function');
    // TypeScript interfaces are erased at runtime; verify via source inspection.
    const fs = require('fs');
    const src = fs.readFileSync(path.join(process.cwd(), 'lib/domain/party/role-mutation-service.ts'), 'utf8');
    addResult('X1-T3', 'RoleMutationService source exports AssignRoleDTO', /export interface AssignRoleDTO/.test(src));
    addResult('X1-T4', 'RoleMutationService source exports RevokeRoleDTO', /export interface RevokeRoleDTO/.test(src));
  } catch (e: any) {
    addResult('X1-T1', 'RoleMutationService module loads', false, e.message);
  }

  // ---------- T2: assignRole validation ----------
  try {
    const { RoleMutationService, RoleMutationError } = requireFromRoot('lib/domain/party/role-mutation-service');
    const fakeSupabase: any = {
      from: (table: string) => {
        if (table === 'md_entities') {
          // X2: legacy projection mock (X1 service now includes dual-write)
          return { update: () => ({ eq: () => ({ eq: () => ({ data: null, error: null } as any) }) }) };
        }
        return { insert: () => ({ select: () => ({ single: async () => ({} as any) }) }) };
      }
    };
    const svc = new RoleMutationService(fakeSupabase);

    let threwNoPartyId = false;
    try { await svc.assignRole('t1', { party_id: '', role_type: 'VENDOR', context_type: 'GLOBAL' }); } catch (e: any) { if (e instanceof RoleMutationError) threwNoPartyId = true; }
    addResult('X1-T5', 'assignRole throws RoleMutationError on missing party_id', threwNoPartyId);

    let threwInvalidRole = false;
    try { await svc.assignRole('t1', { party_id: 'p1', role_type: 'BOGUS' as any, context_type: 'GLOBAL' }); } catch (e: any) { if (e instanceof RoleMutationError) threwInvalidRole = true; }
    addResult('X1-T6', 'assignRole throws RoleMutationError on invalid role_type', threwInvalidRole);

    let threwNoTenant = false;
    try { await svc.assignRole('', { party_id: 'p1', role_type: 'VENDOR', context_type: 'GLOBAL' }); } catch (e: any) { if (e instanceof RoleMutationError) threwNoTenant = true; }
    addResult('X1-T7', 'assignRole throws RoleMutationError on missing tenantId', threwNoTenant);

    let threwEngagementNoCtx = false;
    try { await svc.assignRole('t1', { party_id: 'p1', role_type: 'BILL_TO', context_type: 'ENGAGEMENT' }); } catch (e: any) { if (e instanceof RoleMutationError) threwEngagementNoCtx = true; }
    addResult('X1-T8', 'assignRole throws RoleMutationError on ENGAGEMENT without context_id', threwEngagementNoCtx);
  } catch (e: any) {
    addResult('X1-T2', 'assignRole validation', false, e.message);
  }

  // ---------- T3: revokeRole validation ----------
  try {
    const { RoleMutationService, RoleMutationError } = requireFromRoot('lib/domain/party/role-mutation-service');
    const fakeSupabase: any = {
      from: (table: string) => {
        if (table === 'md_entities') {
          return { update: () => ({ eq: () => ({ eq: () => ({ data: null, error: null } as any) }) }) };
        }
        return {
          select: () => ({ eq: () => ({ eq: () => ({ eq: () => ({ eq: () => ({ is: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null } as any) }) }) }) }) }) }) }),
          update: () => ({ eq: () => ({ select: () => ({ single: async () => ({} as any) }) }) })
        };
      }
    };
    const svc = new RoleMutationService(fakeSupabase);

    let threwNoRole = false;
    try { await svc.revokeRole('t1', { party_id: 'p1', role_type: 'VENDOR', context_type: 'GLOBAL' }); } catch (e: any) { if (e instanceof RoleMutationError && e.message.includes('No active role')) threwNoRole = true; }
    addResult('X1-T9', 'revokeRole throws when no active role exists', threwNoRole);

    let threwNoTenant = false;
    try { await svc.revokeRole('', { party_id: 'p1', role_type: 'VENDOR', context_type: 'GLOBAL' }); } catch (e: any) { if (e instanceof RoleMutationError && e.message.includes('tenantId')) threwNoTenant = true; }
    addResult('X1-T10', 'revokeRole throws on missing tenantId', threwNoTenant);
  } catch (e: any) {
    addResult('X1-T3', 'revokeRole validation', false, e.message);
  }

  // ---------- T4: Audit log in X1 ----------
  try {
    const { RoleMutationService } = requireFromRoot('lib/domain/party/role-mutation-service');
    const fakeSupabase: any = {
      from: (table: string) => {
        if (table === 'md_entities') {
          return { update: () => ({ eq: () => ({ eq: () => ({ data: null, error: null } as any) }) }) };
        }
        if (table === 'party_roles') {
          return {
            insert: () => ({ select: () => ({ single: async () => ({ data: { id: 'r1', tenant_id: 't1', party_id: 'p1', role_type: 'VENDOR', context_type: 'GLOBAL', context_id: null, is_active: true }, error: null } as any) }) }),
            select: () => ({ eq: () => ({ eq: () => ({ eq: () => ({ eq: () => ({ is: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: 'r1' }, error: null } as any) }) }) }) }) }) }) }),
            update: () => ({ eq: () => ({ select: () => ({ single: async () => ({ data: { id: 'r1', is_active: false }, error: null } as any) }) }) })
          };
        }
        return {};
      }
    };
    const svc = new RoleMutationService(fakeSupabase);
    const initialLog = svc.getAuditLog();
    addResult('X1-T11', 'audit log starts empty', initialLog.length === 0);

    await svc.assignRole('t1', { party_id: 'p1', role_type: 'VENDOR', context_type: 'GLOBAL' }, 'actor-1');
    const afterAssign = svc.getAuditLog();
    addResult('X1-T12', 'assignRole records an ASSIGN audit entry', afterAssign.length === 1 && afterAssign[0].action === 'ASSIGN');
    addResult('X1-T13', 'audit entry has actor_id when provided', afterAssign[0].actor_id === 'actor-1');
    addResult('X1-T14', 'audit entry has legacy_projection=SUCCESS (X2 dual-write active)', afterAssign[0].legacy_projection === 'SUCCESS');

    await svc.revokeRole('t1', { party_id: 'p1', role_type: 'VENDOR', context_type: 'GLOBAL' }, 'actor-1');
    const afterRevoke = svc.getAuditLog();
    addResult('X1-T15', 'revokeRole records a REVOKE audit entry', afterRevoke.length === 2 && afterRevoke[1].action === 'REVOKE');

    const returned = svc.getAuditLog() as any;
    returned.push({ tampered: true } as any);
    addResult('X1-T16', 'audit log getter returns a copy (not internal reference)', svc.getAuditLog().length === 2);
  } catch (e: any) {
    addResult('X1-T4', 'audit log', false, e.message);
  }

  // ---------- T5: Vocabulary inclusion (X1 covers 4 legacy types) ----------
  try {
    const { PARTY_ROLE_TYPES } = requireFromRoot('lib/domain/party/types');
    addResult('X1-T17', 'vocabulary includes CUSTOMER', PARTY_ROLE_TYPES.includes('CUSTOMER'));
    addResult('X1-T18', 'vocabulary includes SUPPLIER', PARTY_ROLE_TYPES.includes('SUPPLIER'));
    addResult('X1-T19', 'vocabulary includes VENDOR', PARTY_ROLE_TYPES.includes('VENDOR'));
    addResult('X1-T20', 'vocabulary includes BROKER', PARTY_ROLE_TYPES.includes('BROKER'));
  } catch (e: any) {
    addResult('X1-T5', 'vocabulary', false, e.message);
  }

  return results;
}

if (require.main === module) {
  (async () => {
    const results = await runX1RoleMutationServiceSuite();
    const failed = results.filter(r => !r.pass).length;
    console.log(`\nX1 total: ${results.length - failed}/${results.length} PASS`);
    if (failed > 0) process.exit(1);
  })();
}
