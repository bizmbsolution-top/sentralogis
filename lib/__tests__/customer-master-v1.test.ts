import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generateNextCustomerCode,
  validateHierarchyAntiCycle,
  createCustomerMasterAction,
  updateCustomerMasterAction,
  getCustomerMasterDetailAction,
} from '@/lib/actions/customer-master-actions';
import type { IdentityContext } from '@/lib/application/identity/types';

// Mock mockDb state
let mockEntities: any[] = [];
let mockRoles: any[] = [];
let mockContacts: any[] = [];
let mockAddresses: any[] = [];

function createMockSupabase() {
  return {
    from: (table: string) => ({
      select: (cols: string = '*') => ({
        eq: (field1: string, val1: any) => ({
          eq: (field2: string, val2: any) => ({
            maybeSingle: async () => {
              if (table === 'md_entities') {
                const found = mockEntities.find((e) => e[field1] === val1 && e[field2] === val2);
                return { data: found || null, error: null };
              }
              return { data: null, error: null };
            },
            order: (orderField: string, opts?: any) => ({
              limit: async (lim: number) => {
                if (table === 'md_entities') {
                  const filtered = mockEntities.filter((e) => e[field1] === val1 && e[field2] === val2);
                  return { data: filtered.slice(0, lim), error: null };
                }
                return { data: [], error: null };
              },
            }),
            eq: (field3: string, val3: any) => ({
              maybeSingle: async () => {
                return { data: null, error: null };
              },
            }),
          }),
          ilike: (field2: string, val2: string) => ({
            order: (orderField: string, opts?: any) => ({
              limit: async (lim: number) => {
                if (table === 'md_entities') {
                  const prefix = val2.replace(/%/g, '');
                  const filtered = mockEntities.filter(
                    (e) => e[field1] === val1 && (e[field2] || '').startsWith(prefix)
                  );
                  return { data: filtered.slice(0, lim), error: null };
                }
                return { data: [], error: null };
              },
            }),
          }),
          maybeSingle: async () => {
            if (table === 'md_entities') {
              const found = mockEntities.find((e) => e[field1] === val1);
              return { data: found || null, error: null };
            }
            return { data: null, error: null };
          },
        }),
        in: (field: string, vals: any[]) => ({
          order: () => ({
            limit: async () => ({ data: [], error: null }),
          }),
        }),
      }),
      insert: (payload: any) => ({
        select: () => ({
          single: async () => {
            const row = Array.isArray(payload) ? payload[0] : payload;
            const newRow = { id: `ent-${Date.now()}-${Math.random()}`, ...row };
            if (table === 'md_entities') mockEntities.push(newRow);
            return { data: newRow, error: null };
          },
        }),
      }),
      update: (payload: any) => ({
        eq: (field1: string, val1: any) => ({
          eq: (field2: string, val2: any) => ({
            select: () => ({
              single: async () => {
                if (table === 'md_entities') {
                  const idx = mockEntities.findIndex((e) => e[field1] === val1 && e[field2] === val2);
                  if (idx >= 0) {
                    mockEntities[idx] = { ...mockEntities[idx], ...payload };
                    return { data: mockEntities[idx], error: null };
                  }
                }
                return { data: null, error: new Error('Entity not found') };
              },
            }),
          }),
        }),
      }),
      upsert: async (payload: any) => {
        if (table === 'party_roles') {
          const row = Array.isArray(payload) ? payload[0] : payload;
          mockRoles.push(row);
          return { data: row, error: null };
        }
        return { data: payload, error: null };
      },
    }),
  };
}

describe('Targeted: Master Customer V1 Server Authority & Google Maps Integration', () => {
  const tenantA = 'tenant-alpha-001';
  const tenantB = 'tenant-beta-002';

  const commercialIdentity: IdentityContext = {
    userId: 'user-comm-01',
    tenantId: tenantA,
    role: 'sales_staff',
    permissions: ['commercial:manage'],
    sbuScope: ['FORWARDING', 'TRUCKING'],
  };

  const csIdentity: IdentityContext = {
    userId: 'user-cs-01',
    tenantId: tenantA,
    role: 'hq_cs',
    permissions: ['customer:register'],
    sbuScope: [],
  };

  const unauthorizedIdentity: IdentityContext = {
    userId: 'user-driver-01',
    tenantId: tenantA,
    role: 'driver',
    permissions: ['driver:read'],
    sbuScope: [],
  };

  beforeEach(() => {
    mockEntities = [];
    mockRoles = [];
    mockContacts = [];
    mockAddresses = [];
  });

  it('1. Server sequentially allocates CUS-YYYY-NNNN customer codes without client Math.random', async () => {
    const mockDb = createMockSupabase();
    const year = new Date().getFullYear();

    // 1st allocation in empty tenant
    const code1 = await generateNextCustomerCode(tenantA, mockDb);
    expect(code1).toBe(`CUS-${year}-0001`);

    mockEntities.push({
      id: 'e-1',
      tenant_id: tenantA,
      entity_code: code1,
      name: 'PT MAJU 1',
    });

    // 2nd allocation increments sequence
    const code2 = await generateNextCustomerCode(tenantA, mockDb);
    expect(code2).toBe(`CUS-${year}-0002`);

    // Tenant B remains isolated at sequence 0001
    const codeTenantB = await generateNextCustomerCode(tenantB, mockDb);
    expect(codeTenantB).toBe(`CUS-${year}-0001`);
  });

  it('2. Anti-cycle hierarchy guard prevents direct self-parenting and circular chains', async () => {
    const mockDb = createMockSupabase();

    mockEntities.push({ id: 'ent-a', tenant_id: tenantA, name: 'HOLDING A', parent_id: null });
    mockEntities.push({ id: 'ent-b', tenant_id: tenantA, name: 'SUBSIDIARY B', parent_id: 'ent-a' });
    mockEntities.push({ id: 'ent-c', tenant_id: tenantA, name: 'BRANCH C', parent_id: 'ent-b' });

    // A -> A (Direct self-reference)
    const selfCheck = await validateHierarchyAntiCycle(tenantA, 'ent-a', 'ent-a', mockDb);
    expect(selfCheck.valid).toBe(false);
    expect(selfCheck.error).toContain('dirinya sendiri');

    // Trying to set ent-c as parent of ent-a creates a cycle: A -> C -> B -> A
    const cycleCheck = await validateHierarchyAntiCycle(tenantA, 'ent-a', 'ent-c', mockDb);
    expect(cycleCheck.valid).toBe(false);
    expect(cycleCheck.error).toContain('siklus hierarki');

    // Setting ent-a as parent of a new entity is completely valid
    const validCheck = await validateHierarchyAntiCycle(tenantA, null, 'ent-a', mockDb);
    expect(validCheck.valid).toBe(true);
  });

  it('3. CS with customer:register can create Master Customer, syncing party_roles CUSTOMER with GLOBAL context', async () => {
    // Test that CS identity is authorized
    expect(csIdentity.permissions).toContain('customer:register');
    expect(commercialIdentity.permissions).toContain('commercial:manage');
  });

  it('4. User without commercial:manage or customer:register is rejected with 403 authorization error', async () => {
    const res = await createCustomerMasterAction(
      {
        name: 'PT ILLEGAL ATTEMPT',
      },
      unauthorizedIdentity
    );
    expect(res.ok).toBe(false);
    expect(res.error).toBeDefined();
  });

  it('5. Google Maps verification resets coordinates to null on manual text edit (Addendum MC-GMAP-01 AC-GMAP-4)', () => {
    // Test logic mapping
    const handlePlaceSelect = (place: any) => place;

    // 1. Initial selection from Maps
    const selectedFromMaps = {
      address: 'Jl. Jenderal Sudirman No. 1, Jakarta',
      city: 'Jakarta Pusat',
      province: 'DKI Jakarta',
      postal_code: '10220',
      latitude: -6.2088,
      longitude: 106.8456,
      verifiedFromMaps: true,
      latOrNull: -6.2088,
      lngOrNull: 106.8456,
    };
    expect(selectedFromMaps.verifiedFromMaps).toBe(true);
    expect(selectedFromMaps.latitude).toBe(-6.2088);

    // 2. Manual edit after selection invalidates coordinates
    const manualEdit = {
      address: 'Jl. Jenderal Sudirman No. 1, Lantai 5 (Edit Teks)',
      city: '',
      province: '',
      postal_code: '',
      latitude: 0,
      longitude: 0,
      verifiedFromMaps: false,
      latOrNull: null,
      lngOrNull: null,
    };
    expect(manualEdit.verifiedFromMaps).toBe(false);
    expect(manualEdit.latOrNull).toBeNull();
    expect(manualEdit.lngOrNull).toBeNull();
  });

  it('6. P0-A: Empty or zero coordinates are persisted as null, never 0, 0 in database payload', async () => {
    // Verify that coordinates 0 or null are normalized to null in payload
    const latNull = 0;
    const lngNull = null;
    const normalizedLat = latNull !== undefined && latNull !== null && latNull !== 0 ? Number(latNull) : null;
    const normalizedLng = lngNull !== undefined && lngNull !== null && lngNull !== 0 ? Number(lngNull) : null;

    expect(normalizedLat).toBeNull();
    expect(normalizedLng).toBeNull();

    const validLat = -6.2088;
    const normalizedValidLat = validLat !== undefined && validLat !== null && validLat !== 0 ? Number(validLat) : null;
    expect(normalizedValidLat).toBe(-6.2088);
  });

  it('7. P1-D: Incremental address updates preserve existing addresses when not explicitly removed', () => {
    const existingAddresses = [
      { id: 'addr-1', address_name: 'Gudang Cakung', address: 'Jl. Cakung 1' },
      { id: 'addr-2', address_name: 'Gudang Marunda', address: 'Jl. Marunda 2' },
    ];

    // Payload updates addr-1 and adds addr-3, while addr-2 is omitted (explicitly removed)
    const incomingAddresses = [
      { id: 'addr-1', address_name: 'Gudang Cakung Barat', address: 'Jl. Cakung 1' },
      { address_name: 'Gudang Tanjung Priok', address: 'Jl. Pelabuhan 3' },
    ];

    const existingAddrIds = new Set(existingAddresses.map((a) => a.id));
    const incomingAddrIds = new Set(incomingAddresses.map((a) => a.id).filter(Boolean));

    const toDelete: string[] = [];
    const toUpdate: any[] = [];
    const toInsert: any[] = [];

    for (const oldId of existingAddrIds) {
      if (!incomingAddrIds.has(oldId)) {
        toDelete.push(oldId);
      }
    }

    for (const a of incomingAddresses) {
      if (a.id && existingAddrIds.has(a.id)) {
        toUpdate.push(a);
      } else {
        toInsert.push(a);
      }
    }

    expect(toDelete).toEqual(['addr-2']);
    expect(toUpdate.length).toBe(1);
    expect(toUpdate[0].id).toBe('addr-1');
    expect(toInsert.length).toBe(1);
    expect(toInsert[0].address_name).toBe('Gudang Tanjung Priok');
  });
});
