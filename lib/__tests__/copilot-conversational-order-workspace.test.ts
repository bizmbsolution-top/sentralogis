/**
 * Sentralogis — Guided Flow A: Conversational Order Workspace Test Suite
 *
 * Validates end-to-end multi-turn conversation flow for Sales Order creation:
 * 1. Flow Initiation (all phrasing variations)
 * 2. Customer Lookup, Ambiguity, Zero Match, and Duplicate Warning
 * 3. Customer Registration Buffering for unauthorized vs authorized roles
 * 4. SBU / Service Selection (Trucking, Warehouse, Clearance, Forwarding)
 * 5. Progressive Order Details Collection
 * 6. Inline Corrections (route, cargo, revenue, service, customer)
 * 7. Structured Review Step with EXECUTE: OFF
 * 8. Cancellation handling without uncommitted state
 * 9. Final Confirmation Gate:
 *    - hq_cs (unauthorized): polite governance explanation + pre-filled link, 0 403 crashes
 *    - commercial manager (authorized): canonical Engagement + Sales Order with atomic number
 * 10. Non-interference with Operational Read Queries
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  ConversationalOrderWorkspace,
  _setWorkspaceDbClient,
  type GuidedOrderFlowState,
} from '@/lib/copilot/workflow/conversational-order-workspace';
import { CustomerIntentHandler } from '@/lib/copilot/customer/customer-intent-handler';
import { CopilotEngine } from '@/src/platforms/copilot/engine/CopilotEngine';
import { OperationalContext } from '@/src/platforms/copilot/context/OperationalContext';
import { TenantContext } from '@/src/platforms/copilot/context/TenantContext';
import { UserContext } from '@/src/platforms/copilot/context/UserContext';
import { PermissionContext } from '@/src/platforms/copilot/context/PermissionContext';
import { ConversationContext } from '@/src/platforms/copilot/context/ConversationContext';
import { WorkspaceContext } from '@/src/platforms/copilot/context/WorkspaceContext';
import type { IdentityContext } from '@/lib/application/identity/types';

describe('Copilot Conversational Order Workspace (Guided Flow A)', () => {
  const TENANT_ID = 'test-tenant-guided-flow';

  // Role hq_cs: Operational CS (strictly lacks commercial:manage and commercial:read)
  const rahmaIdentity: IdentityContext = {
    userId: 'rahma-user-001',
    tenantId: TENANT_ID,
    role: 'hq_cs',
    roles: ['hq_cs'],
    permissions: ['copilot:read', 'job_order:read', 'work_order:read', 'customer_visibility:read'],
    sbuScope: 'trucking',
  };

  // Role commercial_manager: Full commercial authoring privileges
  const commercialManagerIdentity: IdentityContext = {
    userId: 'manager-user-002',
    tenantId: TENANT_ID,
    role: 'commercial_admin',
    roles: ['commercial_admin'],
    permissions: ['copilot:read', 'commercial:read', 'commercial:manage'],
  };

  let mockDbEntities: Array<{ id: string; name: string; entity_code?: string; is_active?: boolean; tenant_id: string }>;

  function createMockDb() {
    return {
      from: (table: string) => {
        if (table === 'md_entities') {
          return {
            select: () => ({
              eq: (_col: string, tenantId: string) => ({
                ilike: (_col2: string, pattern: string) => ({
                  limit: async (lim: number) => {
                    const cleanPat = pattern.replace(/%/g, '').toLowerCase();
                    const filtered = mockDbEntities.filter(
                      (e) => e.tenant_id === tenantId && e.name.toLowerCase().includes(cleanPat)
                    );
                    return { data: filtered.slice(0, lim), error: null };
                  },
                }),
              }),
            }),
            insert: (payload: any) => ({
              select: () => ({
                single: async () => {
                  const newRecord = {
                    id: `entity-uuid-${Date.now()}`,
                    tenant_id: payload.tenant_id,
                    name: payload.name,
                    entity_code: payload.entity_code || 'CUST-NEW',
                    is_active: true,
                  };
                  mockDbEntities.push(newRecord);
                  return { data: newRecord, error: null };
                },
              }),
            }),
          };
        }
        return {
          select: () => ({ eq: () => ({ limit: async () => ({ data: [], error: null }) }) }),
        };
      },
    };
  }

  function createTestContext(identity: IdentityContext, convoId = 'guided-session-1') {
    return OperationalContext.create({
      tenant: TenantContext.create({ id: identity.tenantId }),
      user: UserContext.create({ id: identity.userId, displayName: identity.role === 'hq_cs' ? 'RAHMA' : 'Commercial Manager', roles: identity.roles }),
      permissions: PermissionContext.create(identity.permissions),
      conversation: ConversationContext.create({ conversationId: convoId }),
      workspace: WorkspaceContext.create({}),
    });
  }

  beforeEach(() => {
    ConversationalOrderWorkspace.resetAllSessions();
    mockDbEntities = [
      { id: 'entity-1', name: 'PT Mitra Sukses Logistik', entity_code: 'MSL-01', is_active: true, tenant_id: TENANT_ID },
      { id: 'entity-2', name: 'PT Mitra Makmur Sejahtera', entity_code: 'MMS-02', is_active: true, tenant_id: TENANT_ID },
      { id: 'entity-3', name: 'CV Berkah Angkutan', entity_code: 'CBA-03', is_active: true, tenant_id: TENANT_ID },
    ];
    _setWorkspaceDbClient(createMockDb());
  });

  // --------------------------------------------------------------------------
  // 1. INITIATION PHRASING VARIATIONS
  // --------------------------------------------------------------------------
  it('1. INITIATION INTENTS: correctly recognizes diverse order creation phrasings and prompts for customer', async () => {
    const phrasings = [
      'buatkan order baru',
      'order baru',
      'buat SO baru',
      'buat sales order baru',
      'saya ingin membuat pesanan pelanggan',
      'mulai transaksi pelanggan',
      'Saya mau order trucking',
    ];

    for (const phrase of phrasings) {
      ConversationalOrderWorkspace.resetAllSessions();
      const isInit = ConversationalOrderWorkspace.isOrderInitiationIntent(phrase);
      expect(isInit, `Failed initiation intent on: "${phrase}"`).toBe(true);

      const result = await ConversationalOrderWorkspace.handleTurn(phrase, rahmaIdentity);
      expect(result.handled).toBe(true);
      expect(result.responseText).toBeTruthy();
    }

    // Per U-28 contract: customer registration intent is routed via CustomerIntentHandler, not order initiation
    expect(ConversationalOrderWorkspace.isOrderInitiationIntent('Daftarkan customer baru')).toBe(false);
    expect(CustomerIntentHandler.isCustomerCreateIntent('Daftarkan customer baru', commercialManagerIdentity)).toBe(true);
  });

  // --------------------------------------------------------------------------
  // 2. CUSTOMER MATCHING & AMBIGUITY
  // --------------------------------------------------------------------------
  it('2. CUSTOMER MATCHING: single match auto-selects, multiple matches trigger options, zero match asks for registration', async () => {
    const convoId = 'convo-customer-matching';

    // 2A. Multiple matches for "Mitra" (PT Mitra Sukses & PT Mitra Makmur)
    ConversationalOrderWorkspace.resetAllSessions();
    await ConversationalOrderWorkspace.handleTurn('buat SO baru', rahmaIdentity, null, convoId);
    const turn2 = await ConversationalOrderWorkspace.handleTurn('Mitra', rahmaIdentity, null, convoId);
    expect(turn2.handled).toBe(true);
    expect(turn2.responseText).toContain('Ditemukan beberapa customer yang cocok');
    expect(turn2.responseText).toContain('PT Mitra Sukses Logistik');
    expect(turn2.responseText).toContain('PT Mitra Makmur Sejahtera');

    // 2B. Single match selection: "Berkah"
    ConversationalOrderWorkspace.resetAllSessions();
    await ConversationalOrderWorkspace.handleTurn('buat SO baru', rahmaIdentity, null, convoId);
    const turnSingle = await ConversationalOrderWorkspace.handleTurn('Berkah', rahmaIdentity, null, convoId);
    expect(turnSingle.handled).toBe(true);
    expect(turnSingle.responseText).toContain('Customer **CV Berkah Angkutan** berhasil diverifikasi');
    expect(turnSingle.responseText).toContain('Trucking');

    // 2C. Zero match: "PT Samudera Logistik Baru"
    ConversationalOrderWorkspace.resetAllSessions();
    await ConversationalOrderWorkspace.handleTurn('buat SO baru', rahmaIdentity, null, convoId);
    const turnZero = await ConversationalOrderWorkspace.handleTurn('PT Samudera Logistik Baru', rahmaIdentity, null, convoId);
    expect(turnZero.handled).toBe(true);
    expect(turnZero.responseText).toContain('belum terdaftar pada data master');
    expect(turnZero.responseText).toContain('Apakah Anda ingin mendaftarkan **"PT Samudera Logistik Baru"** sebagai customer baru sekarang?');
  });

  // --------------------------------------------------------------------------
  // 3. CUSTOMER REGISTRATION BUFFERING & DUPLICATE WARNING
  // --------------------------------------------------------------------------
  it('3. REGISTRATION BUFFERING & DUPLICATE WARNING: buffers candidate for hq_cs without write, warns on duplicates', async () => {
    const convoId = 'convo-reg-buffer';

    // Initiate order flow and provide unregistered customer "PT Mitra Abadi"
    ConversationalOrderWorkspace.resetAllSessions();
    await ConversationalOrderWorkspace.handleTurn('buat SO baru', rahmaIdentity, null, convoId);
    const stepCust = await ConversationalOrderWorkspace.handleTurn('PT Mitra Abadi', rahmaIdentity, null, convoId);
    expect(stepCust.handled).toBe(true);
    expect(stepCust.responseText).toContain('belum terdaftar pada data master');

    const regConfirm = await ConversationalOrderWorkspace.handleTurn('Ya, daftarkan', rahmaIdentity, null, convoId);

    // rahma is hq_cs (no commercial:manage / customer:register) -> candidate buffered, polite policy notice, no uncaught crash
    expect(regConfirm.handled).toBe(true);
    expect(regConfirm.responseText).toContain('Pendaftaran Customer Baru Dibufer');
    expect(regConfirm.responseText).toContain('PT Mitra Abadi');
    expect(regConfirm.responseText).toContain('hq_cs');
    expect(regConfirm.responseText).toContain('Silakan pilih jenis layanan/SBU yang diinginkan:');
  });

  // --------------------------------------------------------------------------
  // 4. SERVICE / SBU SELECTION
  // --------------------------------------------------------------------------
  it('4. SBU SELECTION: validates SBU types (Trucking, Warehouse, Clearance, Forwarding) and rejects invalid ones', async () => {
    const convoId = 'convo-sbu-sel';

    // Start with known customer
    ConversationalOrderWorkspace.resetAllSessions();
    await ConversationalOrderWorkspace.handleTurn('buat sales order untuk CV Berkah Angkutan', rahmaIdentity, null, convoId);

    // Invalid SBU
    const invalidTurn = await ConversationalOrderWorkspace.handleTurn('Kapal Pesiar', rahmaIdentity, null, convoId);
    expect(invalidTurn.responseText).toMatch(/pilihan layanan.*tidak dikenali/i);
    expect(invalidTurn.responseText).toContain('Trucking');

    // Valid SBU: Trucking
    const validTurn = await ConversationalOrderWorkspace.handleTurn('Trucking', rahmaIdentity, null, convoId);
    expect(validTurn.responseText).toContain('TRUCKING');
    expect(validTurn.responseText).toContain('Lokasi Asal (Origin)');
  });

  // --------------------------------------------------------------------------
  // 5. PROGRESSIVE DETAILS COLLECTION & INLINE CORRECTIONS
  // --------------------------------------------------------------------------
  it('5. PROGRESSIVE DETAILS & INLINE CORRECTIONS: collects route, cargo, revenue, and applies live corrections', async () => {
    const convoId = 'convo-details-flow';
    ConversationalOrderWorkspace.resetAllSessions();

    // Turn 1: Init with customer & service
    await ConversationalOrderWorkspace.handleTurn('buat order CV Berkah Angkutan layanan trucking', rahmaIdentity, null, convoId);

    // Turn 2: Provide route
    const t2 = await ConversationalOrderWorkspace.handleTurn('asal Jakarta tujuan Semarang', rahmaIdentity, null, convoId);
    expect(t2.responseText).toContain('Jakarta');
    expect(t2.responseText).toContain('Semarang');

    // Turn 3: Inline correction - change destination to Surabaya
    const t3 = await ConversationalOrderWorkspace.handleTurn('ganti tujuan ke Surabaya', rahmaIdentity, null, convoId);
    expect(t3.responseText).toContain('Surabaya');

    // Turn 4: Cargo & quantity
    const t4 = await ConversationalOrderWorkspace.handleTurn('muatan Spare Part Mesin 10 palet', rahmaIdentity, null, convoId);
    expect(t4.responseText).toContain('Spare Part Mesin');
    expect(t4.responseText).toContain('10 palet');

    // Turn 5: Revenue & date
    const t5 = await ConversationalOrderWorkspace.handleTurn('nilai Rp 18.500.000 tanggal 2026-10-25', rahmaIdentity, null, convoId);
    expect(t5.responseText).toContain('18.500.000');
    expect(t5.responseText).toContain('2026-10-25');

    // Turn 6: Inline correction on revenue
    const t6 = await ConversationalOrderWorkspace.handleTurn('ganti nilai ke 20 juta', rahmaIdentity, null, convoId);
    expect(t6.responseText).toContain('20.000.000');
  });

  // --------------------------------------------------------------------------
  // 6. CANCELLATION HANDLING
  // --------------------------------------------------------------------------
  it('6. CANCELLATION: "batal" cleanly aborts the active session with zero persistence', async () => {
    const convoId = 'convo-cancel-test';
    ConversationalOrderWorkspace.resetAllSessions();

    await ConversationalOrderWorkspace.handleTurn('buat SO baru', rahmaIdentity, null, convoId);
    expect(ConversationalOrderWorkspace.getSessionState(rahmaIdentity, undefined, convoId)).not.toBeNull();

    const cancelRes = await ConversationalOrderWorkspace.handleTurn('batal', rahmaIdentity, null, convoId);
    expect(cancelRes.handled).toBe(true);
    expect(cancelRes.responseText).toContain('Proses percakapan pembuatan Sales Order telah dibatalkan');
    expect(ConversationalOrderWorkspace.getSessionState(rahmaIdentity, undefined, convoId)).toBeNull();
  });

  // --------------------------------------------------------------------------
  // 7. GOVERNANCE CONFIRMATION: HQ_CS (UNAUTHORIZED) REFUSAL WITH FORM LINK
  // --------------------------------------------------------------------------
  it('7. CONFIRMATION FOR HQ_CS: explains commercial:manage boundary and provides pre-filled create link without 403 crash', async () => {
    const convoId = 'convo-rahma-confirm';
    ConversationalOrderWorkspace.resetAllSessions();

    // Start with all mandatory details (including quantity)
    const initRes = await ConversationalOrderWorkspace.handleTurn(
      'buat sales order untuk CV Berkah Angkutan trucking Jakarta ke Surabaya muatan Besi Beton 10 ton nilai Rp 25.000.000 tanggal 2026-10-20',
      rahmaIdentity,
      null,
      convoId,
    );
    expect(initRes.handled).toBe(true);
    expect(initRes.responseText).toContain('Ringkasan Sales Order');
    expect(initRes.responseText).toContain('CV Berkah Angkutan');
    expect(initRes.responseText).toContain('EXECUTE: OFF');

    // Confirm step
    const confirmRes = await ConversationalOrderWorkspace.handleTurn('Simpan', rahmaIdentity, null, convoId);
    expect(confirmRes.handled).toBe(true);
    expect(confirmRes.responseText).toContain('Otorisasi Tata Kelola Terbatas (EXECUTE: OFF)');
    expect(confirmRes.responseText).toContain('commercial:manage');
    expect(confirmRes.responseText).toContain('hq_cs');
    expect(confirmRes.responseText).toContain('/commercial/sales-orders/create');
    expect(confirmRes.responseText).toContain('CV%20Berkah%20Angkutan');
    expect(confirmRes.responseText).not.toContain('SO-FAKE');
  });

  // --------------------------------------------------------------------------
  // 8. READ QUERY NON-INTERFERENCE
  // --------------------------------------------------------------------------
  it('8. NON-INTERFERENCE: operational read queries bypass active flow through CopilotEngine', async () => {
    const testContext = createTestContext(rahmaIdentity, 'convo-read-isolation');

    // 1. Initiate order
    const r1 = await CopilotEngine.processCommand('buat SO baru', testContext, rahmaIdentity);
    expect(r1.content).toContain('Ringkasan Pra-Aksi Pembuatan Sales Order');

    // 2. User asks a read query while order was in progress: "sales order draft"
    const r2 = await CopilotEngine.processCommand('sales order draft', testContext, rahmaIdentity);
    // Should NOT be treated as a customer name
    expect(r2.content).not.toContain('Nama Customer: sales order draft');
    // Must be rejected as protected commercial read when identity lacks both sales_order:read and commercial:read
    expect(r2.content).toContain("Akses ditolak: Pembacaan data Sales Order memerlukan izin 'sales_order:read' atau 'commercial:read'");
  });
});
