/**
 * Sentralogis — Phase 4B / Guided Flow A
 * lib/copilot/workflow/conversational-order-workspace.ts
 *
 * Conversational Order Workspace (Guided Flow A)
 *
 * Implements the state machine for guided Sales Order creation:
 * 1. Intent Detection & Flow Initiation
 * 2. Customer Lookup & Verification (with duplicate check & buffer registration)
 * 3. Service / SBU Capability Validation (Trucking, Warehouse, Clearance, Forwarding)
 * 4. Progressive Order Details Collection (Route, Cargo, Quantity, Date, Revenue) with in-flight corrections
 * 5. Structured Review with EXECUTE: OFF gate
 * 6. Explicit Human Confirmation gate
 * 7. Canonical Backend Persistence via resolveOrCreateEngagement and createSalesOrder when authorized
 */

import { supabaseAdmin } from '@/lib/supabase/admin';
import type { IdentityContext } from '@/lib/application/identity/types';
import { assertPermission, assertAnyPermission } from '@/lib/application/identity/resolver';
import { resolveOrCreateEngagement } from '@/lib/application/engagement/engagement-bridge';
import { createSalesOrder, confirmSalesOrder } from '@/lib/sales-order/service';
import { LocationMatchingService } from '@/lib/location/location-matching-service';
import { CustomerIntentHandler } from '@/lib/copilot/customer/customer-intent-handler';
import { generateNextCustomerCode } from '@/lib/actions/customer-master-actions';

export type SbuType = 'TRUCKING' | 'WAREHOUSE' | 'CLEARANCE' | 'FORWARDING';

export type GuidedOrderStep =
  | 'CUSTOMER_SELECTION'
  | 'CUSTOMER_REGISTRATION'
  | 'SERVICE_SELECTION'
  | 'ORDER_DETAILS'
  | 'REVIEW'
  | 'CONFIRMED'
  | 'CANCELLED';

export interface GuidedOrderFlowState {
  step: GuidedOrderStep;
  customerId: string | null;
  customerName: string | null;
  customerCode?: string | null;
  customerIsNew?: boolean;
  draftId?: string | null;
  newCustomerCandidate?: {
    name: string;
    code?: string;
  };
  sbuType: SbuType | null;
  origin: string | null;
  destination: string | null;
  originLocationId?: string | null;
  originLocationCode?: string | null;
  originPlaceId?: string | null;
  originLatitude?: number | null;
  originLongitude?: number | null;
  destinationLocationId?: string | null;
  destinationLocationCode?: string | null;
  destinationPlaceId?: string | null;
  destinationLatitude?: number | null;
  destinationLongitude?: number | null;
  destinationRequiresClarification?: boolean;
  cargoDescription: string | null;
  quantity: string | null;
  orderDate: string;
  targetFulfillmentDate: string | null;
  totalAgreedRevenue: number;
  currency: string;
  commercialNotes: string | null;
  wantsConfirmImmediately: boolean;
  confirmedSoNumber?: string | null;
  createdSalesOrderId?: string | null;
  warningNotice?: string | null;
  pendingCustomerMatches?: Array<{ id: string; name: string; entity_code?: string; legal_name?: string | null }>;
  lastUpdated: number;
}

export interface WorkspaceTurnResult {
  handled: boolean;
  state: GuidedOrderFlowState | null;
  responseText: string;
  actionRequired?: 'CONFIRM_SAVE' | 'CHOOSE_CUSTOMER' | 'CONFIRM_REGISTRATION' | 'CHOOSE_SERVICE' | 'PROVIDE_DETAILS';
  proposal?: any;
}

// In-memory session store fallback for sessions where activeContext is not roundtripped by simple clients
const sessionStore = new Map<string, GuidedOrderFlowState>();

let _workspaceDb: any = null;

export function _setWorkspaceDbClient(client: any): void {
  _workspaceDb = client;
}

function getDb(): any {
  if (_workspaceDb) return _workspaceDb;
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!url || !url.startsWith('http') || url.includes('256')) {
      throw new Error('Supabase client unconfigured in environment');
    }
    return supabaseAdmin;
  } catch {
    return {
      from: () => ({
        select: () => ({
          eq: () => ({
            ilike: () => ({
              limit: async () => ({ data: [], error: null }),
            }),
          }),
        }),
        insert: () => ({
          select: () => ({
            single: async () => ({ data: null, error: new Error('Database unavailable') }),
          }),
        }),
      }),
    };
  }
}

export function getSessionKey(identity: IdentityContext, conversationId?: string): string {
  const cId = (!conversationId || conversationId === 'default' || conversationId === 'default-session') ? 'default' : conversationId;
  return `${identity.tenantId}:${identity.userId}:${cId}`;
}

export class ConversationalOrderWorkspace {
  /**
   * Clears any active flow for the user/tenant session.
   */
  static clearSession(identity: IdentityContext, conversationId?: string): void {
    sessionStore.delete(getSessionKey(identity, conversationId));
    sessionStore.delete(`${identity.tenantId}:${identity.userId}:default`);
  }

  /**
   * Retrieves the current active flow state, if any.
   */
  static getSessionState(
    identity: IdentityContext,
    passedState?: GuidedOrderFlowState | null,
    conversationId?: string,
  ): GuidedOrderFlowState | null {
    if (passedState && passedState.step !== 'CANCELLED' && passedState.step !== 'CONFIRMED') {
      return passedState;
    }
    const key = getSessionKey(identity, conversationId);
    let state = sessionStore.get(key);
    if (!state) {
      state = sessionStore.get(`${identity.tenantId}:${identity.userId}:default`);
    }
    if (state && (Date.now() - state.lastUpdated > 30 * 60 * 1000 || state.step === 'CANCELLED' || state.step === 'CONFIRMED')) {
      sessionStore.delete(key);
      sessionStore.delete(`${identity.tenantId}:${identity.userId}:default`);
      return null;
    }
    return state || null;
  }

  /**
   * Persists the state into memory store.
   */
  static saveSessionState(identity: IdentityContext, state: GuidedOrderFlowState, conversationId?: string): void {
    state.lastUpdated = Date.now();
    const key = getSessionKey(identity, conversationId);
    sessionStore.set(key, state);
    sessionStore.set(`${identity.tenantId}:${identity.userId}:default`, state);
  }

  /**
   * Determines if the user input should trigger a new guided order flow.
   */
  static isOrderInitiationIntent(input: string): boolean {
    const trimmed = input.trim().toLowerCase();
    // Exclude read queries
    if (/^(daftar|list|tampilkan|lihat|cari|cek|status|buka|open|detail)\b/i.test(trimmed)) {
      return false;
    }
    // Exclude job order / work order specific mutations
    if (/\b(job order|jo|work order|wo)\b/i.test(trimmed)) {
      return false;
    }
    return (
      /\b(buat|buatkan|bikin|tambah|create|mulai)\b.*\b(sales order|so|order pelanggan|pesanan pelanggan|order|pesanan|transaksi)\b/i.test(trimmed) ||
      /\b(saya\s+ingin|mau)\s+(membuat|buat|bikin|mulai)\b.*\b(sales order|so|order pelanggan|pesanan pelanggan|order|pesanan|transaksi)\b/i.test(trimmed) ||
      /\b(sales order|so|order pelanggan|pesanan pelanggan|order|pesanan)\s+baru\b/i.test(trimmed) ||
      /\bmulai\s+transaksi\b/i.test(trimmed) ||
      /\b(saya\s+mau|mau)\s+order\s+(trucking|warehouse|clearance|forwarding)\b/i.test(trimmed)
    );
  }

  /**
   * Resets all in-memory workspace sessions (useful for tests and cleanup).
   */
  static resetAllSessions(): void {
    sessionStore.clear();
  }

  /**
   * Main turn handler for guided order workspace.
   */
  static async handleTurn(
    input: string,
    identity: IdentityContext,
    existingState?: GuidedOrderFlowState | null,
    conversationId?: string,
  ): Promise<WorkspaceTurnResult> {
    const trimmedInput = input.trim();
    let state = this.getSessionState(identity, existingState, conversationId);

    // 1. Check for cancellation
    if (/\b(batal|batalkan|cancel|hentikan|selesai tanpa simpan)\b/i.test(trimmedInput)) {
      if (state) {
        this.clearSession(identity, conversationId);
        return {
          handled: true,
          state: null,
          responseText: 'Proses percakapan pembuatan Sales Order telah dibatalkan. Tidak ada data yang disimpan ke sistem.',
        };
      }
    }

    // 2. Check for fresh flow initiation (or restart of order creation)
    if (this.isOrderInitiationIntent(trimmedInput)) {
      state = this.initializeFlow(trimmedInput);
      this.saveSessionState(identity, state, conversationId);
    } else if (!state) {
      return { handled: false, state: null, responseText: '' };
    }

    // 3. Process turn through current state machine step
    const result = await this.executeStep(trimmedInput, state, identity);
    if (result.state && result.state.step !== 'CONFIRMED' && result.state.step !== 'CANCELLED') {
      this.saveSessionState(identity, result.state, conversationId);
    } else {
      this.clearSession(identity, conversationId);
    }

    return result;
  }

  private static initializeFlow(input: string): GuidedOrderFlowState {
    const today = new Date().toISOString().slice(0, 10);
    const state: GuidedOrderFlowState = {
      step: 'CUSTOMER_SELECTION',
      customerId: null,
      customerName: null,
      sbuType: null,
      origin: null,
      destination: null,
      cargoDescription: null,
      quantity: null,
      orderDate: today,
      targetFulfillmentDate: null,
      totalAgreedRevenue: 0,
      currency: 'IDR',
      commercialNotes: null,
      wantsConfirmImmediately: false,
      lastUpdated: Date.now(),
    };

    // Extract any pre-filled fields from initial prompt
    this.extractInlineFields(input, state);

    return state;
  }

  private static extractInlineFields(input: string, state: GuidedOrderFlowState): void {
    // SBU
    if (/\btrucking\b/i.test(input)) state.sbuType = 'TRUCKING';
    else if (/\bwarehouse|gudang\b/i.test(input)) state.sbuType = 'WAREHOUSE';
    else if (/\bclearance|customs|pabean\b/i.test(input)) state.sbuType = 'CLEARANCE';
    else if (/\bforwarding\b/i.test(input)) state.sbuType = 'FORWARDING';

    // Route pair: e.g. "Jakarta ke Surabaya" or "Jakarta ➔ Surabaya" (exclude route prefixes like 'asal', 'dari', 'tujuan')
    const routePairMatch =
      input.match(/(?:^|[\s,;])((?:[A-Za-z0-9.-]+\s+){0,4}[A-Za-z0-9.-]+)\s+(?:ke|tujuan|➔)\s+([A-Za-z0-9\s.,-]{3,40}?)(?=\s+(?:muatan|barang|kargo|nilai|rp|tgl|tanggal|sbu|jumlah|qty|konfirmasi|$)|[,.;\n]|$)/i) ||
      input.match(/\b([A-Za-z0-9\s]{3,30})\s+(?:ke|tujuan|➔)\s+([A-Za-z0-9\s]{3,30})\b/i);
    const stopWords = ['order', 'buat', 'sales', 'untuk', 'customer', 'layanan', 'service', 'trucking', 'warehouse', 'clearance', 'forwarding', 'muatan', 'barang', 'kargo', 'sbu', 'asal', 'dari', 'tujuan', 'ke'];
    if (routePairMatch) {
      const originRaw = routePairMatch[1].trim();
      const originTokens = originRaw.split(/\s+/);
      const cleanOriginTokens: string[] = [];
      for (let i = originTokens.length - 1; i >= 0; i--) {
        const token = originTokens[i].toLowerCase();
        if (stopWords.includes(token)) break;
        cleanOriginTokens.unshift(originTokens[i]);
      }
      const cleanOrigin = cleanOriginTokens.join(' ').trim();
      if (cleanOrigin.length >= 2) {
        if (!state.origin) state.origin = cleanOrigin;
        if (!state.destination) {
          const rawDest = routePairMatch[2].trim();
          const cleanDest = rawDest.replace(/\s+(?:muatan|barang|kargo|nilai|rp|tgl|tanggal|sbu|jumlah|qty|konfirmasi)\b.*$/i, '').trim();
          state.destination = cleanDest || rawDest;
        }
      }
    }

    // Route: asal / dari (supports colons, e.g. "Asal: NPCT 1 Priok")
    const originMatch = input.match(/(?:asal\s*dari|asal|dari)\s*(?::|\s)\s*([A-Za-z0-9\s.,-]{3,40}?)(?=\s+(?:tujuan\s+ke|tujuan|ke|tgl|tanggal|rp|nilai|armada|volume|muatan|sbu|$)|[,.;\n]|$)/i);
    if (originMatch) state.origin = originMatch[1].trim();

    // Route: tujuan / ke (supports colons, e.g. "Tujuan: Cikarang")
    const destMatch = input.match(/(?:tujuan\s+ke|tujuan|ke)\s*(?::|\s)\s*([A-Za-z0-9\s.,-]{3,40}?)(?=\s+(?:asal\s+dari|dari|asal|tgl|tanggal|rp|nilai|armada|volume|muatan|sbu|$)|[,.;\n]|$)/i);
    if (destMatch) state.destination = destMatch[1].trim();

    // Container specific recognition (e.g. "Container 20ft", "1 Kontainer 40ft", "20ft container", "Muatan: Container 20ft", "Container 20ft x 2", "2x Container 20ft")
    const containerMatch =
      input.match(/\b(?:(\d+)\s*(?:x|\*)\s*)?(?:kontainer|container)\s*(20|40|45)?\s*(?:ft|feet)?(?:\s*(?:x|\*|sebanyak|sejumlah)\s*(\d+))?\b/i) ||
      input.match(/\b(?:(\d+)\s*(?:x|\*)\s*)?(20|40|45)\s*(?:ft|feet)?\s*(?:kontainer|container)(?:\s*(?:x|\*|sebanyak|sejumlah)\s*(\d+))?\b/i);
    if (containerMatch) {
      const prefixCount = containerMatch[1];
      const suffixCount = containerMatch[3];
      const count = suffixCount || prefixCount || '1';
      const feetMatch = containerMatch[0].match(/20|40|45/);
      const feet = feetMatch ? `${feetMatch[0]}ft` : '20ft';
      state.cargoDescription = `Container ${feet}`;
      state.quantity = count;
    }

    // Cargo / muatan
    const cargoMatch = input.match(/(?:muatan|barang|komoditas|kargo)\s*(?::|\s)\s*([A-Za-z0-9\s.,-]{3,40}?)(?=\s+(?:tujuan|asal|ke|dari|nilai|rp|volume|qty|jumlah|sbu|$)|[,.;\n]|$)/i);
    if (cargoMatch && !containerMatch) {
      state.cargoDescription = cargoMatch[1].trim();
    }

    // Quantity (generic)
    const qtyMatch = input.match(/\b(\d+)\s*(rit|trip|kontainer|container|box|colli|koli|palet|pallet|ton|kg)\b/i);
    if (qtyMatch && !state.quantity) {
      state.quantity = `${qtyMatch[1]} ${qtyMatch[2]}`;
    }

    // Target Date
    const dateMatch = input.match(/\b(\d{4}-\d{2}-\d{2})\b/);
    if (dateMatch) {
      state.targetFulfillmentDate = dateMatch[1];
    } else if (/\besok\b/i.test(input)) {
      const tomorrow = new Date(Date.now() + 86400000);
      state.targetFulfillmentDate = tomorrow.toISOString().slice(0, 10);
    }

    // Revenue
    const revMatch = input.match(/(?:rp\.?|idr|nilai|kesepakatan)\s*([0-9.,]+(?:\s*(?:juta|jt|ribu|rb))?)/i);
    if (revMatch) {
      state.totalAgreedRevenue = this.parseRevenueText(revMatch[1]);
    }

    // Customer (supports "Customer: PT TRADING PERDANA SUKSES (TPS)")
    const corpPrefix = '(?:PT|CV|UD|TBK|LTD|INC)\\.?';
    const custDelimiter = '(?:trucking|warehouse|clearance|forwarding|layanan|service|muatan|barang|kargo|dengan|via|tujuan|asal|ke|dari|nilai|rp|idr|tanggal|tgl|draft|confirm|lanjut|sbu)';
    const custMatch =
      input.match(new RegExp(`(?:customer|pelanggan|untuk|atas nama)\\s*:\\s*([^,.;\\n]+?)(?=\\s+${custDelimiter}|[,.;\\n]|$)`, 'i')) ||
      input.match(new RegExp(`(?:customer|pelanggan|untuk|atas nama)\\s+(${corpPrefix}\\s+[^,.;\\n]+?)(?=\\s+${custDelimiter}|[,.;\\n]|$)`, 'i')) ||
      input.match(new RegExp(`(?:customer|pelanggan|untuk|atas nama)\\s+([^,.;\\n]+?)(?=\\s+${custDelimiter}|[,.;\\n]|$)`, 'i')) ||
      input.match(new RegExp(`\\b(${corpPrefix}\\s+[^,.;\\n]+?)(?=\\s+${custDelimiter}|[,.;\\n]|$)`, 'i'));
    if (custMatch && !state.customerId) {
      state.customerName = custMatch[1].trim();
    } else if (!state.customerId) {
      // Pattern: "buat order baru [Nama Customer]" (e.g. "buat order baru Samudera")
      const orderCustDelimiter = `(?:\\s+(?:${custDelimiter})\\b|[,.;\\n]|$)`;
      const orderCustRegex = new RegExp(
        `(?:buat|buatkan|bikin|tambah|mulai)?\\s*(?:sales order|so|order pelanggan|pesanan pelanggan|order|pesanan)(?:\\s+baru)?\\s+(?:untuk\\s+|atas nama\\s+)?([^,.;\\n]+?)(?=${orderCustDelimiter})`,
        'i'
      );
      const orderCustMatch = input.match(orderCustRegex);
      if (orderCustMatch) {
        const candidate = orderCustMatch[1].trim();
        const firstWord = candidate.split(/\s+/)[0].toLowerCase();
        const sbuTokens = ['baru', 'pelanggan', 'customer', 'klien', 'trucking', 'warehouse', 'gudang', 'clearance', 'customs', 'pabean', 'forwarding'];
        if (!sbuTokens.includes(firstWord) && candidate.length >= 2) {
          state.customerName = candidate;
        }
      }
    }

    // Confirm immediately mode
    if (/\b(confirm|konfirmasi|langsung\s*wo|lanjut\s*wo)\b/i.test(input)) {
      state.wantsConfirmImmediately = true;
    }
  }

  private static parseRevenueText(revText: string): number {
    const raw = revText.toLowerCase().trim();
    if (raw.includes('juta') || raw.includes('jt')) {
      const match = raw.match(/([0-9]+(?:[.,][0-9]+)?)\s*(?:juta|jt)/);
      if (match) {
        const val = parseFloat(match[1].replace(',', '.'));
        return Math.round(val * 1_000_000);
      }
    }
    if (raw.includes('ribu') || raw.includes('rb')) {
      const match = raw.match(/([0-9]+(?:[.,][0-9]+)?)\s*(?:ribu|rb)/);
      if (match) {
        const val = parseFloat(match[1].replace(',', '.'));
        return Math.round(val * 1_000);
      }
    }
    const cleaned = raw.replace(/[^0-9]/g, '');
    const num = parseInt(cleaned, 10);
    return isNaN(num) ? 0 : num;
  }

  private static async executeStep(
    input: string,
    state: GuidedOrderFlowState,
    identity: IdentityContext,
  ): Promise<WorkspaceTurnResult> {
    // Check for inline additions and corrections at any point
    this.extractInlineFields(input, state);
    this.handleInlineCorrections(input, state);

    switch (state.step) {
      case 'CUSTOMER_SELECTION':
        return await this.handleCustomerSelection(input, state, identity);

      case 'CUSTOMER_REGISTRATION':
        return await this.handleCustomerRegistration(input, state, identity);

      case 'SERVICE_SELECTION':
        return await this.handleServiceSelection(input, state, identity);

      case 'ORDER_DETAILS':
        return await this.handleOrderDetails(input, state, identity);

      case 'REVIEW':
        return await this.handleReviewAndConfirmation(input, state, identity);

      default:
        return {
          handled: true,
          state,
          responseText: 'Sesi pembuatan order telah selesai atau tidak aktif.',
        };
    }
  }

  private static handleInlineCorrections(input: string, state: GuidedOrderFlowState): void {
    // "ganti tujuan ke Surabaya"
    const destCorrection = input.match(/(?:ganti|ubah|ralat)\s+tujuan\s+(?:ke\s+)?([A-Za-z\s]{3,25})/i);
    if (destCorrection) state.destination = destCorrection[1].trim();

    // "ganti asal ke Jakarta"
    const originCorrection = input.match(/(?:ganti|ubah|ralat)\s+asal\s+(?:ke\s+|dari\s+)?([A-Za-z\s]{3,25})/i);
    if (originCorrection) state.origin = originCorrection[1].trim();

    // "ganti nilai ke 25 juta"
    const revCorrection = input.match(/(?:ganti|ubah|ralat)\s+nilai\s+(?:ke\s+)?([0-9.,]+(?:\s*(?:juta|jt|ribu|rb))?)/i);
    if (revCorrection) state.totalAgreedRevenue = this.parseRevenueText(revCorrection[1]);

    // "ganti customer ke PT ABC"
    const custCorrection = input.match(/(?:ganti|ubah|ralat)\s+customer\s+(?:ke\s+)?([A-Za-z0-9\s.,-]{3,35})/i);
    if (custCorrection) {
      state.customerName = custCorrection[1].trim();
      state.customerId = null;
      state.step = 'CUSTOMER_SELECTION';
    }

    // "ganti muatan ke Semen 20 ton"
    const cargoCorrection = input.match(/(?:ganti|ubah|ralat)\s+(?:muatan|barang|komoditas|kargo)\s+(?:ke\s+)?([A-Za-z0-9\s.,-]{3,35})/i);
    if (cargoCorrection) state.cargoDescription = cargoCorrection[1].trim();

    // "ganti jumlah ke 2 kontainer" / "ganti qty ke 5 box"
    const qtyCorrection = input.match(/(?:ganti|ubah|ralat)\s+(?:jumlah|kuantitas|qty)\s+(?:ke\s+)?([A-Za-z0-9\s.,-]{1,25})/i);
    if (qtyCorrection) state.quantity = qtyCorrection[1].trim();

    // "ganti service ke Warehouse"
    const serviceCorrection = input.match(/(?:ganti|ubah|ralat)\s+(?:service|layanan|sbu)\s+(?:ke\s+)?(trucking|warehouse|clearance|forwarding)/i);
    if (serviceCorrection) {
      const s = serviceCorrection[1].toUpperCase();
      if (['TRUCKING', 'WAREHOUSE', 'CLEARANCE', 'FORWARDING'].includes(s)) {
        state.sbuType = s as SbuType;
      }
    }
  }

  private static async handleCustomerSelection(
    input: string,
    state: GuidedOrderFlowState,
    identity: IdentityContext,
  ): Promise<WorkspaceTurnResult> {
    // 0. If user previously had multiple matches and enters a number (e.g. "1", "2")
    if (state.pendingCustomerMatches && state.pendingCustomerMatches.length > 1) {
      const numMatch = input.trim().match(/^([1-9][0-9]?)$/);
      if (numMatch) {
        const choiceIdx = parseInt(numMatch[1], 10) - 1;
        if (choiceIdx >= 0 && choiceIdx < state.pendingCustomerMatches.length) {
          const selected = state.pendingCustomerMatches[choiceIdx];
          state.customerId = selected.id;
          state.customerName = selected.name;
          state.customerCode = selected.entity_code || null;
          state.pendingCustomerMatches = undefined;
          if (!state.sbuType) {
            state.step = 'SERVICE_SELECTION';
            return {
              handled: true,
              state,
              responseText:
                `Customer **${state.customerName}** berhasil dipilih dan diverifikasi.\n\n` +
                `Silakan pilih jenis layanan/SBU yang diinginkan:\n` +
                `- **Trucking** (Pengiriman darat/armada)\n` +
                `- **Warehouse** (Pergudangan/penyimpanan)\n` +
                `- **Clearance** (Kepabeanan/Customs)\n` +
                `- **Forwarding** (Multimoda antar pulau)\n\n` +
                `*(Ketik salah satu layanan di atas)*`,
              actionRequired: 'CHOOSE_SERVICE',
            };
          } else {
            state.step = 'ORDER_DETAILS';
            return await this.handleOrderDetails(input, state, identity);
          }
        }
      }
    }

    // If user asked explicitly to register new customer:
    const wantsRegister = /\b(daftar|daftarkan|registrasi|customer baru|pelanggan baru|tambah customer|tambah pelanggan)\b/i.test(input);
    if (wantsRegister) {
      const extractedName = CustomerIntentHandler.extractCandidateCustomerName(input);
      const targetName = extractedName || state.customerName;
      if (targetName) {
        state.newCustomerCandidate = { name: targetName };
        state.step = 'CUSTOMER_REGISTRATION';
        return await this.handleCustomerRegistration(targetName, state, identity);
      } else {
        state.step = 'CUSTOMER_REGISTRATION';
        return {
          handled: true,
          state,
          responseText: 'Silakan sebutkan nama Customer baru yang ingin Anda daftarkan (misalnya: *PT Samudera Logistik Makmur*).',
          actionRequired: 'PROVIDE_DETAILS',
        };
      }
    }

    // If customerName is known or provided in input, search md_entities
    let searchTerm = state.customerName;
    if (!searchTerm) {
      const delimiterPattern = '(?:trucking|warehouse|clearance|forwarding|layanan|service|muatan|barang|kargo|dengan|via|tujuan|asal|ke|dari|nilai|rp\\.?|idr|tanggal|tgl|draft|confirm|lanjut|$)';
      const custRegex1 = new RegExp(`(?:customer|pelanggan|untuk|atas nama)\\s+((?:PT|CV)\\s+[A-Za-z0-9\\s.,-]+|[A-Za-z0-9\\s._-]{3,35}?)(?=\\s+${delimiterPattern}|[,.;]|$)`, 'i');
      const custRegex2 = new RegExp(`\\b((?:PT|CV)\\s+[A-Za-z0-9\\s.]{3,30}?)(?=\\s+${delimiterPattern}|[,.;]|$)`, 'i');
      const custMatch = input.match(custRegex1) || input.match(custRegex2);
      if (custMatch) {
        searchTerm = CustomerIntentHandler.extractCandidateCustomerName(custMatch[1].trim()) || custMatch[1].trim();
        state.customerName = searchTerm;
      } else if (input.trim().length >= 2 && !this.isOrderInitiationIntent(input)) {
        searchTerm = CustomerIntentHandler.extractCandidateCustomerName(input.trim()) || input.trim();
        state.customerName = searchTerm;
      }
    } else {
      searchTerm = CustomerIntentHandler.extractCandidateCustomerName(searchTerm) || searchTerm;
      state.customerName = searchTerm;
    }

    if (!searchTerm) {
      return {
        handled: true,
        state,
        responseText:
          '### Ringkasan Pra-Aksi Pembuatan Sales Order (EXECUTE: OFF)\n\n' +
          '- **Customer:** *(Belum diisi — wajib)*\n' +
          `- **Tanggal Order / Target:** *(Default hari ini: ${state.orderDate})*\n` +
          '- **Nilai Kesepakatan:** *(Belum diisi — default IDR 0 pada Draft)*\n' +
          '- **Mode Penyimpanan:** Belum dipilih (Draft SO atau Simpan & Konfirmasi SO -> Lanjut ke WO)\n\n' +
          '**Data yang masih perlu dilengkapi:**\n' +
          '- Nama Customer / Pelanggan\n' +
          '- Tanggal Order / Target Pengiriman\n' +
          '- Estimasi Nilai Kesepakatan (IDR)\n\n' +
          '*Apakah Anda ingin menyimpan order pelanggan ini sebagai **Draft SO** terlebih dahulu, atau **Simpan & Konfirmasi SO** agar langsung siap dilanjutkan ke **Work Order (WO)**?*\n\n' +
          'Silakan sebutkan **nama Customer** untuk order ini, atau ketik *"Daftarkan customer baru [Nama]"* jika customer belum terdaftar di sistem.\n\n' +
          '> **Catatan Tata Kelola (EXECUTE: OFF):** Copilot membantu menyiapkan rincian order dan tidak mengeksekusi mutasi database secara diam-diam. Silakan lanjutkan pembuatan melalui form resmi:\n\n' +
          '[Buka Form Buat Sales Order](/commercial/sales-orders/create) • [Lihat Daftar Sales Order](/commercial/sales-orders)',
        actionRequired: 'CHOOSE_CUSTOMER',
      };
    }

    // Normalization: clean legal prefixes, aliases, and punctuation to search broadly across name, legal_name, and entity_code
    const aliasMatch = searchTerm.match(/\(([^)]+)\)/);
    const alias = aliasMatch ? aliasMatch[1].trim() : '';
    const baseName = searchTerm.replace(/\([^)]*\)/g, ' ').trim();
    const cleanCore = baseName
      .replace(/^(PT|CV|UD|TBK|LTD|INC)\.?\s+/i, '')
      .replace(/[\s,.-]+/g, ' ')
      .trim();

    const db = getDb();
    let rows: any[] = [];
    let queryError: any = null;

    try {
      let query = db
        .from('md_entities')
        .select('id, name, entity_code, legal_name, is_active')
        .eq('tenant_id', identity.tenantId);

      // Multi-column or-filter if supported by PostgREST client, otherwise fallback to name ilike
      if (typeof query.or === 'function' && cleanCore.length > 0) {
        let orClause = `name.ilike.%${cleanCore}%,legal_name.ilike.%${cleanCore}%,entity_code.ilike.%${cleanCore}%,name.ilike.%${baseName}%`;
        if (alias) {
          orClause += `,entity_code.ilike.%${alias}%,name.ilike.%${alias}%`;
        }
        query = query.or(orClause);
      } else {
        query = query.ilike('name', `%${cleanCore || searchTerm}%`);
      }

      const res = await query.limit(10);
      if (res.error) {
        queryError = res.error;
        console.error('Customer lookup error:', res.error);
      }
      rows = res.data || [];
    } catch (err: any) {
      queryError = err;
      console.error('Customer lookup exception:', err);
    }

    // Guard: If database/network error occurred, do NOT treat as non-existent or jump to registration
    if (queryError) {
      return {
        handled: true,
        state,
        responseText:
          `Terjadi kendala saat memeriksa database customer: ${queryError.message || 'Koneksi database bermasalah'}.\n\n` +
          `Sistem tidak dapat memastikan apakah customer **"${searchTerm}"** sudah terdaftar atau belum.\n\n` +
          `Silakan ulangi permintaan Anda atau buka langsung [Form Buat Sales Order](/commercial/sales-orders/create).`,
        actionRequired: 'CHOOSE_CUSTOMER',
      };
    }

    const matches = (rows || []).filter((r: any) => {
      if (r.is_active === false) return false;
      const rName = (r.name || '').toLowerCase();
      const rLegal = (r.legal_name || '').toLowerCase();
      const rCode = (r.entity_code || '').toLowerCase();
      const sCore = cleanCore.toLowerCase();
      const sBase = baseName.toLowerCase();
      const sAlias = alias.toLowerCase();
      const sFull = searchTerm.toLowerCase();

      return (
        rName.includes(sCore) ||
        rLegal.includes(sCore) ||
        rCode.includes(sCore) ||
        rName.includes(sBase) ||
        (sAlias && (rCode.includes(sAlias) || rName.includes(sAlias))) ||
        (sFull && rName.includes(sFull))
      );
    });

    if (matches.length === 1) {
      state.customerId = matches[0].id;
      // Preserve canonical entity name, display with legal_name if different
      state.customerName = matches[0].name;
      state.customerCode = matches[0].entity_code || null;
      state.pendingCustomerMatches = undefined;
      // Transition to SERVICE_SELECTION or ORDER_DETAILS
      if (!state.sbuType) {
        state.step = 'SERVICE_SELECTION';
        const legalSuffix = matches[0].legal_name && matches[0].legal_name !== matches[0].name
          ? ` (*${matches[0].legal_name}*)`
          : '';
        return {
          handled: true,
          state,
          responseText:
            `Customer **${state.customerName}**${legalSuffix} berhasil diverifikasi.\n\n` +
            `Silakan pilih jenis layanan/SBU yang diinginkan:\n` +
            `- **Trucking** (Pengiriman darat/armada)\n` +
            `- **Warehouse** (Pergudangan/penyimpanan)\n` +
            `- **Clearance** (Kepabeanan/Customs)\n` +
            `- **Forwarding** (Multimoda antar pulau)\n\n` +
            `*(Ketik salah satu layanan di atas)*`,
          actionRequired: 'CHOOSE_SERVICE',
        };
      } else {
        state.step = 'ORDER_DETAILS';
        return await this.handleOrderDetails(input, state, identity);
      }
    }

    if (matches.length > 1) {
      // Store matches in state for numbered selection on next turn
      state.pendingCustomerMatches = matches.map((m: any) => ({
        id: m.id,
        name: m.name,
        entity_code: m.entity_code,
        legal_name: m.legal_name,
      }));

      const optionsText = matches
        .map((m: any, idx: number) => {
          const codeStr = m.entity_code ? ` [Kode: ${m.entity_code}]` : '';
          const legalStr = m.legal_name && m.legal_name !== m.name ? ` — *${m.legal_name}*` : '';
          return `${idx + 1}. **${m.name}**${legalStr}${codeStr}`;
        })
        .join('\n');
      return {
        handled: true,
        state,
        responseText:
          `Ditemukan beberapa customer yang cocok dengan pencarian *"${searchTerm}":*\n\n` +
          `${optionsText}\n\n` +
          `Silakan sebutkan nomor pilihan Anda (misal: **1**) atau ketik nama lengkap customer.`,
        actionRequired: 'CHOOSE_CUSTOMER',
      };
    }

    // Zero matches: verified empty from clean query -> offer registration
    state.newCustomerCandidate = { name: searchTerm };
    state.step = 'CUSTOMER_REGISTRATION';
    state.pendingCustomerMatches = undefined;

    const revFormatted = state.totalAgreedRevenue > 0 ? `IDR ${state.totalAgreedRevenue.toLocaleString('id-ID')}` : '*(Belum diisi)*';
    return {
      handled: true,
      state,
      responseText:
        `### Ringkasan Pra-Aksi Pembuatan Sales Order (EXECUTE: OFF)\n\n` +
        `- **Customer:** ${searchTerm} *(Belum terdaftar di data master)*\n` +
        `- **Tanggal Order / Target:** ${state.targetFulfillmentDate || state.orderDate}\n` +
        `- **Nilai Kesepakatan:** ${revFormatted}\n` +
        `- **Mode Penyimpanan:** ${state.wantsConfirmImmediately ? 'Simpan & Konfirmasi SO' : 'Draft SO'}\n\n` +
        `Customer dengan nama **"${searchTerm}"** belum terdaftar pada data master tenant Anda.\n\n` +
        `Apakah Anda ingin mendaftarkan **"${searchTerm}"** sebagai customer baru sekarang? *(Jawab "Ya, daftarkan" atau sebutkan nama customer lain)*\n\n` +
        `> **Catatan Tata Kelola (EXECUTE: OFF):** Copilot membantu menyiapkan rincian order dan tidak mengeksekusi mutasi database secara diam-diam. Silakan lanjutkan pembuatan melalui form resmi:\n\n` +
        `[Buka Form Buat Sales Order](/commercial/sales-orders/create) • [Lihat Daftar Sales Order](/commercial/sales-orders)`,
      actionRequired: 'CONFIRM_REGISTRATION',
    };
  }

  private static async handleCustomerRegistration(
    input: string,
    state: GuidedOrderFlowState,
    identity: IdentityContext,
  ): Promise<WorkspaceTurnResult> {
    const rawCandidate = state.newCustomerCandidate?.name || state.customerName || input.trim();
    const candidateName = CustomerIntentHandler.extractCandidateCustomerName(rawCandidate) || rawCandidate;
    const isAffirmative = /^(ya|ya,\s*daftarkan|daftarkan|setuju|lanjut|ok|yes|lanjutkan)$/i.test(input.trim());

    if (!isAffirmative) {
      state.newCustomerCandidate = { name: candidateName };
      // Check if candidate duplicates any existing entity
      const token = candidateName
        .replace(/\b(PT|CV|UD|TBK|LTD|INC)\b/gi, '')
        .trim()
        .split(/\s+/)[0] || candidateName;

      const { data: dupes } = await getDb()
        .from('md_entities')
        .select('id, name')
        .eq('tenant_id', identity.tenantId)
        .ilike('name', `%${token}%`)
        .limit(3);

      const filteredDupes = (dupes || []).filter((d: any) => d.name.toLowerCase() !== candidateName.toLowerCase());
      let warning = '';
      if (filteredDupes.length > 0) {
        warning = `> ⚠️ **Perhatian:** Ditemukan nama customer yang mirip pada database master: ${filteredDupes.map((d: any) => `*${d.name}*`).join(', ')}. Pastikan tidak membuat duplikasi entitas yang tidak disengaja.\n\n`;
      }

      return {
        handled: true,
        state,
        responseText:
          `${warning}` +
          `Konfirmasi pendaftaran customer baru:\n` +
          `- **Nama Customer:** ${candidateName}\n` +
          `- **Tenant ID:** ${identity.tenantId.slice(0, 8)}...\n\n` +
          `Ketik **"Ya, daftarkan"** untuk melanjutkan atau ketik nama customer lain.`,
        actionRequired: 'CONFIRM_REGISTRATION',
      };
    }

    // Check permission to register customer / commercial
    let hasRegisterPermission = false;
    try {
      assertAnyPermission(identity, ['commercial:manage', 'customer:register']);
      hasRegisterPermission = true;
    } catch {
      hasRegisterPermission = false;
    }

    if (!hasRegisterPermission) {
      // Role lacks customer:register and commercial:manage
      state.customerId = 'TEMP_UNCOMMITTED_CUSTOMER';
      state.customerName = `${candidateName} (Pendaftaran Tertunda - Butuh Izin Registrasi)`;
      state.customerIsNew = true;
      state.step = !state.sbuType ? 'SERVICE_SELECTION' : 'ORDER_DETAILS';
      state.warningNotice =
        'Akun Anda tidak memiliki izin registrasi customer. Pendaftaran customer dan simpan Sales Order akan disiapkan dalam format ulasan terstruktur untuk ditinjau administrator.';

      return {
        handled: true,
        state,
        responseText:
          `### Pendaftaran Customer Baru Dibufer (Role: \`${identity.role}\`)\n\n` +
          `Customer baru **"${candidateName}"** telah dicatat sementara sebagai draf di sesi ini tanpa mutasi data langsung ke master database karena akun Anda tidak memiliki izin \`customer:register\`.\n\n` +
          (!state.sbuType
            ? `Silakan pilih jenis layanan/SBU yang diinginkan:\n- **Trucking** (Pengiriman darat/armada)\n- **Warehouse** (Pergudangan)\n- **Clearance** (Kepabeanan)\n- **Forwarding** (Multimoda antar pulau)`
            : `Silakan lengkapi detail order (rute asal, rute tujuan, komoditas muatan, dan estimasi nilai).`),
        actionRequired: !state.sbuType ? 'CHOOSE_SERVICE' : 'PROVIDE_DETAILS',
      };
    }

    // Pre-flight check: if customer already exists in tenant's md_entities, reuse it without duplicate error
    try {
      const { data: existingList } = await (getDb() as any)
        .from('md_entities')
        .select('id, name, entity_code, is_active')
        .eq('tenant_id', identity.tenantId)
        .ilike('name', candidateName)
        .limit(1);

      if (existingList && existingList.length > 0) {
        const existingCust = existingList[0];
        state.customerId = existingCust.id;
        state.customerName = existingCust.name;
        state.customerCode = existingCust.entity_code || null;
        state.customerIsNew = false;
        state.newCustomerCandidate = undefined;
        state.step = !state.sbuType ? 'SERVICE_SELECTION' : 'ORDER_DETAILS';

        return {
          handled: true,
          state,
          responseText:
            `Customer **"${existingCust.name}"** (Kode: \`${existingCust.entity_code || '-'}\`) sudah terdaftar pada database master tenant Anda.\n\n` +
            `**Langkah Selanjutnya:**\n` +
            (!state.sbuType
              ? `Apakah Anda ingin lanjut membuat Sales Order untuk customer ini? Silakan pilih jenis layanan/SBU yang diinginkan:\n- **Trucking** (Pengiriman darat/armada)\n- **Warehouse** (Pergudangan)\n- **Clearance** (Kepabeanan)\n- **Forwarding** (Multimoda antar pulau)\n\n*(Atau ketik **"Batal"** / **"Selesai"** jika Anda hanya ingin mendaftarkan customer)*`
              : `Layanan **${state.sbuType}** telah dipilih. Silakan lengkapi detail rute dan muatan, atau ketik *"Batal"* jika ingin selesai.`),
          actionRequired: !state.sbuType ? 'CHOOSE_SERVICE' : 'PROVIDE_DETAILS',
        };
      }
    } catch (checkErr) {
      console.error('[ConversationalOrderWorkspace] Pre-flight check error:', checkErr);
    }

    // Actor has customer:register or commercial:manage -> Register in md_entities with canonical server code
    let generatedCode = `CUS-${new Date().getFullYear()}-0001`;
    try {
      generatedCode = await generateNextCustomerCode(identity.tenantId, getDb());
    } catch (codeErr) {
      console.error('[ConversationalOrderWorkspace] generateNextCustomerCode fallback:', codeErr);
    }

    const { data: newCust, error: insertErr } = await (getDb() as any)
      .from('md_entities')
      .insert({
        tenant_id: identity.tenantId,
        entity_code: generatedCode,
        name: candidateName,
        legal_name: candidateName,
        phone: null,
        email: null,
        is_customer: true,
        is_active: true,
      })
      .select('id, name, legal_name, entity_code, phone, email, is_customer, is_active')
      .single();

    if (insertErr || !newCust) {
      console.error('Failed to register customer in md_entities:', insertErr);
      return {
        handled: true,
        state,
        responseText: `Gagal mendaftarkan customer baru ke database: ${insertErr?.message || 'Unknown error'}. Silakan coba kembali atau gunakan customer yang sudah ada.`,
      };
    }

    // Maintain canonical party_roles assignment (party_roles = CANONICAL, is_* = COMPATIBILITY PROJECTION)
    try {
      await (getDb() as any).from('party_roles').insert({
        tenant_id: identity.tenantId,
        party_id: newCust.id,
        role_type: 'CUSTOMER',
        context_type: 'GLOBAL',
        context_id: null,
        is_primary: true,
        is_active: true,
      });
    } catch (roleErr) {
      console.error('[ConversationalOrderWorkspace] party_roles insert error (non-fatal):', roleErr);
    }

    state.customerId = newCust.id;
    state.customerName = newCust.name;
    state.customerIsNew = true;
    state.newCustomerCandidate = undefined;
    state.step = !state.sbuType ? 'SERVICE_SELECTION' : 'ORDER_DETAILS';

    return {
      handled: true,
      state,
      responseText:
        `Customer baru **"${newCust.name}"** (Kode: \`${newCust.entity_code}\`) berhasil didaftarkan ke data master.\n\n` +
        `**Langkah Selanjutnya:**\n` +
        (!state.sbuType
          ? `Apakah Anda ingin lanjut membuat Sales Order untuk customer ini? Silakan pilih jenis layanan/SBU yang diinginkan:\n- **Trucking** (Pengiriman darat/armada)\n- **Warehouse** (Pergudangan)\n- **Clearance** (Kepabeanan)\n- **Forwarding** (Multimoda antar pulau)\n\n*(Atau ketik **"Batal"** / **"Selesai"** jika Anda hanya ingin mendaftarkan customer)*`
          : `Layanan **${state.sbuType}** telah dipilih. Silakan lengkapi detail rute dan muatan, atau ketik *"Batal"* jika ingin selesai.`),
      actionRequired: !state.sbuType ? 'CHOOSE_SERVICE' : 'PROVIDE_DETAILS',
    };
  }

  private static async handleServiceSelection(
    input: string,
    state: GuidedOrderFlowState,
    identity?: IdentityContext,
  ): Promise<WorkspaceTurnResult> {
    const raw = input.toUpperCase();
    if (raw.includes('TRUCKING') || raw.includes('DARAT') || raw.includes('ARMADA')) {
      state.sbuType = 'TRUCKING';
    } else if (raw.includes('WAREHOUSE') || raw.includes('GUDANG') || raw.includes('PENYIMPANAN')) {
      state.sbuType = 'WAREHOUSE';
    } else if (raw.includes('CLEARANCE') || raw.includes('CUSTOMS') || raw.includes('PABEAN') || raw.includes('BEA CUKAI')) {
      state.sbuType = 'CLEARANCE';
    } else if (raw.includes('FORWARDING') || raw.includes('ANTAR PULAU') || raw.includes('LAUT')) {
      state.sbuType = 'FORWARDING';
    } else {
      return {
        handled: true,
        state,
        responseText:
          `Pilihan layanan "${input.trim()}" tidak dikenali. Silakan pilih salah satu SBU resmi yang tersedia:\n` +
          `- **Trucking** (Armada darat FTL/LTL)\n` +
          `- **Warehouse** (Sewa ruang & pengelolaan stok gudang)\n` +
          `- **Clearance** (Kepabeanan & PPJK)\n` +
          `- **Forwarding** (Pengiriman kontainer antar pulau FCL/LCL)`,
        actionRequired: 'CHOOSE_SERVICE',
      };
    }

    state.step = 'ORDER_DETAILS';
    return await this.handleOrderDetails('', state, identity);
  }

  private static async handleOrderDetails(
    input: string,
    state: GuidedOrderFlowState,
    identity?: IdentityContext,
  ): Promise<WorkspaceTurnResult> {
    // 1. Extract inline fields
    this.extractInlineFields(input, state);

    // 2. Process context-sensitive short answers when specific field is missing
    const trimmedInput = input.trim();
    const isSbuWord = /^(trucking|warehouse|clearance|customs|pabean|forwarding|gudang)$/i.test(trimmedInput);
    const hasMultipleFields = /(?:tujuan|asal|muatan|barang|kargo|nilai|rp|idr)\b.*(?:tujuan|asal|muatan|barang|kargo|nilai|rp|idr)\b/i.test(trimmedInput);
    const hasExplicitOrigin = !hasMultipleFields && /^(?:asal\s*dari|asal|dari)\s*:?\s*/i.test(trimmedInput);
    const hasExplicitDest = !hasMultipleFields && /^(?:tujuan\s*ke|tujuan|ke)\s*:?\s*/i.test(trimmedInput);
    const hasExplicitCargo = !hasMultipleFields && /^(?:muatan|barang|komoditas|kargo)\s*:?\s*/i.test(trimmedInput);
    const hasExplicitQty = !hasMultipleFields && /^(?:jumlah|kuantitas|qty)\s*:?\s*/i.test(trimmedInput);

    if (hasExplicitOrigin) {
      state.origin = trimmedInput.replace(/^(?:asal\s*dari|asal|dari)\s*:?\s*/i, '').trim();
    } else if (hasExplicitDest) {
      state.destination = trimmedInput.replace(/^(?:tujuan\s*ke|tujuan|ke)\s*:?\s*/i, '').trim();
    } else if (hasExplicitCargo) {
      state.cargoDescription = trimmedInput.replace(/^(?:muatan|barang|komoditas|kargo)\s*:?\s*/i, '').trim();
    } else if (hasExplicitQty) {
      state.quantity = trimmedInput.replace(/^(?:jumlah|kuantitas|qty)\s*:?\s*/i, '').trim();
    } else {
      const isSingleFieldAnswer =
        trimmedInput.length > 0 &&
        !isSbuWord &&
        !trimmedInput.includes('\n') &&
        !trimmedInput.includes(';') &&
        !this.isOrderInitiationIntent(trimmedInput);

      if (isSingleFieldAnswer) {
        const containerAnswerMatch =
          trimmedInput.match(/\b(?:(\d+)\s*(?:x|\*)\s*)?(?:kontainer|container)\s*(20|40|45)?\s*(?:ft|feet)?(?:\s*(?:x|\*|sebanyak|sejumlah)\s*(\d+))?\b/i) ||
          trimmedInput.match(/\b(?:(\d+)\s*(?:x|\*)\s*)?(20|40|45)\s*(?:ft|feet)?\s*(?:kontainer|container)(?:\s*(?:x|\*|sebanyak|sejumlah)\s*(\d+))?\b/i);
        if (containerAnswerMatch) {
          const prefixCount = containerAnswerMatch[1];
          const suffixCount = containerAnswerMatch[3];
          const count = suffixCount || prefixCount || '1';
          const feetMatch = containerAnswerMatch[0].match(/20|40|45/);
          const feet = feetMatch ? `${feetMatch[0]}ft` : '20ft';
          state.cargoDescription = `Container ${feet}`;
          state.quantity = count;
        } else if (!state.origin && !/\b(rp|idr|juta|ribu)\b/i.test(trimmedInput)) {
          state.origin = trimmedInput.replace(/^(dari|asal)\s*:?\s*/i, '');
        } else if (state.origin && !state.destination && !/\b(rp|idr|juta|ribu)\b/i.test(trimmedInput)) {
          state.destination = trimmedInput.replace(/^(ke|tujuan)\s*:?\s*/i, '');
        } else if (state.origin && state.destination && !state.cargoDescription && !/\b(rp|idr|juta|ribu)\b/i.test(trimmedInput)) {
          state.cargoDescription = trimmedInput;
        } else if (state.origin && state.destination && state.cargoDescription && !state.quantity && !/\b(rp|idr|juta|ribu)\b/i.test(trimmedInput)) {
          state.quantity = trimmedInput;
        }
      }
    }

    // 3. Match locations with Master Data and external reference (Rule 4)
    if (identity?.tenantId) {
      if (state.origin && !state.originLocationId) {
        try {
          const originMatch = await LocationMatchingService.matchPlaceWithMaster(
            { address: state.origin, name: state.origin },
            identity.tenantId,
          );
          if (originMatch.isMasterMatch) {
            state.originLocationId = originMatch.masterLocationId;
            state.originLocationCode = originMatch.masterLocationCode;
            state.origin = originMatch.name;
            state.originLatitude = originMatch.latitude;
            state.originLongitude = originMatch.longitude;
          } else {
            state.originLocationId = null;
            state.originLocationCode = null;
            state.originPlaceId = originMatch.placeId || null;
            state.originLatitude = originMatch.latitude || null;
            state.originLongitude = originMatch.longitude || null;
          }
        } catch (locErr) {
          console.error('[ConversationalOrderWorkspace] Origin match error:', locErr);
        }
      }

      if (state.destination && !state.destinationLocationId) {
        try {
          const destMatch = await LocationMatchingService.matchPlaceWithMaster(
            { address: state.destination, name: state.destination },
            identity.tenantId,
          );
          if (destMatch.isMasterMatch) {
            state.destinationLocationId = destMatch.masterLocationId;
            state.destinationLocationCode = destMatch.masterLocationCode;
            state.destination = destMatch.name;
            state.destinationLatitude = destMatch.latitude;
            state.destinationLongitude = destMatch.longitude;
            state.destinationRequiresClarification = false;
          } else {
            state.destinationLocationId = null;
            state.destinationLocationCode = null;
            state.destinationPlaceId = destMatch.placeId || null;
            state.destinationLatitude = destMatch.latitude || null;
            state.destinationLongitude = destMatch.longitude || null;
            if (/^(cikarang|jakarta|surabaya|semarang|bandung|medan|bekasi|tangerang)$/i.test(state.destination.trim())) {
              state.destinationRequiresClarification = true;
            }
          }
        } catch (locErr) {
          console.error('[ConversationalOrderWorkspace] Destination match error:', locErr);
        }
      }
    }

    // 4. Check what is missing
    const missing: string[] = [];
    if (state.sbuType === 'TRUCKING' || state.sbuType === 'FORWARDING') {
      if (!state.origin) missing.push('Lokasi Asal (Origin)');
      if (!state.destination) missing.push('Lokasi Tujuan (Destination)');
      if (!state.cargoDescription) missing.push('Deskripsi Muatan (Cargo)');
      if (!state.quantity) missing.push('Jumlah / Kuantitas (Qty)');
    } else {
      if (!state.cargoDescription) missing.push('Deskripsi Komoditas / Barang');
      if (!state.quantity) missing.push('Jumlah / Kuantitas (Qty)');
    }

    if (missing.length > 0) {
      const originDisplay = state.origin
        ? `${state.origin}${state.originLocationCode ? ` [Master: ${state.originLocationCode}]` : ' [Peta/Google Maps]'}`
        : '*(Belum diisi)*';
      const destDisplay = state.destination
        ? `${state.destination}${state.destinationLocationCode ? ` [Master: ${state.destinationLocationCode}]` : ' [Peta/Google Maps]'}`
        : '*(Belum diisi)*';

      let clarificationNotice = '';
      if (state.destination && state.destinationRequiresClarification) {
        clarificationNotice = `\n> ℹ️ **Catatan Lokasi:** Tujuan tercatat **${state.destination}**. Jika Anda memiliki alamat gudang/pabrik spesifik (misal: *Kawasan GIIC, MM2100, Jababeka, atau EJIP*), Anda dapat menyatakannya atau memilih melalui Google Maps Autocomplete.\n`;
      }

      return {
        handled: true,
        state,
        responseText:
          `### Rincian Order — SBU ${state.sbuType}\n` +
          `- **Customer:** ${state.customerName || '*(Belum dipilih)*'}\n` +
          `- **Layanan:** ${state.sbuType}\n` +
          `- **Asal:** ${originDisplay}\n` +
          `- **Tujuan:** ${destDisplay}\n` +
          `- **Muatan:** ${state.cargoDescription || '*(Belum diisi)*'}\n` +
          `- **Jumlah:** ${state.quantity || '*(Belum diisi)*'}\n` +
          `- **Estimasi Nilai:** ${state.totalAgreedRevenue > 0 ? `IDR ${state.totalAgreedRevenue.toLocaleString('id-ID')}` : '*(Belum diisi)*'}\n\n` +
          `${clarificationNotice}` +
          `**Data yang masih perlu dilengkapi:**\n${missing.map((m) => `- ${m}`).join('\n')}\n\n` +
          `*(Silakan sebutkan data yang masih belum terisi di atas, misalnya: "Muatan: Container 20ft, Jumlah: 1 kontainer")*`,
        actionRequired: 'PROVIDE_DETAILS',
      };
    }

    // 5. All operational details collected -> transition to REVIEW
    state.step = 'REVIEW';
    return this.renderReviewSummary(state);
  }

  private static renderReviewSummary(state: GuidedOrderFlowState): WorkspaceTurnResult {
    // Defense-in-depth: Never generate proposal if mandatory fields for the service are missing
    const missingFields: string[] = [];
    if (state.sbuType === 'TRUCKING' || state.sbuType === 'FORWARDING') {
      if (!state.origin) missingFields.push('Lokasi Asal (Origin)');
      if (!state.destination) missingFields.push('Lokasi Tujuan (Destination)');
      if (!state.cargoDescription) missingFields.push('Deskripsi Muatan (Cargo)');
      if (!state.quantity) missingFields.push('Jumlah / Kuantitas (Qty)');
    } else {
      if (!state.cargoDescription) missingFields.push('Deskripsi Komoditas / Barang');
      if (!state.quantity) missingFields.push('Jumlah / Kuantitas (Qty)');
    }

    if (missingFields.length > 0) {
      state.step = 'ORDER_DETAILS';
      const originDisplay = state.origin
        ? `${state.origin}${state.originLocationCode ? ` [Master: ${state.originLocationCode}]` : ' [Peta/Google Maps]'}`
        : '*(Belum diisi)*';
      const destDisplay = state.destination
        ? `${state.destination}${state.destinationLocationCode ? ` [Master: ${state.destinationLocationCode}]` : ' [Peta/Google Maps]'}`
        : '*(Belum diisi)*';

      return {
        handled: true,
        state,
        responseText:
          `### Rincian Order Belum Lengkap — SBU ${state.sbuType}\n` +
          `- **Customer:** ${state.customerName || '*(Belum dipilih)*'}\n` +
          `- **Layanan:** ${state.sbuType}\n` +
          `- **Asal:** ${originDisplay}\n` +
          `- **Tujuan:** ${destDisplay}\n` +
          `- **Muatan:** ${state.cargoDescription || '*(Belum diisi)*'}\n` +
          `- **Jumlah:** ${state.quantity || '*(Belum diisi)*'}\n` +
          `- **Estimasi Nilai:** ${state.totalAgreedRevenue > 0 ? `IDR ${state.totalAgreedRevenue.toLocaleString('id-ID')}` : '*(Belum diisi)*'}\n\n` +
          `**Data yang masih perlu dilengkapi:**\n${missingFields.map((m) => `- ${m}`).join('\n')}\n\n` +
          `*(Silakan sebutkan data yang masih belum terisi di atas, misalnya: "Muatan: Container 20ft, Jumlah: 1 kontainer")*`,
        actionRequired: 'PROVIDE_DETAILS',
      };
    }

    const customerDisplay = state.customerCode && !state.customerName?.includes(state.customerCode)
      ? `${state.customerCode} — ${state.customerName}`
      : (state.customerName || '-');

    const sbuDisplay = state.sbuType === 'TRUCKING' ? 'Trucking'
      : state.sbuType === 'WAREHOUSE' ? 'Warehouse'
      : state.sbuType === 'CLEARANCE' ? 'Clearance'
      : state.sbuType === 'FORWARDING' ? 'Forwarding'
      : (state.sbuType || '-');

    const revFormatted =
      state.totalAgreedRevenue > 0
        ? `IDR ${state.totalAgreedRevenue.toLocaleString('id-ID')}`
        : 'belum diisi jika belum tersedia';

    const modeLabel = state.wantsConfirmImmediately
      ? '**Simpan & Konfirmasi SO (CONFIRMED)** *(Siap dilanjutkan ke alur Fulfillment & Work Order)*'
      : '**Simpan sebagai Draft SO (DRAFT)**';

    const originLabel = state.origin
      ? `${state.origin}${state.originLocationCode ? ` (Kode Master: \`${state.originLocationCode}\`)` : ' (Google Maps)'}`
      : '-';
    const destLabel = state.destination
      ? `${state.destination}${state.destinationLocationCode ? ` (Kode Master: \`${state.destinationLocationCode}\`)` : ' (Google Maps)'}`
      : '-';

    let clarificationText = '';
    if (state.destinationRequiresClarification) {
      clarificationText = `\n> ℹ️ **Klarifikasi Tujuan:** Area pengiriman adalah **${state.destination}**. Anda dapat melengkapi blok/kawasan industri sewaktu-waktu atau saat form order resmi dibuka.`;
    }

    const warningText = state.warningNotice ? `\n\n> ℹ️ **Catatan:** ${state.warningNotice}` : '';

    if (!state.draftId) {
      state.draftId = `draft-so-${state.customerId || 'anon'}-${Date.now()}`;
    }

    return {
      handled: true,
      state,
      responseText:
        `### Ringkasan Sales Order (EXECUTE: OFF)\n\n` +
        `Berikut rincian order yang siap dibuat:\n` +
        `- **Customer:** ${customerDisplay}\n` +
        `- **Layanan:** ${sbuDisplay}\n` +
        `- **Rute:** ${state.origin || '-'} ➔ ${state.destination || '-'}\n` +
        `- **Lokasi Asal:** ${state.origin || '-'}\n` +
        `- **Lokasi Tujuan:** ${state.destination || '-'}\n` +
        `- **Muatan:** ${state.cargoDescription || '-'}\n` +
        `- **Jumlah:** ${state.quantity || '-'}\n` +
        `- **Estimasi Nilai:** ${revFormatted}\n` +
        `- **Status:** Draft / Siap Ditinjau\n` +
        `- **Tanggal Order:** ${state.orderDate}\n` +
        `- **Target Selesai:** ${state.targetFulfillmentDate || 'Fleksibel'}\n` +
        `- **Mode Penyimpanan:** ${modeLabel}\n` +
        `${clarificationText}` +
        `${warningText}\n\n` +
        `> **Konfirmasi Tindakan:**\n` +
        `- Ketik **"Simpan"** atau **"Konfirmasi Simpan SO"** untuk menyimpan transaksi ini.\n` +
        `- Ketik **"Buka Form Resmi"** atau klik tombol pada kartu proposal untuk meninjau pada form resmi.\n` +
        `- Ketik **"Ganti [bagian]"** jika ada rincian yang ingin diubah sebelum disimpan.\n` +
        `- Ketik **"Batal"** untuk membatalkan seluruh proses.`,
      actionRequired: 'CONFIRM_SAVE',
      proposal: {
        action: 'CREATE_SALES_ORDER',
        intent: 'CREATE_SALES_ORDER',
        customerId: state.customerId,
        customerCode: state.customerCode,
        customerName: state.customerName,
        customerDisplay,
        sbuType: state.sbuType,
        sbuDisplay,
        revenue: state.totalAgreedRevenue,
        orderDate: state.orderDate,
        targetFulfillmentDate: state.targetFulfillmentDate,
        mode: state.wantsConfirmImmediately ? 'CONFIRMED' : 'DRAFT',
        origin: state.origin,
        originLocationId: state.originLocationId,
        originLocationCode: state.originLocationCode,
        originPlaceId: state.originPlaceId,
        originLatitude: state.originLatitude,
        originLongitude: state.originLongitude,
        destination: state.destination,
        destinationLocationId: state.destinationLocationId,
        destinationLocationCode: state.destinationLocationCode,
        destinationPlaceId: state.destinationPlaceId,
        destinationLatitude: state.destinationLatitude,
        destinationLongitude: state.destinationLongitude,
        cargoDescription: state.cargoDescription,
        quantity: state.quantity,
        draftId: state.draftId,
        draftPayload: {
          draftId: state.draftId,
          customerId: state.customerId,
          customerName: state.customerName,
          customerCode: state.customerCode,
          serviceType: state.sbuType,
          originName: state.origin,
          originLocationId: state.originLocationId,
          originLocationCode: state.originLocationCode,
          destinationName: state.destination,
          destinationLocationId: state.destinationLocationId,
          destinationLocationCode: state.destinationLocationCode,
          cargoDescription: state.cargoDescription,
          quantity: state.quantity,
          unit: 'unit',
          estimatedRevenue: state.totalAgreedRevenue,
          orderDate: state.orderDate,
          targetFulfillmentDate: state.targetFulfillmentDate,
        },
      },
    };
  }

  private static async handleReviewAndConfirmation(
    input: string,
    state: GuidedOrderFlowState,
    identity: IdentityContext,
  ): Promise<WorkspaceTurnResult> {
    if (/\b(buka\s+form|form\s+resmi)\b/i.test(input)) {
      const qCustomer = encodeURIComponent(state.customerName || '');
      const qCustCode = encodeURIComponent(state.customerCode || '');
      const qCustId = encodeURIComponent(state.customerId || '');
      const qRev = encodeURIComponent(String(state.totalAgreedRevenue || 0));
      const qNotes = encodeURIComponent(`SBU: ${state.sbuType || 'Trucking'}. Rute: ${state.origin || '-'} -> ${state.destination || '-'}. Muatan: ${state.cargoDescription || '-'} (Jumlah: ${state.quantity || '-'}).`);
      const qDraftId = encodeURIComponent(state.draftId || `draft-so-${state.customerId || 'anon'}`);
      return {
        handled: true,
        state,
        responseText:
          `Silakan buka form Sales Order resmi melalui tombol **"Buka Form Resmi"** pada kartu proposal atau tautan berikut:\n\n` +
          `👉 [Buka Form Resmi Sales Order](/commercial/sales-orders/create?fromCopilot=1&draftId=${qDraftId}&customerId=${qCustId}&customer=${qCustomer}&customerCode=${qCustCode}&revenue=${qRev}&notes=${qNotes})`,
        actionRequired: 'CONFIRM_SAVE',
      };
    }

    const isSaveConfirmed = /\b(simpan|konfirmasi|confirm|execute|ok simpan|ya simpan|setuju simpan)\b/i.test(input);

    if (!isSaveConfirmed) {
      // Re-run review or let inline correction take effect
      return this.renderReviewSummary(state);
    }

    // Check authority: does identity have commercial:manage or sales_order:create?
    let canCreateSo = false;
    let canConfirmSo = false;
    try {
      assertAnyPermission(identity, ['commercial:manage', 'sales_order:create']);
      canCreateSo = true;
    } catch {
      canCreateSo = false;
    }
    try {
      assertPermission(identity, 'commercial:manage');
      canConfirmSo = true;
    } catch {
      canConfirmSo = false;
    }

    if (!canCreateSo) {
      // Governance policy refusal per Section E
      const encodedCustomerId = encodeURIComponent(state.customerId || '');
      const encodedCustomer = encodeURIComponent(state.customerName || '');
      const encodedRev = encodeURIComponent(String(state.totalAgreedRevenue || 0));
      const encodedNotes = encodeURIComponent(
        `Layanan: ${state.sbuType || '-'}; Rute: ${state.origin || '-'} ke ${state.destination || '-'}; Muatan: ${state.cargoDescription || '-'}`
      );

      this.clearSession(identity);
      return {
        handled: true,
        state: null,
        responseText:
          `### Otorisasi Tata Kelola Terbatas (EXECUTE: OFF)\n\n` +
          `Sesi penyusunan order untuk **${state.customerName}** telah selesai disusun, namun akun Anda (\`${identity.userId.slice(0, 8)}...\` / Role: \`${identity.role}\`) **tidak memiliki hak akses pembuatan Sales Order (` +
          `commercial:manage / sales_order:create` +
          `\`).**\n\n` +
          `Sesuai kebijakan keamanan data Sentralogis, Copilot tidak dapat mengeksekusi penyimpanan langsung ke database tanpa wewenang komersial resmi.\n\n` +
          `Silakan serahkan draf ini kepada staf Commercial atau buka form resmi dengan data yang sudah terisi otomatis:\n\n` +
          `[Buka Form Sales Order dengan Data Ini](/commercial/sales-orders/create?customerId=${encodedCustomerId}&customer=${encodedCustomer}&revenue=${encodedRev}&notes=${encodedNotes}) • [Kembali ke Dashboard](/dashboard)`,
      };
    }

    if (!state.customerId || state.customerId === 'TEMP_UNCOMMITTED_CUSTOMER') {
      const candidate = state.newCustomerCandidate?.name || state.customerName || 'Pelanggan';
      const encodedCustomer = encodeURIComponent(candidate);
      return {
        handled: true,
        state,
        responseText:
          `### Penyimpanan Memerlukan Customer Terdaftar (EXECUTE: OFF)\n\n` +
          `Pelanggan **"${candidate}"** belum terdaftar resmi pada data master (\`md_entities\`). ` +
          `Sesuai tata kelola transaksi Sentralogis (ADR-034), pembuatan Sales Order dan Engagement memerlukan relasi \`customer_id\` kanonik yang valid sebelum disimpan ke database.\n\n` +
          `**Langkah yang dapat dilakukan:**\n` +
          `1. Daftarkan customer terlebih dahulu: Ketik *"daftarkan customer baru ${candidate}"* (memerlukan izin komersial \`commercial:manage\`).\n` +
          `2. Buka form resmi untuk peninjauan: [Form Buat Sales Order](/commercial/sales-orders/create?customer=${encodedCustomer}).\n` +
          `3. Ganti dengan customer yang sudah terdaftar: Ketik *"ganti customer ke [Nama Customer Terdaftar]"*.`,
        actionRequired: 'CHOOSE_CUSTOMER',
      };
    }

    // Actor HAS authorization -> Commit via canonical backend
    try {
      // 1. Resolve or create canonical Engagement (ADR-032 / ADR-034)

      const engResult = await resolveOrCreateEngagement(
        {
          customerId: state.customerId,
          targetFulfillmentDate: state.targetFulfillmentDate || null,
          currency: state.currency || 'IDR',
          commercialNotes: `Copilot Guided Order — SBU: ${state.sbuType || '-'}, Rute: ${state.origin || '-'} ke ${state.destination || '-'}, Muatan: ${state.cargoDescription || '-'}`,
        },
        identity,
      );

      const engagementId = engResult.engagement.id;

      // 2. Create canonical Sales Order (ADR-035 next_sales_order atomic sequence)
      const soResult = await createSalesOrder(
        {
          engagementId,
          orderDate: state.orderDate,
          targetFulfillmentDate: state.targetFulfillmentDate || null,
          currency: state.currency || 'IDR',
          totalAgreedRevenue: state.totalAgreedRevenue,
          commercialNotes: `SBU: ${state.sbuType || '-'}. Rute: ${state.origin || '-'} -> ${state.destination || '-'}. Muatan: ${state.cargoDescription || '-'} (${state.quantity || '-'}).`,
        },
        identity,
      );

      let finalOrder = soResult.salesOrder;

      // 3. If confirm immediately requested, advance to CONFIRMED only if authorized
      let confirmationNotice = '';
      if (state.wantsConfirmImmediately && finalOrder.status === 'DRAFT') {
        if (canConfirmSo) {
          finalOrder = await confirmSalesOrder(finalOrder.id, identity);
        } else {
          confirmationNotice = `\n\n> ℹ️ **Catatan Otorisasi:** Akun Anda (\`${identity.role}\`) memiliki hak akses membuat **Draft SO**, namun konfirmasi resmi (\`CONFIRMED\`) memerlukan wewenang Commercial (\`commercial:manage\`). Order berhasil disimpan sebagai **DRAFT** dan dapat diverifikasi/dikonfirmasi oleh tim Commercial.`;
        }
      }

      state.step = 'CONFIRMED';
      state.confirmedSoNumber = finalOrder.soNumber;
      state.createdSalesOrderId = finalOrder.id;
      this.clearSession(identity);

      const nextActionText =
        finalOrder.status === 'CONFIRMED'
          ? `Status SO saat ini adalah **CONFIRMED** dan siap dilanjutkan ke pembuatan **Work Order (WO)** serta perincian muatan operasional.`
          : `Status SO saat ini adalah **DRAFT**. Anda dapat meninjau dan mengonfirmasi SO melalui menu Commercial.${confirmationNotice}`;

      return {
        handled: true,
        state: null,
        responseText:
          `### Sales Order Berhasil Dibuat! (EXECUTE: ON — Tersimpan Resmi)\n\n` +
          `Transaksi komersial telah resmi disimpan ke database Sentralogis:\n` +
          `- **Nomor Sales Order:** \`${finalOrder.soNumber}\`\n` +
          `- **Status:** \`${finalOrder.status}\`\n` +
          `- **Customer:** ${state.customerName} (ID: \`${state.customerId}\`)\n` +
          `- **Nomor Engagement:** \`${engResult.engagement.woNumber}\`\n` +
          `- **Total Nilai Kesepakatan:** IDR ${finalOrder.totalAgreedRevenue.toLocaleString('id-ID')}\n\n` +
          `${nextActionText}\n\n` +
          `[Buka Detail Sales Order ${finalOrder.soNumber}](/commercial/sales-orders/${finalOrder.id}) • [Lihat Semua Sales Order](/commercial/sales-orders)`,
      };
    } catch (saveErr: any) {
      console.error('Failed to commit guided Sales Order:', saveErr);
      return {
        handled: true,
        state,
        responseText:
          `Terjadi kendala saat menyimpan Sales Order ke database: **${saveErr?.message || 'Gagal menyimpan transaksi'}**.\n\n` +
          `Anda dapat mencoba kembali dengan mengetik **"Simpan"** atau melanjutkan via form resmi:\n\n` +
          `[Buka Form Buat Sales Order](/commercial/sales-orders/create)`,
      };
    }
  }
}
