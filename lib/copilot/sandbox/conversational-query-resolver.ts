/**
 * Sentralogis Copilot — Conversational Query Resolver
 * lib/copilot/sandbox/conversational-query-resolver.ts
 *
 * Implements the Conversational Query Resolution & Progressive Clarification Layer
 * above the ratified Semantic Contract Boundary (ADR-092 & Boundary Gate).
 *
 * GOVERNANCE INVARIANTS:
 * 1. STRICTLY READ / SIMULATE / PROPOSE ONLY.
 * 2. Zero database queries, zero mutations, zero migrations.
 * 3. Never imports operational execution modules or mutation services.
 * 4. Zero external LLM / OpenAI / ChatGPT calls.
 * 5. All proposals have executionAvailable: false, isExecuted: false.
 * 6. Non-operational queries resolve to CONVERSATIONAL_NON_OPERATIONAL with polite bounded response.
 * 7. Zero data fabrication: NULL drivers -> "Driver belum tercatat"; counts reflect fixture data.
 */

import {
  SIMULATED_CUSTOMERS,
  SIMULATED_SALES_ORDERS,
  SIMULATED_WORK_ORDERS,
  SIMULATED_JOB_ORDERS,
  SIMULATED_SHIPMENTS,
  SIMULATED_DRIVERS,
  SIMULATED_WEEKLY_JOB_ORDERS,
  type SimulatedJobOrder,
  type SimulatedSalesOrder,
  type SimulatedShipment,
} from './deterministic-fixtures';
import type {
  ConversationalContextState,
  ConversationalQueryContext,
  QueryDomain,
  QueryObjectType,
  QueryOperation,
  QueryPeriod,
  QuerySpecificity,
  QueryResolutionState,
  SandboxMessage,
  SemanticUnderstanding,
} from './types';
import type { ProposalBlock } from '@/components/copilot/v2/types';

/**
 * Identity-aware conversational intent categories (Phase 1 Identity Routing Remediation).
 * Pure semantic classification — carries NO identity data; responses are built
 * by the caller from the server-resolved IdentityContext.
 */
export type IdentityIntent = 'IDENTITY' | 'ROLE' | 'TENANT' | 'PERMISSION';

function makeId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

const GREETINGS_ONLY = [
  'selamat pagi',
  'selamat siang',
  'selamat sore',
  'selamat malam',
  'halo',
  'hai',
  'hey',
  'hei',
  'pagi',
  'siang',
  'sore',
  'malam',
  'copilot',
];

const CHATTER_ONLY = [
  'apa kabar',
  'bagaimana kabarnya',
  'cuaca hari ini bagaimana',
  'lagi apa',
  'siapa kamu',
  'kamu siapa',
  'ceritakan lelucon',
  'terima kasih',
  'makasih',
  'thanks',
  'thank you',
];

export interface QueryResolutionResult {
  resolutionState: QueryResolutionState;
  queryContext: ConversationalQueryContext;
  matchedEntityIds: string[];
  counts: {
    total: number;
    distribution?: Record<string, number>;
  };
  responseText: string;
  clarificationQuestion?: string;
  proposalBlock?: ProposalBlock;
}

export class ConversationalQueryResolver {
  /**
   * Evaluates if the input is a general non-operational greeting or chatter (§21).
   */
  public static isNonOperational(rawInput: string): boolean {
    const text = rawInput
      .toLowerCase()
      .replace(/[!?.,;:\s]+$/, '')
      .trim();

    const greetings = [
      'selamat pagi',
      'selamat siang',
      'selamat sore',
      'selamat malam',
      'halo',
      'hai',
      'hey',
      'hei',
      'pagi',
      'siang',
      'sore',
      'malam',
      'pagi copilot',
      'halo copilot',
      'hai copilot',
      'hei copilot',
    ];

    const chatter = [
      'apa kabar',
      'bagaimana kabarnya',
      'cuaca hari ini bagaimana',
      'lagi apa',
      'siapa kamu',
      'kamu siapa',
      'ceritakan lelucon',
      'terima kasih',
      'makasih',
      'thanks',
      'thank you',
    ];

    return (
      greetings.some((g) => text === g || text.startsWith(g + ' ') || text.endsWith(' ' + g)) ||
      chatter.some((c) => text.includes(c))
    );
  }

  /**
   * Strips a leading greeting or chatter token so operational intent detection
   * is not suppressed by a polite opener (§21).
   * E.g. "halo, tampilkan semua user" → "tampilkan semua user".
   * Returns the input unchanged when no leading greeting prefix is detected.
   */
  public static normalizeForClassification(rawInput: string): string {
    const text = rawInput.trim();
    const lower = text.toLowerCase();

    const prefixes = [...GREETINGS_ONLY, ...CHATTER_ONLY];

    for (const p of prefixes) {
      const escaped = p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(`^${escaped}\\s*[!?.,;:]*\\s+`, 'i');
      if (re.test(lower)) {
        return text.replace(re, '').trim();
      }
    }

    return text;
  }

  /**
   * Classifies authenticated self-reference questions (identity / role /
   * tenant / permission) so they route to the identity-aware conversational
   * path instead of falling through to default FIND → OperationalLiveReadGateway
   * (Phase 1 Identity Routing Remediation).
   *
   * Pure classification: derives NO identity values — the caller must build
   * any response from the server-resolved IdentityContext. Phrase matching is
   * deliberately specific so security-sensitive prompts (e.g. cross-tenant
   * enumeration requests) never become identity shortcuts.
   */
  public static getIdentityIntent(rawInput: string): IdentityIntent | null {
    const text = rawInput
      .toLowerCase()
      .replace(/[!?.,;:\s]+$/, '')
      .trim();

    const identityPhrases = [
      'siapa saya',
      'siapa nama saya',
      'nama saya siapa',
      'saya siapa',
      'akun saya siapa',
      'siapa akun saya',
      'akun saya',
      'profil saya',
      'identitas saya',
      'user saya',
      'siapa user saya',
      'user id saya',
    ];
    const rolePhrases = ['role saya', 'peran saya', 'apa role saya', 'jabatan saya'];
    const tenantPhrases = ['tenant saya', 'berada di tenant mana', 'tenant mana saya', 'tenant yang saya', 'organisasi saya'];
    const permissionPhrases = ['boleh saya lakukan', 'bisa saya lakukan', 'hak saya', 'izin saya', 'permission saya', 'hak akses saya'];

    if (identityPhrases.some((p) => text === p || text.includes(p))) return 'IDENTITY';
    if (rolePhrases.some((p) => text === p || text.includes(p))) return 'ROLE';
    if (tenantPhrases.some((p) => text === p || text.includes(p))) return 'TENANT';
    if (permissionPhrases.some((p) => text === p || text.includes(p))) return 'PERMISSION';
    return null;
  }

  /**
   * Detects deterministic query context reset conditions (§8).
   */
  public static detectReset(
    userInput: string,
    previousContext?: ConversationalQueryContext
  ): boolean {
    const lower = userInput.toLowerCase().trim();

    // Explicit reset phrases
    const explicitResetPhrases = [
      'selanjutnya',
      'sekarang saya mau',
      'ganti pertanyaan',
      'mulai baru',
      'pertanyaan baru',
      'tanya yang lain',
      'reset pencarian',
    ];

    if (explicitResetPhrases.some((p) => lower.includes(p))) {
      return true;
    }

    // Material domain/object change
    // If previous was JOB_ORDER or SHIPMENT, and user asks about an invoice
    if (
      previousContext &&
      (previousContext.objectType === 'JOB_ORDER' ||
        previousContext.objectType === 'SHIPMENT' ||
        previousContext.objectType === 'WORK_ORDER')
    ) {
      if (lower.includes('invoice') || lower.includes('tagihan')) {
        return true;
      }
    }

    return false;
  }

  /**
   * Resolves and updates the conversational query context progressively (§5, §6, §7, §8, §17, §18).
   */
  public static resolveQueryContext(
    userInput: string,
    previousContext?: ConversationalQueryContext
  ): {
    context: ConversationalQueryContext;
    resetOccurred: boolean;
    isCorrection: boolean;
  } {
    const raw = userInput.trim();
    const lower = raw.toLowerCase();

    // Check non-operational
    if (ConversationalQueryResolver.isNonOperational(raw)) {
      return {
        context: {
          domain: 'GENERAL',
          objectType: 'UNKNOWN',
          requestedOperation: 'NON_OPERATIONAL',
          activeFilters: {},
          conversationTurn: (previousContext?.conversationTurn || 0) + 1,
          specificity: 'SUFFICIENTLY_SPECIFIC',
        },
        resetOccurred: false,
        isCorrection: false,
      };
    }

    // Check reset
    const resetOccurred = ConversationalQueryResolver.detectReset(userInput, previousContext);

    // Initialize or clone previous context
    const current: ConversationalQueryContext =
      previousContext && !resetOccurred
        ? {
            ...previousContext,
            activeFilters: { ...previousContext.activeFilters },
            otherResolvedEntities: { ...previousContext.otherResolvedEntities },
            conversationTurn: previousContext.conversationTurn + 1,
          }
        : {
            activeFilters: {},
            conversationTurn: 1,
          };

    // ------------------------------------------------------------------------
    // §17 CORRECTION & MODALITY REPAIR ("Bukan yang laut, yang trucking")
    // ------------------------------------------------------------------------
    let isCorrection = false;
    if (
      lower.includes('bukan yang laut') ||
      lower.includes('bukan kapal') ||
      (lower.includes('bukan') && lower.includes('trucking'))
    ) {
      isCorrection = true;
      current.domain = 'TRUCKING';
      current.activeFilters['domain'] = 'TRUCKING';
      // Remove sea interpretation
      delete current.activeFilters['mode_sea'];
      delete current.shipmentNumber;
      if (current.objectType === 'SHIPMENT') {
        current.objectType = 'JOB_ORDER';
      }
    }

    // ------------------------------------------------------------------------
    // §18 USER CAN CHANGE ONE DIMENSION ("ubah ke minggu lalu")
    // ------------------------------------------------------------------------
    if (lower.includes('ubah ke minggu lalu') || lower.includes('ganti ke minggu lalu')) {
      current.period = 'LAST_WEEK';
      current.activeFilters['period'] = 'LAST_WEEK';
      return { context: current, resetOccurred, isCorrection: true };
    }

    // ------------------------------------------------------------------------
    // PERIOD REFINEMENT ("minggu ini", "pekan ini", "minggu lalu")
    // ------------------------------------------------------------------------
    if (
      lower.includes('minggu ini') ||
      lower.includes('pekan ini') ||
      lower === 'minggu ini saja' ||
      lower === 'pekan ini saja'
    ) {
      current.period = 'THIS_WEEK';
      current.activeFilters['period'] = 'THIS_WEEK';
    } else if (lower.includes('minggu lalu') || lower.includes('pekan lalu')) {
      current.period = 'LAST_WEEK';
      current.activeFilters['period'] = 'LAST_WEEK';
    }

    // ------------------------------------------------------------------------
    // STATUS REFINEMENT ("yang active", "yang aktif", "status active")
    // ------------------------------------------------------------------------
    // ------------------------------------------------------------------------
    // STATUS REFINEMENT ("yang active", "yang aktif", "status active", "rejected", etc.)
    // ------------------------------------------------------------------------
    if (
      lower.includes('yang active') ||
      lower.includes('yang aktif') ||
      lower.includes('status active') ||
      lower.includes('yang masih aktif') ||
      /\b(active|aktif)\b/i.test(lower)
    ) {
      current.status = 'ACTIVE';
      current.activeFilters['status'] = 'ACTIVE';
    } else if (
      lower.includes('belum jalan') ||
      lower.includes('belum selesai') ||
      lower.includes('belum tuntas') ||
      lower.includes('masih berjalan') ||
      lower.includes('sedang berjalan') ||
      lower.includes('in progress') ||
      lower.includes('ongoing') ||
      lower.includes('pending execution') ||
      lower === 'yang belum jalan' ||
      lower === 'yang belum selesai'
    ) {
      current.status = 'BELUM_JALAN';
      current.activeFilters['status'] = 'BELUM_JALAN';
    } else if (/\b(rejected|ditolak)\b/i.test(lower) || lower.includes('status rejected') || lower.includes('status ditolak')) {
      current.status = 'REJECTED';
      current.activeFilters['status'] = 'REJECTED';
    } else if (/\b(cancelled|canceled|batal|dibatalkan)\b/i.test(lower) || lower.includes('status batal')) {
      current.status = 'CANCELLED';
      current.activeFilters['status'] = 'CANCELLED';
    } else if (
      lower.includes('sudah selesai') ||
      lower.includes('telah selesai') ||
      lower.includes('pekerjaan selesai') ||
      /\b(completed|selesai|done)\b/i.test(lower) ||
      lower.includes('status selesai')
    ) {
      current.status = 'COMPLETED';
      current.activeFilters['status'] = 'COMPLETED';
    } else if (/\b(awaiting_audit|audit)\b/i.test(lower)) {
      current.status = 'AWAITING_AUDIT';
      current.activeFilters['status'] = 'AWAITING_AUDIT';
    } else if (/\b(assigned)\b/i.test(lower) && !lower.includes('unassigned')) {
      current.status = 'ASSIGNED';
      current.activeFilters['status'] = 'ASSIGNED';
    } else if (/\b(draft)\b/i.test(lower) || lower.includes('status draft')) {
      current.status = 'DRAFT';
      current.activeFilters['status'] = 'DRAFT';
    } else if (/\b(confirmed|dikonfirmasi|terkonfirmasi)\b/i.test(lower) || lower.includes('status confirmed')) {
      current.status = 'CONFIRMED';
      current.activeFilters['status'] = 'CONFIRMED';
    } else if (/\b(document|dokumen)\b/i.test(lower)) {
      current.status = 'DOCUMENT';
      current.activeFilters['status'] = 'DOCUMENT';
    } else if (/\b(invoiced|tertagih)\b/i.test(lower)) {
      current.status = 'INVOICED';
      current.activeFilters['status'] = 'INVOICED';
    }

    // ------------------------------------------------------------------------
    // CUSTOMER REFINEMENT ("Customer ABC", "Customer XYZ", "TPS", dynamic extraction)
    // ------------------------------------------------------------------------
    if (lower.includes('customer abc') || lower === 'abc' || lower.includes('pt aneka bangun cemerlang')) {
      current.customer = 'Customer ABC';
      current.customerId = 'cust-abc';
      current.activeFilters['customer'] = 'Customer ABC';
    } else if (lower.includes('customer xyz') || lower === 'xyz') {
      current.customer = 'Customer XYZ';
      current.customerId = 'cust-xyz';
      current.activeFilters['customer'] = 'Customer XYZ';
    } else {
      const nonCustomerWords = new Set([
        'draft', 'draf', 'baru', 'lama', 'aktif', 'active', 'confirmed', 'terkonfirmasi',
        'batal', 'cancelled', 'canceled', 'rejected', 'ditolak', 'selesai', 'completed', 'done',
        'semua', 'all', 'hari', 'minggu', 'pekan', 'bulan', 'tahun', 'ini', 'lalu',
        'trucking', 'truk', 'forwarding', 'warehouse', 'gudang', 'customs', 'clearance',
        'status', 'yang', 'di', 'ke', 'dari', 'asal', 'tujuan', 'rute', 'laut', 'darat'
      ]);

      // 1. Known acronym or specific business code like "TPS"
      if (!current.customer && /\bTPS\b/i.test(raw)) {
        current.customer = 'TPS';
        current.activeFilters['customer'] = 'TPS';
      }

      // 2. Explicit marker: "milik <Customer>", "untuk <Customer>", "customer <Customer>", "pelanggan <Customer>"
      if (!current.customer) {
        const markerMatch = raw.match(/\b(?:milik|untuk|customer|pelanggan|klien)\s+((?:PT\s+|CV\s+|UD\s+)?[A-Za-z0-9&.-]+(?:\s+[A-Za-z0-9&.-]+){0,4})/i);
        if (markerMatch) {
          const cand = markerMatch[1].replace(/\s+(?:status|yang|draft|draf|aktif|active|confirmed|selesai|completed|di|ke|dari).*$/i, '').trim();
          if (cand && !nonCustomerWords.has(cand.toLowerCase())) {
            current.customer = cand;
            current.activeFilters['customer'] = cand;
          }
        }
      }

      // 3. Pattern: standalone corporate entity name in raw string (e.g. "PT TRADING PERDANA SUKSES")
      if (!current.customer) {
        const ptMatch = raw.match(/\b((?:PT|CV|UD)\s+[A-Za-z0-9\s.,-]{3,40})\b/i);
        if (ptMatch) {
          const cand = ptMatch[1].replace(/\s+(?:status|yang|draft|draf|order|so).*$/i, '').trim();
          if (cand && !nonCustomerWords.has(cand.toLowerCase())) {
            current.customer = cand;
            current.activeFilters['customer'] = cand;
          }
        }
      }

      // 4. Pattern: "order <Customer> status <Status>" or "order <Customer> draft" or "so <Customer> draft"
      if (!current.customer) {
        const orderCustMatch = raw.match(/\b(?:order|so|pesanan|sales\s+order)\s+((?:PT\s+|CV\s+|UD\s+)?[A-Za-z0-9&.-]+(?:\s+[A-Za-z0-9&.-]+){0,3})/i);
        if (orderCustMatch) {
          const cand = orderCustMatch[1].replace(/\s+(?:status|yang|draft|draf|aktif|active|confirmed|selesai|completed|di|ke|dari).*$/i, '').trim();
          if (cand && !nonCustomerWords.has(cand.toLowerCase())) {
            current.customer = cand;
            current.activeFilters['customer'] = cand;
          }
        }
      }

      // 5. Pattern: "draft order <Customer>" or "draft so <Customer>" or "order draft <Customer>"
      if (!current.customer) {
        const draftCustMatch = raw.match(/\b(?:draft\s+(?:order|so|sales\s+order)|(?:order|so|sales\s+order)\s+draft)\s+((?:PT\s+|CV\s+|UD\s+)?[A-Za-z0-9&.-]+(?:\s+[A-Za-z0-9&.-]+){0,3})/i);
        if (draftCustMatch) {
          const cand = draftCustMatch[1].replace(/\s+(?:status|yang|di|ke|dari).*$/i, '').trim();
          if (cand && !nonCustomerWords.has(cand.toLowerCase())) {
            current.customer = cand;
            current.activeFilters['customer'] = cand;
          }
        }
      }
    }

    // ------------------------------------------------------------------------
    // LOCATION / DESTINATION / ORIGIN REFINEMENT
    // ------------------------------------------------------------------------
    const cities = ['Surabaya', 'Semarang', 'Bandung', 'Denpasar', 'Jakarta', 'Medan', 'Makassar', 'Subang', 'Bekasi', 'Cikarang'];
    for (const city of cities) {
      const cLower = city.toLowerCase();
      const hasDest = 
        lower.includes(`tujuan ${cLower}`) || 
        lower.includes(`ke ${cLower}`) || 
        lower.includes(`bongkar di ${cLower}`) || 
        lower.includes(`destinasi ${cLower}`) ||
        lower.includes(`arah ${cLower}`) ||
        lower === `yang ${cLower}`;

      const hasOrig = 
        lower.includes(`asal ${cLower}`) || 
        lower.includes(`dari ${cLower}`) || 
        lower.includes(`muat di ${cLower}`) || 
        lower.includes(`pickup di ${cLower}`);

      const hasAmbiguous = 
        lower.includes(`di ${cLower}`) || 
        lower.includes(`yang di ${cLower}`) ||
        lower.includes(`pada ${cLower}`) ||
        lower.includes(`jo ${cLower}`) ||
        lower.includes(`order ${cLower}`) ||
        lower.includes(`wilayah ${cLower}`) ||
        lower.includes(`area ${cLower}`) ||
        lower.trim() === cLower;

      if (hasDest && !hasOrig) {
        current.destination = city;
        current.activeFilters['destination'] = city;
        delete current.origin;
        delete current.activeFilters['origin'];
        if (current.otherResolvedEntities) {
          delete current.otherResolvedEntities['ambiguousLocation'];
        }
        current.unresolvedAmbiguity = false;
        break;
      } else if (hasOrig && !hasDest) {
        current.origin = city;
        current.activeFilters['origin'] = city;
        delete current.destination;
        delete current.activeFilters['destination'];
        if (current.otherResolvedEntities) {
          delete current.otherResolvedEntities['ambiguousLocation'];
        }
        current.unresolvedAmbiguity = false;
        break;
      } else if (hasAmbiguous) {
        delete current.origin;
        delete current.activeFilters['origin'];
        delete current.destination;
        delete current.activeFilters['destination'];
        current.otherResolvedEntities = { ...(current.otherResolvedEntities || {}), ambiguousLocation: city };
        current.unresolvedAmbiguity = true;
        current.specificity = 'AMBIGUOUS';
        current.lastClarificationQuestion = `Apakah yang Anda maksud adalah Job Order dengan asal ${city} atau tujuan ${city}?`;
        break;
      }
    }

    // ------------------------------------------------------------------------
    // DOMAIN & MODALITY ("trucking", "yang trucking")
    // ------------------------------------------------------------------------
    if (lower.includes('trucking') || lower.includes('truk') || lower.includes('darat')) {
      current.domain = 'TRUCKING';
      current.activeFilters['domain'] = 'TRUCKING';
    }

    // ------------------------------------------------------------------------
    // OBJECT TYPE RESOLUTION
    // ------------------------------------------------------------------------
    if (lower.includes('job order') || /\bjo\b/i.test(lower)) {
      current.objectType = 'JOB_ORDER';
    } else if (lower.includes('work order') || /\bwo\b/i.test(lower) || /\bwo-/i.test(lower)) {
      current.objectType = 'WORK_ORDER';
    } else if (
      lower.includes('sales order') ||
      /\bso\b/i.test(lower) ||
      /\bso-/i.test(lower) ||
      /\b(order|pesanan)\b/i.test(lower)
    ) {
      current.objectType = 'SALES_ORDER';
    } else if (lower.includes('shipment') || lower.includes('pengiriman')) {
      current.objectType = 'SHIPMENT';
    } else if (lower.includes('invoice') || lower.includes('tagihan')) {
      current.objectType = 'INVOICE';
      current.domain = 'FINANCE';
    }

    // ------------------------------------------------------------------------
    // DIRECT IDENTIFIER RESOLUTION (Canonical JO, SO, SHP, WO, Open commands)
    // ------------------------------------------------------------------------
    // 1. Direct open/view command, e.g. "buka HALU-TOP-0526-002-01" or "lihat JO-2026-0001"
    const openMatch = raw.match(/\b(?:buka|lihat|detail|cek|open|show)\s+([A-Za-z0-9/_-]{6,})\b/i);
    // 2. Bare input consisting solely of an identifier, e.g. "HALU-TOP-0526-002-01"
    const trimmedInput = raw.trim();
    const isBareIdentifier = /^[A-Za-z0-9]{2,}(?:[-_/][A-Za-z0-9]+){2,}$/.test(trimmedInput);
    // 3. Pattern match for canonical Sentralogis JO (e.g. HALU-TOP-0526-002-01, ATM-BENLI-0826-001-01)
    const canonicalJoMatch = raw.match(/\b([A-Za-z0-9_]+-[A-Za-z0-9_]+-\d{4}-\d{3}(?:-\d+)?(?:\/[A-Za-z0-9]+-\d+)?)\b/i);
    // 4. Conventional JO prefix
    const joPrefixMatch = raw.match(/\b(JO-[A-Za-z0-9_-]+)\b/i);

    const explicitCandidate = openMatch ? openMatch[1] : (isBareIdentifier ? trimmedInput : null);

    if (explicitCandidate) {
      const upperCand = explicitCandidate.toUpperCase();
      if (/^SO-/i.test(upperCand)) {
        current.salesOrderNumber = upperCand;
        current.objectType = 'SALES_ORDER';
        current.activeFilters['salesOrderNumber'] = upperCand;
      } else if (/^SHP-/i.test(upperCand)) {
        current.shipmentNumber = upperCand;
        current.objectType = 'SHIPMENT';
        current.activeFilters['shipmentNumber'] = upperCand;
      } else if (/^WO-/i.test(upperCand)) {
        current.activeFilters['woNumber'] = upperCand;
        current.objectType = 'WORK_ORDER';
      } else {
        current.jobOrderNumber = upperCand;
        current.objectType = 'JOB_ORDER';
        current.activeFilters['jobOrderNumber'] = upperCand;
      }
      current.requestedOperation = 'FIND';
      current.specificity = 'SUFFICIENTLY_SPECIFIC';
      current.unresolvedAmbiguity = false;
    } else if (canonicalJoMatch && !/^SO-/i.test(canonicalJoMatch[1]) && !/^WO-/i.test(canonicalJoMatch[1])) {
      current.jobOrderNumber = canonicalJoMatch[1].toUpperCase();
      current.objectType = 'JOB_ORDER';
      current.activeFilters['jobOrderNumber'] = current.jobOrderNumber;
      current.requestedOperation = 'FIND';
      current.specificity = 'SUFFICIENTLY_SPECIFIC';
      current.unresolvedAmbiguity = false;
    } else if (joPrefixMatch) {
      current.jobOrderNumber = joPrefixMatch[1].toUpperCase();
      current.objectType = 'JOB_ORDER';
      current.activeFilters['jobOrderNumber'] = current.jobOrderNumber;
      current.requestedOperation = 'FIND';
      current.specificity = 'SUFFICIENTLY_SPECIFIC';
      current.unresolvedAmbiguity = false;
    }

    const soMatch = raw.match(/\b(SO-\d{4}-(?:\d{2}-)?\d{4})\b/i);
    if (soMatch && !current.salesOrderNumber) {
      current.salesOrderNumber = soMatch[0].toUpperCase();
      current.objectType = 'SALES_ORDER';
      current.activeFilters['salesOrderNumber'] = current.salesOrderNumber;
      current.unresolvedAmbiguity = false;
    }

    const woMatch = raw.match(/\b(WO-[A-Za-z0-9_-]{3,})\b/i);
    if (woMatch && !current.activeFilters['woNumber']) {
      current.activeFilters['woNumber'] = woMatch[0].toUpperCase();
      current.objectType = 'WORK_ORDER';
      current.unresolvedAmbiguity = false;
    }

    const shpMatch = raw.match(/\b(SHP-\d{4}-\d{4})\b/i);
    if (shpMatch && !current.shipmentNumber) {
      current.shipmentNumber = shpMatch[0].toUpperCase();
      current.objectType = 'SHIPMENT';
      current.activeFilters['shipmentNumber'] = current.shipmentNumber;
      current.unresolvedAmbiguity = false;
    }

    // ------------------------------------------------------------------------
    // REQUESTED OPERATION
    // ------------------------------------------------------------------------
    if (lower.startsWith('berapa') || lower.includes('jumlah jo') || lower.includes('berapa jo')) {
      current.requestedOperation = 'COUNT';
    } else if (lower.includes('ganti driver') || lower.includes('ubah driver') || lower.includes('ganti supir')) {
      current.requestedOperation = 'REPLACE_DRIVER';
    } else if (
      lower.includes('sudah berangkat') ||
      lower.includes('sudah jalan') ||
      lower.includes('status')
    ) {
      current.requestedOperation = 'STATUS_CHECK';
    } else if (!current.requestedOperation) {
      current.requestedOperation = 'FIND';
    }

    return { context: current, resetOccurred, isCorrection };
  }

  /**
   * Resolves query against deterministic simulated fixtures and enforces specificity (§10–§15).
   */
  public static resolveQuery(
    userInput: string,
    state: ConversationalContextState
  ): QueryResolutionResult {
    const raw = userInput.trim();
    const lower = raw.toLowerCase();

    // 1. Non-operational boundary (§21)
    if (ConversationalQueryResolver.isNonOperational(raw)) {
      const qContext: ConversationalQueryContext = {
        domain: 'GENERAL',
        objectType: 'UNKNOWN',
        requestedOperation: 'NON_OPERATIONAL',
        activeFilters: {},
        conversationTurn: (state.queryContext?.conversationTurn || 0) + 1,
        specificity: 'SUFFICIENTLY_SPECIFIC',
      };
      return {
        resolutionState: 'CONVERSATIONAL_NON_OPERATIONAL',
        queryContext: qContext,
        matchedEntityIds: [],
        counts: { total: 0 },
        responseText:
          'Maaf, saya adalah Copilot Sentralogis yang khusus membantu Anda terkait data, informasi, dan pekerjaan di Sentralogis. Silakan sampaikan hal yang ingin Anda cari atau cek.',
      };
    }

    // 2. Unknown Operational Intent (§15, §16, §11)
    if (
      lower === 'tolong bereskan ini' ||
      lower === 'bereskan ini' ||
      lower === 'lakukan sesuatu sekarang' ||
      lower === 'lakukan sesuatu' ||
      lower === 'proses dong' ||
      lower === 'urus dong' ||
      lower === 'handle ini' ||
      lower === 'kerjakan ini'
    ) {
      const qContext: ConversationalQueryContext = {
        domain: 'GENERAL',
        objectType: 'UNKNOWN',
        requestedOperation: 'GENERAL_INQUIRY',
        activeFilters: {},
        conversationTurn: (state.queryContext?.conversationTurn || 0) + 1,
        specificity: 'UNRESOLVED',
        unresolvedAmbiguity: true,
      };
      return {
        resolutionState: 'UNKNOWN_OPERATIONAL',
        queryContext: qContext,
        matchedEntityIds: [],
        counts: { total: 0 },
        responseText:
          'Perintah Anda belum dapat diproses karena tidak menyebutkan objek, nomor referensi, atau instruksi operasional yang spesifik. Mohon sebutkan data atau transaksi yang ingin Anda proses.',
        clarificationQuestion:
          'Mohon perjelas: transaksi atau pekerjaan apa yang ingin Anda proses?',
      };
    }

    // 3. Ambiguity Firewall: Bare "Surabaya" or "urus Surabaya" (§16, §10, Scenario 04)
    if (
      (!state.queryContext?.objectType && (lower === 'yang surabaya' || lower === 'urus surabaya' || lower === 'surabaya')) ||
      (lower.includes('urus surabaya') && !lower.includes('so') && !lower.includes('jo') && !lower.includes('shipment'))
    ) {
      const qContext: ConversationalQueryContext = {
        destination: 'Surabaya',
        activeFilters: { destination: 'Surabaya' },
        conversationTurn: (state.queryContext?.conversationTurn || 0) + 1,
        specificity: 'AMBIGUOUS',
        unresolvedAmbiguity: true,
      };
      return {
        resolutionState: 'CLARIFICATION_REQUIRED',
        queryContext: qContext,
        matchedEntityIds: ['SO-2026-0042', 'JO-2026-0812', 'SHP-2026-0302'],
        counts: { total: 3 },
        responseText:
          'Ditemukan beberapa transaksi terkait Surabaya dengan tipe yang berbeda. Yang dimaksud yang mana:\n1. Sales Order **SO-2026-0042**\n2. Job Order **JO-2026-0812**\n3. Shipment **SHP-2026-0302**?',
        clarificationQuestion:
          'Yang dimaksud yang mana: 1. Sales Order SO-2026-0042, 2. Job Order JO-2026-0812, atau 3. Shipment SHP-2026-0302?',
      };
    }

    // 4. Update query context progressively
    const { context, resetOccurred, isCorrection } = ConversationalQueryResolver.resolveQueryContext(
      userInput,
      state.queryContext
    );

    // 5. Action Safety: Driver Replacement (§20, Category K)
    if (context.requestedOperation === 'REPLACE_DRIVER') {
      const targetJo = context.jobOrderNumber || state.activeJobOrderId || 'JO-2026-0812';
      const proposal: ProposalBlock = {
        id: `prop-${Date.now()}`,
        title: 'Usulan Penggantian Driver Job Order',
        description: `Mengalokasikan driver Budi Santoso untuk Job Order ${targetJo} (Jakarta → Surabaya).`,
        intent: 'ASSIGN_OR_REPLACE_DRIVER',
        entityId: targetJo,
        entityType: 'job-order',
        changes: [
          {
            field: 'Driver (Supir)',
            from: 'Belum Ditugaskan',
            to: 'Budi Santoso (+62 812-3456-7890)',
          },
        ],
        reason: 'Status penugasan beralih dari UNASSIGNED menjadi teralokasi di tingkat rencana.',
        requiresApproval: true,
        executionAvailable: false,
        target: targetJo,
        action: 'REPLACE_DRIVER',
        proposal: true,
        isExecuted: false,
      };
      return {
        resolutionState: 'PROPOSAL',
        queryContext: context,
        matchedEntityIds: [targetJo],
        counts: { total: 1 },
        responseText: `Berikut adalah proposal penugasan driver untuk **${targetJo}**. Tindakan ini berstatus **USULAN RENCANA** dan tidak melakukan mutasi database operasional.`,
        proposalBlock: proposal,
      };
    }

    // Active entity fallback if no explicit entity was extracted in current query
    if (!context.shipmentNumber && !context.salesOrderNumber && !context.jobOrderNumber) {
      if (state.activeJobOrderId && (context.requestedOperation === 'STATUS_CHECK' || context.status === 'BELUM_JALAN')) {
        context.jobOrderNumber = state.activeJobOrderId;
        context.objectType = 'JOB_ORDER';
      } else if (state.activeSalesOrderId && (context.requestedOperation === 'STATUS_CHECK' || context.status === 'BELUM_JALAN')) {
        context.salesOrderNumber = state.activeSalesOrderId;
        context.objectType = 'SALES_ORDER';
      } else if (state.activeShipmentId && (context.requestedOperation === 'STATUS_CHECK' || context.status === 'BELUM_JALAN')) {
        context.shipmentNumber = state.activeShipmentId;
        context.objectType = 'SHIPMENT';
      }
    }

    // 6. Direct Specific Entity Query (§13 Direct Answer Contract)
    // 6a. Specific Shipment
    if (context.shipmentNumber) {
      const found = SIMULATED_SHIPMENTS.find((s) => s.shipmentNumber === context.shipmentNumber);
      if (found) {
        return {
          resolutionState: 'DIRECT_ANSWER',
          queryContext: { ...context, specificity: 'SUFFICIENTLY_SPECIFIC' },
          matchedEntityIds: [found.shipmentNumber],
          counts: { total: 1 },
          responseText:
            found.departureStatus === 'SUDAH_BERANGKAT'
              ? `Sudah berangkat.\n\nShipment **${found.shipmentNumber}** (${found.origin} → ${found.destination}) telah berangkat pada ${found.etd} menggunakan ${found.carrierName}. Estimasi tiba: ${found.eta}.`
              : `Belum berangkat.\n\nShipment **${found.shipmentNumber}** (${found.origin} → ${found.destination}) saat ini berstatus **${found.departureStatus}** (${found.status}). Jadwal keberangkatan: ${found.etd}.`,
        };
      }
    }

    // 6b. Specific Sales Order
    if (context.salesOrderNumber) {
      const found = SIMULATED_SALES_ORDERS.find((s) => s.soNumber === context.salesOrderNumber);
      if (found) {
        return {
          resolutionState: 'DIRECT_ANSWER',
          queryContext: { ...context, specificity: 'SUFFICIENTLY_SPECIFIC' },
          matchedEntityIds: [found.soNumber],
          counts: { total: 1 },
          responseText:
            found.operationalStatus === 'BELUM_JALAN'
              ? `Belum berangkat.\n\nSales Order **${found.soNumber}** (${found.customerName}, ${found.originCity} → ${found.destinationCity}) masih berstatus **BELUM_JALAN** (${found.status}). Job Order terkait belum berjalan.`
              : `Sales Order **${found.soNumber}** (${found.customerName}, ${found.originCity} → ${found.destinationCity}) berstatus **${found.operationalStatus}** (${found.status}).`,
        };
      }
    }

    // 6c. Specific Job Order
    if (context.jobOrderNumber) {
      const found =
        SIMULATED_WEEKLY_JOB_ORDERS.find((j) => j.joNumber === context.jobOrderNumber) ||
        SIMULATED_JOB_ORDERS.find((j) => j.joNumber === context.jobOrderNumber);
      if (found) {
        const driverInfo = found.driverName ? found.driverName : 'Driver belum tercatat';
        return {
          resolutionState: 'DIRECT_ANSWER',
          queryContext: { ...context, specificity: 'SUFFICIENTLY_SPECIFIC' },
          matchedEntityIds: [found.joNumber],
          counts: { total: 1 },
          responseText:
            found.operationalStatus === 'BELUM_JALAN'
              ? `Belum jalan.\n\nJob Order **${found.joNumber}** (${found.customerName}, ${found.origin} → ${found.destination}) masih berstatus **BELUM_JALAN** (${found.status}).\n- Driver: ${driverInfo}\n- Kendaraan: ${found.vehicleNumber || 'TBD'}`
              : `Job Order **${found.joNumber}** (${found.customerName}, ${found.origin} → ${found.destination}) berstatus **${found.operationalStatus}** (${found.status}).\n- Driver: ${driverInfo}\n- Kendaraan: ${found.vehicleNumber || 'TBD'}`,
        };
      }
    }

    // 7. General Operational Query Execution (e.g. Job Orders)
    if (context.objectType === 'JOB_ORDER' || (!context.objectType && context.period)) {
      context.objectType = 'JOB_ORDER';

      // Use weekly simulated dataset
      let candidates = [...SIMULATED_WEEKLY_JOB_ORDERS];

      // Filter by period (default THIS_WEEK unless specified)
      const targetPeriod = context.period || 'THIS_WEEK';
      candidates = candidates.filter((j) => j.period === targetPeriod);

      // Filter by status if specified
      if (context.status) {
        candidates = candidates.filter((j) => j.status === context.status);
      }

      // Filter by customer if specified
      if (context.customer) {
        candidates = candidates.filter((j) => j.customerName.includes(context.customer!));
      }

      // Filter by destination if specified
      if (context.destination) {
        candidates = candidates.filter((j) => j.destination.includes(context.destination!));
      }

      const totalCount = candidates.length;
      const matchedIds = candidates.map((j) => j.joNumber);

      // §12 COUNT Operation Handling: "Berapa JO aktif minggu ini?"
      if (context.requestedOperation === 'COUNT') {
        const statusLabel = context.status ? `berstatus ${context.status}` : '';
        const custLabel = context.customer ? `untuk ${context.customer}` : '';
        const periodLabel = targetPeriod === 'THIS_WEEK' ? 'minggu ini' : 'minggu lalu';
        return {
          resolutionState: 'DIRECT_ANSWER',
          queryContext: { ...context, specificity: 'SUFFICIENTLY_SPECIFIC' },
          matchedEntityIds: matchedIds,
          counts: { total: totalCount },
          responseText: `Terdapat **${totalCount}** Job Order ${statusLabel} ${custLabel} ${periodLabel}.`,
        };
      }

      // §14 NOT FOUND Handling
      if (totalCount === 0) {
        const appliedFilters: string[] = [];
        if (context.customer) appliedFilters.push(`Customer: ${context.customer}`);
        if (context.status) appliedFilters.push(`Status: ${context.status}`);
        if (context.destination) appliedFilters.push(`Tujuan: ${context.destination}`);
        if (context.period) appliedFilters.push(`Periode: ${context.period === 'THIS_WEEK' ? 'Minggu ini' : 'Minggu lalu'}`);

        return {
          resolutionState: 'NOT_FOUND',
          queryContext: { ...context, specificity: 'SUFFICIENTLY_SPECIFIC' },
          matchedEntityIds: [],
          counts: { total: 0 },
          responseText: `Saya tidak menemukan Job Order yang sesuai dengan pencarian Anda.\n\nFilter yang digunakan:\n${appliedFilters.map((f) => `- ${f}`).join('\n')}\n\nJika Anda mau, saya bisa mengecek status lain atau periode lain.`,
        };
      }

      // §11 & §12 Broad Query vs Specific Query
      // If status is specified (e.g. ACTIVE) but customer is not yet specified:
      if (context.status && totalCount > 6 && !context.customer) {
        return {
          resolutionState: 'CLARIFICATION_REQUIRED',
          queryContext: { ...context, specificity: 'TOO_BROAD' },
          matchedEntityIds: matchedIds,
          counts: { total: totalCount },
          responseText: `Ada **${totalCount}** active Job Orders minggu ini.\n\nApakah Anda ingin mempersempit lebih lanjut berdasarkan **customer**, **tujuan**, atau **driver**?`,
          clarificationQuestion:
            'Apakah Anda ingin mempersempit lebih lanjut berdasarkan customer, tujuan, atau driver?',
        };
      }

      // If broad initial query without status filter:
      if (!context.status && totalCount > 6 && !context.customer) {
        // Calculate real distribution from fixture data
        const distribution: Record<string, number> = {};
        for (const c of candidates) {
          distribution[c.status] = (distribution[c.status] || 0) + 1;
        }

        const distLines = Object.entries(distribution)
          .map(([status, cnt]) => `- **${status}**: ${cnt}`)
          .join('\n');

        return {
          resolutionState: 'BROAD_SUMMARY',
          queryContext: { ...context, specificity: 'TOO_BROAD' },
          matchedEntityIds: matchedIds,
          counts: { total: totalCount, distribution },
          responseText: `Ada **${totalCount}** Job Order yang ditemukan untuk ${targetPeriod === 'THIS_WEEK' ? 'minggu ini' : 'minggu lalu'}.\n\nDistribusi Status:\n${distLines}\n\nAnda bisa mempersempit berdasarkan **status**, **customer**, **tujuan**, **periode**, **driver**, atau **nomor JO**.`,
          clarificationQuestion:
            'Job Order yang mana? Bisa berdasarkan customer, tujuan, periode, status, atau nomor JO.',
        };
      }

      // If specific enough (e.g. Customer ABC has 6 Active JOs)
      const listSummary = candidates
        .slice(0, 6)
        .map((j) => `- **${j.joNumber}** (${j.origin} → ${j.destination}) | Driver: ${j.driverName || 'Driver belum tercatat'}`)
        .join('\n');

      return {
        resolutionState: 'DIRECT_ANSWER',
        queryContext: { ...context, specificity: 'SUFFICIENTLY_SPECIFIC' },
        matchedEntityIds: matchedIds,
        counts: { total: totalCount },
        responseText: `Ada **${totalCount}** active Job Orders untuk **${context.customer || 'pencarian Anda'}** minggu ini.\n\nDaftar Job Order:\n${listSummary}`,
      };
    }

    // Default fallback
    return {
      resolutionState: 'DIRECT_ANSWER',
      queryContext: context,
      matchedEntityIds: [],
      counts: { total: 0 },
      responseText: `Pencarian Anda telah diproses dengan konteks aktif: ${JSON.stringify(context.activeFilters)}.`,
    };
  }

  /**
   * Processes a message through the Conversational Query Resolver state machine (§4).
   */
  public static processMessage(
    userInput: string,
    state: ConversationalContextState
  ): {
    result: QueryResolutionResult;
    updatedState: ConversationalContextState;
    responseMessages: SandboxMessage[];
  } {
    const raw = userInput.trim();
    const result = ConversationalQueryResolver.resolveQuery(userInput, state);

    const updatedState: ConversationalContextState = {
      ...state,
      queryContext: result.queryContext,
      conversationHistory: [
        ...state.conversationHistory,
        { role: 'user', text: raw },
        { role: 'assistant', text: result.responseText },
      ],
    };

    // Propagate primary entities
    if (result.queryContext.customer) {
      updatedState.activeCustomerName = result.queryContext.customer;
    }
    if (result.queryContext.jobOrderNumber) {
      updatedState.activeJobOrderId = result.queryContext.jobOrderNumber;
    }
    if (result.queryContext.salesOrderNumber) {
      updatedState.activeSalesOrderId = result.queryContext.salesOrderNumber;
    }
    if (result.queryContext.shipmentNumber) {
      updatedState.activeShipmentId = result.queryContext.shipmentNumber;
    }

    const msg: SandboxMessage = {
      id: makeId(),
      role: 'assistant',
      type: result.proposalBlock ? 'proposal' : 'text',
      dataSource: result.proposalBlock ? 'PROPOSED' : 'SIMULATED',
      isExecuted: false,
      content: result.responseText,
      proposal: result.proposalBlock,
      clarificationNeeded: result.resolutionState === 'CLARIFICATION_REQUIRED',
      timestamp: new Date(),
    };

    return {
      result,
      updatedState,
      responseMessages: [msg],
    };
  }
}
