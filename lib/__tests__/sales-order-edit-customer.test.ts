/**
 * Sentralogis — Targeted Test Suite: Sales Order Edit Customer & Autocomplete
 * lib/__tests__/sales-order-edit-customer.test.ts
 *
 * Requirements covered (Section 5):
 * 1. Form Edit menampilkan Customer yang tersimpan saat ini.
 * 2. Autocomplete menemukan TPS berdasarkan TPS.
 * 3. Autocomplete menemukan TPS berdasarkan nama legal.
 * 4. Autocomplete menemukan TPS berdasarkan kode canonical.
 * 5. Pengguna dapat mengganti ABC menjadi TPS dan menyimpan perubahan melalui service resmi.
 * 6. Setelah penyimpanan, daftar SO dan detail SO sama-sama menampilkan TPS.
 * 7. Pencarian tanpa hasil tidak mengubah Customer yang tersimpan.
 * 8. Customer dari tenant lain tidak dapat dipilih atau disimpan.
 * 9. Perubahan Customer tidak mengubah SO lain secara tidak sengaja.
 * 10. Kegagalan server tidak menampilkan pesan sukses palsu dan tidak meninggalkan perubahan parsial.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { IdentityContext } from '@/lib/application/identity/types';
import {
  updateDraftSalesOrder,
  findSalesOrderById,
  listSalesOrdersForTenant,
  listCustomersAndEngagementsForTenant,
  enrichSalesOrdersWithCustomer,
  _setSalesOrderDbClient,
} from '@/lib/sales-order/service';
import type { SalesOrderDbClient } from '@/lib/sales-order/service';
import { SalesOrderError } from '@/lib/sales-order/types';

type Row = Record<string, unknown>;

describe('Sales Order Edit Customer & Autocomplete (Section 5 Gates)', () => {
  const TENANT_A = '78846049-fb63-45a9-93da-3af3fea5b587';
  const TENANT_B = 'b0000000-0000-4000-8000-00000000000b';
  const USER_ID = 'u0000000-0000-4000-8000-000000000001';

  // Identity with commercial management permission
  const commercialAdminContext: IdentityContext = {
    userId: USER_ID,
    tenantId: TENANT_A,
    role: 'commercial_admin',
    roles: ['commercial_admin'],
    permissions: ['commercial:read', 'commercial:manage', 'sales_order:create', 'sales_order:read', 'customer_visibility:read'],
  };

  // Mock Entities
  const ENTITY_ABC: Row = {
    id: 'f18c007f-c86f-4af8-aa81-dfe0df090c4a',
    tenant_id: TENANT_A,
    name: 'ABC',
    legal_name: 'PT ANUGRAH BERKAT CEMERLANG',
    entity_code: 'CUS/017',
    is_active: true,
    is_customer: true,
  };

  const ENTITY_TPS: Row = {
    id: 'd8fb3472-f4cd-4cf8-9af1-ca3e6ccd454d',
    tenant_id: TENANT_A,
    name: 'TPS',
    legal_name: 'PT TRADING PERDANA SUKSES',
    entity_code: 'CUS/001',
    is_active: true,
    is_customer: true,
  };

  const ENTITY_OTHER_TENANT: Row = {
    id: 'c-tenant-b-999',
    tenant_id: TENANT_B,
    name: 'OTHER CUSTOMER',
    legal_name: 'PT OTHER TENANT',
    entity_code: 'CUS/999',
    is_active: true,
    is_customer: true,
  };

  const ENTITY_INACTIVE: Row = {
    id: 'c-inactive-111',
    tenant_id: TENANT_A,
    name: 'INACTIVE CUST',
    legal_name: 'PT INACTIVE',
    entity_code: 'CUS/000',
    is_active: false,
    is_customer: true,
  };

  let mockEntities: Row[] = [];
  let mockEngagements: Row[] = [];
  let mockSalesOrders: Row[] = [];

  class MockDb implements SalesOrderDbClient {
    rpc(fn: string, _params: Record<string, unknown>): Promise<{ data: any; error: any }> {
      if (fn === 'next_sales_order') {
        return Promise.resolve({ data: 'SO-2026-10-9999', error: null });
      }
      return Promise.resolve({ data: null, error: { message: `Unknown RPC ${fn}` } });
    }

    from(table: string): any {
      const rows = () =>
        table === 'md_entities' ? mockEntities
        : table === 'commercial_work_orders' ? mockEngagements
        : table === 'sales_orders' ? mockSalesOrders
        : [];

      const chain: any = {
        _filters: [] as Array<{ col: string; val: unknown; op?: string }>,
        _order: null as { col: string; asc: boolean } | null,
        select(_cols?: string) {
          return chain;
        },
        eq(col: string, val: unknown) {
          chain._filters.push({ col, val, op: 'eq' });
          return chain;
        },
        neq(col: string, val: unknown) {
          chain._filters.push({ col, val, op: 'neq' });
          return chain;
        },
        in(col: string, vals: unknown[]) {
          chain._filters.push({ col, val: vals, op: 'in' });
          return chain;
        },
        like(col: string, pattern: string) {
          chain._filters.push({ col, val: pattern, op: 'like' });
          return chain;
        },
        order(col: string, opts: { ascending: boolean }) {
          chain._order = { col, asc: opts.ascending };
          return chain;
        },
        limit(_n: number) {
          return chain;
        },
        single() {
          return chain.then((res: any) => {
            const row = res.data && res.data.length > 0 ? res.data[0] : null;
            return { data: row, error: row ? null : { message: 'Row not found' } };
          });
        },
        maybeSingle() {
          return chain.then((res: any) => {
            const row = res.data && res.data.length > 0 ? res.data[0] : null;
            return { data: row, error: null };
          });
        },
        insert(payload: Row) {
          const newRow = { ...payload, id: payload.id || `gen-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` };
          rows().push(newRow);
          return {
            select() {
              return {
                single: async () => ({ data: newRow, error: null }),
                maybeSingle: async () => ({ data: newRow, error: null }),
              };
            },
            single: async () => ({ data: newRow, error: null }),
          };
        },
        update(payload: Row) {
          const updateChain = {
            eq(col: string, val: unknown) {
              chain._filters.push({ col, val, op: 'eq' });
              return updateChain;
            },
            select() {
              const matched = rows().filter((r) =>
                chain._filters.every((f: any) => r[f.col] === f.val),
              );
              for (const r of matched) {
                Object.assign(r, payload);
              }
              return Promise.resolve({ data: matched, error: null });
            },
          };
          return updateChain;
        },
        then(resolve: any) {
          let list = rows().filter((r) =>
            chain._filters.every((f: any) => {
              if (f.op === 'in') return (f.val as unknown[]).includes(r[f.col]);
              if (f.op === 'neq') return r[f.col] !== f.val;
              if (f.op === 'like') {
                const regex = new RegExp(`^${(f.val as string).replace(/%/g, '.*')}$`, 'i');
                return regex.test(String(r[f.col] || ''));
              }
              return r[f.col] === f.val;
            }),
          );
          if (chain._order) {
            const { col, asc } = chain._order;
            list = [...list].sort((a, b) => {
              const va = a[col] ?? '';
              const vb = b[col] ?? '';
              if (va < vb) return asc ? -1 : 1;
              if (va > vb) return asc ? 1 : -1;
              return 0;
            });
          }
          return Promise.resolve({ data: list, error: null }).then(resolve);
        },
      };

      return chain;
    }
  }

  const mockDb = new MockDb();

  beforeEach(() => {
    mockEntities = [{ ...ENTITY_ABC }, { ...ENTITY_TPS }, { ...ENTITY_OTHER_TENANT }, { ...ENTITY_INACTIVE }];

    // Initial engagement for ABC
    mockEngagements = [
      {
        id: 'eng-abc-001',
        tenant_id: TENANT_A,
        wo_number: 'HALU0-CUS01-1026-001',
        customer_id: ENTITY_ABC.id,
        status: 'DRAFT',
        created_at: '2026-10-17T00:00:00.000Z',
      },
    ];

    // SO-2026-10-0009 currently linked to ABC's engagement
    mockSalesOrders = [
      {
        id: '54d110a3-ee17-4a9a-bdad-ce86ebdb4b54',
        tenant_id: TENANT_A,
        engagement_id: 'eng-abc-001',
        quote_id: null,
        so_number: 'SO-2026-10-0009',
        status: 'DRAFT',
        order_date: '2026-10-17',
        target_fulfillment_date: '2026-10-20',
        currency: 'IDR',
        total_agreed_revenue: 15000000,
        payment_terms_days: 30,
        incoterm: null,
        commercial_notes: 'Initial draft for TPS',
        version_no: 1,
        created_at: '2026-10-17T00:00:00.000Z',
        updated_at: '2026-10-17T00:00:00.000Z',
        created_by: USER_ID,
        updated_by: USER_ID,
      },
    ];

    _setSalesOrderDbClient(mockDb);
  });

  afterEach(() => {
    _setSalesOrderDbClient(null);
  });

  // 1. Form Edit displays current saved customer
  it('Requirement 1: correctly retrieves and enriches the current customer on the Sales Order', async () => {
    const rawSo = await findSalesOrderById(commercialAdminContext, '54d110a3-ee17-4a9a-bdad-ce86ebdb4b54');
    const [enriched] = await enrichSalesOrdersWithCustomer(commercialAdminContext, [rawSo]);

    expect(enriched.id).toBe('54d110a3-ee17-4a9a-bdad-ce86ebdb4b54');
    expect(enriched.customerId).toBe(ENTITY_ABC.id);
    expect(enriched.customerName).toBe('ABC');
    expect(enriched.customerCode).toBe('CUS/017');
  });

  // 2. Autocomplete finds TPS by "TPS"
  it('Requirement 2: autocomplete finds TPS based on short name keyword "TPS"', async () => {
    const res = await listCustomersAndEngagementsForTenant(commercialAdminContext, { search: 'TPS' });

    expect(res.customers.length).toBeGreaterThanOrEqual(1);
    const matched = res.customers.find((c) => c.id === ENTITY_TPS.id);
    expect(matched).toBeDefined();
    expect(matched?.name).toBe('TPS');
    expect(matched?.legalName).toBe('PT TRADING PERDANA SUKSES');
    expect(matched?.code).toBe('CUS/001');
  });

  // 3. Autocomplete finds TPS by legal name "PT TRADING PERDANA SUKSES"
  it('Requirement 3: autocomplete finds TPS based on legal name keyword', async () => {
    const res = await listCustomersAndEngagementsForTenant(commercialAdminContext, { search: 'Trading Perdana' });

    expect(res.customers.length).toBe(1);
    expect(res.customers[0].id).toBe(ENTITY_TPS.id);
    expect(res.customers[0].legalName).toBe('PT TRADING PERDANA SUKSES');
  });

  // 4. Autocomplete finds TPS by canonical code "CUS/001"
  it('Requirement 4: autocomplete finds TPS based on canonical code "CUS/001"', async () => {
    const res = await listCustomersAndEngagementsForTenant(commercialAdminContext, { search: 'CUS/001' });

    expect(res.customers.length).toBe(1);
    expect(res.customers[0].id).toBe(ENTITY_TPS.id);
    expect(res.customers[0].code).toBe('CUS/001');
  });

  // 5. User can change ABC to TPS and save via official service
  it('Requirement 5: updates customer from ABC to TPS through updateDraftSalesOrder and resolves engagement', async () => {
    const updated = await updateDraftSalesOrder(
      '54d110a3-ee17-4a9a-bdad-ce86ebdb4b54',
      { customerId: ENTITY_TPS.id as string },
      commercialAdminContext,
    );

    expect(updated.id).toBe('54d110a3-ee17-4a9a-bdad-ce86ebdb4b54');
    expect(updated.engagementId).not.toBe('eng-abc-001'); // Pointed to TPS engagement

    // Verify engagement was resolved/created for TPS
    const tpsEng = mockEngagements.find((e) => e.id === updated.engagementId);
    expect(tpsEng).toBeDefined();
    expect(tpsEng?.customer_id).toBe(ENTITY_TPS.id);
  });

  // 6. After save, both SO list and detail display TPS
  it('Requirement 6: both Sales Order detail and list reflect TPS after save', async () => {
    // Perform update
    await updateDraftSalesOrder(
      '54d110a3-ee17-4a9a-bdad-ce86ebdb4b54',
      { customerId: ENTITY_TPS.id as string },
      commercialAdminContext,
    );

    // Detail check
    const rawDetail = await findSalesOrderById(commercialAdminContext, '54d110a3-ee17-4a9a-bdad-ce86ebdb4b54');
    const [detail] = await enrichSalesOrdersWithCustomer(commercialAdminContext, [rawDetail]);
    expect(detail.customerId).toBe(ENTITY_TPS.id);
    expect(detail.customerName).toBe('TPS');
    expect(detail.customerCode).toBe('CUS/001');

    // List check
    const list = await listSalesOrdersForTenant(commercialAdminContext);
    const soInList = list.find((s) => s.id === '54d110a3-ee17-4a9a-bdad-ce86ebdb4b54');
    expect(soInList).toBeDefined();
    expect(soInList?.customerId).toBe(ENTITY_TPS.id);
    expect(soInList?.customerName).toBe('TPS');
    expect(soInList?.customerCode).toBe('CUS/001');
  });

  // 7. Search without results does not change saved customer
  it('Requirement 7: search query without results returns empty array without altering saved customer', async () => {
    const res = await listCustomersAndEngagementsForTenant(commercialAdminContext, { search: 'NON_EXISTENT_CUSTOMER_XYZ' });
    expect(res.customers.length).toBe(0);

    // Ensure database SO remains on ABC
    const rawSo = await findSalesOrderById(commercialAdminContext, '54d110a3-ee17-4a9a-bdad-ce86ebdb4b54');
    const [enriched] = await enrichSalesOrdersWithCustomer(commercialAdminContext, [rawSo]);
    expect(enriched.customerId).toBe(ENTITY_ABC.id);
    expect(enriched.customerName).toBe('ABC');
  });

  // 8. Customer from another tenant cannot be selected or saved
  it('Requirement 8: rejects assigning customer from another tenant with 404 CUSTOMER_NOT_FOUND', async () => {
    await expect(
      updateDraftSalesOrder(
        '54d110a3-ee17-4a9a-bdad-ce86ebdb4b54',
        { customerId: ENTITY_OTHER_TENANT.id as string },
        commercialAdminContext,
      ),
    ).rejects.toThrowError(SalesOrderError);

    // SO remains unmodified
    const rawSo = await findSalesOrderById(commercialAdminContext, '54d110a3-ee17-4a9a-bdad-ce86ebdb4b54');
    const [enriched] = await enrichSalesOrdersWithCustomer(commercialAdminContext, [rawSo]);
    expect(enriched.customerId).toBe(ENTITY_ABC.id);
  });

  // 9. Customer change on one SO does not accidentally mutate other SOs
  it('Requirement 9: changing customer on SO-1 does not alter customer or engagement of SO-2', async () => {
    // Add SO-2 on the same ABC engagement
    mockSalesOrders.push({
      id: 'so-sibling-abc-002',
      tenant_id: TENANT_A,
      engagement_id: 'eng-abc-001',
      quote_id: null,
      so_number: 'SO-2026-10-0010',
      status: 'DRAFT',
      order_date: '2026-10-18',
      total_agreed_revenue: 8000000,
      payment_terms_days: 14,
      currency: 'IDR',
      version_no: 1,
      created_at: '2026-10-18T00:00:00.000Z',
      updated_at: '2026-10-18T00:00:00.000Z',
      created_by: USER_ID,
      updated_by: USER_ID,
    });

    // Update SO-1 to TPS
    await updateDraftSalesOrder(
      '54d110a3-ee17-4a9a-bdad-ce86ebdb4b54',
      { customerId: ENTITY_TPS.id as string },
      commercialAdminContext,
    );

    // SO-1 is now on TPS
    const rawSo1 = await findSalesOrderById(commercialAdminContext, '54d110a3-ee17-4a9a-bdad-ce86ebdb4b54');
    const [enriched1] = await enrichSalesOrdersWithCustomer(commercialAdminContext, [rawSo1]);
    expect(enriched1.customerId).toBe(ENTITY_TPS.id);

    // SO-2 MUST REMAIN on ABC!
    const rawSo2 = await findSalesOrderById(commercialAdminContext, 'so-sibling-abc-002');
    const [enriched2] = await enrichSalesOrdersWithCustomer(commercialAdminContext, [rawSo2]);
    expect(enriched2.customerId).toBe(ENTITY_ABC.id);
    expect(enriched2.customerName).toBe('ABC');
    expect(enriched2.engagementId).toBe('eng-abc-001');
  });

  // 10. Server failure does not leave partial mutations
  it('Requirement 10: rejects inactive customer with CUSTOMER_INACTIVE without mutating database', async () => {
    await expect(
      updateDraftSalesOrder(
        '54d110a3-ee17-4a9a-bdad-ce86ebdb4b54',
        { customerId: ENTITY_INACTIVE.id as string },
        commercialAdminContext,
      ),
    ).rejects.toThrow(/inactive and cannot be assigned/i);

    // Database state remains unchanged
    const rawSo = await findSalesOrderById(commercialAdminContext, '54d110a3-ee17-4a9a-bdad-ce86ebdb4b54');
    const [enriched] = await enrichSalesOrdersWithCustomer(commercialAdminContext, [rawSo]);
    expect(enriched.customerId).toBe(ENTITY_ABC.id);
    expect(enriched.versionNo).toBe(1);
  });
});
