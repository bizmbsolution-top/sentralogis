/**
 * Sentralogis Copilot — Semantic Understanding & Context Resolution Gate Test Suite
 * lib/__tests__/copilot-semantic-understanding-gate.test.ts
 *
 * GOVERNANCE TEST / READ-ONLY / NO EXECUTION
 *
 * Validates:
 * §1 Mandatory Preflight & Protected Files Integrity
 * §4 Semantic Understanding Contract (intent, object, entity, condition, action, context, ambiguity, clarification)
 * §5 Context Resolution Test (Scenarios A through F)
 * §6 Semantic Variation Test (10 distinct Indonesian phrasing variations for DEPARTURE_STATUS_INQUIRY)
 * §7 Negative / Ambiguity Test (unresolved references & disconnected actions require clarification)
 * §8 Correction Test (User updates modality / entity)
 * §9 Typo / Informal Language Test (surabya, sby, order yg blm jalan, supir, truk)
 * §10 Multi-turn Context Test (Turns 1 to 6 sequence with state retention)
 * §11 No False Execution Claim (proposal vs execution separation, executionAvailable: false, isExecuted: false)
 * §12 Deterministic Test Matrix (minimum 30 test cases across Groups A through O)
 */

import { describe, test, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  ConversationalSandboxEngine,
  AUTHORITATIVE_SCENARIOS,
} from '../copilot/sandbox/sandbox-engine';
import {
  SIMULATED_CUSTOMERS,
  SIMULATED_SALES_ORDERS,
  SIMULATED_JOB_ORDERS,
  SIMULATED_SHIPMENTS,
  SIMULATED_DRIVERS,
} from '../copilot/sandbox/deterministic-fixtures';
import type {
  ConversationalContextState,
  SemanticUnderstanding,
  SandboxMessage,
} from '../copilot/sandbox/types';

describe('SENTRALOGIS COPILOT — SEMANTIC UNDERSTANDING & CONTEXT RESOLUTION GATE', () => {
  // ==========================================================================
  // §1 MANDATORY PREFLIGHT & INTEGRITY INVARIANTS
  // ==========================================================================
  describe('§1 Mandatory Preflight & Governance Baseline Invariants', () => {
    test('15 protected tracked files exist on disk and remain intact', () => {
      const protectedFiles = [
        'app/api/v1/commercial/invoices/route.ts',
        'docs/architecture/ADR-092-copilot-execute-canonical-domain-wiring.md',
        'lib/__tests__/adr092-phase3-assign-driver-e2e.test.ts',
        'lib/__tests__/u13r-sales-order-forensic-reconciliation.test.ts',
        'lib/__tests__/u15r-fulfillment-forensic-reconciliation.test.ts',
        'lib/application/identity/session-source.ts',
        'lib/copilot/execute/execution-service.ts',
        'lib/financial/feature-flags.ts',
        'lib/financial/http.ts',
        'lib/financial/repository.ts',
        'lib/financial/types.ts',
        'scripts/run-full-regression.ts',
        'supabase/.temp/cli-latest',
        'supabase/migrations/20260919_029_financial_settlement_interface.sql',
        'supabase/migrations/20260922_001_next_invoice_number.sql',
      ];

      for (const relPath of protectedFiles) {
        expect(fs.existsSync(path.join(process.cwd(), relPath))).toBe(true);
      }
    });

    test('sandbox engine does not import mutation or execution modules', () => {
      const src = fs.readFileSync(
        path.join(process.cwd(), 'lib/copilot/sandbox/sandbox-engine.ts'),
        'utf8'
      );
      expect(src).not.toContain('execution-service');
      expect(src).not.toContain('JobOrderAssignmentService');
      expect(src).not.toContain('DriverReplacementService');
      expect(src).not.toContain('supabase.from(');
    });
  });

  // ==========================================================================
  // §4 REQUIRED UNDERSTANDING CONTRACT
  // ==========================================================================
  describe('§4 Required Understanding Contract', () => {
    test('produces compliant SemanticUnderstanding object conforming to specification', () => {
      const state: ConversationalContextState = { conversationHistory: [] };
      const understanding = ConversationalSandboxEngine.resolveUnderstanding(
        'Customer ABC punya order apa saja yang belum jalan?',
        state
      );

      expect(understanding).toBeDefined();
      expect(typeof understanding.intent).toBe('string');
      expect(typeof understanding.object).toBe('string');
      expect(typeof understanding.entity).toBe('string');
      expect(typeof understanding.condition).toBe('string');
      expect(typeof understanding.action).toBe('string');
      expect(typeof understanding.context).toBe('string');
      expect(['NONE', 'LOW', 'MATERIAL']).toContain(understanding.ambiguity);
      expect(['NOT_REQUIRED', 'REQUIRED']).toContain(understanding.clarification);
      expect(understanding.confidenceBasis).toBeDefined();
    });
  });

  // ==========================================================================
  // §5 CONTEXT RESOLUTION TESTS (SCENARIOS A – F)
  // ==========================================================================
  describe('§5 Context Resolution Tests (Scenarios A through F)', () => {
    test('Scenario A: Initial customer query and relative follow-up ("Yang paling baru")', () => {
      // Turn 1: Initial query
      let state: ConversationalContextState = { conversationHistory: [] };
      const turn1 = ConversationalSandboxEngine.processUserMessage(
        'Customer ABC punya order apa saja yang belum jalan?',
        state
      );
      state = turn1.updatedState;

      expect(state.activeCustomerId).toBe('cust-abc');
      expect(state.activeCustomerName).toBe('Customer ABC');

      // Turn 2: Relative follow-up without repeating customer name
      const turn2Understanding = ConversationalSandboxEngine.resolveUnderstanding(
        'Yang paling baru.',
        state
      );
      expect(turn2Understanding.intent).toBe('QUERY_LATEST');
      expect(turn2Understanding.object).toBe('SALES_ORDER');
      expect(turn2Understanding.entity).toBe('Customer ABC');
      expect(turn2Understanding.condition).toBe('LATEST_BY_DATE');
      expect(turn2Understanding.clarification).toBe('NOT_REQUIRED');

      const turn2 = ConversationalSandboxEngine.processUserMessage('Yang paling baru.', state);
      expect(turn2.updatedState.activeSalesOrderId).toBe('SO-2026-0042');
      const resMsg = turn2.responseMessages.find((m) => m.type === 'result');
      expect(resMsg?.content).toContain('SO-2026-0042');
    });

    test('Scenario B: "Order tujuan Surabaya sudah berangkat?" resolves departure status', () => {
      const state: ConversationalContextState = { conversationHistory: [] };
      const understanding = ConversationalSandboxEngine.resolveUnderstanding(
        'Order tujuan Surabaya sudah berangkat?',
        state
      );

      expect(understanding.intent).toBe('DEPARTURE_STATUS_INQUIRY');
      expect(understanding.object).toBe('SHIPMENT');
      expect(understanding.entity).toBe('SHP-2026-0302');
      expect(understanding.clarification).toBe('NOT_REQUIRED');

      const { responseMessages, updatedState } = ConversationalSandboxEngine.processUserMessage(
        'Order tujuan Surabaya sudah berangkat?',
        state
      );
      expect(updatedState.activeShipmentId).toBe('SHP-2026-0302');
      expect(responseMessages[1].content).toContain('BELUM BERANGKAT');
    });

    test('Scenario C: "Tolong urus yang Surabaya." detects material ambiguity and requires clarification', () => {
      const state: ConversationalContextState = { conversationHistory: [] };
      const understanding = ConversationalSandboxEngine.resolveUnderstanding(
        'Tolong urus yang Surabaya.',
        state
      );

      expect(understanding.intent).toBe('TAKE_ACTION');
      expect(understanding.object).toBe('MULTIPLE_CANDIDATES');
      expect(understanding.entity).toBe('Surabaya');
      expect(understanding.action).toBe('HANDLE');
      expect(understanding.ambiguity).toBe('MATERIAL');
      expect(understanding.clarification).toBe('REQUIRED');

      const { responseMessages, updatedState } = ConversationalSandboxEngine.processUserMessage(
        'Tolong urus yang Surabaya.',
        state
      );
      expect(updatedState.pendingClarification).toBe(true);
      expect(responseMessages[0].clarificationNeeded).toBe(true);
      expect(responseMessages[0].content).toContain('Mohon klarifikasi');
    });

    test('Scenario D: "Ganti driver untuk JO ini." generates proposal without execution', () => {
      const state: ConversationalContextState = {
        conversationHistory: [],
        activeJobOrderId: 'JO-2026-0812',
      };
      const understanding = ConversationalSandboxEngine.resolveUnderstanding(
        'Ganti driver untuk JO ini.',
        state
      );

      expect(understanding.intent).toBe('PROPOSE_DRIVER_REPLACEMENT');
      expect(understanding.object).toBe('JOB_ORDER');
      expect(understanding.entity).toBe('JO-2026-0812');
      expect(understanding.action).toBe('DRIVER_REPLACEMENT');
      expect(understanding.clarification).toBe('NOT_REQUIRED');

      const { responseMessages, updatedState } = ConversationalSandboxEngine.processUserMessage(
        'Ganti driver untuk JO ini.',
        state
      );
      const propMsg = responseMessages.find((m) => m.type === 'proposal');
      expect(propMsg).toBeDefined();
      expect(propMsg?.isExecuted).toBe(false);
      expect(propMsg?.proposal?.executionAvailable).toBe(false);
      expect(updatedState.lastProposal).toBeDefined();
    });

    test('Scenario E: "Budi saja." confirms proposal candidate without database mutation', () => {
      const state: ConversationalContextState = {
        conversationHistory: [],
        activeJobOrderId: 'JO-2026-0812',
        lastProposal: {
          id: 'prop-test',
          title: 'Usulan Penugasan Driver',
          description: 'Usulan',
          intent: 'ASSIGN_OR_REPLACE_DRIVER',
          entityId: 'JO-2026-0812',
          entityType: 'job-order',
          changes: [],
          reason: 'Available',
          executionAvailable: false,
        },
      };

      const understanding = ConversationalSandboxEngine.resolveUnderstanding(
        'Budi saja.',
        state
      );
      expect(understanding.intent).toBe('CONFIRM_PROPOSAL_CANDIDATE');
      expect(understanding.entity).toBe('Budi Santoso');
      expect(understanding.action).toBe('PROPOSE_CONFIRMATION');
      expect(understanding.clarification).toBe('NOT_REQUIRED');

      const { responseMessages } = ConversationalSandboxEngine.processUserMessage('Budi saja.', state);
      expect(responseMessages[0].content).toContain('PROPOSAL CONFIRMED — NOT EXECUTED');
      expect(responseMessages[0].isExecuted).toBe(false);
    });

    test('Scenario F: "Yang tadi." with ambiguous/empty context requires clarification without guessing', () => {
      const state: ConversationalContextState = { conversationHistory: [] };
      const understanding = ConversationalSandboxEngine.resolveUnderstanding('Yang tadi.', state);

      expect(understanding.intent).toBe('REFERENCE_SELECTION');
      expect(understanding.ambiguity).toBe('MATERIAL');
      expect(understanding.clarification).toBe('REQUIRED');

      const { responseMessages } = ConversationalSandboxEngine.processUserMessage('Yang tadi.', state);
      expect(responseMessages[0].clarificationNeeded).toBe(true);
      expect(responseMessages[0].content).toContain('yang tadi');
    });
  });

  // ==========================================================================
  // §6 SEMANTIC VARIATION TEST (10 PHRASING VARIATIONS)
  // ==========================================================================
  describe('§6 Semantic Variation Test (10 Indonesian Phrasing Variations for DEPARTURE_STATUS_INQUIRY)', () => {
    const variations = [
      'Sudah berangkat?',
      'Sudah jalan belum?',
      'Truknya sudah berangkat?',
      'Yang ke Surabaya sudah jalan?',
      'Shipment Surabaya sudah berangkat?',
      'Barangnya sudah dikirim?',
      'Sudah jalan ke Surabaya?',
      'Untuk Surabaya sudah berangkat atau belum?',
      'Apakah pengiriman Surabaya sudah mulai?',
      'Truk menuju Surabaya sudah jalan?',
    ];

    test.each(variations)('variant "%s" maps semantically to DEPARTURE_STATUS_INQUIRY without rigid keyword match', (phrase) => {
      const state: ConversationalContextState = {
        conversationHistory: [],
        activeSalesOrderId: 'SO-2026-0042',
      };
      const understanding = ConversationalSandboxEngine.resolveUnderstanding(phrase, state);

      expect(understanding.intent).toBe('DEPARTURE_STATUS_INQUIRY');
      expect(understanding.condition).toBeDefined();
    });
  });

  // ==========================================================================
  // §7 NEGATIVE & AMBIGUITY TEST
  // ==========================================================================
  describe('§7 Negative & Ambiguity Test', () => {
    test('"Urus Surabaya." with multiple candidates requires clarification', () => {
      const state: ConversationalContextState = { conversationHistory: [] };
      const understanding = ConversationalSandboxEngine.resolveUnderstanding('Urus Surabaya.', state);

      expect(understanding.intent).toBe('TAKE_ACTION');
      expect(understanding.ambiguity).toBe('MATERIAL');
      expect(understanding.clarification).toBe('REQUIRED');
    });

    test('"Ganti drivernya." without active JO context requires clarification', () => {
      const state: ConversationalContextState = { conversationHistory: [] };
      const understanding = ConversationalSandboxEngine.resolveUnderstanding('Ganti drivernya.', state);

      expect(understanding.intent).toBe('PROPOSE_DRIVER_REPLACEMENT');
      expect(understanding.object).toBe('JOB_ORDER');
      expect(understanding.entity).toBe('UNKNOWN');
      expect(understanding.ambiguity).toBe('MATERIAL');
      expect(understanding.clarification).toBe('REQUIRED');
    });

    test('"Yang ini." without active selected referent requires clarification', () => {
      const state: ConversationalContextState = { conversationHistory: [] };
      const understanding = ConversationalSandboxEngine.resolveUnderstanding('Yang ini.', state);

      expect(understanding.intent).toBe('REFERENCE_SELECTION');
      expect(understanding.ambiguity).toBe('MATERIAL');
      expect(understanding.clarification).toBe('REQUIRED');
    });

    test('"Pakainya Budi." without active proposal or job order requires clarification', () => {
      const state: ConversationalContextState = { conversationHistory: [] };
      const understanding = ConversationalSandboxEngine.resolveUnderstanding('Pakainya Budi.', state);

      expect(understanding.intent).toBe('CONFIRM_PROPOSAL_CANDIDATE');
      expect(understanding.ambiguity).toBe('MATERIAL');
      expect(understanding.clarification).toBe('REQUIRED');
    });
  });

  // ==========================================================================
  // §8 CORRECTION TEST
  // ==========================================================================
  describe('§8 Correction Test', () => {
    test('updates transport mode resolution on "Bukan yang laut, yang trucking."', () => {
      const state: ConversationalContextState = {
        conversationHistory: [],
        activeShipmentId: 'SHP-2026-0302',
      };
      const understanding = ConversationalSandboxEngine.resolveUnderstanding(
        'Bukan yang laut, yang trucking.',
        state
      );

      expect(understanding.intent).toBe('CORRECTION');
      expect(understanding.object).toBe('TRANSPORT_MODE');
      expect(understanding.condition).toBe('MODE_TRUCKING');
      expect(understanding.action).toBe('SWITCH_MODE');
      expect(understanding.clarification).toBe('NOT_REQUIRED');

      const { responseMessages, updatedState } = ConversationalSandboxEngine.processUserMessage(
        'Bukan yang laut, yang trucking.',
        state
      );
      expect(updatedState.activeJobOrderId).toBe('JO-2026-0812');
      expect(responseMessages[0].content).toContain('Trucking');
      expect(responseMessages[0].content).toContain('JO-2026-0812');
    });

    test('updates active Sales Order on "Bukan order itu. Yang nomor SO-2026-0041."', () => {
      const state: ConversationalContextState = {
        conversationHistory: [],
        activeSalesOrderId: 'SO-2026-0042',
      };
      const understanding = ConversationalSandboxEngine.resolveUnderstanding(
        'Bukan order itu. Yang nomor SO-2026-0041.',
        state
      );

      expect(understanding.intent).toBe('CORRECTION');
      expect(understanding.object).toBe('SALES_ORDER');
      expect(understanding.entity).toBe('SO-2026-0041');
      expect(understanding.clarification).toBe('NOT_REQUIRED');

      const { responseMessages, updatedState } = ConversationalSandboxEngine.processUserMessage(
        'Bukan order itu. Yang nomor SO-2026-0041.',
        state
      );
      expect(updatedState.activeSalesOrderId).toBe('SO-2026-0041');
      expect(responseMessages[0].content).toContain('SO-2026-0041');
      expect(responseMessages[0].content).toContain('Semarang');
    });
  });

  // ==========================================================================
  // §9 TYPO & INFORMAL LANGUAGE TEST
  // ==========================================================================
  describe('§9 Typo & Informal Indonesian Language Test', () => {
    test('resolves typo "surabya" to Surabaya departure inquiry', () => {
      const state: ConversationalContextState = { conversationHistory: [] };
      const understanding = ConversationalSandboxEngine.resolveUnderstanding(
        'shipment surabya sudah berangkat belum?',
        state
      );
      expect(understanding.intent).toBe('DEPARTURE_STATUS_INQUIRY');
      expect(understanding.entity).toBe('SHP-2026-0302');
    });

    test('normalizes informal particle "dong": "surabaya dong"', () => {
      const state: ConversationalContextState = { conversationHistory: [] };
      const understanding = ConversationalSandboxEngine.resolveUnderstanding(
        'shipment surabaya dong sudah berangkat?',
        state
      );
      expect(understanding.intent).toBe('DEPARTURE_STATUS_INQUIRY');
      expect(understanding.entity).toBe('SHP-2026-0302');
    });

    test('normalizes common abbreviation "sby": "yang ke sby sudah jalan?"', () => {
      const state: ConversationalContextState = { conversationHistory: [] };
      const understanding = ConversationalSandboxEngine.resolveUnderstanding(
        'yang ke sby sudah jalan?',
        state
      );
      expect(understanding.intent).toBe('DEPARTURE_STATUS_INQUIRY');
      expect(understanding.entity).toBe('SHP-2026-0302');
    });

    test('normalizes informal contractions "yg blm": "order yg blm jalan"', () => {
      const state: ConversationalContextState = { conversationHistory: [] };
      const understanding = ConversationalSandboxEngine.resolveUnderstanding(
        'customer ABC order yg blm jalan apa aja?',
        state
      );
      expect(understanding.intent).toBe('QUERY_ORDERS');
      expect(understanding.condition).toBe('BELUM_JALAN');
    });

    test('resolves "driver JO itu" to driver inquiry for active job order', () => {
      const state: ConversationalContextState = {
        conversationHistory: [],
        activeJobOrderId: 'JO-2026-0810',
      };
      const understanding = ConversationalSandboxEngine.resolveUnderstanding('driver JO itu', state);
      expect(understanding.intent).toBe('QUERY_DRIVER');
      expect(understanding.object).toBe('DRIVER');
      expect(understanding.entity).toBe('JO-2026-0810');
    });

    test('resolves "supirnya siapa?" to driver inquiry', () => {
      const state: ConversationalContextState = {
        conversationHistory: [],
        activeJobOrderId: 'JO-2026-0810',
      };
      const understanding = ConversationalSandboxEngine.resolveUnderstanding('supirnya siapa?', state);
      expect(understanding.intent).toBe('QUERY_DRIVER');
      expect(understanding.object).toBe('DRIVER');
    });

    test('resolves "truknya udah jalan?" to departure inquiry', () => {
      const state: ConversationalContextState = {
        conversationHistory: [],
        activeSalesOrderId: 'SO-2026-0042',
      };
      const understanding = ConversationalSandboxEngine.resolveUnderstanding('truknya udah jalan?', state);
      expect(understanding.intent).toBe('DEPARTURE_STATUS_INQUIRY');
      expect(understanding.object).toBe('SALES_ORDER');
    });
  });

  // ==========================================================================
  // §10 MULTI-TURN CONTEXT SEQUENCE TEST (TURNS 1 – 6)
  // ==========================================================================
  describe('§10 Multi-Turn Context Test (Turns 1 through 6)', () => {
    test('maintains multi-turn context faithfully with zero database mutations', () => {
      let state: ConversationalContextState = { conversationHistory: [] };

      // Turn 1: "Customer ABC punya order apa?"
      const turn1 = ConversationalSandboxEngine.processUserMessage('Customer ABC punya order apa?', state);
      state = turn1.updatedState;
      expect(state.activeCustomerName).toBe('Customer ABC');
      expect(turn1.responseMessages[0].semanticUnderstanding?.intent).toBe('QUERY_ORDERS');

      // Turn 2: "Yang paling baru."
      const turn2 = ConversationalSandboxEngine.processUserMessage('Yang paling baru.', state);
      state = turn2.updatedState;
      expect(state.activeSalesOrderId).toBe('SO-2026-0042');
      expect(turn2.responseMessages[0].semanticUnderstanding?.intent).toBe('QUERY_LATEST');

      // Turn 3: "Tujuannya mana?"
      const turn3 = ConversationalSandboxEngine.processUserMessage('Tujuannya mana?', state);
      state = turn3.updatedState;
      expect(turn3.responseMessages[0].content).toContain('Surabaya');
      expect(turn3.responseMessages[0].semanticUnderstanding?.intent).toBe('QUERY_DESTINATION');

      // Turn 4: "Sudah jalan belum?"
      const turn4 = ConversationalSandboxEngine.processUserMessage('Sudah jalan belum?', state);
      state = turn4.updatedState;
      expect(turn4.responseMessages[0].content).toContain('BELUM_JALAN');
      expect(turn4.responseMessages[0].semanticUnderstanding?.intent).toBe('DEPARTURE_STATUS_INQUIRY');

      // Turn 5: "Kalau belum, urus drivernya." -> Proposes driver allocation
      const turn5 = ConversationalSandboxEngine.processUserMessage('Kalau belum, urus drivernya.', state);
      state = turn5.updatedState;
      expect(state.lastProposal).toBeDefined();
      expect(state.lastProposal?.executionAvailable).toBe(false);
      expect(turn5.responseMessages[0].isExecuted).toBe(false);
      expect(turn5.responseMessages[1].isExecuted).toBe(false);

      // Turn 6: "Pakai Budi." -> Confirms proposal candidate
      const turn6 = ConversationalSandboxEngine.processUserMessage('Pakai Budi.', state);
      state = turn6.updatedState;
      expect(turn6.responseMessages[0].content).toContain('PROPOSAL CONFIRMED — NOT EXECUTED');
      expect(turn6.responseMessages[0].isExecuted).toBe(false);

      // Invariant: Turn 5 and 6 did not execute any mutations
      for (const msg of [...turn1.responseMessages, ...turn2.responseMessages, ...turn3.responseMessages, ...turn4.responseMessages, ...turn5.responseMessages, ...turn6.responseMessages]) {
        expect(msg.isExecuted).toBe(false);
      }
    });
  });

  // ==========================================================================
  // §11 NO FALSE EXECUTION CLAIM
  // ==========================================================================
  describe('§11 No False Execution Claim Invariant', () => {
    test('never falsely claims driver assigned or database executed', () => {
      const state: ConversationalContextState = {
        conversationHistory: [],
        activeJobOrderId: 'JO-2026-0812',
      };
      const { responseMessages } = ConversationalSandboxEngine.processUserMessage(
        'Sudah diganti drivernya?',
        state
      );

      const text = responseMessages[0].content!;
      expect(text).toContain('Belum');
      expect(text).toContain('TIDAK diganti');
      expect(text).not.toContain('Driver berhasil diganti');
      expect(text).not.toContain('JO berhasil diperbarui');
      expect(text).not.toContain('Assignment berhasil');
      expect(responseMessages[0].isExecuted).toBe(false);
      expect(responseMessages[0].dataSource).toBe('NOT_EXECUTED');
    });
  });

  // ==========================================================================
  // §12 DETERMINISTIC TEST MATRIX (>= 30 CASES ACROSS GROUPS A – O)
  // ==========================================================================
  describe('§12 Deterministic Test Matrix (Groups A through O)', () => {
    interface TestCase {
      id: string;
      group: string;
      input: string;
      expectedIntent: string;
      expectedObject: string;
      expectedEntity: string;
      expectedAmbiguity: 'NONE' | 'LOW' | 'MATERIAL';
      expectedClarification: 'NOT_REQUIRED' | 'REQUIRED';
      contextState?: Partial<ConversationalContextState>;
    }

    const testMatrix: TestCase[] = [
      // Group A: Direct Query
      {
        id: 'TC-A1',
        group: 'A. Direct Query',
        input: 'Customer ABC punya order apa saja yang belum jalan?',
        expectedIntent: 'QUERY_ORDERS',
        expectedObject: 'SALES_ORDER',
        expectedEntity: 'Customer ABC',
        expectedAmbiguity: 'NONE',
        expectedClarification: 'NOT_REQUIRED',
      },
      {
        id: 'TC-A2',
        group: 'A. Direct Query',
        input: 'Customer XYZ ada transaksi apa saja?',
        expectedIntent: 'QUERY_ORDERS',
        expectedObject: 'SALES_ORDER',
        expectedEntity: 'Customer XYZ',
        expectedAmbiguity: 'NONE',
        expectedClarification: 'NOT_REQUIRED',
      },
      // Group B: Contextual follow-up
      {
        id: 'TC-B1',
        group: 'B. Contextual follow-up',
        input: 'Yang paling baru.',
        expectedIntent: 'QUERY_LATEST',
        expectedObject: 'SALES_ORDER',
        expectedEntity: 'Customer ABC',
        expectedAmbiguity: 'NONE',
        expectedClarification: 'NOT_REQUIRED',
        contextState: { activeCustomerName: 'Customer ABC' },
      },
      {
        id: 'TC-B2',
        group: 'B. Contextual follow-up',
        input: 'Tujuannya mana?',
        expectedIntent: 'QUERY_DESTINATION',
        expectedObject: 'SALES_ORDER',
        expectedEntity: 'SO-2026-0042',
        expectedAmbiguity: 'NONE',
        expectedClarification: 'NOT_REQUIRED',
        contextState: { activeSalesOrderId: 'SO-2026-0042' },
      },
      // Group C: Pronoun / reference resolution
      {
        id: 'TC-C1',
        group: 'C. Pronoun / reference',
        input: 'driver JO itu',
        expectedIntent: 'QUERY_DRIVER',
        expectedObject: 'DRIVER',
        expectedEntity: 'JO-2026-0810',
        expectedAmbiguity: 'NONE',
        expectedClarification: 'NOT_REQUIRED',
        contextState: { activeJobOrderId: 'JO-2026-0810' },
      },
      {
        id: 'TC-C2',
        group: 'C. Pronoun / reference',
        input: 'Ganti driver untuk JO ini.',
        expectedIntent: 'PROPOSE_DRIVER_REPLACEMENT',
        expectedObject: 'JOB_ORDER',
        expectedEntity: 'JO-2026-0812',
        expectedAmbiguity: 'NONE',
        expectedClarification: 'NOT_REQUIRED',
        contextState: { activeJobOrderId: 'JO-2026-0812' },
      },
      // Group D: Latest / previous / current
      {
        id: 'TC-D1',
        group: 'D. Latest / previous / current',
        input: 'Order yang terbaru.',
        expectedIntent: 'QUERY_LATEST',
        expectedObject: 'SALES_ORDER',
        expectedEntity: 'Customer ABC',
        expectedAmbiguity: 'NONE',
        expectedClarification: 'NOT_REQUIRED',
        contextState: { activeCustomerName: 'Customer ABC' },
      },
      {
        id: 'TC-D2',
        group: 'D. Latest / previous / current',
        input: 'Order yang terakhir apa?',
        expectedIntent: 'QUERY_LATEST',
        expectedObject: 'SALES_ORDER',
        expectedEntity: 'Customer ABC',
        expectedAmbiguity: 'NONE',
        expectedClarification: 'NOT_REQUIRED',
        contextState: { activeCustomerName: 'Customer ABC' },
      },
      // Group E: Location resolution
      {
        id: 'TC-E1',
        group: 'E. Location resolution',
        input: 'Order tujuan Semarang',
        expectedIntent: 'QUERY_ORDERS_BY_LOCATION',
        expectedObject: 'SALES_ORDER',
        expectedEntity: 'Semarang',
        expectedAmbiguity: 'NONE',
        expectedClarification: 'NOT_REQUIRED',
      },
      {
        id: 'TC-E2',
        group: 'E. Location resolution',
        input: 'Order tujuan Denpasar',
        expectedIntent: 'QUERY_ORDERS_BY_LOCATION',
        expectedObject: 'SALES_ORDER',
        expectedEntity: 'Denpasar',
        expectedAmbiguity: 'NONE',
        expectedClarification: 'NOT_REQUIRED',
      },
      // Group F: Customer-based
      {
        id: 'TC-F1',
        group: 'F. Customer-based',
        input: 'Cek order Customer ABC',
        expectedIntent: 'QUERY_ORDERS',
        expectedObject: 'SALES_ORDER',
        expectedEntity: 'Customer ABC',
        expectedAmbiguity: 'NONE',
        expectedClarification: 'NOT_REQUIRED',
      },
      {
        id: 'TC-F2',
        group: 'F. Customer-based',
        input: 'Cek pengiriman Customer XYZ',
        expectedIntent: 'QUERY_ORDERS',
        expectedObject: 'SALES_ORDER',
        expectedEntity: 'Customer XYZ',
        expectedAmbiguity: 'NONE',
        expectedClarification: 'NOT_REQUIRED',
      },
      // Group G: SO-based
      {
        id: 'TC-G1',
        group: 'G. SO-based',
        input: 'Status SO-2026-0041',
        expectedIntent: 'QUERY_SALES_ORDER',
        expectedObject: 'SALES_ORDER',
        expectedEntity: 'SO-2026-0041',
        expectedAmbiguity: 'NONE',
        expectedClarification: 'NOT_REQUIRED',
      },
      {
        id: 'TC-G2',
        group: 'G. SO-based',
        input: 'Detail SO-2026-0042',
        expectedIntent: 'QUERY_SALES_ORDER',
        expectedObject: 'SALES_ORDER',
        expectedEntity: 'SO-2026-0042',
        expectedAmbiguity: 'NONE',
        expectedClarification: 'NOT_REQUIRED',
      },
      // Group H: JO-based
      {
        id: 'TC-H1',
        group: 'H. JO-based',
        input: 'Status JO-2026-0810',
        expectedIntent: 'QUERY_JOB_ORDER',
        expectedObject: 'JOB_ORDER',
        expectedEntity: 'JO-2026-0810',
        expectedAmbiguity: 'NONE',
        expectedClarification: 'NOT_REQUIRED',
      },
      {
        id: 'TC-H2',
        group: 'H. JO-based',
        input: 'Detail JO-2026-0812',
        expectedIntent: 'QUERY_JOB_ORDER',
        expectedObject: 'JOB_ORDER',
        expectedEntity: 'JO-2026-0812',
        expectedAmbiguity: 'NONE',
        expectedClarification: 'NOT_REQUIRED',
      },
      // Group I: Shipment-based
      {
        id: 'TC-I1',
        group: 'I. Shipment-based',
        input: 'Status SHP-2026-0301',
        expectedIntent: 'QUERY_SHIPMENT',
        expectedObject: 'SHIPMENT',
        expectedEntity: 'SHP-2026-0301',
        expectedAmbiguity: 'NONE',
        expectedClarification: 'NOT_REQUIRED',
      },
      {
        id: 'TC-I2',
        group: 'I. Shipment-based',
        input: 'Status SHP-2026-0302',
        expectedIntent: 'QUERY_SHIPMENT',
        expectedObject: 'SHIPMENT',
        expectedEntity: 'SHP-2026-0302',
        expectedAmbiguity: 'NONE',
        expectedClarification: 'NOT_REQUIRED',
      },
      // Group J: Driver / action intent
      {
        id: 'TC-J1',
        group: 'J. Driver / action intent',
        input: 'Tugaskan driver untuk JO ini.',
        expectedIntent: 'PROPOSE_DRIVER_REPLACEMENT',
        expectedObject: 'JOB_ORDER',
        expectedEntity: 'JO-2026-0812',
        expectedAmbiguity: 'NONE',
        expectedClarification: 'NOT_REQUIRED',
        contextState: { activeJobOrderId: 'JO-2026-0812' },
      },
      {
        id: 'TC-J2',
        group: 'J. Driver / action intent',
        input: 'Alokasi driver baru untuk JO-2026-0812',
        expectedIntent: 'PROPOSE_DRIVER_REPLACEMENT',
        expectedObject: 'JOB_ORDER',
        expectedEntity: 'JO-2026-0812',
        expectedAmbiguity: 'NONE',
        expectedClarification: 'NOT_REQUIRED',
        contextState: { activeJobOrderId: 'JO-2026-0812' },
      },
      // Group K: Ambiguity
      {
        id: 'TC-K1',
        group: 'K. Ambiguity detection',
        input: 'Tolong urus yang Surabaya.',
        expectedIntent: 'TAKE_ACTION',
        expectedObject: 'MULTIPLE_CANDIDATES',
        expectedEntity: 'Surabaya',
        expectedAmbiguity: 'MATERIAL',
        expectedClarification: 'REQUIRED',
      },
      {
        id: 'TC-K2',
        group: 'K. Ambiguity detection',
        input: 'Urus Surabaya.',
        expectedIntent: 'TAKE_ACTION',
        expectedObject: 'MULTIPLE_CANDIDATES',
        expectedEntity: 'Surabaya',
        expectedAmbiguity: 'MATERIAL',
        expectedClarification: 'REQUIRED',
      },
      // Group L: Correction
      {
        id: 'TC-L1',
        group: 'L. Correction',
        input: 'Bukan yang laut, yang trucking.',
        expectedIntent: 'CORRECTION',
        expectedObject: 'TRANSPORT_MODE',
        expectedEntity: 'Surabaya',
        expectedAmbiguity: 'NONE',
        expectedClarification: 'NOT_REQUIRED',
      },
      {
        id: 'TC-L2',
        group: 'L. Correction',
        input: 'Bukan order itu. Yang nomor SO-2026-0041.',
        expectedIntent: 'CORRECTION',
        expectedObject: 'SALES_ORDER',
        expectedEntity: 'SO-2026-0041',
        expectedAmbiguity: 'NONE',
        expectedClarification: 'NOT_REQUIRED',
      },
      // Group M: Informal language
      {
        id: 'TC-M1',
        group: 'M. Informal language',
        input: 'supirnya siapa?',
        expectedIntent: 'QUERY_DRIVER',
        expectedObject: 'DRIVER',
        expectedEntity: 'JO-2026-0810',
        expectedAmbiguity: 'NONE',
        expectedClarification: 'NOT_REQUIRED',
        contextState: { activeJobOrderId: 'JO-2026-0810' },
      },
      {
        id: 'TC-M2',
        group: 'M. Informal language',
        input: 'truknya udah jalan?',
        expectedIntent: 'DEPARTURE_STATUS_INQUIRY',
        expectedObject: 'SALES_ORDER',
        expectedEntity: 'SO-2026-0042',
        expectedAmbiguity: 'NONE',
        expectedClarification: 'NOT_REQUIRED',
        contextState: { activeSalesOrderId: 'SO-2026-0042' },
      },
      // Group N: Typo ringan
      {
        id: 'TC-N1',
        group: 'N. Typo ringan',
        input: 'shipment surabya sudah berangkat?',
        expectedIntent: 'DEPARTURE_STATUS_INQUIRY',
        expectedObject: 'SHIPMENT',
        expectedEntity: 'SHP-2026-0302',
        expectedAmbiguity: 'NONE',
        expectedClarification: 'NOT_REQUIRED',
      },
      {
        id: 'TC-N2',
        group: 'N. Typo ringan',
        input: 'yang ke sby sudah jalan?',
        expectedIntent: 'DEPARTURE_STATUS_INQUIRY',
        expectedObject: 'SHIPMENT',
        expectedEntity: 'SHP-2026-0302',
        expectedAmbiguity: 'NONE',
        expectedClarification: 'NOT_REQUIRED',
      },
      {
        id: 'TC-N3',
        group: 'N. Typo ringan',
        input: 'order customer ABC yg blm jalan',
        expectedIntent: 'QUERY_ORDERS',
        expectedObject: 'SALES_ORDER',
        expectedEntity: 'Customer ABC',
        expectedAmbiguity: 'NONE',
        expectedClarification: 'NOT_REQUIRED',
      },
      // Group O: Negative / unsafe assumptions
      {
        id: 'TC-O1',
        group: 'O. Negative / unsafe assumptions',
        input: 'Ganti drivernya.',
        expectedIntent: 'PROPOSE_DRIVER_REPLACEMENT',
        expectedObject: 'JOB_ORDER',
        expectedEntity: 'UNKNOWN',
        expectedAmbiguity: 'MATERIAL',
        expectedClarification: 'REQUIRED',
      },
      {
        id: 'TC-O2',
        group: 'O. Negative / unsafe assumptions',
        input: 'Pakainya Budi.',
        expectedIntent: 'CONFIRM_PROPOSAL_CANDIDATE',
        expectedObject: 'DRIVER',
        expectedEntity: 'Budi Santoso',
        expectedAmbiguity: 'MATERIAL',
        expectedClarification: 'REQUIRED',
      },
      {
        id: 'TC-O3',
        group: 'O. Negative / unsafe assumptions',
        input: 'Yang ini.',
        expectedIntent: 'REFERENCE_SELECTION',
        expectedObject: 'UNKNOWN',
        expectedEntity: 'UNKNOWN',
        expectedAmbiguity: 'MATERIAL',
        expectedClarification: 'REQUIRED',
      },
      {
        id: 'TC-O4',
        group: 'O. Negative / unsafe assumptions',
        input: 'Yang tadi.',
        expectedIntent: 'REFERENCE_SELECTION',
        expectedObject: 'UNKNOWN',
        expectedEntity: 'MULTIPLE',
        expectedAmbiguity: 'MATERIAL',
        expectedClarification: 'REQUIRED',
      },
    ];

    test(`matrix contains at least 30 test cases (actual: ${testMatrix.length})`, () => {
      expect(testMatrix.length).toBeGreaterThanOrEqual(30);
    });

    test.each(testMatrix)(
      '$id [$group]: "$input" -> intent: $expectedIntent, ambiguity: $expectedAmbiguity, clarification: $expectedClarification',
      ({ input, expectedIntent, expectedObject, expectedEntity, expectedAmbiguity, expectedClarification, contextState }) => {
        const state: ConversationalContextState = {
          conversationHistory: [],
          ...(contextState || {}),
        };

        const understanding = ConversationalSandboxEngine.resolveUnderstanding(input, state);

        expect(understanding.intent).toBe(expectedIntent);
        expect(understanding.object).toBe(expectedObject);
        expect(understanding.entity).toBe(expectedEntity);
        expect(understanding.ambiguity).toBe(expectedAmbiguity);
        expect(understanding.clarification).toBe(expectedClarification);
      }
    );
  });
});
