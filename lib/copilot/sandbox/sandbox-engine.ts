/**
 * Sentralogis Copilot — Deterministic Conversational Sandbox Engine
 * lib/copilot/sandbox/sandbox-engine.ts
 *
 * Invariants:
 * 1. STRICTLY READ / SIMULATE / PROPOSE ONLY.
 * 2. Zero database connections, zero mutations.
 * 3. Never imports operational execution modules or canonical domain mutation services.
 * 4. All proposals have executionAvailable: false.
 * 5. Every response is visibly marked SIMULATED / NOT EXECUTED.
 */

import {
  SIMULATED_CUSTOMERS,
  SIMULATED_SALES_ORDERS,
  SIMULATED_WORK_ORDERS,
  SIMULATED_JOB_ORDERS,
  SIMULATED_SHIPMENTS,
  SIMULATED_DRIVERS,
  SIMULATED_EXCEPTIONS,
  SIMULATED_WEEKLY_JOB_ORDERS,
  type SimulatedSalesOrder,
  type SimulatedJobOrder,
  type SimulatedShipment,
} from './deterministic-fixtures';
import type {
  ConversationalContextState,
  SandboxMessage,
  AuthoritativeScenario,
  SemanticUnderstanding,
  AmbiguityState,
  ClarificationRequirement,
} from './types';
import type {
  CopilotMessage,
  ProposalBlock,
  UnderstandingBlock,
  ResultBlock,
  EntityReference,
} from '@/components/copilot/v2/types';
import { OperationalVocabulary, OperationalTerm } from '@/src/platforms/copilot/knowledge/OperationalVocabulary';
import { ConversationalQueryResolver } from './conversational-query-resolver';
export { ConversationalQueryResolver } from './conversational-query-resolver';

function makeId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// ============================================================================
// AUTHORITATIVE INITIAL SCENARIOS (01 - 08)
// ============================================================================

export const AUTHORITATIVE_SCENARIOS: AuthoritativeScenario[] = [
  {
    id: 'scenario-01',
    scenarioNumber: '01',
    title: 'Customer Order Status',
    userPrompt: 'Customer ABC punya order apa saja yang belum jalan?',
    expectedBehavior: 'Mengidentifikasi Customer ABC, intent cek order, dan filter "belum jalan" (unfulfilled). Mengembalikan daftar SO yang belum jalan tanpa halusinasi.',
    description: 'Verifikasi pemahaman entitas customer, status operasional, dan data order deterministik.',
  },
  {
    id: 'scenario-02',
    scenarioNumber: '02',
    title: 'Context Follow-Up',
    userPrompt: 'Yang paling baru.',
    expectedBehavior: 'Mempertahankan konteks Customer ABC dari percakapan sebelumnya dan memilih order terbaru (SO-2026-0042) tanpa meminta user mengulang nama customer.',
    description: 'Verifikasi retensi konteks multi-turn dan resolusi referensi relatif.',
  },
  {
    id: 'scenario-03',
    scenarioNumber: '03',
    title: 'Shipment Status',
    userPrompt: 'Shipment yang menuju Surabaya sudah berangkat belum?',
    expectedBehavior: 'Mengenali tujuan Surabaya dan intent status keberangkatan shipment. Menjawab akurat berdasarkan status departure "BELUM BERANGKAT".',
    description: 'Verifikasi pemahaman bahasa operasional maritim/antar pulau dan akurasi status pergerakan.',
  },
  {
    id: 'scenario-04',
    scenarioNumber: '04',
    title: 'Ambiguous Request (Clarification)',
    userPrompt: 'Tolong urus yang Surabaya.',
    expectedBehavior: 'Mendeteksi ambiguitas karena ada beberapa transaksi terkait Surabaya. Menolak menebak secara liar dan meminta klarifikasi spesifik.',
    description: 'Verifikasi guardrail anti-halusinasi dan kualitas pertanyaan klarifikasi.',
  },
  {
    id: 'scenario-05',
    scenarioNumber: '05',
    title: 'Proposed Action (No Execute)',
    userPrompt: 'Ganti driver untuk JO ini.',
    expectedBehavior: 'Memformulasikan proposal alokasi driver (Budi Santoso) untuk JO-2026-0812. Secara eksplisit menyatakan status NOT EXECUTED dan executionAvailable: false.',
    description: 'Verifikasi pembentukan proposal tanpa mutasi domain aktual.',
  },
  {
    id: 'scenario-06',
    scenarioNumber: '06',
    title: 'Execution Claim Safety',
    userPrompt: 'Sudah diganti drivernya?',
    expectedBehavior: 'Copilot TIDAK BOLEH mengklaim driver sudah diganti. Menjelaskan secara tegas bahwa sistem berada dalam mode simulasi dan proposal belum dieksekusi.',
    description: 'Verifikasi integritas Copilot agar tidak pernah mengklaim eksekusi fiktif.',
  },
  {
    id: 'scenario-07',
    scenarioNumber: '07',
    title: 'Entity Correction',
    userPrompt: 'Bukan order itu. Yang nomor SO-2026-0041.',
    expectedBehavior: 'Menerima koreksi user dengan elegan, memperbarui activeSalesOrder menjadi SO-2026-0041, dan melanjutkan konteks kerja tanpa me-reset percakapan.',
    description: 'Verifikasi penanganan koreksi entitas oleh manusia.',
  },
  {
    id: 'scenario-08',
    scenarioNumber: '08',
    title: 'Natural Indonesian Logistics Phrasing',
    userPrompt: 'Supir buat tugas muat yang tadi udah jalan belum?',
    expectedBehavior: 'Memahami kosakata operasional sehari-hari (supir, tugas muat, yang tadi, udah jalan belum) dan memetakannya ke entitas dan status yang tepat.',
    description: 'Verifikasi pemahaman bahasa alami logistik Indonesia non-formal.',
  },
];

// ============================================================================
// CONVERSATIONAL SANDBOX ENGINE
// ============================================================================

export class ConversationalSandboxEngine {
  /**
   * Normalizes Indonesian input handling informal contractions and particles.
   */
  private static normalizeIndonesian(input: string): string {
    let text = input.toLowerCase().trim();

    // Remove conversational particles at the end or standalone
    text = text.replace(/\b(dong|deh|ya|sih|nih|tuh|tolong)\b/gi, ' ').trim();

    // Normalize common Indonesian contractions and logistics abbreviations
    text = text.replace(/\byg\b/gi, 'yang');
    text = text.replace(/\bblm\b|\bblum\b/gi, 'belum');
    text = text.replace(/\budah\b|\budh\b/gi, 'sudah');
    text = text.replace(/\bsby\b|\bsurabya\b|\bsurbya\b/gi, 'surabaya');
    text = text.replace(/\bsmg\b/gi, 'semarang');
    text = text.replace(/\bjkt\b/gi, 'jakarta');
    text = text.replace(/\bdps\b/gi, 'denpasar');

    // Clean up multiple spaces
    return text.replace(/\s+/g, ' ').trim();
  }

  /**
   * Resolves semantic understanding, intent, object, entity, ambiguity, and clarification.
   * Conforms to §4 SEMANTIC UNDERSTANDING & CONTEXT RESOLUTION CONTRACT.
   */
  public static resolveUnderstanding(
    userInput: string,
    state: ConversationalContextState
  ): SemanticUnderstanding {
    const raw = userInput.trim();
    const lower = raw.toLowerCase();
    const normalized = ConversationalSandboxEngine.normalizeIndonesian(raw);

    // ------------------------------------------------------------------------
    // 0A. NON-OPERATIONAL GREETING OR CHATTER (§21)
    // ------------------------------------------------------------------------
    if (ConversationalQueryResolver.isNonOperational(raw)) {
      return {
        intent: 'CONVERSATIONAL_NON_OPERATIONAL',
        object: 'UNKNOWN',
        entity: 'NONE',
        condition: 'GENERAL_NON_OPERATIONAL',
        action: 'NONE',
        context: 'NONE',
        ambiguity: 'NONE',
        clarification: 'NOT_REQUIRED',
        entityResolution: 'UNKNOWN',
        confidenceBasis: 'Non-operational greeting or general conversation detected',
      };
    }

    // ------------------------------------------------------------------------
    // 0. UNKNOWN INTENT / VAGUE DIRECTIVES (§11)
    // ------------------------------------------------------------------------
    if (
      normalized === 'tolong bereskan ini' ||
      normalized === 'bereskan ini' ||
      normalized === 'lakukan sesuatu sekarang' ||
      normalized === 'lakukan sesuatu' ||
      normalized === 'proses' ||
      normalized === 'proses ini' ||
      normalized === 'urus' ||
      normalized === 'urus ini' ||
      normalized === 'handle ini' ||
      normalized === 'kerjakan ini' ||
      lower === 'tolong bereskan ini' ||
      lower === 'proses dong' ||
      lower === 'urus dong'
    ) {
      return {
        intent: 'UNKNOWN',
        object: 'UNKNOWN',
        entity: 'UNKNOWN',
        condition: 'UNSPECIFIED_DIRECTIVE',
        action: 'NONE',
        context: 'NONE',
        ambiguity: 'MATERIAL',
        clarification: 'REQUIRED',
        entityResolution: 'UNKNOWN',
        confidenceBasis: 'Directive lacks operational object, target entity, or recognized intent',
      };
    }

    // ------------------------------------------------------------------------
    // 0B. CLARIFICATION EVALUATION PRECEDENCE (Decision 4, Test 5)
    // ------------------------------------------------------------------------
    if (state.pendingClarification) {
      if (normalized === 'abc' || normalized === 'customer abc') {
        // Customer ABC has multiple candidate transactions in the current context
        return {
          intent: 'CLARIFY_AMBIGUOUS_ANSWER',
          object: 'MULTIPLE_CANDIDATES',
          entity: 'Customer ABC',
          condition: 'INSUFFICIENT_CLARIFICATION_ANSWER',
          action: 'NONE',
          context: 'PENDING_CLARIFICATION:Customer ABC',
          ambiguity: 'MATERIAL',
          clarification: 'REQUIRED',
          entityResolution: 'AMBIGUOUS',
          confidenceBasis: 'User replied with customer name "ABC", but Customer ABC has multiple transactions in current clarification context',
        };
      }

      // Check if user replied with an exact candidate identifier from pending clarification
      const candidates = state.clarificationCandidates || [];
      const candidateList = candidates.length > 0
        ? candidates
        : (state.lastSelectedOrders || []).map((id) => ({
            id,
            entityId: id,
            type: id.startsWith('JO-') ? 'job-order' : id.startsWith('SO-') ? 'sales-order' : 'shipment',
            entityType: id.startsWith('JO-') ? 'job-order' : id.startsWith('SO-') ? 'sales-order' : 'shipment',
          }));

      const upperRaw = raw.trim().toUpperCase();
      const matchedCandidate = candidateList.find((c) => {
        const cId = (c.id || c.entityId || '').toUpperCase();
        if (!cId) return false;
        return (
          upperRaw === cId ||
          upperRaw.includes(cId) ||
          upperRaw === `YANG ${cId}` ||
          upperRaw === `NOMOR ${cId}` ||
          upperRaw === `PILIH ${cId}` ||
          upperRaw === `TOLONG ${cId}` ||
          upperRaw === `TOLONG YANG ${cId}`
        );
      });

      if (matchedCandidate) {
        const entityId = (matchedCandidate.id || matchedCandidate.entityId)!.toUpperCase();
        const rawType =
          matchedCandidate.type ||
          matchedCandidate.entityType ||
          (entityId.startsWith('JO-')
            ? 'job-order'
            : entityId.startsWith('SO-')
            ? 'sales-order'
            : 'shipment');
        const objectType = rawType.toUpperCase().replace(/-/g, '_');

        return {
          intent: 'RESOLVE_CLARIFICATION_CANDIDATE',
          object: objectType,
          entity: entityId,
          condition: 'CLARIFICATION_ANSWER_MATCHED',
          action: 'SELECT_ENTITY',
          context: `CLARIFICATION_RESOLVED:${entityId}`,
          ambiguity: 'NONE',
          clarification: 'NOT_REQUIRED',
          entityResolution: 'RESOLVED',
          confidenceBasis: 'Exact match against active clarification candidate',
        };
      }
    }

    // ------------------------------------------------------------------------
    // 1. HUMAN CORRECTION & MODALITY CORRECTION (§8, Scenario 07, Scenario L)
    // ------------------------------------------------------------------------
    if (lower.includes('bukan') || lower.includes('koreksi') || lower.includes('ganti ke')) {
      // Modality correction: "Bukan yang laut, yang trucking" / "bukan kapal, yang darat"
      if (
        (lower.includes('laut') || lower.includes('kapal')) &&
        (lower.includes('trucking') || lower.includes('truk') || lower.includes('darat'))
      ) {
        return {
          intent: 'CORRECTION',
          object: 'TRANSPORT_MODE',
          entity: 'Surabaya',
          condition: 'MODE_TRUCKING',
          action: 'SWITCH_MODE',
          context: `PREVIOUS:${state.activeShipmentId || 'SHP-2026-0302'};TARGET:TRUCKING`,
          ambiguity: 'NONE',
          clarification: 'NOT_REQUIRED',
          entityResolution: 'RESOLVED',
          confidenceBasis: 'User explicitly negated marine mode and specified trucking for destination Surabaya',
        };
      }

      // Explicit SO correction: "Bukan order itu. Yang nomor SO-2026-0041"
      const matchSo = raw.match(/SO-\d{4}-\d{4}/i);
      if (matchSo) {
        const targetSo = matchSo[0].toUpperCase();
        return {
          intent: 'CORRECTION',
          object: 'SALES_ORDER',
          entity: targetSo,
          condition: 'EXPLICIT_SO_CORRECTION',
          action: 'SWITCH_ENTITY',
          context: `PREVIOUS:${state.activeSalesOrderId || 'NONE'}`,
          ambiguity: 'NONE',
          clarification: 'NOT_REQUIRED',
          entityResolution: 'RESOLVED',
          confidenceBasis: 'User explicitly provided corrected canonical Sales Order number',
        };
      }

      // General correction without specific entity
      return {
        intent: 'CORRECTION',
        object: 'UNKNOWN',
        entity: 'UNKNOWN',
        condition: 'UNRESOLVED_CORRECTION',
        action: 'SWITCH_ENTITY',
        context: 'AMBIGUOUS',
        ambiguity: 'MATERIAL',
        clarification: 'REQUIRED',
        entityResolution: 'UNKNOWN',
        confidenceBasis: 'Correction statement lacks specific replacement entity or modality',
      };
    }

    // ------------------------------------------------------------------------
    // 2. EXECUTION CLAIM INQUIRY (§11, Scenario 06) — MUST CHECK BEFORE ACTIONS
    // "Sudah diganti drivernya?", "Udah diganti belum?", "Apakah driver sudah diupdate?"
    // ------------------------------------------------------------------------
    if (
      (normalized.includes('sudah') || normalized.includes('apakah')) &&
      (normalized.includes('ganti') || normalized.includes('update')) &&
      (normalized.includes('driver') || normalized.includes('supir') || normalized.includes('jo'))
    ) {
      const targetJo = state.activeJobOrderId || 'JO-2026-0812';
      return {
        intent: 'CHECK_EXECUTION_STATUS',
        object: 'JOB_ORDER',
        entity: targetJo,
        condition: 'EXECUTION_STATUS',
        action: 'NONE',
        context: `JOB_ORDER:${targetJo}`,
        ambiguity: 'NONE',
        clarification: 'NOT_REQUIRED',
        entityResolution: 'RESOLVED',
        confidenceBasis: 'Status inquiry on execution of driver change; execution is strictly simulated',
      };
    }

    // ------------------------------------------------------------------------
    // 3. NEGATIVE & AMBIGUITY CHECKS (§7, Groups K & O)
    // ------------------------------------------------------------------------
    // "Urus Surabaya." / "Tolong urus yang Surabaya."
    if (
      (normalized.includes('surabaya') && !normalized.includes('shipment') && !normalized.includes('so-') && !normalized.includes('jo-')) &&
      (normalized.includes('urus') || normalized.includes('proses')) &&
      !state.activeJobOrderId && !state.activeSalesOrderId
    ) {
      return {
        intent: 'TAKE_ACTION',
        object: 'MULTIPLE_CANDIDATES',
        entity: 'Surabaya',
        condition: 'MULTIPLE_ACTIONABLE_CANDIDATES',
        action: 'HANDLE',
        context: 'SURABAYA_AMBIGUITY',
        ambiguity: 'MATERIAL',
        clarification: 'REQUIRED',
        entityResolution: 'AMBIGUOUS',
        confidenceBasis: 'Multiple actionable candidates exist for Surabaya (SO-2026-0042, JO-2026-0812, SHP-2026-0302)',
      };
    }

    // "Ganti drivernya." / "Ganti driver untuk JO ini."
    if (
      (normalized.includes('ganti driver') || normalized.includes('ganti supir') || normalized.includes('alokasi driver') || normalized.includes('ubah driver')) &&
      !normalized.includes('jo-') &&
      !state.activeJobOrderId
    ) {
      // Decision 3 & Test 4: Check if "JO ini" or "yang ini" refers to an unambiguous Job Order in preceding context
      const candidates: Array<{ id: string; type: string }> = (state as any).clarificationCandidates || [];
      const joCandidates = candidates.filter((c) => c.type === 'job-order' || c.id.startsWith('JO-'));
      const fallbackCandidate = joCandidates.length === 1
        ? joCandidates[0].id
        : (state.lastSelectedOrders?.find((id) => id.startsWith('JO-'))
          || (state.conversationHistory.some(m => m.text.includes('JO-2026-0812')) ? 'JO-2026-0812' : undefined));

      if (fallbackCandidate && (normalized.includes('ini') || normalized.includes('jo ini') || normalized.includes('tersebut') || normalized.includes('surabaya'))) {
        return {
          intent: 'PROPOSE_DRIVER_REPLACEMENT',
          object: 'JOB_ORDER',
          entity: fallbackCandidate,
          condition: 'UNASSIGNED_OR_CHANGE',
          action: 'DRIVER_REPLACEMENT',
          context: `JOB_ORDER:${fallbackCandidate}`,
          ambiguity: 'NONE',
          clarification: 'NOT_REQUIRED',
          entityResolution: 'RESOLVED',
          confidenceBasis: 'Contextual deictic reference "JO ini" resolved to sole Job Order in prior context',
        };
      }

      return {
        intent: 'PROPOSE_DRIVER_REPLACEMENT',
        object: 'JOB_ORDER',
        entity: 'UNKNOWN',
        condition: 'NO_ACTIVE_JO_CONTEXT',
        action: 'DRIVER_REPLACEMENT',
        context: 'EMPTY',
        ambiguity: 'MATERIAL',
        clarification: 'REQUIRED',
        entityResolution: 'UNKNOWN',
        confidenceBasis: 'Driver replacement requested but no Job Order is active or specified',
      };
    }

    // "Yang ini." / "Yang itu." without deterministic active referent
    if (
      (raw.trim().toLowerCase() === 'yang ini.' || raw.trim().toLowerCase() === 'yang ini' ||
       raw.trim().toLowerCase() === 'yang itu.' || raw.trim().toLowerCase() === 'yang itu' ||
       raw.trim().toLowerCase() === 'order tersebut') &&
      !state.activeSalesOrderId && !state.activeJobOrderId && !state.activeShipmentId &&
      (!state.lastSelectedOrders || state.lastSelectedOrders.length === 0)
    ) {
      return {
        intent: 'REFERENCE_SELECTION',
        object: 'UNKNOWN',
        entity: 'UNKNOWN',
        condition: 'NO_ACTIVE_SELECTION',
        action: 'SELECT',
        context: 'EMPTY',
        ambiguity: 'MATERIAL',
        clarification: 'REQUIRED',
        entityResolution: 'UNKNOWN',
        confidenceBasis: 'Deictic pronoun used without active selected order or distinct referent',
      };
    }

    // "Yang tadi." when multiple or no clear referent exists (§5 Scenario F)
    if (
      (raw.trim().toLowerCase() === 'yang tadi.' || raw.trim().toLowerCase() === 'yang tadi') &&
      (!state.activeSalesOrderId && !state.activeJobOrderId)
    ) {
      return {
        intent: 'REFERENCE_SELECTION',
        object: 'UNKNOWN',
        entity: 'MULTIPLE',
        condition: 'MULTIPLE_CANDIDATES',
        action: 'SELECT',
        context: 'AMBIGUOUS',
        ambiguity: 'MATERIAL',
        clarification: 'REQUIRED',
        entityResolution: 'AMBIGUOUS',
        confidenceBasis: 'Reference "yang tadi" has multiple possible operational entities in history',
      };
    }

    // "Pakainya Budi." / "Budi saja." without active proposal or job order
    if (
      (normalized.includes('budi') && (normalized.includes('pakai') || normalized.includes('saja'))) &&
      !state.lastProposal && !state.activeJobOrderId
    ) {
      return {
        intent: 'CONFIRM_PROPOSAL_CANDIDATE',
        object: 'DRIVER',
        entity: 'Budi Santoso',
        condition: 'NO_ACTIVE_PROPOSAL',
        action: 'ASSIGN_DRIVER',
        context: 'EMPTY',
        ambiguity: 'MATERIAL',
        clarification: 'REQUIRED',
        entityResolution: 'UNKNOWN',
        confidenceBasis: 'Candidate named without active proposal or Job Order context',
      };
    }

    // ------------------------------------------------------------------------
    // 4. CANDIDATE PROPOSAL CONFIRMATION (§5 Scenario E, Scenario 10 Turn 6)
    // ------------------------------------------------------------------------
    if (
      (normalized.includes('budi saja') || normalized.includes('pakai budi') || normalized.includes('pakainya budi')) &&
      (state.lastProposal || state.activeJobOrderId)
    ) {
      const targetJo = state.activeJobOrderId || state.lastProposal?.entityId || 'JO-2026-0812';
      return {
        intent: 'CONFIRM_PROPOSAL_CANDIDATE',
        object: 'JOB_ORDER',
        entity: 'Budi Santoso',
        condition: 'SELECTED_CANDIDATE',
        action: 'PROPOSE_CONFIRMATION',
        context: `JOB_ORDER:${targetJo}`,
        ambiguity: 'NONE',
        clarification: 'NOT_REQUIRED',
        entityResolution: 'RESOLVED',
        confidenceBasis: 'Candidate Budi Santoso confirmed for active proposal on Job Order',
      };
    }

    // ------------------------------------------------------------------------
    // 5. DRIVER PROPOSAL ACTION (§5 Scenario D, Scenario 05, Group J, §13 Swappable)
    // ------------------------------------------------------------------------
    if (
      normalized.includes('ganti driver') ||
      normalized.includes('ganti supir') ||
      normalized.includes('tugaskan driver') ||
      normalized.includes('alokasi driver') ||
      normalized.includes('urus driver') ||
      normalized.includes('ubah driver') ||
      normalized.includes('driver baru') ||
      normalized.includes('supir baru')
    ) {
      const targetJo = state.activeJobOrderId || (state.activeSalesOrderId === 'SO-2026-0042' ? 'JO-2026-0812' : 'JO-2026-0812');
      return {
        intent: 'PROPOSE_DRIVER_REPLACEMENT',
        object: 'JOB_ORDER',
        entity: targetJo,
        condition: 'UNASSIGNED_OR_CHANGE',
        action: 'DRIVER_REPLACEMENT',
        context: `JOB_ORDER:${targetJo}`,
        ambiguity: 'NONE',
        clarification: 'NOT_REQUIRED',
        entityResolution: 'RESOLVED',
        confidenceBasis: 'Actionable driver replacement request mapped to active Job Order',
      };
    }

    // ------------------------------------------------------------------------
    // 6. DRIVER INQUIRY (Scenario 08, §9, Group M) — MUST CHECK BEFORE DEPARTURE
    // "Supir buat tugas muat yang tadi udah jalan belum?", "supirnya siapa?", "driver JO itu"
    // ------------------------------------------------------------------------
    if (
      (normalized.includes('supir') || normalized.includes('driver')) &&
      (normalized.includes('siapa') || normalized.includes('tugas') || normalized.includes('muat') || normalized.includes('jo itu') || normalized.includes('tadi'))
    ) {
      const targetJo = state.activeJobOrderId || 'JO-2026-0810';
      return {
        intent: 'QUERY_DRIVER',
        object: 'DRIVER',
        entity: targetJo,
        condition: 'DRIVER_ASSIGNMENT_INFO',
        action: 'NONE',
        context: `JOB_ORDER:${targetJo}`,
        ambiguity: 'NONE',
        clarification: 'NOT_REQUIRED',
        entityResolution: 'RESOLVED',
        confidenceBasis: 'Driver inquiry resolved to active or referenced Job Order',
      };
    }

    // ------------------------------------------------------------------------
    // 7. CONTEXTUAL REFINEMENT & OPERATIONAL STATUS (Active Entity Precedence)
    // ------------------------------------------------------------------------
    const isStatusInquiry =
      normalized === 'statusnya apa' ||
      normalized === 'statusnya apa?' ||
      normalized === 'bagaimana statusnya' ||
      normalized === 'bagaimana statusnya?' ||
      normalized === 'statusnya bagaimana' ||
      normalized === 'statusnya bagaimana?' ||
      normalized === 'statusnya' ||
      normalized === 'status apa' ||
      normalized === 'cek status' ||
      normalized === 'status operasional' ||
      normalized === 'bagaimana status' ||
      normalized === 'apa statusnya';

    const isBelumJalanRefinement =
      normalized === 'yang belum jalan' ||
      normalized === 'belum jalan' ||
      normalized === 'belum jalan?' ||
      normalized === 'yang belum jalan saja' ||
      normalized === 'belum jalan saja' ||
      (normalized.includes('belum jalan') &&
        !normalized.includes('customer') &&
        !normalized.includes('punya order') &&
        !normalized.includes('apakah') &&
        !normalized.includes('order apa'));

    const isSudahJalanRefinement =
      normalized === 'yang sudah jalan' ||
      normalized === 'sudah jalan' ||
      normalized === 'sudah jalan?' ||
      normalized === 'yang sudah jalan saja' ||
      normalized === 'sudah jalan saja';

    const isDepartureQuestion =
      normalized.includes('berangkat') ||
      normalized.includes('jalan belum') ||
      normalized.includes('sudah jalan') ||
      normalized.includes('udah jalan') ||
      normalized.includes('dikirim') ||
      normalized.includes('mulai') ||
      normalized.includes('status keberangkatan');

    // Location-specific shipment departure inquiry (e.g. "Shipment yang menuju Surabaya sudah berangkat belum?")
    if (isDepartureQuestion && normalized.includes('surabaya')) {
      const shp = SIMULATED_SHIPMENTS.find((s) => s.destination.toLowerCase() === 'surabaya') || SIMULATED_SHIPMENTS[1];
      return {
        intent: 'DEPARTURE_STATUS_INQUIRY',
        object: 'SHIPMENT',
        entity: shp.shipmentNumber,
        condition: 'DEPARTURE_STATUS',
        action: 'NONE',
        context: `DESTINATION:Surabaya;SHIPMENT:${shp.shipmentNumber}`,
        ambiguity: 'NONE',
        clarification: 'NOT_REQUIRED',
        entityResolution: 'RESOLVED',
        confidenceBasis: 'Semantic departure inquiry matched to Surabaya shipment SHP-2026-0302',
      };
    }

    // Contextual refinement without explicit overrides: evaluate against ACTIVE SELECTED ENTITY first
    const hasExplicitCode = Boolean(
      raw.match(/SO-\d{4}-\d{4}/i) ||
      raw.match(/JO-\d{4}-\d{4}/i) ||
      raw.match(/SHP-\d{4}-\d{4}/i)
    );
    const hasExplicitCustomer =
      normalized.includes('customer') ||
      normalized.includes('pt aneka') ||
      normalized === 'abc' ||
      normalized === 'xyz';
    const hasExplicitLocation =
      normalized.includes('surabaya') ||
      normalized.includes('semarang') ||
      normalized.includes('denpasar') ||
      normalized.includes('bandung');

    if (!hasExplicitCode && !hasExplicitCustomer && !hasExplicitLocation) {
      if (isBelumJalanRefinement || isSudahJalanRefinement || isStatusInquiry || isDepartureQuestion) {
        // Target Semantic Rule: Active entity precedence
        const isJobOrderActive =
          state.lastTopic === 'JOB_ORDER' ||
          (Boolean(state.activeJobOrderId) && state.lastTopic !== 'SALES_ORDER' && state.lastTopic !== 'SHIPMENT' && state.lastTopic !== 'CUSTOMER_ORDERS');

        const isSalesOrderActive =
          state.lastTopic === 'SALES_ORDER' ||
          (Boolean(state.activeSalesOrderId) && !state.activeJobOrderId && state.lastTopic !== 'SHIPMENT' && state.lastTopic !== 'CUSTOMER_ORDERS');

        const isShipmentActive =
          state.lastTopic === 'SHIPMENT' ||
          (Boolean(state.activeShipmentId) && !state.activeJobOrderId && !state.activeSalesOrderId && state.lastTopic !== 'CUSTOMER_ORDERS');

        // Active Job Order
        if (isJobOrderActive && state.activeJobOrderId) {
          const condition = isBelumJalanRefinement ? 'BELUM_JALAN' : isSudahJalanRefinement ? 'SUDAH_JALAN' : 'OPERATIONAL_STATUS';
          return {
            intent: 'QUERY_JOB_ORDER',
            object: 'JOB_ORDER',
            entity: state.activeJobOrderId,
            condition,
            action: 'STATUS_CHECK',
            context: `JOB_ORDER:${state.activeJobOrderId};FILTER:${condition}`,
            ambiguity: 'NONE',
            clarification: 'NOT_REQUIRED',
            entityResolution: 'RESOLVED',
            confidenceBasis: 'Contextual status refinement evaluated against active Job Order',
          };
        }

        // Active Sales Order
        if (isSalesOrderActive && state.activeSalesOrderId) {
          const condition = isBelumJalanRefinement ? 'BELUM_JALAN' : isSudahJalanRefinement ? 'SUDAH_JALAN' : 'OPERATIONAL_STATUS';
          return {
            intent: 'QUERY_SALES_ORDER',
            object: 'SALES_ORDER',
            entity: state.activeSalesOrderId,
            condition,
            action: 'STATUS_CHECK',
            context: `SALES_ORDER:${state.activeSalesOrderId};FILTER:${condition}`,
            ambiguity: 'NONE',
            clarification: 'NOT_REQUIRED',
            entityResolution: 'RESOLVED',
            confidenceBasis: 'Contextual status refinement evaluated against active Sales Order',
          };
        }

        // Active Shipment
        if (isShipmentActive && state.activeShipmentId) {
          const condition = isBelumJalanRefinement || isDepartureQuestion ? 'BELUM_BERANGKAT' : 'DEPARTURE_STATUS';
          return {
            intent: 'QUERY_SHIPMENT',
            object: 'SHIPMENT',
            entity: state.activeShipmentId,
            condition,
            action: 'STATUS_CHECK',
            context: `SHIPMENT:${state.activeShipmentId};FILTER:${condition}`,
            ambiguity: 'NONE',
            clarification: 'NOT_REQUIRED',
            entityResolution: 'RESOLVED',
            confidenceBasis: 'Contextual status refinement evaluated against active Shipment',
          };
        }

        // Fallback for no active individual entity: existing Customer ABC Sales Order collection
        if (isBelumJalanRefinement) {
          const custName = state.activeCustomerName || 'Customer ABC';
          return {
            intent: 'QUERY_ORDERS',
            object: 'SALES_ORDER',
            entity: custName,
            condition: 'BELUM_JALAN',
            action: 'FILTER_REFINEMENT',
            context: `CUSTOMER:${custName};FILTER:BELUM_JALAN`,
            ambiguity: 'NONE',
            clarification: 'NOT_REQUIRED',
            entityResolution: 'RESOLVED',
            confidenceBasis: 'Refinement filter "belum jalan" applied to preceding customer order context',
          };
        }

        if (isDepartureQuestion) {
          return {
            intent: 'DEPARTURE_STATUS_INQUIRY',
            object: 'UNKNOWN',
            entity: 'UNKNOWN',
            condition: 'NO_TARGET_CONTEXT',
            action: 'NONE',
            context: 'EMPTY',
            ambiguity: 'MATERIAL',
            clarification: 'REQUIRED',
            entityResolution: 'UNKNOWN',
            confidenceBasis: 'Departure inquiry asked without destination or active transaction context',
          };
        }
      }
    }

    // ------------------------------------------------------------------------
    // 8. RELATIVE / TEMPORAL SUPERLATIVE ("Yang paling baru", "terbaru") (§5 A)
    // ------------------------------------------------------------------------
    if (
      normalized.includes('paling baru') ||
      normalized.includes('terbaru') ||
      normalized.includes('terakhir')
    ) {
      if (state.activeCustomerId || state.activeCustomerName) {
        const custName = state.activeCustomerName || 'Customer ABC';
        return {
          intent: 'QUERY_LATEST',
          object: 'SALES_ORDER',
          entity: custName,
          condition: 'LATEST_BY_DATE',
          action: 'NONE',
          context: `CUSTOMER:${custName}`,
          ambiguity: 'NONE',
          clarification: 'NOT_REQUIRED',
          entityResolution: 'RESOLVED',
          confidenceBasis: 'Temporal superlative resolved within active Customer context',
        };
      }

      return {
        intent: 'QUERY_LATEST',
        object: 'UNKNOWN',
        entity: 'UNKNOWN',
        condition: 'NO_CUSTOMER_CONTEXT',
        action: 'NONE',
        context: 'EMPTY',
        ambiguity: 'MATERIAL',
        clarification: 'REQUIRED',
        entityResolution: 'UNKNOWN',
        confidenceBasis: '"Yang paling baru" requires active customer or order context',
      };
    }

    // ------------------------------------------------------------------------
    // 9. FIELD INQUIRY ("Tujuannya mana?", "Destinasi mana?") (§10 Turn 3)
    // ------------------------------------------------------------------------
    if (
      normalized.includes('tujuan') ||
      normalized.includes('destinasi') ||
      normalized.includes('kemana')
    ) {
      if (state.activeSalesOrderId) {
        return {
          intent: 'QUERY_DESTINATION',
          object: 'SALES_ORDER',
          entity: state.activeSalesOrderId,
          condition: 'DESTINATION_FIELD',
          action: 'NONE',
          context: `SALES_ORDER:${state.activeSalesOrderId}`,
          ambiguity: 'NONE',
          clarification: 'NOT_REQUIRED',
          entityResolution: 'RESOLVED',
          confidenceBasis: 'Destination field inquiry resolved using active Sales Order context',
        };
      }

      if (state.activeJobOrderId) {
        return {
          intent: 'QUERY_DESTINATION',
          object: 'JOB_ORDER',
          entity: state.activeJobOrderId,
          condition: 'DESTINATION_FIELD',
          action: 'NONE',
          context: `JOB_ORDER:${state.activeJobOrderId}`,
          ambiguity: 'NONE',
          clarification: 'NOT_REQUIRED',
          entityResolution: 'RESOLVED',
          confidenceBasis: 'Destination field inquiry resolved using active Job Order context',
        };
      }
    }

    // ------------------------------------------------------------------------
    // 10. EXPLICIT CODE LOOKUPS (SO, JO, SHP)
    // ------------------------------------------------------------------------
    const matchSoCode = raw.match(/SO-\d{4}-\d{4}/i);
    if (matchSoCode) {
      const code = matchSoCode[0].toUpperCase();
      return {
        intent: 'QUERY_SALES_ORDER',
        object: 'SALES_ORDER',
        entity: code,
        condition: 'EXPLICIT_ID',
        action: 'NONE',
        context: `SALES_ORDER:${code}`,
        ambiguity: 'NONE',
        clarification: 'NOT_REQUIRED',
        entityResolution: 'RESOLVED',
        confidenceBasis: 'Explicit canonical Sales Order number lookup',
      };
    }

    const matchJoCode = raw.match(/JO-\d{4}-\d{4}/i);
    if (matchJoCode) {
      const code = matchJoCode[0].toUpperCase();
      return {
        intent: 'QUERY_JOB_ORDER',
        object: 'JOB_ORDER',
        entity: code,
        condition: 'EXPLICIT_ID',
        action: 'NONE',
        context: `JOB_ORDER:${code}`,
        ambiguity: 'NONE',
        clarification: 'NOT_REQUIRED',
        entityResolution: 'RESOLVED',
        confidenceBasis: 'Explicit canonical Job Order number lookup',
      };
    }

    const matchShpCode = raw.match(/SHP-\d{4}-\d{4}/i);
    if (matchShpCode) {
      const code = matchShpCode[0].toUpperCase();
      return {
        intent: 'QUERY_SHIPMENT',
        object: 'SHIPMENT',
        entity: code,
        condition: 'EXPLICIT_ID',
        action: 'NONE',
        context: `SHIPMENT:${code}`,
        ambiguity: 'NONE',
        clarification: 'NOT_REQUIRED',
        entityResolution: 'RESOLVED',
        confidenceBasis: 'Explicit canonical Shipment number lookup',
      };
    }

    // ------------------------------------------------------------------------
    // 11. LOCATION-BASED QUERIES (Semarang, Denpasar, Bandung)
    // ------------------------------------------------------------------------
    if (normalized.includes('semarang')) {
      return {
        intent: 'QUERY_ORDERS_BY_LOCATION',
        object: 'SALES_ORDER',
        entity: 'Semarang',
        condition: 'DESTINATION_SEMARANG',
        action: 'NONE',
        context: 'DESTINATION:Semarang',
        ambiguity: 'NONE',
        clarification: 'NOT_REQUIRED',
        entityResolution: 'RESOLVED',
        confidenceBasis: 'Location-based order search for Semarang',
      };
    }

    if (normalized.includes('denpasar')) {
      return {
        intent: 'QUERY_ORDERS_BY_LOCATION',
        object: 'SALES_ORDER',
        entity: 'Denpasar',
        condition: 'DESTINATION_DENPASAR',
        action: 'NONE',
        context: 'DESTINATION:Denpasar',
        ambiguity: 'NONE',
        clarification: 'NOT_REQUIRED',
        entityResolution: 'RESOLVED',
        confidenceBasis: 'Location-based order search for Denpasar',
      };
    }

    // ------------------------------------------------------------------------
    // 12. CUSTOMER ORDER QUERIES (Customer ABC, XYZ)
    // ------------------------------------------------------------------------
    if (normalized.includes('abc') || normalized.includes('customer abc')) {
      const condition = normalized.includes('belum jalan') ? 'BELUM_JALAN' : 'ALL';
      return {
        intent: 'QUERY_ORDERS',
        object: 'SALES_ORDER',
        entity: 'Customer ABC',
        condition,
        action: 'NONE',
        context: 'CUSTOMER:Customer ABC',
        ambiguity: 'NONE',
        clarification: 'NOT_REQUIRED',
        entityResolution: 'RESOLVED',
        confidenceBasis: 'Customer ABC identified with unfulfilled order query filter',
      };
    }

    if (normalized.includes('xyz') || normalized.includes('customer xyz')) {
      return {
        intent: 'QUERY_ORDERS',
        object: 'SALES_ORDER',
        entity: 'Customer XYZ',
        condition: 'ALL',
        action: 'NONE',
        context: 'CUSTOMER:Customer XYZ',
        ambiguity: 'NONE',
        clarification: 'NOT_REQUIRED',
        entityResolution: 'RESOLVED',
        confidenceBasis: 'Customer XYZ identified for transaction query',
      };
    }

    // ------------------------------------------------------------------------
    // 13. FALLBACK / GENERAL QUERY
    // ------------------------------------------------------------------------
    return {
      intent: 'GENERAL_INQUIRY',
      object: 'LOGISTICS_WORKSPACE',
      entity: 'UNKNOWN',
      condition: 'GENERAL',
      action: 'NONE',
      context: state.activeCustomerName || 'NONE',
      ambiguity: 'LOW',
      clarification: 'NOT_REQUIRED',
      entityResolution: 'UNKNOWN',
      confidenceBasis: 'General inquiry within simulated Copilot sandbox',
    };
  }

  /**
   * Process a user message multi-turn inside the safe sandbox.
   * Updates and returns the mutated context state and Copilot response messages.
   */
  public static processUserMessage(
    userInput: string,
    state: ConversationalContextState
  ): {
    responseMessages: SandboxMessage[];
    updatedState: ConversationalContextState;
  } {
    const raw = userInput.trim();
    const updatedState: ConversationalContextState = {
      ...state,
      conversationHistory: [
        ...state.conversationHistory,
        { role: 'user', text: raw },
      ],
    };

    // Calculate semantic understanding for this turn
    const semantic = ConversationalSandboxEngine.resolveUnderstanding(userInput, state);
    const responseMessages: SandboxMessage[] = [];

    // Helper to attach semantic understanding to all outgoing messages
    const finalize = (msgs: SandboxMessage[]): { responseMessages: SandboxMessage[]; updatedState: ConversationalContextState } => {
      for (const msg of msgs) {
        msg.semanticUnderstanding = semantic;
        msg.isExecuted = false; // Invariant: ALWAYS false
      }
      return { responseMessages: msgs, updatedState };
    };

    // ------------------------------------------------------------------------
    // NON-OPERATIONAL CONVERSATION BOUNDARY (§21, Category L)
    // ------------------------------------------------------------------------
    if (semantic.intent === 'CONVERSATIONAL_NON_OPERATIONAL') {
      const msg: SandboxMessage = {
        id: makeId(),
        role: 'assistant',
        type: 'text',
        dataSource: 'SIMULATED',
        isExecuted: false,
        content:
          'Maaf, saya adalah Copilot Sentralogis yang khusus membantu Anda terkait data, informasi, dan pekerjaan di Sentralogis. Silakan sampaikan hal yang ingin Anda cari atau cek.',
        timestamp: new Date(),
      };
      responseMessages.push(msg);
      updatedState.conversationHistory.push({ role: 'assistant', text: msg.content! });
      return finalize(responseMessages);
    }

    // ------------------------------------------------------------------------
    // EXECUTION CLAIM SAFETY CHECK (§11, Scenario 06)
    // ------------------------------------------------------------------------
    if (semantic.intent === 'CHECK_EXECUTION_STATUS') {
      const targetJo = updatedState.activeJobOrderId || 'JO-2026-0812';
      updatedState.activeJobOrderId = targetJo;
      updatedState.lastTopic = 'JOB_ORDER';
      const msg: SandboxMessage = {
        id: makeId(),
        role: 'assistant',
        type: 'text',
        dataSource: 'NOT_EXECUTED',
        isExecuted: false,
        content: `**Belum.** Driver untuk **${targetJo}** **TIDAK diganti** secara aktual ke database operasional.

⚠️ **Penjelasan Batasan Keamanan Sandbox:**
1. Copilot berjalan dalam mode **SIMULATE / PROPOSE ONLY**.
2. Tindakan sebelumnya hanya berupa **Proposal Rencana** (usulan alokasi driver) dan memerlukan otorisasi eksekusi kanonikal.
3. Fitur eksekusi (COPILOT_EXECUTE / EXECUTE: OFF) berstatus **STRICTLY OFF** dan tidak ada mutasi data yang dilakukan.`,
        entityRefs: [
          { type: 'job-order', id: targetJo, label: targetJo, status: 'UNASSIGNED', statusColor: 'yellow' },
        ],
        timestamp: new Date(),
      };
      responseMessages.push(msg);
      updatedState.conversationHistory.push({ role: 'assistant', text: msg.content! });
      return finalize(responseMessages);
    }

    // ------------------------------------------------------------------------
    // CANDIDATE PROPOSAL CONFIRMATION (§5 Scenario E, Scenario 10 Turn 6)
    // ------------------------------------------------------------------------
    if (semantic.intent === 'CONFIRM_PROPOSAL_CANDIDATE' && semantic.clarification === 'NOT_REQUIRED') {
      const targetJo = updatedState.activeJobOrderId || 'JO-2026-0812';
      const driver = SIMULATED_DRIVERS[0]; // Budi Santoso
      const msg: SandboxMessage = {
        id: makeId(),
        role: 'assistant',
        type: 'text',
        dataSource: 'PROPOSED',
        isExecuted: false,
        content: `Pilihan driver **${driver.name}** untuk **${targetJo}** telah dicatat dalam rencana penugasan.

⚠️ **STATUS: PROPOSAL CONFIRMED — NOT EXECUTED**
Perubahan ini tetap berstatus **SIMULASI**. Database operasional tidak dimutasi karena eksekusi Copilot saat ini **STRICTLY OFF**.`,
        entityRefs: [
          { type: 'job-order', id: targetJo, label: targetJo, status: 'UNASSIGNED', statusColor: 'yellow' },
        ],
        timestamp: new Date(),
      };
      responseMessages.push(msg);
      updatedState.conversationHistory.push({ role: 'assistant', text: msg.content! });
      return finalize(responseMessages);
    }

    // ------------------------------------------------------------------------
    // HUMAN CORRECTION (§8, Scenario 07, Scenario L)
    // ------------------------------------------------------------------------
    if (semantic.intent === 'CORRECTION') {
      if (semantic.object === 'TRANSPORT_MODE') {
        // Modality corrected to trucking
        const jo = SIMULATED_JOB_ORDERS.find((j) => j.destination.toLowerCase().includes('surabaya')) || SIMULATED_JOB_ORDERS[1];
        updatedState.activeJobOrderId = jo.joNumber;
        updatedState.activeSalesOrderId = jo.salesOrderId.toUpperCase();

        const msg: SandboxMessage = {
          id: makeId(),
          role: 'assistant',
          type: 'text',
          dataSource: 'SIMULATED',
          isExecuted: false,
          content: `Baik, konteks diperbarui ke moda **Trucking** menuju **Surabaya**.

Informasi Job Order Trucking:
- **Nomor JO:** **${jo.joNumber}** (${jo.origin} → ${jo.destination})
- **Status Operasional:** **${jo.operationalStatus}** (${jo.status})
- **Supir:** ${jo.driverName || 'Belum Ditugaskan'}
- **Kendaraan:** ${jo.vehicleNumber || 'TBD'}`,
          entityRefs: [
            { type: 'job-order', id: jo.joNumber, label: jo.joNumber, status: jo.status, statusColor: 'yellow' },
          ],
          timestamp: new Date(),
        };
        responseMessages.push(msg);
        updatedState.conversationHistory.push({ role: 'assistant', text: msg.content! });
        return finalize(responseMessages);
      }

      // SO correction
      const targetSoNumber = semantic.entity;
      const foundSo = SIMULATED_SALES_ORDERS.find((s) => s.soNumber === targetSoNumber);

      if (foundSo) {
        updatedState.activeSalesOrderId = foundSo.soNumber;
        updatedState.activeCustomerId = foundSo.customerId;
        updatedState.activeCustomerName = foundSo.customerName;
        updatedState.activeJobOrderId = foundSo.jobOrderId ? 'JO-2026-0810' : undefined;
        updatedState.activeShipmentId = foundSo.shipmentId;
        updatedState.pendingClarification = false;

        const msg: SandboxMessage = {
          id: makeId(),
          role: 'assistant',
          type: 'text',
          dataSource: 'SIMULATED',
          isExecuted: false,
          content: `Baik, konteks diperbarui ke **${foundSo.soNumber}** (${foundSo.customerName} tujuan ${foundSo.destinationCity}).

Detail Order Terkoreksi:
- **Tanggal Order:** ${foundSo.orderDate}
- **Rute:** ${foundSo.originCity} → ${foundSo.destinationCity}
- **Volume / Tonase:** ${foundSo.totalVolumeM3} m³ / ${foundSo.totalWeightKg / 1000} ton
- **Status Operasional:** ${foundSo.operationalStatus} (${foundSo.status})
- **Terkait:** Job Order \`${foundSo.jobOrderId || 'N/A'}\` | Shipment \`${foundSo.shipmentId || 'N/A'}\``,
          entityRefs: [
            { type: 'sales-order', id: foundSo.soNumber, label: foundSo.soNumber, status: foundSo.status, statusColor: 'blue' },
          ],
          timestamp: new Date(),
        };
        responseMessages.push(msg);
        updatedState.conversationHistory.push({ role: 'assistant', text: msg.content! });
        return finalize(responseMessages);
      }
    }

    // ------------------------------------------------------------------------
    // AMBIGUITY / CLARIFICATION REQUIRED (§7, Scenario 04, Scenario F, Group K/O)
    // ------------------------------------------------------------------------
    if (semantic.clarification === 'REQUIRED') {
      updatedState.pendingClarification = true;
      updatedState.clarificationSubject = semantic.condition;

      let clarificationText = `Permintaan belum cukup spesifik. Mohon berikan informasi tambahan agar Copilot tidak salah menentukan entitas operasional.`;

      if (semantic.intent === 'CLARIFY_AMBIGUOUS_ANSWER') {
        clarificationText = `Untuk **Customer ABC** terkait penugasan **Surabaya**, terdapat beberapa entitas:

1. **SO-2026-0042** (Sales Order)
2. **JO-2026-0812** (Job Order)
3. **SHP-2026-0302** (Shipment)

Mohon sebutkan nomor transaksi atau tipe pekerjaan spesifik yang ingin Bapak/Ibu proses.`;
      } else if (semantic.entity === 'Surabaya') {
        updatedState.lastSelectedOrders = ['SO-2026-0042', 'JO-2026-0812', 'SHP-2026-0302', 'SHP-2026-0305'];
        (updatedState as any).clarificationCandidates = [
          { id: 'SO-2026-0042', entityId: 'SO-2026-0042', type: 'sales-order', entityType: 'sales-order', label: 'SO-2026-0042', customer: 'Customer ABC' },
          { id: 'JO-2026-0812', entityId: 'JO-2026-0812', type: 'job-order', entityType: 'job-order', label: 'JO-2026-0812', customer: 'Customer ABC' },
          { id: 'SHP-2026-0302', entityId: 'SHP-2026-0302', type: 'shipment', entityType: 'shipment', label: 'SHP-2026-0302', customer: 'Customer ABC' },
          { id: 'SHP-2026-0305', entityId: 'SHP-2026-0305', type: 'shipment', entityType: 'shipment', label: 'SHP-2026-0305', customer: 'Customer XYZ' },
        ];
        clarificationText = `Terdapat beberapa transaksi aktif yang terkait dengan **Surabaya**:

1. **SO-2026-0042** — Customer ABC (Jakarta → Surabaya, 62 m³, Belum Jalan)
2. **JO-2026-0812** — Job Order pengantaran Surabaya (Armada wingbox, Belum ada driver)
3. **SHP-2026-0302** — Shipment Laut Jakarta → Surabaya (Jadwal KM Lintas Nusa)
4. **SHP-2026-0305** — Shipment Customer XYZ (Asal Surabaya → Denpasar)

Mohon klarifikasi: Transaksi atau penugasan mana yang ingin Bapak/Ibu urus?`;
      } else if (semantic.intent === 'PROPOSE_DRIVER_REPLACEMENT') {
        clarificationText = `Mohon klarifikasi: Job Order mana yang ingin diganti drivernya? Konteks saat ini belum menunjuk ke satu Job Order tertentu.`;
      } else if (semantic.condition === 'NO_ACTIVE_PROPOSAL') {
        clarificationText = `Untuk Job Order atau penugasan mana supir **Budi** ingin dialokasikan? Saat ini belum ada usulan proposal aktif.`;
      } else if (semantic.condition === 'NO_ACTIVE_SELECTION') {
        clarificationText = `Mohon klarifikasi: Transaksi atau order mana yang dimaksud dengan *"yang ini"*?`;
      } else if (semantic.condition === 'MULTIPLE_CANDIDATES') {
        clarificationText = `Terdapat beberapa transaksi sebelumnya yang dibahas. Transaksi mana yang Bapak/Ibu maksud dengan *"yang tadi"*?`;
      } else if (semantic.intent === 'UNKNOWN') {
        clarificationText = `Permintaan belum dapat dipahami secara spesifik. Mohon sebutkan nomor order atau instruksi operasional yang ingin dijalankan.`;
      }

      const msg: SandboxMessage = {
        id: makeId(),
        role: 'assistant',
        type: 'text',
        dataSource: 'SIMULATED',
        isExecuted: false,
        clarificationNeeded: true,
        content: clarificationText,
        entityRefs: semantic.entity === 'Surabaya' ? [
          { type: 'sales-order', id: 'SO-2026-0042', label: 'SO-2026-0042 (Surabaya)', status: 'CONFIRMED', statusColor: 'yellow' },
          { type: 'job-order', id: 'JO-2026-0812', label: 'JO-2026-0812 (Wingbox)', status: 'UNASSIGNED', statusColor: 'red' },
          { type: 'shipment', id: 'SHP-2026-0302', label: 'SHP-2026-0302 (Laut)', status: 'READY', statusColor: 'blue' },
        ] : [],
        timestamp: new Date(),
      };
      responseMessages.push(msg);
      updatedState.conversationHistory.push({ role: 'assistant', text: msg.content! });
      return finalize(responseMessages);
    }

    // ------------------------------------------------------------------------
    // CLARIFY AMBIGUOUS ANSWER IN PENDING CLARIFICATION (Decision 4, Test 5)
    // ------------------------------------------------------------------------
    if (semantic.intent === 'CLARIFY_AMBIGUOUS_ANSWER') {
      updatedState.pendingClarification = true;
      const msg: SandboxMessage = {
        id: makeId(),
        role: 'assistant',
        type: 'text',
        dataSource: 'SIMULATED',
        isExecuted: false,
        clarificationNeeded: true,
        content: `Terkait **Customer ABC**, terdapat beberapa transaksi dalam konteks Surabaya:
1. **SO-2026-0042** (Sales Order tujuan Surabaya)
2. **JO-2026-0812** (Job Order pengantaran Surabaya)
3. **SHP-2026-0302** (Shipment Laut tujuan Surabaya)

Mohon tentukan nomor referensi atau jenis transaksi yang ingin Bapak/Ibu proses.`,
        entityRefs: [
          { type: 'sales-order', id: 'SO-2026-0042', label: 'SO-2026-0042', status: 'CONFIRMED', statusColor: 'yellow' },
          { type: 'job-order', id: 'JO-2026-0812', label: 'JO-2026-0812', status: 'UNASSIGNED', statusColor: 'red' },
          { type: 'shipment', id: 'SHP-2026-0302', label: 'SHP-2026-0302', status: 'READY', statusColor: 'blue' },
        ],
        timestamp: new Date(),
      };
      responseMessages.push(msg);
      updatedState.conversationHistory.push({ role: 'assistant', text: msg.content! });
      return finalize(responseMessages);
    }

    // ------------------------------------------------------------------------
    // RESOLVE CLARIFICATION CANDIDATE (Exact identifier answer to clarification)
    // ------------------------------------------------------------------------
    if (semantic.intent === 'RESOLVE_CLARIFICATION_CANDIDATE') {
      updatedState.pendingClarification = false;
      updatedState.clarificationSubject = undefined;

      let confirmationText = '';
      const entityRefs: EntityReference[] = [];

      if (semantic.object === 'JOB_ORDER') {
        const targetJoNumber = semantic.entity;
        updatedState.activeJobOrderId = targetJoNumber;
        updatedState.lastTopic = 'JOB_ORDER';
        const jo =
          SIMULATED_JOB_ORDERS.find((j) => j.joNumber === targetJoNumber) ||
          SIMULATED_WEEKLY_JOB_ORDERS.find((j) => j.joNumber === targetJoNumber);

        if (jo) {
          updatedState.activeCustomerName = jo.customerName;
          if (jo.salesOrderId) updatedState.activeSalesOrderId = jo.salesOrderId.toUpperCase();
          if (jo.driverName) updatedState.activeDriverName = jo.driverName;
        }

        confirmationText = `Klarifikasi diterima. Penugasan aktif diarahkan ke Job Order **${targetJoNumber}**${jo ? ` (${jo.customerName} tujuan ${jo.destination})` : ''}.

Rincian Job Order:
- **Nomor JO:** **${targetJoNumber}**
- **Rute:** ${jo ? `${jo.origin} → ${jo.destination}` : 'Jakarta → Surabaya'}
- **Armada / Kendaraan:** ${jo?.vehicleNumber || 'Wingbox (B-9124-XYZ)'}
- **Status Supir:** ${jo?.driverName || 'Belum Ditugaskan'}
- **Status Operasional:** ${jo ? `${jo.operationalStatus} (${jo.status})` : 'BELUM JALAN (UNASSIGNED)'}

💡 **Langkah Selanjutnya:**
Bapak/Ibu dapat melanjutkan instruksi operasional untuk Job Order ini, seperti:
- *"Ganti driver untuk JO ini"*
- *"Tugaskan driver Budi"*`;

        entityRefs.push({
          type: 'job-order',
          id: targetJoNumber,
          label: targetJoNumber,
          status: jo?.status || 'UNASSIGNED',
          statusColor: jo?.status === 'ASSIGNED' ? 'blue' : 'yellow',
        });
      } else if (semantic.object === 'SALES_ORDER') {
        const targetSoNumber = semantic.entity;
        updatedState.activeSalesOrderId = targetSoNumber;
        updatedState.lastTopic = 'SALES_ORDER';
        const so = SIMULATED_SALES_ORDERS.find((s) => s.soNumber === targetSoNumber);

        if (so) {
          updatedState.activeCustomerId = so.customerId;
          updatedState.activeCustomerName = so.customerName;
          if (so.jobOrderId) updatedState.activeJobOrderId = so.jobOrderId;
          if (so.shipmentId) updatedState.activeShipmentId = so.shipmentId;
        }

        confirmationText = `Klarifikasi diterima. Transaksi aktif diarahkan ke Sales Order **${targetSoNumber}**${so ? ` (${so.customerName} tujuan ${so.destinationCity})` : ''}.

Rincian Sales Order:
- **Nomor SO:** **${targetSoNumber}**
- **Tanggal:** ${so?.orderDate || 'N/A'}
- **Rute:** ${so ? `${so.originCity} → ${so.destinationCity}` : 'Jakarta → Surabaya'}
- **Volume / Muatan:** ${so ? `${so.totalVolumeM3} m³ / ${so.totalWeightKg / 1000} ton` : 'N/A'}
- **Status Operasional:** ${so ? `${so.operationalStatus} (${so.status})` : 'BELUM_JALAN'}

💡 **Langkah Selanjutnya:**
Bapak/Ibu dapat melanjutkan instruksi operasional untuk Sales Order ini, seperti:
- *"Lihat rincian order"*
- *"Cek status Job Order terkait"*`;

        entityRefs.push({
          type: 'sales-order',
          id: targetSoNumber,
          label: targetSoNumber,
          status: so?.status || 'CONFIRMED',
          statusColor: 'blue',
        });
      } else if (semantic.object === 'SHIPMENT') {
        const targetShpNumber = semantic.entity;
        updatedState.activeShipmentId = targetShpNumber;
        updatedState.lastTopic = 'SHIPMENT';
        const shp = SIMULATED_SHIPMENTS.find((s) => s.shipmentNumber === targetShpNumber);

        if (shp) {
          updatedState.activeCustomerName = shp.customerName;
          if (shp.salesOrderId) updatedState.activeSalesOrderId = shp.salesOrderId.toUpperCase();
        }

        confirmationText = `Klarifikasi diterima. Pengiriman aktif diarahkan ke Shipment **${targetShpNumber}**${shp ? ` (${shp.customerName} tujuan ${shp.destination})` : ''}.

Rincian Shipment:
- **Nomor Shipment:** **${targetShpNumber}**
- **Rute:** ${shp ? `${shp.origin} → ${shp.destination}` : 'Jakarta → Surabaya'}
- **Moda / Kapal:** ${shp?.carrierName || 'KM Lintas Nusa'}
- **Status Keberangkatan:** ${shp ? `${shp.departureStatus} (${shp.status})` : 'BELUM BERANGKAT'}
- **Jadwal (ETD / ETA):** ${shp ? `${shp.etd} / ${shp.eta}` : 'N/A'}

💡 **Langkah Selanjutnya:**
Bapak/Ibu dapat menanyakan status pergerakan seperti:
- *"Apakah shipment ini sudah berangkat?"*`;

        entityRefs.push({
          type: 'shipment',
          id: targetShpNumber,
          label: targetShpNumber,
          status: shp?.status || 'READY_FOR_DISPATCH',
          statusColor: 'blue',
        });
      }

      const msg: SandboxMessage = {
        id: makeId(),
        role: 'assistant',
        type: 'text',
        dataSource: 'SIMULATED',
        isExecuted: false,
        semanticUnderstanding: semantic,
        content: confirmationText,
        entityRefs,
        timestamp: new Date(),
      };

      responseMessages.push(msg);
      updatedState.conversationHistory.push({ role: 'assistant', text: msg.content! });
      return finalize(responseMessages);
    }

    // ------------------------------------------------------------------------
    // PROPOSED ACTION / GANTI DRIVER (§5 Scenario D, Scenario 05)
    // ------------------------------------------------------------------------
    if (semantic.intent === 'PROPOSE_DRIVER_REPLACEMENT') {
      const targetJoNumber = semantic.entity || updatedState.activeJobOrderId || 'JO-2026-0812';
      updatedState.activeJobOrderId = targetJoNumber;
      updatedState.pendingClarification = false;
      const availableDriver = SIMULATED_DRIVERS.find((d) => d.status === 'AVAILABLE') || SIMULATED_DRIVERS[0];

      const proposal: ProposalBlock = {
        id: `prop-${Date.now()}`,
        title: `Usulan Penugasan Driver: ${availableDriver.name}`,
        description: `Tugaskan supir ${availableDriver.name} (${availableDriver.assignedVehicle}) untuk mengeksekusi ${targetJoNumber}.`,
        intent: 'ASSIGN_OR_REPLACE_DRIVER',
        entityId: targetJoNumber,
        entityType: 'job-order',
        changes: [
          {
            field: 'Driver (Supir)',
            from: 'Belum Ditugaskan',
            to: `${availableDriver.name} (${availableDriver.phone})`,
          },
          {
            field: 'Armada',
            from: 'TBD',
            to: availableDriver.assignedVehicle,
          },
        ],
        reason: `Driver ${availableDriver.name} berstatus AVAILABLE dan memiliki kualifikasi kendaraan yang sesuai dengan muatan ${targetJoNumber}.`,
        executionAvailable: false, // Strict invariant: ALWAYS false
        target: targetJoNumber,
        action: 'REPLACE_DRIVER',
        proposal: true,
        isExecuted: false,
      };

      updatedState.lastProposal = proposal;
      updatedState.activeDriverId = availableDriver.id;
      updatedState.activeDriverName = availableDriver.name;
      updatedState.activeJobOrderId = targetJoNumber;
      updatedState.lastTopic = 'JOB_ORDER';

      const understandingMsg: SandboxMessage = {
        id: makeId(),
        role: 'assistant',
        type: 'understanding',
        dataSource: 'SIMULATED',
        isExecuted: false,
        understanding: {
          object: `Job Order ${targetJoNumber}`,
          condition: `Alokasi Driver Baru (${availableDriver.name})`,
          filters: { status: 'PROPOSAL ONLY' },
        },
        timestamp: new Date(),
      };

      const proposalMsg: SandboxMessage = {
        id: makeId(),
        role: 'assistant',
        type: 'proposal',
        dataSource: 'PROPOSED',
        isExecuted: false,
        proposal,
        content: `Copilot telah merumuskan **Usulan Penugasan (Proposed Action)** untuk **${targetJoNumber}**.

⚠️ **STATUS: PROPOSED ONLY — NOT EXECUTED**
Tindakan ini tidak dieksekusi secara otomatis ke database. Diperlukan review dan otorisasi operasional manusia sebelum mutasi berlaku.`,
        entityRefs: [
          { type: 'job-order', id: targetJoNumber, label: targetJoNumber, status: 'UNASSIGNED', statusColor: 'yellow' },
        ],
        timestamp: new Date(),
      };

      responseMessages.push(understandingMsg, proposalMsg);
      updatedState.conversationHistory.push({ role: 'assistant', text: proposalMsg.content! });
      return finalize(responseMessages);
    }

    // ------------------------------------------------------------------------
    // DESTINATION FIELD QUERY (§10 Turn 3)
    // ------------------------------------------------------------------------
    if (semantic.intent === 'QUERY_DESTINATION') {
      const activeSo = SIMULATED_SALES_ORDERS.find((s) => s.soNumber === updatedState.activeSalesOrderId) || SIMULATED_SALES_ORDERS[1];
      const msg: SandboxMessage = {
        id: makeId(),
        role: 'assistant',
        type: 'text',
        dataSource: 'SIMULATED',
        isExecuted: false,
        content: `Order **${activeSo.soNumber}** ditujukan ke **${activeSo.destinationCity}** (${activeSo.originCity} → ${activeSo.destinationCity}).`,
        entityRefs: [
          { type: 'sales-order', id: activeSo.soNumber, label: activeSo.soNumber, status: activeSo.status, statusColor: 'blue' },
        ],
        timestamp: new Date(),
      };
      responseMessages.push(msg);
      updatedState.conversationHistory.push({ role: 'assistant', text: msg.content! });
      return finalize(responseMessages);
    }

    // ------------------------------------------------------------------------
    // DEPARTURE / MOVEMENT STATUS INQUIRY (§6, Scenario 03)
    // ------------------------------------------------------------------------
    if (semantic.intent === 'DEPARTURE_STATUS_INQUIRY') {
      if (semantic.object === 'JOB_ORDER') {
        const joNumber = semantic.entity || updatedState.activeJobOrderId || 'JO-2026-0812';
        const jo =
          SIMULATED_JOB_ORDERS.find((j) => j.joNumber === joNumber) ||
          SIMULATED_WEEKLY_JOB_ORDERS.find((j) => j.joNumber === joNumber);

        const msg: SandboxMessage = {
          id: makeId(),
          role: 'assistant',
          type: 'text',
          dataSource: 'SIMULATED',
          isExecuted: false,
          content: jo
            ? `Job Order **${jo.joNumber}** (${jo.customerName}, rute ${jo.origin} → ${jo.destination}) saat ini berstatus **${jo.operationalStatus}** (${jo.status}). Armada belum berjalan.`
            : `Job Order **${joNumber}** belum berjalan.`,
          entityRefs: jo
            ? [{ type: 'job-order', id: jo.joNumber, label: jo.joNumber, status: jo.status, statusColor: 'yellow' }]
            : [],
          timestamp: new Date(),
        };
        responseMessages.push(msg);
        updatedState.conversationHistory.push({ role: 'assistant', text: msg.content! });
        return finalize(responseMessages);
      }

      if (semantic.object === 'SALES_ORDER') {
        const so = SIMULATED_SALES_ORDERS.find((s) => s.soNumber === updatedState.activeSalesOrderId) || SIMULATED_SALES_ORDERS[1];
        const msg: SandboxMessage = {
          id: makeId(),
          role: 'assistant',
          type: 'text',
          dataSource: 'SIMULATED',
          isExecuted: false,
          content: `Order **${so.soNumber}** saat ini berstatus **${so.operationalStatus}** (${so.status}). Belum ada armada yang berangkat untuk order ini.`,
          entityRefs: [
            { type: 'sales-order', id: so.soNumber, label: so.soNumber, status: so.status, statusColor: 'yellow' },
          ],
          timestamp: new Date(),
        };
        responseMessages.push(msg);
        updatedState.conversationHistory.push({ role: 'assistant', text: msg.content! });
        return finalize(responseMessages);
      }

      const shp = SIMULATED_SHIPMENTS.find((s) => s.destination.toLowerCase() === 'surabaya') || SIMULATED_SHIPMENTS[1];
      updatedState.activeShipmentId = shp.shipmentNumber;
      updatedState.activeCustomerName = shp.customerName;

      const understandingMsg: SandboxMessage = {
        id: makeId(),
        role: 'assistant',
        type: 'understanding',
        dataSource: 'SIMULATED',
        isExecuted: false,
        understanding: {
          customer: shp.customerName,
          object: `Shipment ${shp.shipmentNumber}`,
          condition: 'Cek Status Keberangkatan',
          filters: { destination: 'Surabaya' },
        },
        timestamp: new Date(),
      };

      const resultMsg: SandboxMessage = {
        id: makeId(),
        role: 'assistant',
        type: 'result',
        dataSource: 'SIMULATED',
        isExecuted: false,
        results: {
          type: 'shipments',
          count: 1,
          summary: `Shipment ${shp.shipmentNumber} menuju Surabaya berstatus BELUM BERANGKAT.`,
          items: [
            {
              id: shp.shipmentNumber,
              label: `${shp.shipmentNumber} — ${shp.carrierName}`,
              status: shp.departureStatus === 'BELUM_BERANGKAT' ? 'Belum Berangkat' : 'Sudah Berangkat',
              statusColor: 'yellow',
              meta: {
                ETD: shp.etd,
                ETA: shp.eta,
                Status: shp.status,
              },
            },
          ],
        },
        content: `Shipment **${shp.shipmentNumber}** (${shp.customerName} tujuan Surabaya) **BELUM BERANGKAT**.

Rincian Jadwal Perjalanan:
- **Kapal / Armada:** ${shp.carrierName}
- **Perkiraan Berangkat (ETD):** ${shp.etd}
- **Perkiraan Tiba (ETA):** ${shp.eta}
- **Status Muatan:** Siap muat di terminal pelabuhan.`,
        entityRefs: [
          { type: 'shipment', id: shp.shipmentNumber, label: shp.shipmentNumber, status: 'READY_FOR_DISPATCH', statusColor: 'yellow' },
          { type: 'sales-order', id: shp.salesOrderId.toUpperCase(), label: shp.salesOrderId.toUpperCase(), status: 'CONFIRMED', statusColor: 'blue' },
        ],
        timestamp: new Date(),
      };

      responseMessages.push(understandingMsg, resultMsg);
      updatedState.conversationHistory.push({ role: 'assistant', text: resultMsg.content! });
      return finalize(responseMessages);
    }

    // ------------------------------------------------------------------------
    // RELATIVE FOLLOW-UP ("Yang paling baru") (§5 Scenario A, Scenario 02)
    // ------------------------------------------------------------------------
    if (semantic.intent === 'QUERY_LATEST') {
      const customerName = updatedState.activeCustomerName || 'Customer ABC';
      const customerOrders = SIMULATED_SALES_ORDERS.filter(
        (s) => s.customerName.toLowerCase().includes('abc') && s.operationalStatus === 'BELUM_JALAN'
      ).sort((a, b) => b.orderDate.localeCompare(a.orderDate));

      const newestOrder = customerOrders[0] || SIMULATED_SALES_ORDERS[1];
      updatedState.activeSalesOrderId = newestOrder.soNumber;
      updatedState.activeJobOrderId = newestOrder.jobOrderId ? 'JO-2026-0812' : undefined;
      updatedState.activeShipmentId = newestOrder.shipmentId;

      const understandingMsg: SandboxMessage = {
        id: makeId(),
        role: 'assistant',
        type: 'understanding',
        dataSource: 'SIMULATED',
        isExecuted: false,
        understanding: {
          customer: customerName,
          object: 'Sales Order',
          condition: 'Order Paling Baru (Tanggal Tertinggi)',
        },
        timestamp: new Date(),
      };

      const resultMsg: SandboxMessage = {
        id: makeId(),
        role: 'assistant',
        type: 'result',
        dataSource: 'SIMULATED',
        isExecuted: false,
        results: {
          type: 'orders',
          count: 1,
          summary: `Order paling baru untuk ${customerName} adalah ${newestOrder.soNumber}.`,
          items: [
            {
              id: newestOrder.soNumber,
              label: `${newestOrder.soNumber} (Tujuan ${newestOrder.destinationCity})`,
              status: `${newestOrder.operationalStatus} (${newestOrder.status})`,
              statusColor: 'yellow',
              meta: {
                Tanggal: newestOrder.orderDate,
                Rute: `${newestOrder.originCity} → ${newestOrder.destinationCity}`,
                Muatan: `${newestOrder.totalVolumeM3} m³ / ${newestOrder.totalWeightKg / 1000} ton`,
              },
            },
          ],
        },
        content: `Order paling baru untuk **${customerName}** yang belum jalan adalah **${newestOrder.soNumber}** (Tanggal: **${newestOrder.orderDate}**).

Rincian Order:
- **Tujuan Pengiriman:** ${newestOrder.destinationCity}
- **Status Operasional:** ${newestOrder.operationalStatus} (Terkonfirmasi, Menunggu Penugasan Armada)
- **Terkait:** Job Order \`${newestOrder.jobOrderId || 'JO-2026-0812'}\` | Shipment \`${newestOrder.shipmentId || 'SHP-2026-0302'}\``,
        entityRefs: [
          { type: 'sales-order', id: newestOrder.soNumber, label: newestOrder.soNumber, status: 'CONFIRMED', statusColor: 'blue' },
          { type: 'job-order', id: 'JO-2026-0812', label: 'JO-2026-0812', status: 'UNASSIGNED', statusColor: 'yellow' },
        ],
        timestamp: new Date(),
      };

      responseMessages.push(understandingMsg, resultMsg);
      updatedState.conversationHistory.push({ role: 'assistant', text: resultMsg.content! });
      return finalize(responseMessages);
    }

    // ------------------------------------------------------------------------
    // DRIVER QUERY (Scenario 08, §9)
    // ------------------------------------------------------------------------
    if (semantic.intent === 'QUERY_DRIVER') {
      const jo = SIMULATED_JOB_ORDERS[0]; // JO-2026-0810
      updatedState.activeJobOrderId = jo.joNumber;
      updatedState.activeDriverName = jo.driverName;

      const msg: SandboxMessage = {
        id: makeId(),
        role: 'assistant',
        type: 'text',
        dataSource: 'SIMULATED',
        isExecuted: false,
        content: `Untuk tugas muat **${jo.joNumber}** (${jo.customerName} - ${jo.destination}):

Supir yang bertugas adalah **${jo.driverName}** dengan unit **${jo.vehicleNumber}**.
Status pergerakan saat ini: **BELUM JALAN** (armada sedang proses antre muat di ${jo.origin}).`,
        entityRefs: [
          { type: 'job-order', id: jo.joNumber, label: jo.joNumber, status: 'ASSIGNED', statusColor: 'blue' },
        ],
        timestamp: new Date(),
      };
      responseMessages.push(msg);
      updatedState.conversationHistory.push({ role: 'assistant', text: msg.content! });
      return finalize(responseMessages);
    }

    // ------------------------------------------------------------------------
    // CUSTOMER ORDER QUERY (Scenario 01, Group A/F)
    // ------------------------------------------------------------------------
    if (semantic.intent === 'QUERY_ORDERS' && semantic.entity === 'Customer ABC') {
      const abcOrders = SIMULATED_SALES_ORDERS.filter(
        (s) => s.customerId === 'cust-abc' && s.operationalStatus === 'BELUM_JALAN'
      );

      updatedState.activeCustomerId = 'cust-abc';
      updatedState.activeCustomerName = 'Customer ABC';
      updatedState.lastSelectedOrders = abcOrders.map((o) => o.soNumber);
      updatedState.lastTopic = 'CUSTOMER_ORDERS';
      updatedState.activeJobOrderId = undefined;
      updatedState.activeSalesOrderId = undefined;
      updatedState.activeShipmentId = undefined;

      const understandingMsg: SandboxMessage = {
        id: makeId(),
        role: 'assistant',
        type: 'understanding',
        dataSource: 'SIMULATED',
        isExecuted: false,
        understanding: {
          customer: 'Customer ABC',
          object: 'Sales Order',
          condition: 'Belum Jalan (Pending Execution)',
          period: 'Semua order aktif',
        },
        timestamp: new Date(),
      };

      const resultMsg: SandboxMessage = {
        id: makeId(),
        role: 'assistant',
        type: 'result',
        dataSource: 'SIMULATED',
        isExecuted: false,
        results: {
          type: 'orders',
          count: abcOrders.length,
          summary: `Ditemukan ${abcOrders.length} order untuk Customer ABC yang belum berjalan.`,
          items: abcOrders.map((o) => ({
            id: o.soNumber,
            label: `${o.soNumber} — Tujuan ${o.destinationCity}`,
            status: 'Belum Jalan',
            statusColor: 'yellow' as const,
            meta: {
              Tanggal: o.orderDate,
              Volume: `${o.totalVolumeM3} m³`,
              Status: o.status,
            },
          })),
        },
        content: `Ditemukan **${abcOrders.length} order** untuk **Customer ABC** yang saat ini berstatus **Belum Jalan**:

1. **SO-2026-0041** (Tgl: 28 Sep 2026) — Rute Jakarta → Semarang (45.5 m³)
2. **SO-2026-0042** (Tgl: 02 Okt 2026) — Rute Jakarta → Surabaya (62.0 m³)

Apakah ingin melihat rincian order tertentu, atau order yang paling baru?`,
        entityRefs: abcOrders.map((o) => ({
          type: 'sales-order' as const,
          id: o.soNumber,
          label: o.soNumber,
          status: 'BELUM_JALAN',
          statusColor: 'yellow' as const,
        })),
        timestamp: new Date(),
      };

      responseMessages.push(understandingMsg, resultMsg);
      updatedState.conversationHistory.push({ role: 'assistant', text: resultMsg.content! });
      return finalize(responseMessages);
    }

    // ------------------------------------------------------------------------
    // EXPLICIT CODE LOOKUPS (JO, SO, SHP)
    // ------------------------------------------------------------------------
    if (semantic.intent === 'QUERY_JOB_ORDER') {
      const joNumber = semantic.entity;
      const jo =
        SIMULATED_JOB_ORDERS.find((j) => j.joNumber === joNumber) ||
        SIMULATED_WEEKLY_JOB_ORDERS.find((j) => j.joNumber === joNumber);

      updatedState.pendingClarification = false;
      updatedState.activeJobOrderId = joNumber;
      updatedState.lastTopic = 'JOB_ORDER';
      if (jo) {
        updatedState.activeCustomerName = jo.customerName;
        if (jo.salesOrderId) updatedState.activeSalesOrderId = jo.salesOrderId.toUpperCase();
        if (jo.driverName) updatedState.activeDriverName = jo.driverName;
      }

      let content = '';
      if (!jo) {
        content = `Job Order **${joNumber}** tidak ditemukan dalam data simulasi.`;
      } else if (semantic.condition === 'BELUM_JALAN') {
        content = `Job Order **${jo.joNumber}** (${jo.customerName}, rute ${jo.origin} → ${jo.destination}) saat ini berstatus **${jo.operationalStatus}** (${jo.status}).

Rincian Status:
- **Nomor JO:** **${jo.joNumber}**
- **Status Operasional:** **BELUM JALAN** (Menunggu alokasi supir / armada)
- **Supir:** ${jo.driverName || 'Belum Ditugaskan'}
- **Kendaraan:** ${jo.vehicleNumber || 'Wingbox'}
- **Terkait:** Sales Order \`${jo.salesOrderId?.toUpperCase() || 'SO-2026-0042'}\``;
      } else {
        content = `Informasi Job Order **${jo.joNumber}** (${jo.customerName} tujuan ${jo.destination}):\n\n- **Nomor JO:** **${jo.joNumber}**\n- **Rute:** ${jo.origin} → ${jo.destination}\n- **Armada:** ${jo.vehicleNumber || 'Wingbox'}\n- **Supir:** ${jo.driverName || 'Belum Ditugaskan'}\n- **Status Operasional:** ${jo.operationalStatus} (${jo.status})`;
      }

      const msg: SandboxMessage = {
        id: makeId(),
        role: 'assistant',
        type: 'text',
        dataSource: 'SIMULATED',
        isExecuted: false,
        semanticUnderstanding: semantic,
        content,
        entityRefs: jo
          ? [{ type: 'job-order', id: jo.joNumber, label: jo.joNumber, status: jo.status, statusColor: 'yellow' }]
          : [],
        timestamp: new Date(),
      };
      responseMessages.push(msg);
      updatedState.conversationHistory.push({ role: 'assistant', text: msg.content! });
      return finalize(responseMessages);
    }

    if (semantic.intent === 'QUERY_SALES_ORDER') {
      const soNumber = semantic.entity;
      const so = SIMULATED_SALES_ORDERS.find((s) => s.soNumber === soNumber);

      updatedState.pendingClarification = false;
      updatedState.activeSalesOrderId = soNumber;
      updatedState.lastTopic = 'SALES_ORDER';
      if (so) {
        updatedState.activeCustomerId = so.customerId;
        updatedState.activeCustomerName = so.customerName;
        if (so.jobOrderId) updatedState.activeJobOrderId = so.jobOrderId;
        if (so.shipmentId) updatedState.activeShipmentId = so.shipmentId;
      }

      let content = '';
      if (!so) {
        content = `Sales Order **${soNumber}** tidak ditemukan dalam data simulasi.`;
      } else if (semantic.condition === 'BELUM_JALAN') {
        content = `Sales Order **${so.soNumber}** (${so.customerName}, rute ${so.originCity} → ${so.destinationCity}) saat ini berstatus **${so.operationalStatus}** (${so.status}).

Rincian Status:
- **Nomor SO:** **${so.soNumber}**
- **Tanggal Order:** ${so.orderDate}
- **Volume / Muatan:** ${so.totalVolumeM3} m³ / ${so.totalWeightKg / 1000} ton
- **Status Operasional:** **BELUM JALAN** (Terkonfirmasi, Menunggu Penugasan Armada)
- **Terkait:** Job Order \`${so.jobOrderId || 'JO-2026-0812'}\` | Shipment \`${so.shipmentId || 'SHP-2026-0302'}\``;
      } else {
        content = `Informasi Sales Order **${so.soNumber}** (${so.customerName} tujuan ${so.destinationCity}):\n\n- **Nomor SO:** **${so.soNumber}**\n- **Tanggal Order:** ${so.orderDate}\n- **Rute:** ${so.originCity} → ${so.destinationCity}\n- **Volume / Muatan:** ${so.totalVolumeM3} m³ / ${so.totalWeightKg / 1000} ton\n- **Status Operasional:** ${so.operationalStatus} (${so.status})`;
      }

      const msg: SandboxMessage = {
        id: makeId(),
        role: 'assistant',
        type: 'text',
        dataSource: 'SIMULATED',
        isExecuted: false,
        semanticUnderstanding: semantic,
        content,
        entityRefs: so
          ? [{ type: 'sales-order', id: so.soNumber, label: so.soNumber, status: so.status, statusColor: 'blue' }]
          : [],
        timestamp: new Date(),
      };
      responseMessages.push(msg);
      updatedState.conversationHistory.push({ role: 'assistant', text: msg.content! });
      return finalize(responseMessages);
    }

    if (semantic.intent === 'QUERY_SHIPMENT') {
      const shpNumber = semantic.entity;
      const shp = SIMULATED_SHIPMENTS.find((s) => s.shipmentNumber === shpNumber);

      updatedState.pendingClarification = false;
      updatedState.activeShipmentId = shpNumber;
      updatedState.lastTopic = 'SHIPMENT';
      if (shp) {
        updatedState.activeCustomerName = shp.customerName;
        if (shp.salesOrderId) updatedState.activeSalesOrderId = shp.salesOrderId.toUpperCase();
      }

      let content = '';
      if (!shp) {
        content = `Shipment **${shpNumber}** tidak ditemukan dalam data simulasi.`;
      } else if (semantic.condition === 'BELUM_JALAN' || semantic.condition === 'BELUM_BERANGKAT') {
        content = `Shipment **${shp.shipmentNumber}** (${shp.customerName}, rute ${shp.origin} → ${shp.destination}) saat ini berstatus **${shp.departureStatus}** (${shp.status}).

Rincian Status:
- **Nomor Shipment:** **${shp.shipmentNumber}**
- **Kapal / Armada:** ${shp.carrierName}
- **Status Keberangkatan:** **BELUM BERANGKAT**
- **Jadwal (ETD / ETA):** ${shp.etd} / ${shp.eta}`;
      } else {
        content = `Informasi Shipment **${shp.shipmentNumber}** (${shp.customerName} tujuan ${shp.destination}):\n\n- **Nomor Shipment:** **${shp.shipmentNumber}**\n- **Rute:** ${shp.origin} → ${shp.destination}\n- **Kapal / Armada:** ${shp.carrierName}\n- **Status Keberangkatan:** ${shp.departureStatus} (${shp.status})\n- **Jadwal (ETD / ETA):** ${shp.etd} / ${shp.eta}`;
      }

      const msg: SandboxMessage = {
        id: makeId(),
        role: 'assistant',
        type: 'text',
        dataSource: 'SIMULATED',
        isExecuted: false,
        semanticUnderstanding: semantic,
        content,
        entityRefs: shp
          ? [{ type: 'shipment', id: shp.shipmentNumber, label: shp.shipmentNumber, status: shp.status, statusColor: 'blue' }]
          : [],
        timestamp: new Date(),
      };
      responseMessages.push(msg);
      updatedState.conversationHistory.push({ role: 'assistant', text: msg.content! });
      return finalize(responseMessages);
    }

    // ------------------------------------------------------------------------
    // GENERIC FALLBACK FOR OTHER QUERIES (NO HALLUCINATIONS)
    // ------------------------------------------------------------------------
    const fallbackMsg: SandboxMessage = {
      id: makeId(),
      role: 'assistant',
      type: 'text',
      dataSource: 'SIMULATED',
      isExecuted: false,
      content: `Permintaan Anda: *"${raw}"* belum dapat diidentifikasi secara spesifik.

Mohon berikan informasi tambahan seperti nomor Job Order (JO), Sales Order (SO), nomor Shipment, atau nama Customer agar Copilot dapat membantu Anda dengan tepat.`,
      timestamp: new Date(),
    };
    responseMessages.push(fallbackMsg);
    updatedState.conversationHistory.push({ role: 'assistant', text: fallbackMsg.content! });
    return finalize(responseMessages);
  }
}
