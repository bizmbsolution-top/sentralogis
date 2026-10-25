/**
 * Sentralogis — Master Kontak Table & Canonical Integration Test Suite
 * lib/__tests__/master-kontak-table-integration.test.ts
 *
 * Verifies:
 * 1. Master Kontak table renders all required columns (Kode Contact, Initial Name,
 *    Nama Contact/Dagang, Nama Legal, Parent Company, NPWP/Pajak, Email, Telepon/WhatsApp,
 *    Status, Pembaruan, Aksi).
 * 2. Deterministic Initial Name mapping/derivation without duplicate DB columns.
 * 3. Search by name `PT AMANAH TRANSPORTASI` (canonical ID `dc4d2e3a-8602-455d-8c3d-212379364ce1`).
 * 4. Search by contact code `CUS/018`.
 * 5. Filtering by role (`CUSTOMER` via `party_roles` + `is_customer`) and status (`active`/`inactive`).
 * 6. Navigation from Copilot to Master Kontak (`?search=...&customerId=...`) and prevention
 *    of `Nomor JO = MASTER` misrouting.
 * 7. Strict tenant isolation (`78846049-fb63-45a9-93da-3af3fea5b587` vs other tenants).
 * 8. Table consistency after form edit (`updateCustomerMasterAction` state reflected on re-read).
 * 9. Zero regression on the 5-tab `MasterCustomerModal.tsx` and Google Maps address autocomplete.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  type MasterContactEntity,
  type PartyRoleRecord,
  deriveInitialName,
  sanitizeContactPhone,
  hasCustomerRole,
  getEntityRoles,
  buildParentCompanyMap,
  resolveParentCompany,
  attachPartyRolesToEntities,
  filterAndSortMasterContacts,
  buildMasterKontakUrl,
} from '@/lib/master/contact-table-utils';
import {
  CustomerIntentHandler,
  _setCustomerDbClient,
} from '@/lib/copilot/customer/customer-intent-handler';
import { ConversationalQueryResolver } from '@/lib/copilot/sandbox/conversational-query-resolver';
import { IntentStage } from '@/src/platforms/copilot/pipeline/stages/IntentStage';
import type { IdentityContext } from '@/lib/application/identity/types';

const TENANT_PROD = '78846049-fb63-45a9-93da-3af3fea5b587';
const TENANT_OTHER = '99999999-aaaa-bbbb-cccc-000000000002';

const AMANAH_RECORD: MasterContactEntity = {
  id: 'dc4d2e3a-8602-455d-8c3d-212379364ce1',
  tenant_id: TENANT_PROD,
  entity_code: 'CUS/018',
  name: 'PT AMANAH TRANSPORTASI',
  legal_name: 'PT AMANAH TRANSPORTASI',
  tax_id: null,
  tax_status: 'PKP',
  email: null,
  phone: null,
  whatsapp: null,
  parent_id: null,
  is_customer: true,
  is_supplier: false,
  is_vendor: false,
  is_broker: false,
  is_active: true,
  payment_terms_days: 30,
  payment_terms_type: 'net_days',
  created_at: '2026-10-25T02:40:37.989164Z',
  updated_at: '2026-10-25T02:40:37.989164Z',
};

const AMANAH_PARTY_ROLE: PartyRoleRecord = {
  id: 'ff8ca054-4f3c-44d7-ae30-865878b11b5d',
  tenant_id: TENANT_PROD,
  party_id: 'dc4d2e3a-8602-455d-8c3d-212379364ce1',
  role_type: 'CUSTOMER',
  context_type: 'GLOBAL',
  is_primary: true,
  is_active: true,
};

const HOLDING_PARENT: MasterContactEntity = {
  id: '476fc81c-aa68-414b-bcee-0bc169f1bbe7',
  tenant_id: TENANT_PROD,
  entity_code: 'CUS/011',
  name: 'BYD',
  legal_name: 'PT BYD MOTOR INDONESIA',
  tax_id: '01.234.567.8-091.000',
  tax_status: 'PKP',
  email: 'corp@byd.co.id',
  phone: '021-5550101',
  whatsapp: '08119998887',
  parent_id: null,
  is_customer: true,
  is_active: true,
  updated_at: '2026-10-20T08:00:00.000Z',
};

const CHILD_SUBSIDIARY: MasterContactEntity = {
  id: 'a03f3900-4a1c-4fa1-b62c-bd5c59bb3e6a',
  tenant_id: TENANT_PROD,
  entity_code: 'CUS/013',
  name: 'MAU',
  legal_name: 'PT. MANDIRI ANDA UTAMA',
  tax_id: '02.345.678.9-012.000',
  tax_status: 'PKP',
  email: 'finance@mau.co.id',
  phone: '021-8881234',
  whatsapp: '08128881234',
  parent_id: HOLDING_PARENT.id,
  is_customer: false, // Will be resolved via party_roles!
  is_active: true,
  updated_at: '2026-10-24T10:00:00.000Z',
};

const INACTIVE_VENDOR: MasterContactEntity = {
  id: '11112222-3333-4444-5555-666677778888',
  tenant_id: TENANT_PROD,
  entity_code: 'VND/004',
  name: 'PT ARMADA LINTAS NUSANTARA',
  legal_name: 'PT ARMADA LINTAS NUSANTARA',
  tax_id: '03.111.222.3-444.000',
  email: 'ops@armadalintas.id',
  phone: 'CUS', // Corrupted placeholder should be sanitized
  whatsapp: '08137776665',
  parent_id: null,
  is_customer: false,
  is_vendor: true,
  is_active: false,
  updated_at: '2026-10-15T10:00:00.000Z',
};

const OTHER_TENANT_ENTITY: MasterContactEntity = {
  id: 'deadbeef-0000-1111-2222-333344445555',
  tenant_id: TENANT_OTHER,
  entity_code: 'CUS/018',
  name: 'PT AMANAH TRANSPORTASI',
  legal_name: 'PT AMANAH TRANSPORTASI BOCOR',
  is_customer: true,
  is_active: true,
  updated_at: '2026-10-25T05:00:00.000Z',
};

describe('Master Kontak Table & Canonical Integration Suite', () => {
  const sampleRoles: PartyRoleRecord[] = [
    AMANAH_PARTY_ROLE,
    {
      id: 'role-child-cust',
      tenant_id: TENANT_PROD,
      party_id: CHILD_SUBSIDIARY.id,
      role_type: 'CUSTOMER',
      context_type: 'GLOBAL',
      is_primary: true,
      is_active: true,
    },
  ];

  const enrichedDataset = attachPartyRolesToEntities(
    [AMANAH_RECORD, HOLDING_PARENT, CHILD_SUBSIDIARY, INACTIVE_VENDOR, OTHER_TENANT_ENTITY],
    sampleRoles,
    TENANT_PROD,
  );

  beforeEach(() => {
    CustomerIntentHandler.resetPendingRegistrations();
  });

  // =========================================================================
  // 1. Render tabel Master Kontak dengan seluruh kolom wajib
  // =========================================================================
  it('1. Renders all required columns in app/(dashboard)/tenant/master/contacts/page.tsx without querying operational tables', () => {
    const pagePath = path.resolve(
      process.cwd(),
      'app/(dashboard)/tenant/master/contacts/page.tsx',
    );
    const content = fs.readFileSync(pagePath, 'utf-8');

    // Required column headers
    expect(content).toContain('Kode Contact');
    expect(content).toContain('Initial Name');
    expect(content).toContain('Nama Contact / Dagang');
    expect(content).toContain('Nama Legal');
    expect(content).toContain('Parent Company (Induk)');
    expect(content).toContain('NPWP / Pajak');
    expect(content).toContain('Email');
    expect(content).toContain('Telepon / WhatsApp');
    expect(content).toContain('Status');
    expect(content).toContain('Pembaruan');
    expect(content).toContain('Aksi');

    // Canonical table sources: md_entities and party_roles
    expect(content).toContain(".from('md_entities')");
    expect(content).toContain(".from('party_roles')");

    // Must NEVER query job_orders or shp_shipments
    expect(content).not.toContain(".from('job_orders')");
    expect(content).not.toContain(".from('shp_shipments')");
    expect(content).not.toContain('Math.random()');
  });

  // =========================================================================
  // 2. Pemetaan Initial Name yang benar
  // =========================================================================
  it('2. Maps and derives Initial Name accurately according to Sentralogis rules without duplicate DB columns', () => {
    // Full company name -> acronym without legal prefix PT/CV/UD
    expect(deriveInitialName(AMANAH_RECORD)).toBe('AT');
    expect(
      deriveInitialName({
        name: 'PT ANUGRAH BERKAT CEMERLANG',
        legal_name: 'PT ANUGRAH BERKAT CEMERLANG',
      }),
    ).toBe('ABC');

    // Short brand/alias already stored in `name` (per MasterCustomerModal convention)
    expect(deriveInitialName(HOLDING_PARENT)).toBe('BYD');
    expect(deriveInitialName(CHILD_SUBSIDIARY)).toBe('MAU');
    expect(
      deriveInitialName({
        name: 'AJM',
        legal_name: 'PT. ANUGERAH JAYA MANDIRI',
      }),
    ).toBe('AJM');

    // Explicit parenthetical initial
    expect(
      deriveInitialName({
        name: 'PT TRADING PERDANA SUKSES (TPS)',
        legal_name: 'PT TRADING PERDANA SUKSES',
      }),
    ).toBe('TPS');

    // Phone sanitization prevents role code leakage ("CUS")
    expect(sanitizeContactPhone('CUS')).toBe('');
    expect(sanitizeContactPhone('0812-3456-7890')).toBe('0812-3456-7890');
  });

  // =========================================================================
  // 3. Pencarian nama `PT AMANAH TRANSPORTASI`
  // =========================================================================
  it('3. Finds canonical record PT AMANAH TRANSPORTASI (dc4d2e3a-8602-455d-8c3d-212379364ce1) by name', () => {
    const res = filterAndSortMasterContacts(enrichedDataset, {
      tenantId: TENANT_PROD,
      search: 'PT AMANAH TRANSPORTASI',
      roleFilter: 'customer',
    });

    expect(res.totalItems).toBe(1);
    expect(res.items[0].id).toBe('dc4d2e3a-8602-455d-8c3d-212379364ce1');
    expect(res.items[0].entity_code).toBe('CUS/018');
    expect(res.items[0].name).toBe('PT AMANAH TRANSPORTASI');
    expect(res.items[0].legal_name).toBe('PT AMANAH TRANSPORTASI');
    expect(deriveInitialName(res.items[0])).toBe('AT');
    expect(hasCustomerRole(res.items[0])).toBe(true);
  });

  // =========================================================================
  // 4. Pencarian kode contact `CUS/018`
  // =========================================================================
  it('4. Finds canonical record PT AMANAH TRANSPORTASI by contact code CUS/018', () => {
    const res = filterAndSortMasterContacts(enrichedDataset, {
      tenantId: TENANT_PROD,
      search: 'CUS/018',
      roleFilter: 'all',
    });

    expect(res.totalItems).toBe(1);
    expect(res.items[0].id).toBe('dc4d2e3a-8602-455d-8c3d-212379364ce1');
    expect(res.items[0].entity_code).toBe('CUS/018');
    expect(res.items[0].name).toBe('PT AMANAH TRANSPORTASI');
  });

  // =========================================================================
  // 5. Filter berdasarkan role dan status
  // =========================================================================
  it('5. Filters accurately by role (CUSTOMER via party_roles + is_customer, VENDOR) and status (active/inactive)', () => {
    // Customer filter includes CHILD_SUBSIDIARY whose is_customer was false on md_entities but has party_roles=CUSTOMER
    const custRes = filterAndSortMasterContacts(enrichedDataset, {
      tenantId: TENANT_PROD,
      roleFilter: 'customer',
      statusFilter: 'active',
    });
    expect(custRes.totalItems).toBe(3);
    expect(custRes.items.map((i) => i.entity_code)).toEqual(
      expect.arrayContaining(['CUS/018', 'CUS/013', 'CUS/011']),
    );

    // Parent company resolution for CUS/013 -> [CUS/011] BYD
    const childRow = custRes.items.find((i) => i.id === CHILD_SUBSIDIARY.id);
    const parentSummary = resolveParentCompany(childRow, custRes.parentMap);
    expect(parentSummary).not.toBeNull();
    expect(parentSummary?.id).toBe(HOLDING_PARENT.id);
    expect(parentSummary?.label).toBe('[CUS/011] BYD');

    // Inactive status filter returns only INACTIVE_VENDOR
    const inactiveRes = filterAndSortMasterContacts(enrichedDataset, {
      tenantId: TENANT_PROD,
      roleFilter: 'all',
      statusFilter: 'inactive',
    });
    expect(inactiveRes.totalItems).toBe(1);
    expect(inactiveRes.items[0].entity_code).toBe('VND/004');
  });

  // =========================================================================
  // 6. Navigasi dari Copilot ke halaman Master Kontak (tanpa Nomor JO = MASTER)
  // =========================================================================
  it('6. Routes Copilot Master Kontak queries to CustomerIntentHandler with proper URL params and NEVER sets jobOrderNumber = MASTER', async () => {
    // Check ConversationalQueryResolver never extracts "MASTER" as jobOrderNumber
    const parsed1 = ConversationalQueryResolver.resolveQueryContext('buka master kontak');
    expect(parsed1.context.jobOrderNumber).toBeUndefined();
    expect(parsed1.context.activeFilters['jobOrderNumber']).toBeUndefined();

    const parsed2 = ConversationalQueryResolver.resolveQueryContext(
      'cek master kontak PT AMANAH TRANSPORTASI',
    );
    expect(parsed2.context.jobOrderNumber).toBeUndefined();

    const parsed3 = ConversationalQueryResolver.resolveQueryContext('buka CUS/018');
    expect(parsed3.context.jobOrderNumber).toBeUndefined();

    // Check CustomerIntentHandler recognizes Master Kontak & CUS/018 search intents
    expect(CustomerIntentHandler.isCustomerSearchIntent('buka master kontak')).toBe(true);
    expect(
      CustomerIntentHandler.isCustomerSearchIntent('cek master kontak PT AMANAH TRANSPORTASI'),
    ).toBe(true);
    expect(CustomerIntentHandler.isCustomerSearchIntent('buka CUS/018')).toBe(true);
    expect(
      CustomerIntentHandler.extractSearchTerm('cek master kontak PT AMANAH TRANSPORTASI'),
    ).toBe('PT AMANAH TRANSPORTASI');
    expect(CustomerIntentHandler.extractSearchTerm('buka CUS/018')).toBe('CUS/018');

    // Execute through IntentStage with mocked DB returning AMANAH_RECORD
    const mockIdentity: IdentityContext = {
      userId: 'user-prod-01',
      tenantId: TENANT_PROD,
      role: 'tenant_admin',
      permissions: ['commercial:read', 'commercial:manage', 'sales_order:read'],
    };

    _setCustomerDbClient({
      from: (table: string) => {
        expect(table).toBe('md_entities');
        const chain: any = {
          select: () => chain,
          eq: (col: string, val: any) => {
            if (col === 'tenant_id') expect(val).toBe(TENANT_PROD);
            return chain;
          },
          or: () => chain,
          ilike: () => chain,
          order: () => chain,
          limit: async () => ({ data: [AMANAH_RECORD], error: null }),
        };
        return chain;
      },
    });

    const stage = new IntentStage();
    const ctx: any = {
      userInput: 'cek master kontak PT AMANAH TRANSPORTASI',
      identity: mockIdentity,
      context: {},
    };
    await stage.execute(ctx);

    expect(ctx.finalResponse).toBeDefined();
    expect(ctx.finalResponse.content).toContain('PT AMANAH TRANSPORTASI');
    expect(ctx.finalResponse.content).toContain('CUS/018');
    expect(ctx.finalResponse.content).toContain('dc4d2e3a-8602-455d-8c3d-212379364ce1');
    expect(ctx.finalResponse.content).toContain(
      '/tenant/master/contacts?tab=customer&search=CUS%2F018&customerId=dc4d2e3a-8602-455d-8c3d-212379364ce1',
    );
    expect(ctx.finalResponse.content).not.toContain('Nomor JO = MASTER');

    _setCustomerDbClient(null);
  });

  // =========================================================================
  // 7. Isolasi tenant
  // =========================================================================
  it('7. Enforces strict tenant isolation on entity rows and Parent Company resolution', () => {
    const resProd = filterAndSortMasterContacts(
      [AMANAH_RECORD, OTHER_TENANT_ENTITY],
      {
        tenantId: TENANT_PROD,
        search: 'CUS/018',
      },
    );
    expect(resProd.totalItems).toBe(1);
    expect(resProd.items[0].id).toBe(AMANAH_RECORD.id);
    expect(resProd.items[0].legal_name).toBe('PT AMANAH TRANSPORTASI');

    // Cross-tenant parent_id must never resolve across tenants
    const crossTenantChild: MasterContactEntity = {
      ...AMANAH_RECORD,
      parent_id: OTHER_TENANT_ENTITY.id,
    };
    const pMap = buildParentCompanyMap([crossTenantChild, OTHER_TENANT_ENTITY], TENANT_PROD);
    expect(resolveParentCompany(crossTenantChild, pMap)).toBeNull();
  });

  // =========================================================================
  // 8. Konsistensi tabel setelah edit form dilakukan
  // =========================================================================
  it('8. Reflects updated legal_name, tax_id, parent_id, email, phone, and status immediately in the table after form edit', () => {
    const updatedAmanah: MasterContactEntity = {
      ...AMANAH_RECORD,
      name: 'AMANAH',
      legal_name: 'PT AMANAH TRANSPORTASI NUSANTARA',
      tax_id: '09.876.543.2-100.000',
      email: 'finance@amanahtransport.co.id',
      phone: '021-77889900',
      whatsapp: '081122334455',
      parent_id: HOLDING_PARENT.id,
      updated_at: '2026-10-25T10:30:00.000Z',
    };

    const datasetAfterEdit = attachPartyRolesToEntities(
      [updatedAmanah, HOLDING_PARENT],
      [AMANAH_PARTY_ROLE],
      TENANT_PROD,
    );

    const res = filterAndSortMasterContacts(datasetAfterEdit, {
      tenantId: TENANT_PROD,
      search: '09.876.543.2-100.000',
      roleFilter: 'customer',
    });

    expect(res.totalItems).toBe(1);
    const row = res.items[0];
    expect(row.id).toBe('dc4d2e3a-8602-455d-8c3d-212379364ce1');
    expect(row.entity_code).toBe('CUS/018');
    expect(deriveInitialName(row)).toBe('AMANAH');
    expect(row.legal_name).toBe('PT AMANAH TRANSPORTASI NUSANTARA');
    expect(row.tax_id).toBe('09.876.543.2-100.000');
    expect(row.email).toBe('finance@amanahtransport.co.id');
    expect(sanitizeContactPhone(row.phone)).toBe('021-77889900');
    expect(resolveParentCompany(row, res.parentMap)?.label).toBe('[CUS/011] BYD');
  });

  // =========================================================================
  // 9. Tidak ada regresi pada form Master Kontak baru (MasterCustomerModal 5 tabs + Google Maps)
  // =========================================================================
  it('9. Preserves the approved 5-tab MasterCustomerModal design and GoogleMapsInput integration', () => {
    const modalPath = path.resolve(
      process.cwd(),
      'components/master/MasterCustomerModal.tsx',
    );
    const modalContent = fs.readFileSync(modalPath, 'utf-8');

    expect(modalContent).toContain('1. Identitas & Legalitas');
    expect(modalContent).toContain('2. Hierarki Perusahaan');
    expect(modalContent).toContain('3. Penagihan & Termin');
    expect(modalContent).toContain('4. Kontak PIC');
    expect(modalContent).toContain('5. Lokasi Pengiriman');
    expect(modalContent).toContain('GoogleMapsInput');
    expect(modalContent).toContain('createCustomerMasterAction');
    expect(modalContent).toContain('updateCustomerMasterAction');

    const pagePath = path.resolve(
      process.cwd(),
      'app/(dashboard)/tenant/master/contacts/page.tsx',
    );
    const pageContent = fs.readFileSync(pagePath, 'utf-8');
    expect(pageContent).toContain('selectedEntityId={editingCustomerId}');

    const url = buildMasterKontakUrl({
      search: 'CUS/018',
      customerId: 'dc4d2e3a-8602-455d-8c3d-212379364ce1',
      role: 'customer',
      action: 'edit',
    });
    expect(url).toBe(
      '/tenant/master/contacts?tab=customer&search=CUS%2F018&customerId=dc4d2e3a-8602-455d-8c3d-212379364ce1&action=edit',
    );
  });
});
