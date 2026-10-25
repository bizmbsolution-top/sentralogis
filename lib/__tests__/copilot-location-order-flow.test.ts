/**
 * Sentralogis — Phase 4B: Copilot Location & Order Flow Test Suite
 * lib/__tests__/copilot-location-order-flow.test.ts
 *
 * Mandatory Verification Gates per Section 7:
 * 1. Pencarian lokasi master yang cocok.
 * 2. Lokasi Google Maps yang belum memiliki record master.
 * 3. Penanganan hasil lokasi ambigu.
 * 4. Penyimpanan alamat dan referensi lokasi yang dipilih.
 * 5. Input asal dan tujuan melalui Copilot.
 * 6. Input "Container 20ft" yang memperbarui field muatan.
 * 7. Persistensi state ketika percakapan berlanjut.
 * 8. Draft yang sama dibuka kembali dengan data yang sudah diisi.
 * 9. Proposal aksi dengan tipe yang valid dan penanganan tipe yang tidak dikenal.
 * 10. Otorisasi tenant dan validasi penyimpanan yang sudah berlaku.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  ConversationalOrderWorkspace,
  _setWorkspaceDbClient,
  type GuidedOrderFlowState,
} from '@/lib/copilot/workflow/conversational-order-workspace';
import {
  LocationMatchingService,
  _setLocationDbClient,
} from '@/lib/location/location-matching-service';
import type { IdentityContext } from '@/lib/application/identity/types';
import { ConversationalQueryResolver } from '@/lib/copilot/sandbox/conversational-query-resolver';
import {
  OperationalLiveReadGateway,
  _setOperationalReadDelegate,
} from '@/lib/copilot/read/operational-live-read-gateway';

describe('Copilot Location & Sales Order Flow (Section 7 Gates)', () => {
  const TENANT_ID = 'test-tenant-loc-so';

  // Role commercial_manager: Full authorized access
  const commercialAdminIdentity: IdentityContext = {
    userId: 'admin-user-01',
    tenantId: TENANT_ID,
    role: 'commercial_admin',
    roles: ['commercial_admin'],
    permissions: ['copilot:read', 'commercial:read', 'commercial:manage', 'sales_order:create'],
  };

  // Role hq_cs: CS without commercial:manage
  const csIdentity: IdentityContext = {
    userId: 'cs-user-02',
    tenantId: TENANT_ID,
    role: 'hq_cs',
    roles: ['hq_cs'],
    permissions: ['copilot:read', 'job_order:read', 'work_order:read'],
  };

  let mockLocations: any[];
  let mockEntities: any[];

  beforeEach(() => {
    ConversationalOrderWorkspace.clearSession(commercialAdminIdentity);
    ConversationalOrderWorkspace.clearSession(csIdentity);

    mockLocations = [
      {
        id: 'loc-npct1-uuid',
        tenant_id: TENANT_ID,
        location_code: 'NPCT1-PRIOK',
        name: 'NPCT 1 Priok',
        address: 'Jl. Terminal Petikemas Kalibaru, Cilincing, Jakarta Utara',
        city: 'Jakarta Utara',
        province: 'DKI Jakarta',
        postal_code: '14110',
        latitude: -6.1012,
        longitude: 106.9125,
        is_active: true,
      },
      {
        id: 'loc-cikarang-dryport-uuid',
        tenant_id: TENANT_ID,
        location_code: 'CDP-001',
        name: 'Cikarang Dry Port',
        address: 'Kawasan Industri Jababeka, Cikarang',
        city: 'Bekasi',
        province: 'Jawa Barat',
        postal_code: '17530',
        latitude: -6.2891,
        longitude: 107.1554,
        is_active: true,
      },
    ];

    mockEntities = [
      {
        id: 'ent-tps-uuid',
        tenant_id: TENANT_ID,
        entity_code: 'TPS',
        name: 'PT TRADING PERDANA SUKSES',
        legal_name: 'PT TRADING PERDANA SUKSES',
        is_active: true,
      },
    ];

    // Inject mock DB for LocationMatchingService
    _setLocationDbClient({
      from: (tbl: string) => {
        if (tbl === 'md_locations') {
          return {
            select: () => ({
              eq: (_col: string, tenantId: string) => ({
                or: (orClause: string) => ({
                  limit: async (lim: number) => {
                    const clean = orClause.split('%')[1]?.toLowerCase() || '';
                    const matched = mockLocations.filter(
                      (l) =>
                        l.tenant_id === tenantId &&
                        l.is_active !== false &&
                        (l.name.toLowerCase().includes(clean) ||
                          l.location_code.toLowerCase().includes(clean) ||
                          l.address.toLowerCase().includes(clean))
                    );
                    return { data: matched.slice(0, lim), error: null };
                  },
                }),
                ilike: (_col2: string, pat: string) => ({
                  limit: async (lim: number) => {
                    const clean = pat.replace(/%/g, '').toLowerCase();
                    const matched = mockLocations.filter(
                      (l) => l.tenant_id === tenantId && l.name.toLowerCase().includes(clean)
                    );
                    return { data: matched.slice(0, lim), error: null };
                  },
                }),
              }),
            }),
          };
        }
        return { select: () => ({ eq: () => ({ limit: async () => ({ data: [], error: null }) }) }) };
      },
    });

    // Inject mock DB for ConversationalOrderWorkspace
    _setWorkspaceDbClient({
      from: (tbl: string) => {
        if (tbl === 'md_entities') {
          return {
            select: () => ({
              eq: (_col: string, tenantId: string) => ({
                or: (orClause: string) => ({
                  limit: async (lim: number) => {
                    const tokens = orClause
                      .split(',')
                      .map((p) => p.split('%')[1]?.toLowerCase())
                      .filter(Boolean);
                    const matched = mockEntities.filter((e) => {
                      if (e.tenant_id !== tenantId || e.is_active === false) return false;
                      const n = e.name.toLowerCase();
                      const c = (e.entity_code || '').toLowerCase();
                      return tokens.some((t) => n.includes(t) || c.includes(t));
                    });
                    return { data: matched.slice(0, lim), error: null };
                  },
                }),
                ilike: (_col2: string, pat: string) => ({
                  limit: async (lim: number) => {
                    const clean = pat.replace(/%/g, '').toLowerCase();
                    const matched = mockEntities.filter(
                      (e) => e.tenant_id === tenantId && e.name.toLowerCase().includes(clean)
                    );
                    return { data: matched.slice(0, lim), error: null };
                  },
                }),
              }),
            }),
          };
        }
        return { select: () => ({ eq: () => ({ limit: async () => ({ data: [], error: null }) }) }) };
      },
    });
  });

  // 1. Pencarian lokasi master yang cocok
  it('Gate 1: searches and matches existing master data location with location_code', async () => {
    const results = await LocationMatchingService.searchMasterLocations('NPCT 1 Priok', TENANT_ID);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].location_code).toBe('NPCT1-PRIOK');
    expect(results[0].name).toBe('NPCT 1 Priok');

    const match = await LocationMatchingService.matchPlaceWithMaster(
      { address: 'NPCT 1 Priok, Kalibaru' },
      TENANT_ID
    );
    expect(match.isMasterMatch).toBe(true);
    expect(match.masterLocationId).toBe('loc-npct1-uuid');
    expect(match.masterLocationCode).toBe('NPCT1-PRIOK');
  });

  // 2. Lokasi Google Maps yang belum memiliki record master
  it('Gate 2: preserves external Google Maps reference without fabricating fake master IDs', async () => {
    const place = {
      name: 'Gudang Logistik Cikarang Barat KM 28',
      address: 'Jl. Raya Industri Cibitung No. 45, Cikarang Barat, Bekasi',
      city: 'Bekasi',
      province: 'Jawa Barat',
      postalCode: '17520',
      latitude: -6.265,
      longitude: 107.098,
      placeId: 'ChIJ5_qZ0d_7aS4R1234567890a',
    };

    const match = await LocationMatchingService.matchPlaceWithMaster(place, TENANT_ID);
    expect(match.isMasterMatch).toBe(false);
    expect(match.masterLocationId).toBeNull();
    expect(match.masterLocationCode).toBeNull();
    expect(match.placeId).toBe('ChIJ5_qZ0d_7aS4R1234567890a');
    expect(match.latitude).toBe(-6.265);
    expect(match.longitude).toBe(107.098);
  });

  // 3. Penanganan hasil lokasi ambigu
  it('Gate 3: identifies broad ambiguous location (Cikarang) and prompts for specific estate/hub clarification', async () => {
    const turn1 = await ConversationalOrderWorkspace.handleTurn(
      'Buat order baru PT TRADING PERDANA SUKSES (TPS)',
      commercialAdminIdentity
    );
    expect(turn1.state?.customerName).toContain('PT TRADING PERDANA SUKSES');

    const turn2 = await ConversationalOrderWorkspace.handleTurn('Trucking', commercialAdminIdentity);
    expect(turn2.state?.sbuType).toBe('TRUCKING');

    const turn3 = await ConversationalOrderWorkspace.handleTurn('NPCT 1 Priok', commercialAdminIdentity);
    expect(turn3.state?.origin).toBe('NPCT 1 Priok');

    const turn4 = await ConversationalOrderWorkspace.handleTurn('Cikarang', commercialAdminIdentity);
    expect(turn4.state?.destination).toBe('Cikarang');
    expect(turn4.state?.destinationRequiresClarification).toBe(true);
    expect(turn4.responseText).toContain('Cikarang');
    expect(turn4.responseText).toContain('Catatan Lokasi');
  });

  // 4. Penyimpanan alamat dan referensi lokasi yang dipilih
  it('Gate 4: accurately stores both origin master reference and external destination reference', async () => {
    const state: Partial<GuidedOrderFlowState> = {
      step: 'ORDER_DETAILS',
      sbuType: 'TRUCKING',
      customerName: 'PT TRADING PERDANA SUKSES',
      customerId: 'ent-tps-uuid',
      orderDate: '2026-10-18',
      totalAgreedRevenue: 0,
      currency: 'IDR',
      commercialNotes: null,
      wantsConfirmImmediately: false,
      lastUpdated: Date.now(),
    };

    const turn = await ConversationalOrderWorkspace.handleTurn(
      'Asal: NPCT 1 Priok, Tujuan: Cikarang, Muatan: Container 20ft',
      commercialAdminIdentity,
      state as GuidedOrderFlowState
    );

    expect(turn.state?.origin).toBe('NPCT 1 Priok');
    expect(turn.state?.originLocationId).toBe('loc-npct1-uuid');
    expect(turn.state?.originLocationCode).toBe('NPCT1-PRIOK');
    expect(turn.state?.destination).toBe('Cikarang');
    expect(turn.state?.destinationLocationId).toBeNull();
  });

  // 5. Input asal dan tujuan melalui Copilot
  it('Gate 5: handles multi-turn conversational inputs for origin and destination without loss', async () => {
    const turn1 = await ConversationalOrderWorkspace.handleTurn(
      'Buat sales order untuk TPS',
      commercialAdminIdentity
    );
    expect(turn1.state?.customerId).toBe('ent-tps-uuid');

    const turn2 = await ConversationalOrderWorkspace.handleTurn('Layanan Trucking', commercialAdminIdentity);
    expect(turn2.state?.sbuType).toBe('TRUCKING');

    const turn3 = await ConversationalOrderWorkspace.handleTurn('Asal NPCT 1 Priok', commercialAdminIdentity);
    expect(turn3.state?.origin).toBe('NPCT 1 Priok');
    expect(turn3.state?.destination).toBeNull();

    const turn4 = await ConversationalOrderWorkspace.handleTurn('Tujuan Cikarang', commercialAdminIdentity);
    expect(turn4.state?.origin).toBe('NPCT 1 Priok');
    expect(turn4.state?.destination).toBe('Cikarang');
  });

  // 6. Input "Container 20ft" yang memperbarui field muatan
  it('Gate 6: extracts "Container 20ft" and correctly sets cargoDescription and quantity', async () => {
    const state: Partial<GuidedOrderFlowState> = {
      step: 'ORDER_DETAILS',
      sbuType: 'TRUCKING',
      customerName: 'PT TRADING PERDANA SUKSES',
      customerId: 'ent-tps-uuid',
      origin: 'NPCT 1 Priok',
      destination: 'Cikarang',
      orderDate: '2026-10-18',
      totalAgreedRevenue: 15000000,
      currency: 'IDR',
      commercialNotes: null,
      wantsConfirmImmediately: false,
      lastUpdated: Date.now(),
    };

    const turn = await ConversationalOrderWorkspace.handleTurn(
      'Container 20ft',
      commercialAdminIdentity,
      state as GuidedOrderFlowState
    );

    expect(turn.state?.cargoDescription).toBe('Container 20ft');
    expect(turn.state?.quantity).toBe('1');
    expect(turn.state?.step).toBe('REVIEW');
    expect(turn.actionRequired).toBe('CONFIRM_SAVE');
  });

  it('Gate 6b: correctly parses "Container 20ft x 2" into cargoDescription "Container 20ft" and quantity "2"', async () => {
    const state: Partial<GuidedOrderFlowState> = {
      step: 'ORDER_DETAILS',
      sbuType: 'TRUCKING',
      customerName: 'PT TRADING PERDANA SUKSES',
      customerId: 'ent-tps-uuid',
      customerCode: 'TPS',
      origin: 'NPCT 1 PRIOK',
      destination: 'Cikarang MM2000',
      orderDate: '2026-10-18',
      totalAgreedRevenue: 0,
      currency: 'IDR',
      commercialNotes: null,
      wantsConfirmImmediately: false,
      lastUpdated: Date.now(),
    };

    const turn = await ConversationalOrderWorkspace.handleTurn(
      'Container 20ft x 2',
      commercialAdminIdentity,
      state as GuidedOrderFlowState
    );

    expect(turn.state?.cargoDescription).toBe('Container 20ft');
    expect(turn.state?.quantity).toBe('2');
    expect(turn.state?.step).toBe('REVIEW');
    expect(turn.proposal).toBeDefined();
    expect(turn.proposal.cargoDescription).toBe('Container 20ft');
    expect(turn.proposal.quantity).toBe('2');
    expect(turn.proposal.customerCode).toBe('TPS');
    expect(turn.proposal.origin).toBe('NPCT 1 Priok'); // canonical master matched name
    expect(turn.proposal.destination).toBe('Cikarang MM2000');
    expect(turn.proposal.draftPayload).toBeDefined();
    expect(turn.proposal.draftPayload.quantity).toBe('2');
    expect(turn.proposal.draftPayload.cargoDescription).toBe('Container 20ft');
  });

  // 7. Persistensi state ketika percakapan berlanjut
  it('Gate 7: persists state across turns without wiping previously filled fields', async () => {
    await ConversationalOrderWorkspace.handleTurn('Buat SO untuk TPS', commercialAdminIdentity);
    await ConversationalOrderWorkspace.handleTurn('Trucking', commercialAdminIdentity);
    await ConversationalOrderWorkspace.handleTurn('Asal: NPCT 1 Priok', commercialAdminIdentity);
    await ConversationalOrderWorkspace.handleTurn('Tujuan: Cikarang', commercialAdminIdentity);
    const finalTurn = await ConversationalOrderWorkspace.handleTurn(
      'Muatan: Container 20ft',
      commercialAdminIdentity
    );

    const savedState = ConversationalOrderWorkspace.getSessionState(commercialAdminIdentity);
    expect(savedState).not.toBeNull();
    expect(savedState?.customerName).toContain('PT TRADING PERDANA SUKSES');
    expect(savedState?.sbuType).toBe('TRUCKING');
    expect(savedState?.origin).toBe('NPCT 1 Priok');
    expect(savedState?.destination).toBe('Cikarang');
    expect(savedState?.cargoDescription).toBe('Container 20ft');
    expect(finalTurn.state?.step).toBe('REVIEW');
  });

  // 8. Draft yang sama dibuka kembali dengan data yang sudah diisi
  it('Gate 8: retrieves the same active draft session with all saved fields intact', () => {
    const testState: GuidedOrderFlowState = {
      step: 'ORDER_DETAILS',
      customerId: 'ent-tps-uuid',
      customerName: 'PT TRADING PERDANA SUKSES',
      sbuType: 'TRUCKING',
      origin: 'NPCT 1 Priok',
      originLocationCode: 'NPCT1-PRIOK',
      destination: 'Cikarang',
      cargoDescription: 'Container 20ft',
      quantity: '1 Container 20ft',
      orderDate: '2026-10-18',
      targetFulfillmentDate: null,
      totalAgreedRevenue: 12000000,
      currency: 'IDR',
      commercialNotes: null,
      wantsConfirmImmediately: false,
      lastUpdated: Date.now(),
    };

    ConversationalOrderWorkspace.saveSessionState(commercialAdminIdentity, testState, 'session-restore-test');
    const restored = ConversationalOrderWorkspace.getSessionState(
      commercialAdminIdentity,
      null,
      'session-restore-test'
    );

    expect(restored).not.toBeNull();
    expect(restored?.customerId).toBe('ent-tps-uuid');
    expect(restored?.origin).toBe('NPCT 1 Priok');
    expect(restored?.destination).toBe('Cikarang');
    expect(restored?.cargoDescription).toBe('Container 20ft');
    expect(restored?.totalAgreedRevenue).toBe(12000000);
  });

  // 9. Proposal aksi dengan tipe yang valid dan penanganan tipe yang tidak dikenal
  it('Gate 9: generates action proposal with valid action and intent, never undefined or Unknown', async () => {
    const readyState: GuidedOrderFlowState = {
      step: 'ORDER_DETAILS',
      customerId: 'ent-tps-uuid',
      customerName: 'PT TRADING PERDANA SUKSES',
      sbuType: 'TRUCKING',
      origin: 'NPCT 1 Priok',
      destination: 'Cikarang',
      cargoDescription: 'Container 20ft',
      quantity: '1 Container 20ft',
      orderDate: '2026-10-18',
      targetFulfillmentDate: null,
      totalAgreedRevenue: 10000000,
      currency: 'IDR',
      commercialNotes: null,
      wantsConfirmImmediately: false,
      lastUpdated: Date.now(),
    };

    const turn = await ConversationalOrderWorkspace.handleTurn(
      'Review order',
      commercialAdminIdentity,
      readyState
    );

    expect(turn.proposal).toBeDefined();
    expect(turn.proposal.action).toBe('CREATE_SALES_ORDER');
    expect(turn.proposal.intent).toBe('CREATE_SALES_ORDER');
    expect(turn.proposal.action).not.toBe('undefined');
    expect(turn.proposal.action).not.toBe('Unknown');
    expect(turn.proposal.customerName).toBe('PT TRADING PERDANA SUKSES');
    expect(turn.proposal.origin).toBe('NPCT 1 Priok');
    expect(turn.proposal.destination).toBe('Cikarang');
  });

  // 10. Otorisasi tenant dan validasi penyimpanan yang sudah berlaku (EXECUTE: OFF guard)
  it('Gate 10: enforces EXECUTE: OFF and refuses direct mutation for unauthorized role (CS)', async () => {
    const reviewState: GuidedOrderFlowState = {
      step: 'REVIEW',
      customerId: 'ent-tps-uuid',
      customerName: 'PT TRADING PERDANA SUKSES',
      sbuType: 'TRUCKING',
      origin: 'NPCT 1 Priok',
      destination: 'Cikarang',
      cargoDescription: 'Container 20ft',
      quantity: '1 Container 20ft',
      orderDate: '2026-10-18',
      targetFulfillmentDate: null,
      totalAgreedRevenue: 10000000,
      currency: 'IDR',
      commercialNotes: null,
      wantsConfirmImmediately: false,
      lastUpdated: Date.now(),
    };

    const result = await ConversationalOrderWorkspace.handleTurn(
      'Simpan',
      csIdentity,
      reviewState
    );

    expect(result.handled).toBe(true);
    expect(result.responseText).toContain('Otorisasi Tata Kelola Terbatas');
    expect(result.responseText).toContain('tidak memiliki hak akses pembuatan Sales Order');
    expect(result.responseText).toContain('/commercial/sales-orders/create');
  });

  // 11. Customer Identity Integrity: TPS must never be overwritten by ABC
  it('Gate 11: preserves customer identity (TPS) in draftPayload and review links with customerCode', async () => {
    // 1. Initial turn: choose customer TPS
    const turn1 = await ConversationalOrderWorkspace.handleTurn(
      'buat order baru untuk TPS',
      commercialAdminIdentity
    );

    expect(turn1.handled).toBe(true);
    expect(turn1.state?.customerId).toBe('ent-tps-uuid');
    expect(turn1.state?.customerCode).toBe('TPS');
    expect(turn1.state?.customerName).toBe('PT TRADING PERDANA SUKSES');

    // 2. Set service trucking
    const turn2 = await ConversationalOrderWorkspace.handleTurn(
      'trucking',
      commercialAdminIdentity,
      turn1.state
    );

    // 3. Set origin
    const turn3 = await ConversationalOrderWorkspace.handleTurn(
      'asal NPCT 1 Priok',
      commercialAdminIdentity,
      turn2.state
    );

    // 4. Set destination
    const turn4 = await ConversationalOrderWorkspace.handleTurn(
      'tujuan Cikarang Dry Port',
      commercialAdminIdentity,
      turn3.state
    );

    // 5. Set cargo
    const turn5 = await ConversationalOrderWorkspace.handleTurn(
      'Container 20ft x 2',
      commercialAdminIdentity,
      turn4.state
    );

    // 6. Review turn
    const turn6 = await ConversationalOrderWorkspace.handleTurn(
      'review',
      commercialAdminIdentity,
      turn5.state
    );

    expect(turn6.proposal).toBeDefined();
    expect(turn6.proposal.customerId).toBe('ent-tps-uuid');
    expect(turn6.proposal.customerCode).toBe('TPS');
    expect(turn6.proposal.customerName).toBe('PT TRADING PERDANA SUKSES');
    expect(turn6.proposal.draftPayload?.customerCode).toBe('TPS');
    expect(turn6.proposal.draftPayload?.customerId).toBe('ent-tps-uuid');

    // 7. Click or request official form
    const formTurn = await ConversationalOrderWorkspace.handleTurn(
      'buka form resmi',
      commercialAdminIdentity,
      turn6.state
    );

    expect(formTurn.responseText).toContain('customerCode=TPS');
    expect(formTurn.responseText).toContain('customerId=ent-tps-uuid');
    expect(formTurn.responseText).not.toContain('customer=ABC');
  });

  // 12. Open existing draft Sales Order via Copilot
  it('Gate 12: handles "Buka order TPS status draft" by querying existing draft Sales Orders and returning direct link', async () => {
    // Setup mock delegate returning existing draft SO for TPS
    const mockDraftSo = {
      id: '54d110a3-ee17-4a9a-bdad-ce86ebdb4b54',
      soNumber: 'SO-2026-10-0009',
      customerId: 'ent-tps-uuid',
      customerName: 'PT TRADING PERDANA SUKSES',
      customerCode: 'TPS',
      status: 'DRAFT',
      orderDate: '2026-10-17T00:00:00.000Z',
      targetFulfillmentDate: '2026-10-20T00:00:00.000Z',
      totalRevenue: 15000000,
      currency: 'IDR',
    };

    let listSalesOrdersCalled = false;
    let receivedFilters: any = null;

    _setOperationalReadDelegate({
      findJobOrderByNumber: async () => null,
      listJobOrders: async () => [],
      findWorkOrderByNumber: async () => null,
      findSalesOrderByNumber: async () => null,
      listSalesOrders: async (_ctx, filters) => {
        listSalesOrdersCalled = true;
        receivedFilters = filters;
        if (filters?.status === 'DRAFT' && (filters?.customer?.toLowerCase() === 'tps' || filters?.customer?.includes('trading perdana'))) {
          return [mockDraftSo];
        }
        return [];
      },
      findShipmentByNumber: async () => null,
    });

    try {
      // 1. Resolve query
      const parsed = ConversationalQueryResolver.resolveQueryContext('Buka order TPS status draft');
      expect(parsed.context.objectType).toBe('SALES_ORDER');
      expect(parsed.context.status).toBe('DRAFT');
      expect(parsed.context.customer).toBe('TPS');

      // 2. Execute live read
      const readRes = await OperationalLiveReadGateway.executeLiveRead(commercialAdminIdentity, parsed.context);

      expect(listSalesOrdersCalled).toBe(true);
      expect(receivedFilters?.status).toBe('DRAFT');
      expect(receivedFilters?.customer).toBe('TPS');

      // 3. Response should have direct answer with prominent link
      expect(readRes.resolutionState).toBe('DIRECT_ANSWER');
      expect(readRes.results.length).toBe(1);
      expect(readRes.results[0].displayIdentifier).toBe('SO-2026-10-0009');
      expect(readRes.summaryText).toContain('SO-2026-10-0009');
      expect(readRes.summaryText).toContain('PT TRADING PERDANA SUKSES');
      expect(readRes.summaryText).toContain('15.000.000');
      expect(readRes.summaryText).toContain('/commercial/sales-orders/54d110a3-ee17-4a9a-bdad-ce86ebdb4b54');
    } finally {
      _setOperationalReadDelegate(null);
    }
  });

  // 13. Dynamic extraction for diverse Sales Order Draft queries
  it('Gate 13: extracts customer and draft status across diverse natural language phrasings', () => {
    const testCases = [
      { input: 'Buka order TPS status draft', expectedCustomer: 'TPS', expectedStatus: 'DRAFT' },
      { input: 'Tampilkan SO draft milik PT TRADING PERDANA SUKSES', expectedCustomer: 'PT TRADING PERDANA SUKSES', expectedStatus: 'DRAFT' },
      { input: 'Cari order draft TPS', expectedCustomer: 'TPS', expectedStatus: 'DRAFT' },
      { input: 'Buka draft SO milik TPS', expectedCustomer: 'TPS', expectedStatus: 'DRAFT' },
      { input: 'Tampilkan pesanan TPS status draft', expectedCustomer: 'TPS', expectedStatus: 'DRAFT' },
    ];

    for (const tc of testCases) {
      const res = ConversationalQueryResolver.resolveQueryContext(tc.input);
      expect(res.context.objectType).toBe('SALES_ORDER');
      expect(res.context.status).toBe(tc.expectedStatus);
      expect(res.context.customer?.toUpperCase()).toContain(tc.expectedCustomer.toUpperCase());
    }
  });

  // 14. Authorization: Role hq_cs with sales_order:read can read Sales Orders via Copilot live read
  it('Gate 14: permits role hq_cs with sales_order:read to read Sales Orders without requiring commercial:read', async () => {
    const csAuthorizedReadIdentity: IdentityContext = {
      userId: 'cs-user-02',
      tenantId: TENANT_ID,
      role: 'hq_cs',
      roles: ['hq_cs'],
      permissions: ['copilot:read', 'sales_order:read', 'work_order:read', 'job_order:read'],
    };

    const mockDraftSo = {
      id: '54d110a3-ee17-4a9a-bdad-ce86ebdb4b54',
      soNumber: 'SO-2026-10-0009',
      customerId: 'ent-tps-uuid',
      customerName: 'PT TRADING PERDANA SUKSES',
      customerCode: 'TPS',
      status: 'DRAFT',
      orderDate: '2026-10-17T00:00:00.000Z',
      targetFulfillmentDate: '2026-10-20T00:00:00.000Z',
      totalRevenue: 15000000,
      currency: 'IDR',
    };

    _setOperationalReadDelegate({
      findJobOrderByNumber: async () => null,
      listJobOrders: async () => [],
      findWorkOrderByNumber: async () => null,
      findSalesOrderByNumber: async () => mockDraftSo,
      listSalesOrders: async () => [mockDraftSo],
      findShipmentByNumber: async () => null,
    });

    try {
      const parsed = ConversationalQueryResolver.resolveQueryContext('SO TPS');
      expect(parsed.context.objectType).toBe('SALES_ORDER');

      const readRes = await OperationalLiveReadGateway.executeLiveRead(csAuthorizedReadIdentity, parsed.context);
      expect(readRes.resolutionState).toBe('DIRECT_ANSWER');
      expect(readRes.results.length).toBe(1);
      expect(readRes.results[0].displayIdentifier).toBe('SO-2026-10-0009');
      expect(readRes.summaryText).toContain('PT TRADING PERDANA SUKSES');
    } finally {
      _setOperationalReadDelegate(null);
    }
  });

  // 15. Authorization: Role without sales_order:read or commercial:read is strictly blocked
  it('Gate 15: strictly blocks roles without sales_order:read or commercial:read from reading Sales Orders', async () => {
    const unauthorizedIdentity: IdentityContext = {
      userId: 'driver-01',
      tenantId: TENANT_ID,
      role: 'driver',
      roles: ['driver'],
      permissions: ['copilot:read', 'job_order:read'],
    };

    const parsed = ConversationalQueryResolver.resolveQueryContext('SO TPS');
    expect(parsed.context.objectType).toBe('SALES_ORDER');

    await expect(
      OperationalLiveReadGateway.executeLiveRead(unauthorizedIdentity, parsed.context)
    ).rejects.toThrow(/Missing required permission: commercial:read/i);
  });
});
