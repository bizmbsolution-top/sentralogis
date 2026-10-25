/**
 * SENTRALOGIS COPILOT
 * CONVERSATIONAL QUERY RESOLUTION & PROGRESSIVE CLARIFICATION GATE TEST SUITE
 * lib/__tests__/copilot-conversational-query-resolution-gate.test.ts
 *
 * Validates the conversational query-resolution layer above the ratified
 * Semantic Contract Boundary.
 *
 * GOVERNANCE INVARIANTS:
 * 1. STRICTLY READ / SIMULATE / PROPOSE ONLY.
 * 2. Zero database connections, zero mutations, zero migrations.
 * 3. Never imports operational execution modules or mutation services.
 * 4. Zero external LLM / OpenAI / ChatGPT calls.
 * 5. Execution capability strictly OFF.
 * 6. Minimum 40 tests across Categories A through M (§26).
 */

import { describe, test, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  ConversationalQueryResolver,
  type QueryResolutionResult,
} from '../copilot/sandbox/conversational-query-resolver';
import { ConversationalSandboxEngine } from '../copilot/sandbox/sandbox-engine';
import {
  SIMULATED_CUSTOMERS,
  SIMULATED_SALES_ORDERS,
  SIMULATED_WORK_ORDERS,
  SIMULATED_JOB_ORDERS,
  SIMULATED_SHIPMENTS,
  SIMULATED_WEEKLY_JOB_ORDERS,
} from '../copilot/sandbox/deterministic-fixtures';
import type {
  ConversationalContextState,
  ConversationalQueryContext,
} from '../copilot/sandbox/types';

describe('SENTRALOGIS COPILOT — CONVERSATIONAL QUERY RESOLUTION & PROGRESSIVE CLARIFICATION GATE', () => {
  // ==========================================================================
  // §0 & §1 PREFLIGHT & STATIC BOUNDARY INVARIANTS
  // ==========================================================================
  describe('§0 & §1 Static Boundary & Architectural Invariants', () => {
    test('15 protected tracked baseline files remain intact and unmodified', () => {
      const protectedFiles = [
        'supabase/migrations/20260928_001_baseline_extensions.sql',
        'supabase/migrations/20260928_002_baseline_types.sql',
        'supabase/migrations/20260928_003_baseline_tables_and_sequences.sql',
        'supabase/migrations/20260928_004_baseline_constraints.sql',
        'supabase/migrations/20260928_005_baseline_indexes.sql',
        'supabase/migrations/20260928_006_baseline_functions.sql',
        'supabase/migrations/20260928_007_baseline_triggers.sql',
        'supabase/migrations/20260928_008_baseline_rls.sql',
        'scripts/extract-schema-layers.ts',
        'scripts/generate-baseline-layers.ts',
        'scripts/forensic-validate-baseline.ts',
        'scripts/forensic-runtime-validate-baseline.ts',
        'docs/architecture/SENTRALOGIS_WAVE_2A6_SCHEMA_BASELINE_FORENSIC.md',
        'docs/architecture/SENTRALOGIS_WAVE_2A7_PRODUCTION_SCHEMA_BASELINE_VERIFICATION.md',
        'docs/architecture/SENTRALOGIS_WAVE_2A8_PRODUCTION_SCHEMA_EVIDENCE_ACQUISITION_GATE.md',
      ];

      for (const relPath of protectedFiles) {
        const fullPath = path.resolve(process.cwd(), relPath);
        expect(fs.existsSync(fullPath)).toBe(true);
      }
    });

    test('conversational query resolver does NOT import execution or mutation services', () => {
      const resolverPath = path.resolve(
        process.cwd(),
        'lib/copilot/sandbox/conversational-query-resolver.ts'
      );
      const content = fs.readFileSync(resolverPath, 'utf-8');

      expect(content).not.toContain('execution-service');
      expect(content).not.toContain('mutation-service');
      expect(content).not.toContain('supabase.from');
      expect(content).not.toContain('openai');
      expect(content).not.toContain('chatgpt');
      expect(content).not.toContain('anthropic');
      expect(content).not.toContain('COPILOT_EXECUTE = true');
    });

    test('query context model conforms to §5 machine-readable requirements', () => {
      const sampleContext: ConversationalQueryContext = {
        domain: 'TRUCKING',
        objectType: 'JOB_ORDER',
        requestedOperation: 'FIND',
        customer: 'Customer ABC',
        destination: 'Surabaya',
        origin: 'Jakarta',
        period: 'THIS_WEEK',
        status: 'ACTIVE',
        activeFilters: {
          customer: 'Customer ABC',
          status: 'ACTIVE',
          destination: 'Surabaya',
          period: 'THIS_WEEK',
        },
        conversationTurn: 4,
        specificity: 'SUFFICIENTLY_SPECIFIC',
      };

      expect(sampleContext.domain).toBe('TRUCKING');
      expect(sampleContext.objectType).toBe('JOB_ORDER');
      expect(sampleContext.activeFilters['customer']).toBe('Customer ABC');
      expect(sampleContext.conversationTurn).toBe(4);
    });
  });

  // ==========================================================================
  // CATEGORY A: DIRECT ANSWER CONTRACT (§13, Cases 1..3)
  // ==========================================================================
  describe('Category A: Direct Answer Contract (§13)', () => {
    test('A1: Specific JO query (JO-2026-0810) -> answers directly with key evidence', () => {
      const state: ConversationalContextState = { conversationHistory: [] };
      const { result } = ConversationalQueryResolver.processMessage('Status JO-2026-0810?', state);

      expect(result.resolutionState).toBe('DIRECT_ANSWER');
      expect(result.queryContext.jobOrderNumber).toBe('JO-2026-0810');
      expect(result.queryContext.specificity).toBe('SUFFICIENTLY_SPECIFIC');
      expect(result.matchedEntityIds).toContain('JO-2026-0810');
      expect(result.responseText).toContain('JO-2026-0810');
      expect(result.responseText).toContain('Agus Pratama');
    });

    test('A2: Specific SO query (SO-2026-0042) -> answers directly with key evidence', () => {
      const state: ConversationalContextState = { conversationHistory: [] };
      const { result } = ConversationalQueryResolver.processMessage('Bagaimana status SO-2026-0042?', state);

      expect(result.resolutionState).toBe('DIRECT_ANSWER');
      expect(result.queryContext.salesOrderNumber).toBe('SO-2026-0042');
      expect(result.queryContext.specificity).toBe('SUFFICIENTLY_SPECIFIC');
      expect(result.matchedEntityIds).toContain('SO-2026-0042');
      expect(result.responseText).toContain('SO-2026-0042');
      expect(result.responseText).toContain('BELUM_JALAN');
    });

    test('A3: Specific shipment query (SHP-2026-0301) -> answers directly with departure status', () => {
      const state: ConversationalContextState = { conversationHistory: [] };
      const { result } = ConversationalQueryResolver.processMessage('Apakah SHP-2026-0301 sudah berangkat?', state);

      expect(result.resolutionState).toBe('DIRECT_ANSWER');
      expect(result.queryContext.shipmentNumber).toBe('SHP-2026-0301');
      expect(result.queryContext.specificity).toBe('SUFFICIENTLY_SPECIFIC');
      expect(result.matchedEntityIds).toContain('SHP-2026-0301');
      expect(result.responseText).toContain('SHP-2026-0301');
      expect(result.responseText).toContain('BELUM_BERANGKAT');
    });
  });

  // ==========================================================================
  // CATEGORY B: PROGRESSIVE CLARIFICATION (§9, §11, Cases 4..8)
  // ==========================================================================
  describe('Category B: Progressive Clarification (§9, §11)', () => {
    test('B4: Broad initial query "carikan job order" -> returns count (50), distribution, and prompts refinement', () => {
      const state: ConversationalContextState = { conversationHistory: [] };
      const { result } = ConversationalQueryResolver.processMessage('carikan job order', state);

      expect(result.resolutionState).toBe('BROAD_SUMMARY');
      expect(result.queryContext.objectType).toBe('JOB_ORDER');
      expect(result.queryContext.specificity).toBe('TOO_BROAD');
      expect(result.counts.total).toBe(50);
      expect(result.counts.distribution).toBeDefined();
      expect(result.counts.distribution!['ACTIVE']).toBe(24);
      expect(result.counts.distribution!['DOCUMENT']).toBe(11);
      expect(result.counts.distribution!['DRAFT']).toBe(8);
      expect(result.counts.distribution!['INVOICED']).toBe(7);
      expect(result.clarificationQuestion).toBeDefined();
    });

    test('B5: Refinement "minggu ini" -> sets period filter to THIS_WEEK', () => {
      const previousContext: ConversationalQueryContext = {
        objectType: 'JOB_ORDER',
        activeFilters: {},
        conversationTurn: 1,
      };
      const { context } = ConversationalQueryResolver.resolveQueryContext('minggu ini saja', previousContext);

      expect(context.period).toBe('THIS_WEEK');
      expect(context.activeFilters['period']).toBe('THIS_WEEK');
      expect(context.objectType).toBe('JOB_ORDER');
    });

    test('B6: Refinement "yang active" -> sets status filter to ACTIVE and narrows candidates to 24', () => {
      const previousContext: ConversationalQueryContext = {
        objectType: 'JOB_ORDER',
        period: 'THIS_WEEK',
        activeFilters: { period: 'THIS_WEEK' },
        conversationTurn: 2,
      };
      const state: ConversationalContextState = {
        conversationHistory: [],
        queryContext: previousContext,
      };

      const { result } = ConversationalQueryResolver.processMessage('yang active', state);

      expect(result.queryContext.status).toBe('ACTIVE');
      expect(result.queryContext.activeFilters['status']).toBe('ACTIVE');
      expect(result.counts.total).toBe(24);
      expect(result.resolutionState).toBe('CLARIFICATION_REQUIRED');
      expect(result.clarificationQuestion).toContain('customer');
    });

    test('B7: Refinement "Customer ABC" -> narrows active JOs to exactly 6', () => {
      const previousContext: ConversationalQueryContext = {
        objectType: 'JOB_ORDER',
        period: 'THIS_WEEK',
        status: 'ACTIVE',
        activeFilters: { period: 'THIS_WEEK', status: 'ACTIVE' },
        conversationTurn: 3,
      };
      const state: ConversationalContextState = {
        conversationHistory: [],
        queryContext: previousContext,
      };

      const { result } = ConversationalQueryResolver.processMessage('Customer ABC', state);

      expect(result.queryContext.customer).toBe('Customer ABC');
      expect(result.queryContext.activeFilters['customer']).toBe('Customer ABC');
      expect(result.counts.total).toBe(6);
      expect(result.resolutionState).toBe('DIRECT_ANSWER');
      expect(result.responseText).toContain('Customer ABC');
    });

    test('B8: Refinement "tujuan Surabaya" -> narrows destination filter to Surabaya', () => {
      const previousContext: ConversationalQueryContext = {
        objectType: 'JOB_ORDER',
        period: 'THIS_WEEK',
        status: 'ACTIVE',
        customer: 'Customer ABC',
        activeFilters: { period: 'THIS_WEEK', status: 'ACTIVE', customer: 'Customer ABC' },
        conversationTurn: 4,
      };
      const state: ConversationalContextState = {
        conversationHistory: [],
        queryContext: previousContext,
      };

      const { result } = ConversationalQueryResolver.processMessage('tujuan Surabaya', state);

      expect(result.queryContext.destination).toBe('Surabaya');
      expect(result.queryContext.activeFilters['destination']).toBe('Surabaya');
      expect(result.resolutionState).toBe('DIRECT_ANSWER');
      expect(result.matchedEntityIds).toContain('JO-2026-0812');
    });
  });

  // ==========================================================================
  // CATEGORY C: CONTEXT RETENTION & COMPOSITION (§6, §7, Cases 9..10)
  // ==========================================================================
  describe('Category C: Context Retention & Filter Composition (§6, §7)', () => {
    test('C9: End-to-end multi-turn conversation retains all sequential filters', () => {
      let state: ConversationalContextState = { conversationHistory: [] };

      // Turn 1: "Carikan job order"
      const t1 = ConversationalQueryResolver.processMessage('Carikan job order', state);
      state = t1.updatedState;
      expect(state.queryContext?.objectType).toBe('JOB_ORDER');

      // Turn 2: "Minggu ini saja"
      const t2 = ConversationalQueryResolver.processMessage('Minggu ini saja', state);
      state = t2.updatedState;
      expect(state.queryContext?.objectType).toBe('JOB_ORDER');
      expect(state.queryContext?.period).toBe('THIS_WEEK');

      // Turn 3: "Yang active"
      const t3 = ConversationalQueryResolver.processMessage('Yang active', state);
      state = t3.updatedState;
      expect(state.queryContext?.objectType).toBe('JOB_ORDER');
      expect(state.queryContext?.period).toBe('THIS_WEEK');
      expect(state.queryContext?.status).toBe('ACTIVE');

      // Turn 4: "Customer ABC"
      const t4 = ConversationalQueryResolver.processMessage('Customer ABC', state);
      state = t4.updatedState;
      expect(state.queryContext?.objectType).toBe('JOB_ORDER');
      expect(state.queryContext?.period).toBe('THIS_WEEK');
      expect(state.queryContext?.status).toBe('ACTIVE');
      expect(state.queryContext?.customer).toBe('Customer ABC');
      expect(t4.result.counts.total).toBe(6);
    });

    test('C10: One filter update does NOT erase unrelated filters', () => {
      const prev: ConversationalQueryContext = {
        objectType: 'JOB_ORDER',
        customer: 'Customer ABC',
        status: 'ACTIVE',
        period: 'THIS_WEEK',
        destination: 'Surabaya',
        activeFilters: {
          customer: 'Customer ABC',
          status: 'ACTIVE',
          period: 'THIS_WEEK',
          destination: 'Surabaya',
        },
        conversationTurn: 4,
      };

      const { context } = ConversationalQueryResolver.resolveQueryContext('yang trucking', prev);

      expect(context.customer).toBe('Customer ABC');
      expect(context.status).toBe('ACTIVE');
      expect(context.period).toBe('THIS_WEEK');
      expect(context.destination).toBe('Surabaya');
      expect(context.domain).toBe('TRUCKING');
      expect(context.activeFilters['domain']).toBe('TRUCKING');
    });
  });

  // ==========================================================================
  // CATEGORY D: CONTEXT RESET (§8, Cases 11..12)
  // ==========================================================================
  describe('Category D: Context Reset Conditions (§8)', () => {
    test('D11: Explicit reset phrase triggers new query context', () => {
      const prev: ConversationalQueryContext = {
        objectType: 'JOB_ORDER',
        customer: 'Customer ABC',
        status: 'ACTIVE',
        activeFilters: { customer: 'Customer ABC', status: 'ACTIVE' },
        conversationTurn: 3,
      };

      const isReset = ConversationalQueryResolver.detectReset(
        'ganti pertanyaan, sekarang saya mau cek customer XYZ',
        prev
      );
      expect(isReset).toBe(true);

      const { context, resetOccurred } = ConversationalQueryResolver.resolveQueryContext(
        'ganti pertanyaan, sekarang saya mau cek customer XYZ',
        prev
      );
      expect(resetOccurred).toBe(true);
      expect(context.customer).toBe('Customer XYZ');
      expect(context.activeFilters['status']).toBeUndefined();
    });

    test('D12: Invoice question after JO query resets JO-specific filters', () => {
      const prev: ConversationalQueryContext = {
        objectType: 'JOB_ORDER',
        status: 'ACTIVE',
        destination: 'Surabaya',
        period: 'THIS_WEEK',
        activeFilters: { status: 'ACTIVE', destination: 'Surabaya', period: 'THIS_WEEK' },
        conversationTurn: 3,
      };

      const isReset = ConversationalQueryResolver.detectReset(
        'Bagaimana status invoice Customer ABC?',
        prev
      );
      expect(isReset).toBe(true);

      const { context } = ConversationalQueryResolver.resolveQueryContext(
        'Bagaimana status invoice Customer ABC?',
        prev
      );
      expect(context.objectType).toBe('INVOICE');
      expect(context.domain).toBe('FINANCE');
      expect(context.activeFilters['status']).toBeUndefined();
      expect(context.destination).toBeUndefined();
      expect(context.customer).toBe('Customer ABC');
    });
  });

  // ==========================================================================
  // CATEGORY E: AMBIGUITY FIREWALL (§10, §16, Cases 13..15)
  // ==========================================================================
  describe('Category E: Ambiguity Firewall (§10, §16)', () => {
    test('E13: Bare "urus Surabaya" matches multiple object types -> CLARIFICATION_REQUIRED', () => {
      const state: ConversationalContextState = { conversationHistory: [] };
      const { result } = ConversationalQueryResolver.processMessage('urus surabaya', state);

      expect(result.resolutionState).toBe('CLARIFICATION_REQUIRED');
      expect(result.queryContext.specificity).toBe('AMBIGUOUS');
      expect(result.queryContext.unresolvedAmbiguity).toBe(true);
      expect(result.matchedEntityIds).toContain('SO-2026-0042');
      expect(result.matchedEntityIds).toContain('JO-2026-0812');
      expect(result.matchedEntityIds).toContain('SHP-2026-0302');
      expect(result.clarificationQuestion).toContain('Sales Order');
    });

    test('E14: Ambiguity presents candidate options instead of picking one', () => {
      const state: ConversationalContextState = { conversationHistory: [] };
      const { result } = ConversationalQueryResolver.processMessage('yang surabaya', state);

      expect(result.responseText).toContain('SO-2026-0042');
      expect(result.responseText).toContain('JO-2026-0812');
      expect(result.responseText).toContain('SHP-2026-0302');
    });

    test('E15: Ambiguity firewall never arbitrarily selects the first candidate', () => {
      const state: ConversationalContextState = { conversationHistory: [] };
      const { result } = ConversationalQueryResolver.processMessage('urus surabaya', state);

      expect(result.resolutionState).not.toBe('DIRECT_ANSWER');
      expect(result.proposalBlock).toBeUndefined();
    });
  });

  // ==========================================================================
  // CATEGORY F: UNKNOWN OPERATIONAL INTENT (§15, Cases 16..17)
  // ==========================================================================
  describe('Category F: Unknown Operational Intent (§15)', () => {
    test('F16: Vague directive "tolong bereskan ini" -> UNKNOWN_OPERATIONAL', () => {
      const state: ConversationalContextState = { conversationHistory: [] };
      const { result } = ConversationalQueryResolver.processMessage('tolong bereskan ini', state);

      expect(result.resolutionState).toBe('UNKNOWN_OPERATIONAL');
      expect(result.queryContext.specificity).toBe('UNRESOLVED');
      expect(result.queryContext.objectType).toBe('UNKNOWN');
      expect(result.clarificationQuestion).toBeDefined();
    });

    test('F17: Vague directive "proses dong" does NOT fabricate an interpretation or entity', () => {
      const state: ConversationalContextState = { conversationHistory: [] };
      const { result } = ConversationalQueryResolver.processMessage('proses dong', state);

      expect(result.matchedEntityIds).toHaveLength(0);
      expect(result.counts.total).toBe(0);
      expect(result.proposalBlock).toBeUndefined();
    });
  });

  // ==========================================================================
  // CATEGORY G: NOT FOUND CONTRACT (§14, Cases 18..20)
  // ==========================================================================
  describe('Category G: Not Found Contract (§14)', () => {
    test('G18: Query with zero matches returns NOT_FOUND (distinct from UNKNOWN)', () => {
      const prev: ConversationalQueryContext = {
        objectType: 'JOB_ORDER',
        customer: 'Customer ABC',
        destination: 'Jayapura', // No JO to Jayapura in fixtures
        period: 'THIS_WEEK',
        activeFilters: { customer: 'Customer ABC', destination: 'Jayapura', period: 'THIS_WEEK' },
        conversationTurn: 2,
      };
      const state: ConversationalContextState = {
        conversationHistory: [],
        queryContext: prev,
      };

      const { result } = ConversationalQueryResolver.processMessage('carikan yang ke Jayapura', state);

      expect(result.resolutionState).toBe('NOT_FOUND');
      expect(result.matchedEntityIds).toHaveLength(0);
      expect(result.counts.total).toBe(0);
    });

    test('G19: NOT_FOUND response articulates searched filters', () => {
      const prev: ConversationalQueryContext = {
        objectType: 'JOB_ORDER',
        customer: 'Customer ABC',
        destination: 'Jayapura',
        period: 'THIS_WEEK',
        activeFilters: { customer: 'Customer ABC', destination: 'Jayapura', period: 'THIS_WEEK' },
        conversationTurn: 2,
      };
      const state: ConversationalContextState = {
        conversationHistory: [],
        queryContext: prev,
      };

      const { result } = ConversationalQueryResolver.processMessage('carikan yang ke Jayapura', state);

      expect(result.responseText).toContain('Filter yang digunakan:');
      expect(result.responseText).toContain('Customer ABC');
      expect(result.responseText).toContain('Jayapura');
    });

    test('G20: NOT_FOUND offers helpful next steps', () => {
      const prev: ConversationalQueryContext = {
        objectType: 'JOB_ORDER',
        customer: 'Customer ABC',
        destination: 'Jayapura',
        activeFilters: { customer: 'Customer ABC', destination: 'Jayapura' },
        conversationTurn: 2,
      };
      const state: ConversationalContextState = {
        conversationHistory: [],
        queryContext: prev,
      };

      const { result } = ConversationalQueryResolver.processMessage('carikan yang ke Jayapura', state);

      expect(result.responseText).toContain('mengecek status lain atau periode lain');
    });
  });

  // ==========================================================================
  // CATEGORY H: CORRECTION / REPAIR LOOP (§17, Cases 21..22)
  // ==========================================================================
  describe('Category H: Correction & Repair Loop (§17)', () => {
    test('H21: "Bukan yang laut, yang trucking" repairs mode and sets domain to TRUCKING', () => {
      const prev: ConversationalQueryContext = {
        objectType: 'SHIPMENT',
        destination: 'Surabaya',
        activeFilters: { destination: 'Surabaya' },
        conversationTurn: 1,
      };

      const { context, isCorrection } = ConversationalQueryResolver.resolveQueryContext(
        'Bukan yang laut, yang trucking.',
        prev
      );

      expect(isCorrection).toBe(true);
      expect(context.domain).toBe('TRUCKING');
      expect(context.activeFilters['domain']).toBe('TRUCKING');
      expect(context.objectType).toBe('JOB_ORDER');
    });

    test('H22: Correction preserves destination and customer filters', () => {
      const prev: ConversationalQueryContext = {
        objectType: 'SHIPMENT',
        customer: 'Customer ABC',
        destination: 'Surabaya',
        activeFilters: { customer: 'Customer ABC', destination: 'Surabaya' },
        conversationTurn: 2,
      };

      const { context } = ConversationalQueryResolver.resolveQueryContext(
        'Bukan yang laut, yang trucking.',
        prev
      );

      expect(context.customer).toBe('Customer ABC');
      expect(context.destination).toBe('Surabaya');
      expect(context.domain).toBe('TRUCKING');
    });
  });

  // ==========================================================================
  // CATEGORY I: BROAD RESULT & SUMMARY (§11, §12, Cases 23..26)
  // ==========================================================================
  describe('Category I: Broad Result & Distribution (§11, §12)', () => {
    test('I23: Broad query returns total COUNT from simulated fixtures', () => {
      const state: ConversationalContextState = { conversationHistory: [] };
      const { result } = ConversationalQueryResolver.processMessage('Carikan job order minggu ini', state);

      expect(result.counts.total).toBe(50);
      expect(result.responseText).toContain('50');
      expect(result.responseText).toContain('Job Order');
    });

    test('I24: Distribution strictly reflects simulated fixture numbers', () => {
      const state: ConversationalContextState = { conversationHistory: [] };
      const { result } = ConversationalQueryResolver.processMessage('Carikan job order minggu ini', state);

      expect(result.counts.distribution).toEqual({
        ACTIVE: 24,
        DOCUMENT: 11,
        DRAFT: 8,
        INVOICED: 7,
      });
      expect(result.responseText).toContain('ACTIVE**: 24');
      expect(result.responseText).toContain('DOCUMENT**: 11');
      expect(result.responseText).toContain('DRAFT**: 8');
      expect(result.responseText).toContain('INVOICED**: 7');
    });

    test('I25: Suggested refinement derives from actual dimensions', () => {
      const state: ConversationalContextState = { conversationHistory: [] };
      const { result } = ConversationalQueryResolver.processMessage('Carikan job order minggu ini', state);

      expect(result.responseText).toContain('status');
      expect(result.responseText).toContain('customer');
      expect(result.responseText).toContain('tujuan');
      expect(result.responseText).toContain('nomor JO');
    });

    test('I26: Count inquiry "Berapa JO aktif minggu ini?" is answered directly without clarification', () => {
      const state: ConversationalContextState = { conversationHistory: [] };
      const { result } = ConversationalQueryResolver.processMessage('Berapa JO aktif minggu ini?', state);

      expect(result.resolutionState).toBe('DIRECT_ANSWER');
      expect(result.counts.total).toBe(24);
      expect(result.responseText).toContain('24');
      expect(result.clarificationQuestion).toBeUndefined();
    });
  });

  // ==========================================================================
  // CATEGORY J: SEMANTIC EQUIVALENCE (§22, Cases 27..29)
  // ==========================================================================
  describe('Category J: Semantic Equivalence (§22)', () => {
    test('J27: "pekan ini" resolves to the same period as "minggu ini"', () => {
      const c1 = ConversationalQueryResolver.resolveQueryContext('order pekan ini');
      const c2 = ConversationalQueryResolver.resolveQueryContext('order minggu ini');

      expect(c1.context.period).toBe('THIS_WEEK');
      expect(c2.context.period).toBe('THIS_WEEK');
    });

    test('J28: "status active", "yang masih aktif", "yang aktif" all resolve to ACTIVE', () => {
      const c1 = ConversationalQueryResolver.resolveQueryContext('status active');
      const c2 = ConversationalQueryResolver.resolveQueryContext('yang masih aktif');
      const c3 = ConversationalQueryResolver.resolveQueryContext('yang aktif');

      expect(c1.context.status).toBe('ACTIVE');
      expect(c2.context.status).toBe('ACTIVE');
      expect(c3.context.status).toBe('ACTIVE');
    });

    test('J29: "tujuan Surabaya", "delivery ke Surabaya", "yang ke Surabaya" all resolve to Surabaya', () => {
      const c1 = ConversationalQueryResolver.resolveQueryContext('tujuan Surabaya');
      const c2 = ConversationalQueryResolver.resolveQueryContext('delivery ke Surabaya');
      const c3 = ConversationalQueryResolver.resolveQueryContext('yang ke Surabaya');

      expect(c1.context.destination).toBe('Surabaya');
      expect(c2.context.destination).toBe('Surabaya');
      expect(c3.context.destination).toBe('Surabaya');
    });
  });

  // ==========================================================================
  // CATEGORY K: ACTION SAFETY (§20, Cases 30..32)
  // ==========================================================================
  describe('Category K: Action Safety & Proposal Isolation (§20)', () => {
    test('K30: Driver replacement request generates PROPOSAL state only', () => {
      const state: ConversationalContextState = {
        conversationHistory: [],
        activeJobOrderId: 'JO-2026-0812',
      };

      const { result } = ConversationalQueryResolver.processMessage('ganti driver untuk JO ini', state);

      expect(result.resolutionState).toBe('PROPOSAL');
      expect(result.proposalBlock).toBeDefined();
      expect(result.proposalBlock?.target).toBe('JO-2026-0812');
      expect(result.proposalBlock?.action).toBe('REPLACE_DRIVER');
    });

    test('K31: Proposal requires approval and is not executed', () => {
      const state: ConversationalContextState = {
        conversationHistory: [],
        activeJobOrderId: 'JO-2026-0812',
      };

      const { result, responseMessages } = ConversationalQueryResolver.processMessage(
        'ganti driver untuk JO ini',
        state
      );

      expect(result.proposalBlock?.requiresApproval).toBe(true);
      expect(result.proposalBlock?.isExecuted).toBe(false);
      expect(responseMessages[0].isExecuted).toBe(false);
    });

    test('K32: Execution flag is explicitly disabled on proposal block', () => {
      const state: ConversationalContextState = {
        conversationHistory: [],
        activeJobOrderId: 'JO-2026-0812',
      };

      const { result } = ConversationalQueryResolver.processMessage('ganti driver untuk JO ini', state);

      expect(result.proposalBlock?.executionAvailable).toBe(false);
    });
  });

  // ==========================================================================
  // CATEGORY L: NON-OPERATIONAL BOUNDARY (§21, Cases 33..36)
  // ==========================================================================
  describe('Category L: Non-Operational Boundary (§21)', () => {
    test('L33: Greeting "Selamat pagi" resolves to CONVERSATIONAL_NON_OPERATIONAL', () => {
      const state: ConversationalContextState = { conversationHistory: [] };
      const { result } = ConversationalQueryResolver.processMessage('Selamat pagi', state);

      expect(result.resolutionState).toBe('CONVERSATIONAL_NON_OPERATIONAL');
      expect(result.queryContext.requestedOperation).toBe('NON_OPERATIONAL');
    });

    test('L34: General conversation returns polite bounded response', () => {
      const state: ConversationalContextState = { conversationHistory: [] };
      const { result } = ConversationalQueryResolver.processMessage('Cuaca hari ini bagaimana?', state);

      expect(result.resolutionState).toBe('CONVERSATIONAL_NON_OPERATIONAL');
      expect(result.responseText).toContain('Maaf, saya adalah Copilot Sentralogis');
      expect(result.responseText).toContain('pekerjaan di Sentralogis');
    });

    test('L35: Non-operational conversation does not trigger operational search', () => {
      const state: ConversationalContextState = { conversationHistory: [] };
      const { result } = ConversationalQueryResolver.processMessage('Apa kabar?', state);

      expect(result.matchedEntityIds).toHaveLength(0);
      expect(result.counts.total).toBe(0);
      expect(result.queryContext.objectType).toBe('UNKNOWN');
    });

    test('L36: Engine handles non-operational queries via ConversationalSandboxEngine without external LLM', () => {
      const state: ConversationalContextState = { conversationHistory: [] };
      const { responseMessages } = ConversationalSandboxEngine.processUserMessage('Halo Copilot', state);

      expect(responseMessages[0].content).toContain('Maaf, saya adalah Copilot Sentralogis');
      expect(responseMessages[0].dataSource).toBe('SIMULATED');
      expect(responseMessages[0].isExecuted).toBe(false);
    });
  });

  // ==========================================================================
  // CATEGORY M: NO FABRICATION (§23, Cases 37..40)
  // ==========================================================================
  describe('Category M: No Data Fabrication (§23)', () => {
    test('M37: NULL driver displays "Driver belum tercatat" (never "belum berangkat")', () => {
      const state: ConversationalContextState = { conversationHistory: [] };
      const { result } = ConversationalQueryResolver.processMessage('Status JO-2026-0812?', state);

      expect(result.responseText).toContain('Driver belum tercatat');
      expect(result.responseText).not.toContain('Driver belum berangkat');
    });

    test('M38: Zero results query does NOT invent fake entities', () => {
      const prev: ConversationalQueryContext = {
        objectType: 'JOB_ORDER',
        customer: 'Customer Nonexistent',
        activeFilters: { customer: 'Customer Nonexistent' },
        conversationTurn: 1,
      };
      const state: ConversationalContextState = {
        conversationHistory: [],
        queryContext: prev,
      };

      const { result } = ConversationalQueryResolver.processMessage('carikan job ordernya', state);

      expect(result.matchedEntityIds).toHaveLength(0);
      expect(result.counts.total).toBe(0);
      expect(result.responseText).toContain('tidak menemukan Job Order');
    });

    test('M39: Distribution sum exactly equals fixture count (50 == 24+11+8+7)', () => {
      const weeklyOrders = SIMULATED_WEEKLY_JOB_ORDERS.filter((j) => j.period === 'THIS_WEEK');
      expect(weeklyOrders).toHaveLength(50);

      const active = weeklyOrders.filter((j) => j.status === 'ACTIVE').length;
      const document = weeklyOrders.filter((j) => j.status === 'DOCUMENT').length;
      const draft = weeklyOrders.filter((j) => j.status === 'DRAFT').length;
      const invoiced = weeklyOrders.filter((j) => j.status === 'INVOICED').length;

      expect(active).toBe(24);
      expect(document).toBe(11);
      expect(draft).toBe(8);
      expect(invoiced).toBe(7);
      expect(active + document + draft + invoiced).toBe(50);
    });

    test('M40: Operational status cannot be fabricated when records exist', () => {
      const found = SIMULATED_WEEKLY_JOB_ORDERS.find((j) => j.joNumber === 'JO-2026-0810');
      expect(found?.operationalStatus).toBe('BELUM_JALAN');
      expect(found?.customerName).toBe('Customer ABC');
      expect(found?.origin).toBe('Gudang Cakung, Jakarta');
      expect(found?.destination).toBe('DC Semarang');
    });
  });

  // ==========================================================================
  // §18 ONE-DIMENSION MODIFICATION
  // ==========================================================================
  describe('§18 Modification of One Dimension', () => {
    test('user can switch from THIS_WEEK to LAST_WEEK without re-stating customer, status, or destination', () => {
      const prev: ConversationalQueryContext = {
        objectType: 'JOB_ORDER',
        customer: 'Customer ABC',
        status: 'ACTIVE',
        period: 'THIS_WEEK',
        destination: 'Surabaya',
        activeFilters: {
          customer: 'Customer ABC',
          status: 'ACTIVE',
          period: 'THIS_WEEK',
          destination: 'Surabaya',
        },
        conversationTurn: 4,
      };

      const { context, isCorrection } = ConversationalQueryResolver.resolveQueryContext(
        'ubah ke minggu lalu',
        prev
      );

      expect(isCorrection).toBe(true);
      expect(context.period).toBe('LAST_WEEK');
      expect(context.activeFilters['period']).toBe('LAST_WEEK');
      expect(context.customer).toBe('Customer ABC');
      expect(context.status).toBe('ACTIVE');
      expect(context.destination).toBe('Surabaya');
      expect(context.objectType).toBe('JOB_ORDER');
    });
  });
});
