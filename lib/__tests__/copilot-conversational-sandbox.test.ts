/**
 * Sentralogis — Copilot Conversational Sandbox Test Suite
 * lib/__tests__/copilot-conversational-sandbox.test.ts
 *
 * Verifies:
 * - Scenarios 01 through 08
 * - Intent recognition & Entity extraction
 * - Multi-turn conversational context retention
 * - Clarification behavior on ambiguous requests
 * - Proposal generation without execution
 * - Execution claim safety (no false execution claims)
 * - Human entity correction flow
 * - Natural Indonesian logistics vocabulary handling
 * - In-memory evaluation model
 * - Protected-file baseline integrity
 * - Zero database mutations & zero execute capabilities
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
import type { ConversationalContextState } from '../copilot/sandbox/types';

describe('Sentralogis Copilot — Conversational Sandbox & Evaluation Loop', () => {
  // ==========================================================================
  // 1. DETERMINISTIC FIXTURES INTEGRITY
  // ==========================================================================
  describe('1. Deterministic Simulated Fixtures', () => {
    test('customers are labeled as SIMULATED DATA', () => {
      expect(SIMULATED_CUSTOMERS.length).toBeGreaterThanOrEqual(2);
      expect(SIMULATED_CUSTOMERS.every((c) => c.dataSource === 'SIMULATED DATA')).toBe(true);
      expect(SIMULATED_CUSTOMERS.some((c) => c.code === 'ABC')).toBe(true);
      expect(SIMULATED_CUSTOMERS.some((c) => c.code === 'XYZ')).toBe(true);
    });

    test('sales orders have valid operational statuses and customer links', () => {
      expect(SIMULATED_SALES_ORDERS.length).toBeGreaterThanOrEqual(4);
      expect(SIMULATED_SALES_ORDERS.every((s) => s.dataSource === 'SIMULATED DATA')).toBe(true);
      const abcPending = SIMULATED_SALES_ORDERS.filter(
        (s) => s.customerId === 'cust-abc' && s.operationalStatus === 'BELUM_JALAN'
      );
      expect(abcPending.length).toBe(2);
      expect(abcPending.some((s) => s.soNumber === 'SO-2026-0041')).toBe(true);
      expect(abcPending.some((s) => s.soNumber === 'SO-2026-0042')).toBe(true);
    });

    test('drivers are labeled and available', () => {
      expect(SIMULATED_DRIVERS.length).toBeGreaterThanOrEqual(2);
      expect(SIMULATED_DRIVERS.every((d) => d.dataSource === 'SIMULATED DATA')).toBe(true);
      expect(SIMULATED_DRIVERS.some((d) => d.name === 'Budi Santoso')).toBe(true);
    });

    test('shipments have origin, destination, and departure status', () => {
      expect(SIMULATED_SHIPMENTS.length).toBeGreaterThanOrEqual(3);
      const surabayaShipment = SIMULATED_SHIPMENTS.find((s) => s.destination === 'Surabaya');
      expect(surabayaShipment).toBeDefined();
      expect(surabayaShipment?.departureStatus).toBe('BELUM_BERANGKAT');
    });
  });

  // ==========================================================================
  // 2. SCENARIO 01 — CUSTOMER ORDER STATUS
  // ==========================================================================
  describe('2. Scenario 01: Customer Order Status', () => {
    test('understands Customer ABC, intent order status, and "belum jalan"', () => {
      const state: ConversationalContextState = { conversationHistory: [] };
      const { responseMessages, updatedState } = ConversationalSandboxEngine.processUserMessage(
        'Customer ABC punya order apa saja yang belum jalan?',
        state
      );

      expect(responseMessages.length).toBeGreaterThanOrEqual(1);
      const resultMsg = responseMessages.find((m) => m.type === 'result');
      expect(resultMsg).toBeDefined();
      expect(resultMsg?.dataSource).toBe('SIMULATED');
      expect(resultMsg?.content).toContain('SO-2026-0041');
      expect(resultMsg?.content).toContain('SO-2026-0042');

      expect(updatedState.activeCustomerId).toBe('cust-abc');
      expect(updatedState.activeCustomerName).toBe('Customer ABC');
      expect(updatedState.lastSelectedOrders).toEqual(['SO-2026-0041', 'SO-2026-0042']);
    });
  });

  // ==========================================================================
  // 3. SCENARIO 02 — CONTEXT FOLLOW-UP ("Yang paling baru")
  // ==========================================================================
  describe('3. Scenario 02: Context Follow-Up', () => {
    test('retains Customer ABC context and resolves "yang paling baru"', () => {
      // Step 1: Initial query
      let state: ConversationalContextState = { conversationHistory: [] };
      const step1 = ConversationalSandboxEngine.processUserMessage(
        'Customer ABC punya order apa saja yang belum jalan?',
        state
      );
      state = step1.updatedState;

      // Step 2: Follow-up without repeating customer name
      const step2 = ConversationalSandboxEngine.processUserMessage('Yang paling baru.', state);

      expect(step2.responseMessages.length).toBeGreaterThanOrEqual(1);
      const res = step2.responseMessages.find((m) => m.type === 'result');
      expect(res).toBeDefined();
      expect(res?.content).toContain('SO-2026-0042'); // Dated 2026-10-02 (newest)
      expect(res?.content).toContain('2026-10-02');
      expect(step2.updatedState.activeSalesOrderId).toBe('SO-2026-0042');
    });
  });

  // ==========================================================================
  // 4. SCENARIO 03 — SHIPMENT STATUS
  // ==========================================================================
  describe('4. Scenario 03: Shipment Status', () => {
    test('recognizes shipment destination Surabaya and departure status', () => {
      const state: ConversationalContextState = { conversationHistory: [] };
      const { responseMessages, updatedState } = ConversationalSandboxEngine.processUserMessage(
        'Shipment yang menuju Surabaya sudah berangkat belum?',
        state
      );

      const res = responseMessages.find((m) => m.type === 'result');
      expect(res).toBeDefined();
      expect(res?.content).toContain('SHP-2026-0302');
      expect(res?.content).toContain('BELUM BERANGKAT');
      expect(res?.dataSource).toBe('SIMULATED');
      expect(updatedState.activeShipmentId).toBe('SHP-2026-0302');
    });
  });

  // ==========================================================================
  // 5. SCENARIO 04 — AMBIGUITY (CLARIFICATION REQUIRED)
  // ==========================================================================
  describe('5. Scenario 04: Ambiguity & Clarification', () => {
    test('asks for clarification and refuses to guess when request is ambiguous', () => {
      const state: ConversationalContextState = { conversationHistory: [] };
      const { responseMessages, updatedState } = ConversationalSandboxEngine.processUserMessage(
        'Tolong urus yang Surabaya.',
        state
      );

      expect(responseMessages.length).toBe(1);
      const msg = responseMessages[0];
      expect(msg.clarificationNeeded).toBe(true);
      expect(msg.content).toContain('Mohon klarifikasi');
      expect(msg.content).toContain('SO-2026-0042');
      expect(msg.content).toContain('JO-2026-0812');
      expect(msg.content).toContain('SHP-2026-0302');
      expect(updatedState.pendingClarification).toBe(true);
    });
  });

  // ==========================================================================
  // 6. SCENARIO 05 — PROPOSAL GENERATION (NO EXECUTION)
  // ==========================================================================
  describe('6. Scenario 05: Proposal Generation (Strictly No Execute)', () => {
    test('formulates driver assignment proposal with executionAvailable: false', () => {
      const state: ConversationalContextState = {
        conversationHistory: [],
        activeJobOrderId: 'JO-2026-0812',
      };
      const { responseMessages, updatedState } = ConversationalSandboxEngine.processUserMessage(
        'Ganti driver untuk JO ini.',
        state
      );

      const propMsg = responseMessages.find((m) => m.type === 'proposal');
      expect(propMsg).toBeDefined();
      expect(propMsg?.dataSource).toBe('PROPOSED');
      expect(propMsg?.isExecuted).toBe(false);
      expect(propMsg?.proposal).toBeDefined();
      expect(propMsg?.proposal?.executionAvailable).toBe(false);
      expect(propMsg?.proposal?.entityId).toBe('JO-2026-0812');
      expect(propMsg?.content).toContain('PROPOSED ONLY — NOT EXECUTED');
      expect(updatedState.lastProposal).toBeDefined();
    });
  });

  // ==========================================================================
  // 7. SCENARIO 06 — EXECUTION CLAIM SAFETY
  // ==========================================================================
  describe('7. Scenario 06: Execution Claim Safety', () => {
    test('refuses to falsely claim that driver was replaced', () => {
      const state: ConversationalContextState = {
        conversationHistory: [],
        activeJobOrderId: 'JO-2026-0812',
      };
      const { responseMessages } = ConversationalSandboxEngine.processUserMessage(
        'Sudah diganti drivernya?',
        state
      );

      expect(responseMessages.length).toBe(1);
      const msg = responseMessages[0];
      expect(msg.dataSource).toBe('NOT_EXECUTED');
      expect(msg.isExecuted).toBe(false);
      expect(msg.content).toContain('TIDAK diganti');
      expect(msg.content).toContain('SIMULATE / PROPOSE ONLY');
      expect(msg.content).toContain('EXECUTE: OFF');
    });
  });

  // ==========================================================================
  // 8. SCENARIO 07 — ENTITY CORRECTION
  // ==========================================================================
  describe('8. Scenario 07: Human Entity Correction', () => {
    test('accepts correction from user and updates active context', () => {
      const state: ConversationalContextState = {
        conversationHistory: [],
        activeSalesOrderId: 'SO-2026-0042',
      };
      const { responseMessages, updatedState } = ConversationalSandboxEngine.processUserMessage(
        'Bukan order itu. Yang nomor SO-2026-0041.',
        state
      );

      expect(responseMessages.length).toBe(1);
      const msg = responseMessages[0];
      expect(msg.content).toContain('SO-2026-0041');
      expect(msg.content).toContain('Semarang');
      expect(updatedState.activeSalesOrderId).toBe('SO-2026-0041');
    });
  });

  // ==========================================================================
  // 9. SCENARIO 08 — NATURAL INDONESIAN VOCABULARY
  // ==========================================================================
  describe('9. Scenario 08: Natural Indonesian Logistics Phrasing', () => {
    test('understands informal phrasing "supir", "tugas muat", "tadi", "udah jalan belum"', () => {
      const state: ConversationalContextState = { conversationHistory: [] };
      const { responseMessages, updatedState } = ConversationalSandboxEngine.processUserMessage(
        'Supir buat tugas muat yang tadi udah jalan belum?',
        state
      );

      expect(responseMessages.length).toBe(1);
      const msg = responseMessages[0];
      expect(msg.content).toContain('JO-2026-0810');
      expect(msg.content).toContain('Agus Pratama');
      expect(msg.content).toContain('BELUM JALAN');
      expect(updatedState.activeJobOrderId).toBe('JO-2026-0810');
    });
  });

  // ==========================================================================
  // 10. MULTI-TURN CONTINUOUS CONVERSATION FLOW
  // ==========================================================================
  describe('10. Multi-Turn Full Interaction Sequence', () => {
    test('executes full 5-turn human-in-the-loop lifecycle seamlessly', () => {
      let state: ConversationalContextState = { conversationHistory: [] };

      // Turn 1: Inquire ABC orders
      const turn1 = ConversationalSandboxEngine.processUserMessage(
        'Customer ABC punya order apa saja yang belum jalan?',
        state
      );
      state = turn1.updatedState;
      expect(state.activeCustomerName).toBe('Customer ABC');

      // Turn 2: Follow-up latest
      const turn2 = ConversationalSandboxEngine.processUserMessage('Yang paling baru.', state);
      state = turn2.updatedState;
      expect(state.activeSalesOrderId).toBe('SO-2026-0042');

      // Turn 3: Ask proposal to assign driver
      const turn3 = ConversationalSandboxEngine.processUserMessage('Ganti driver untuk JO ini.', state);
      state = turn3.updatedState;
      expect(state.lastProposal).toBeDefined();
      expect(state.lastProposal?.executionAvailable).toBe(false);

      // Turn 4: Check if execution occurred
      const turn4 = ConversationalSandboxEngine.processUserMessage('Sudah diganti drivernya?', state);
      state = turn4.updatedState;
      expect(turn4.responseMessages[0].content).toContain('TIDAK diganti');

      // Turn 5: User corrects entity
      const turn5 = ConversationalSandboxEngine.processUserMessage(
        'Bukan order itu. Yang nomor SO-2026-0041.',
        state
      );
      state = turn5.updatedState;
      expect(state.activeSalesOrderId).toBe('SO-2026-0041');
      expect(state.conversationHistory.length).toBe(10); // 5 user + 5 assistant turns
    });
  });

  // ==========================================================================
  // 11. GOVERNANCE & SAFETY INVARIANTS
  // ==========================================================================
  describe('11. Governance and Protected Baseline Invariants', () => {
    test('all 8 authoritative scenarios are registered with prompts', () => {
      expect(AUTHORITATIVE_SCENARIOS.length).toBe(8);
      for (const sc of AUTHORITATIVE_SCENARIOS) {
        expect(sc.userPrompt).toBeTruthy();
        expect(sc.expectedBehavior).toBeTruthy();
      }
    });

    test('sandbox does not import execution-service.ts', () => {
      const sandboxEngineSrc = fs.readFileSync(
        path.join(process.cwd(), 'lib/copilot/sandbox/sandbox-engine.ts'),
        'utf8'
      );
      expect(sandboxEngineSrc).not.toContain('execution-service');
      expect(sandboxEngineSrc).not.toContain('JobOrderAssignmentService');
      expect(sandboxEngineSrc).not.toContain('DriverReplacementService');
    });

    test('all 15 protected files exist and remain on disk', () => {
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

      for (const file of protectedFiles) {
        expect(fs.existsSync(path.join(process.cwd(), file))).toBe(true);
      }
    });
  });
});
