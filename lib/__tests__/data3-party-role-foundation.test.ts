// DATA-3 Party Role Foundation Test Suite
// Runs in both vitest and regression runner contexts

import * as path from 'path';

// Mock vi for regression runner context
const vi = (() => {
  const fn = (...args: any[]) => fn;
  fn.mockReturnValue = (val: any) => fn;
  fn.mockImplementation = (impl: any) => fn;
  return { fn };
})();

// Resolve module path relative to project root
function requireFromRoot(relativePath: string) {
  const projectRoot = process.cwd();
  return require(path.join(projectRoot, relativePath));
}

export function runData3PartyRoleFoundationSuite() {
  const results: Array<{ testId: string; description: string; pass: boolean; error?: string }> = [];

  function addResult(testId: string, description: string, pass: boolean, error?: string) {
    results.push({ testId, description, pass, error });
    if (!pass) {
      console.log(`[FAIL] ${testId}: ${description}${error ? ' - ' + error : ''}`);
    } else {
      console.log(`[PASS] ${testId}: ${description}`);
    }
  }

  const tenantId = 'tenant-123';
  const partyId = 'party-456';

  // Test 1: Party Role Vocabulary Count
  try {
    const { PARTY_ROLE_TYPES } = requireFromRoot('lib/domain/party/types');
    addResult('D3-T1', 'Party role vocabulary has exactly 10 roles', PARTY_ROLE_TYPES.length === 10);
    addResult('D3-T2', 'Party role vocabulary contains CUSTOMER', PARTY_ROLE_TYPES.includes('CUSTOMER'));
    addResult('D3-T3', 'Party role vocabulary contains VENDOR', PARTY_ROLE_TYPES.includes('VENDOR'));
    addResult('D3-T4', 'Party role vocabulary does NOT contain SHIPPER', !PARTY_ROLE_TYPES.includes('SHIPPER'));
    addResult('D3-T5', 'Party role vocabulary does NOT contain CONSIGNEE', !PARTY_ROLE_TYPES.includes('CONSIGNEE'));
    addResult('D3-T6', 'Party role vocabulary does NOT contain NOTIFY_PARTY', !PARTY_ROLE_TYPES.includes('NOTIFY_PARTY'));
  } catch (e: any) {
    addResult('D3-T1', 'Party role vocabulary', false, e.message);
  }

  // Test 2: Context Types
  try {
    const { PARTY_ROLE_CONTEXT_TYPES } = requireFromRoot('lib/domain/party/types');
    addResult('D3-T7', 'Context types has exactly 4 types', PARTY_ROLE_CONTEXT_TYPES.length === 4);
    addResult('D3-T8', 'Context types does NOT contain SHIPMENT', !PARTY_ROLE_CONTEXT_TYPES.includes('SHIPMENT'));
  } catch (e: any) {
    addResult('D3-T7', 'Context types', false, e.message);
  }

  // Test 3: Party Role Types completeness
  try {
    const { PARTY_ROLE_TYPES } = requireFromRoot('lib/domain/party/types');
    const expected = ['CUSTOMER', 'VENDOR', 'SUPPLIER', 'BROKER', 'CARRIER', 'AGENT', 'BILL_TO', 'SHIP_TO', 'PAYER', 'ORDERING_PARTY'];
    const missing = expected.filter((r: string) => !PARTY_ROLE_TYPES.includes(r));
    addResult('D3-T9', 'All 10 expected roles present', missing.length === 0, missing.length > 0 ? `Missing: ${missing.join(', ')}` : undefined);
  } catch (e: any) {
    addResult('D3-T9', 'Party role completeness', false, e.message);
  }

  // Test 4: Party Relationship Types
  try {
    const { PARTY_RELATIONSHIP_TYPES } = requireFromRoot('lib/domain/party/types');
    addResult('D3-T10', 'Party relationship types defined', PARTY_RELATIONSHIP_TYPES.length >= 5);
    addResult('D3-T11', 'Relationship types include PARTNER', PARTY_RELATIONSHIP_TYPES.includes('PARTNER'));
  } catch (e: any) {
    addResult('D3-T10', 'Party relationship types', false, e.message);
  }

  // Test 5: Party Location Relationship Types
  try {
    const { PARTY_LOCATION_RELATIONSHIP_TYPES } = requireFromRoot('lib/domain/party/types');
    addResult('D3-T12', 'Party location relationship types defined', PARTY_LOCATION_RELATIONSHIP_TYPES.length >= 5);
    addResult('D3-T13', 'Location relationship types include OWNS', PARTY_LOCATION_RELATIONSHIP_TYPES.includes('OWNS'));
  } catch (e: any) {
    addResult('D3-T12', 'Party location relationship types', false, e.message);
  }

  // Test 6: External Reference Entity Types
  try {
    const { EXTERNAL_REFERENCE_ENTITY_TYPES } = requireFromRoot('lib/domain/party/types');
    addResult('D3-T14', 'External reference entity types defined', EXTERNAL_REFERENCE_ENTITY_TYPES.length >= 5);
    addResult('D3-T15', 'External reference includes PARTY', EXTERNAL_REFERENCE_ENTITY_TYPES.includes('PARTY'));
  } catch (e: any) {
    addResult('D3-T14', 'External reference entity types', false, e.message);
  }

  // Test 7: External Reference Systems
  try {
    const { EXTERNAL_REFERENCE_SYSTEMS } = requireFromRoot('lib/domain/party/types');
    addResult('D3-T16', 'External reference systems defined', EXTERNAL_REFERENCE_SYSTEMS.length >= 6);
    addResult('D3-T17', 'External reference includes ERP', EXTERNAL_REFERENCE_SYSTEMS.includes('ERP'));
  } catch (e: any) {
    addResult('D3-T16', 'External reference systems', false, e.message);
  }

  // Test 8: Service classes can be instantiated
  try {
    const { PartyRoleService } = requireFromRoot('lib/domain/party/party-role-service');
    const mockSupabase = { from: vi.fn() };
    const service = new PartyRoleService(mockSupabase);
    addResult('D3-T18', 'PartyRoleService instantiable', true);
  } catch (e: any) {
    addResult('D3-T18', 'PartyRoleService instantiation', false, e.message);
  }

  // Test 9: PartyRoleService rejects invalid role_type
  try {
    const { PartyRoleService, PartyRoleError } = requireFromRoot('lib/domain/party/party-role-service');
    const mockSupabase = { from: vi.fn() };
    const service = new PartyRoleService(mockSupabase);
    service.createRole(tenantId, {
      party_id: partyId,
      role_type: 'INVALID',
      context_type: 'GLOBAL',
    }).then(() => {
      addResult('D3-T19', 'Reject invalid role_type', false, 'Should have thrown');
    }).catch((e: any) => {
      addResult('D3-T19', 'Reject invalid role_type', e instanceof PartyRoleError);
    });
  } catch (e: any) {
    addResult('D3-T19', 'Reject invalid role_type', e instanceof Error);
  }

  // Test 10: PartyRoleService requires context_id for non-GLOBAL
  try {
    const { PartyRoleService, PartyRoleError } = requireFromRoot('lib/domain/party/party-role-service');
    const mockSupabase = { from: vi.fn() };
    const service = new PartyRoleService(mockSupabase);
    service.createRole(tenantId, {
      party_id: partyId,
      role_type: 'BILL_TO',
      context_type: 'ORDER',
    }).then(() => {
      addResult('D3-T20', 'Require context_id for non-GLOBAL', false, 'Should have thrown');
    }).catch((e: any) => {
      addResult('D3-T20', 'Require context_id for non-GLOBAL', e instanceof PartyRoleError);
    });
  } catch (e: any) {
    addResult('D3-T20', 'Require context_id for non-GLOBAL', e instanceof Error);
  }

  // Summary
  const passed = results.filter(r => r.pass).length;
  const failed = results.filter(r => !r.pass).length;
  console.log(`\nDATA-3 PARTY ROLE FOUNDATION SUITE: ${passed} / ${results.length} PASSED`);

  return results;
}
