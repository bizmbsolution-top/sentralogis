/**
 * Sentralogis — Copilot V2 Active Entity Refinement Test Suite
 * lib/__tests__/copilot-v2-active-entity-refinement.test.ts
 *
 * Verifies the Active Entity Precedence Rule for conversational status and refinement queries:
 * ACTIVE SELECTED ENTITY > PENDING CLARIFICATION > CONTEXTUAL RESULT SET > CUSTOMER / GLOBAL > FALLBACK
 *
 * Mandatory Tests:
 * - TEST 1: Active JO Refinement ("JO-2026-0812" -> "sudah diganti drivernya?" -> "yang belum jalan" -> remains JO-2026-0812)
 * - TEST 2: Active JO Status Question ("JO-2026-0812" -> "statusnya apa?" -> remains JO-2026-0812)
 * - TEST 3: Active Shipment Refinement ("SHP-2026-0302" -> "yang belum jalan" -> remains SHP-2026-0302)
 * - TEST 4: Active SO Refinement ("SO-2026-0042" -> "yang belum jalan" -> remains SO-2026-0042)
 * - TEST 5: Explicit Context Switch ("JO-2026-0812" -> "customer ABC" -> switches to Customer ABC orders)
 * - TEST 6: No Active Entity ("yang belum jalan" with empty active state -> defaults to Customer ABC orders)
 * - TEST 7: No False Execution (isExecuted = false, executionAvailable = false, zero mutations)
 */

import { describe, test, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { ConversationalSandboxEngine } from '../copilot/sandbox/sandbox-engine';
import { ConversationalQueryResolver } from '../copilot/sandbox/conversational-query-resolver';
import type { ConversationalContextState } from '../copilot/sandbox/types';

describe('SENTRALOGIS COPILOT V2 — ACTIVE ENTITY REFINEMENT GATE', () => {

  // ==========================================================================
  // TEST 1 — ACTIVE JO REFINEMENT
  // ==========================================================================
  describe('TEST 1: Active JO Refinement ("JO-2026-0812" -> "sudah diganti drivernya?" -> "yang belum jalan")', () => {
    test('preserves JO-2026-0812 as target entity on "yang belum jalan" without customer-level hijack', () => {
      // Turn 1: JO-2026-0812
      const state0: ConversationalContextState = { conversationHistory: [] };
      const turn1 = ConversationalSandboxEngine.processUserMessage('JO-2026-0812', state0);

      expect(turn1.updatedState.activeJobOrderId).toBe('JO-2026-0812');
      expect(turn1.responseMessages[0].content).toContain('JO-2026-0812');

      // Turn 2: sudah diganti drivernya?
      const turn2 = ConversationalSandboxEngine.processUserMessage('sudah diganti drivernya?', turn1.updatedState);
      expect(turn2.updatedState.activeJobOrderId).toBe('JO-2026-0812');
      expect(turn2.responseMessages[0].dataSource).toBe('NOT_EXECUTED');
      expect(turn2.responseMessages[0].content).toContain('TIDAK diganti');

      // Turn 3: yang belum jalan
      const turn3 = ConversationalSandboxEngine.processUserMessage('yang belum jalan', turn2.updatedState);

      // Invariant: Must remain scoped to JO-2026-0812
      expect(turn3.responseMessages[0].semanticUnderstanding?.object).toBe('JOB_ORDER');
      expect(turn3.responseMessages[0].semanticUnderstanding?.entity).toBe('JO-2026-0812');
      expect(turn3.responseMessages[0].semanticUnderstanding?.condition).toBe('BELUM_JALAN');
      expect(turn3.updatedState.activeJobOrderId).toBe('JO-2026-0812');

      // Must NOT return Customer ABC Sales Orders SO-2026-0041 or SO-2026-0042 as primary result
      expect(turn3.responseMessages[0].content).toContain('JO-2026-0812');
      expect(turn3.responseMessages[0].content).toContain('BELUM JALAN');
      expect(turn3.responseMessages[0].content).not.toContain('Ditemukan **2 order** untuk **Customer ABC**');
      expect(turn3.responseMessages[0].content).not.toContain('SO-2026-0041');
    });
  });

  // ==========================================================================
  // TEST 2 — ACTIVE JO STATUS QUESTION
  // ==========================================================================
  describe('TEST 2: Active JO Status Question ("JO-2026-0812" -> "statusnya apa?")', () => {
    test('resolves "statusnya apa?" to active JO-2026-0812 without customer-level hijack', () => {
      const state0: ConversationalContextState = { conversationHistory: [] };
      const turn1 = ConversationalSandboxEngine.processUserMessage('JO-2026-0812', state0);
      expect(turn1.updatedState.activeJobOrderId).toBe('JO-2026-0812');

      const turn2 = ConversationalSandboxEngine.processUserMessage('statusnya apa?', turn1.updatedState);

      expect(turn2.responseMessages[0].semanticUnderstanding?.object).toBe('JOB_ORDER');
      expect(turn2.responseMessages[0].semanticUnderstanding?.entity).toBe('JO-2026-0812');
      expect(turn2.updatedState.activeJobOrderId).toBe('JO-2026-0812');
      expect(turn2.responseMessages[0].content).toContain('JO-2026-0812');
      expect(turn2.responseMessages[0].content).not.toContain('Ditemukan **2 order** untuk **Customer ABC**');
    });

    test.each([
      ['bagaimana statusnya?'],
      ['statusnya bagaimana?'],
      ['cek status'],
      ['status operasional'],
    ])('resolves variation "%s" directly to active Job Order', (input) => {
      const state0: ConversationalContextState = { conversationHistory: [] };
      const turn1 = ConversationalSandboxEngine.processUserMessage('JO-2026-0812', state0);
      const turn2 = ConversationalSandboxEngine.processUserMessage(input, turn1.updatedState);

      expect(turn2.responseMessages[0].semanticUnderstanding?.object).toBe('JOB_ORDER');
      expect(turn2.responseMessages[0].semanticUnderstanding?.entity).toBe('JO-2026-0812');
      expect(turn2.responseMessages[0].content).toContain('JO-2026-0812');
    });
  });

  // ==========================================================================
  // TEST 3 — ACTIVE SHIPMENT REFINEMENT
  // ==========================================================================
  describe('TEST 3: Active Shipment Refinement ("SHP-2026-0302" -> "yang belum jalan")', () => {
    test('retains active Shipment SHP-2026-0302 on refinement', () => {
      const state0: ConversationalContextState = { conversationHistory: [] };
      const turn1 = ConversationalSandboxEngine.processUserMessage('SHP-2026-0302', state0);
      expect(turn1.updatedState.activeShipmentId).toBe('SHP-2026-0302');

      const turn2 = ConversationalSandboxEngine.processUserMessage('yang belum jalan', turn1.updatedState);

      expect(turn2.responseMessages[0].semanticUnderstanding?.object).toBe('SHIPMENT');
      expect(turn2.responseMessages[0].semanticUnderstanding?.entity).toBe('SHP-2026-0302');
      expect(turn2.updatedState.activeShipmentId).toBe('SHP-2026-0302');
      expect(turn2.responseMessages[0].content).toContain('SHP-2026-0302');
      expect(turn2.responseMessages[0].content).toContain('BELUM BERANGKAT');
    });
  });

  // ==========================================================================
  // TEST 4 — ACTIVE SO REFINEMENT
  // ==========================================================================
  describe('TEST 4: Active SO Refinement ("SO-2026-0042" -> "yang belum jalan")', () => {
    test('retains active Sales Order SO-2026-0042 on refinement', () => {
      const state0: ConversationalContextState = { conversationHistory: [] };
      const turn1 = ConversationalSandboxEngine.processUserMessage('SO-2026-0042', state0);
      expect(turn1.updatedState.activeSalesOrderId).toBe('SO-2026-0042');

      const turn2 = ConversationalSandboxEngine.processUserMessage('yang belum jalan', turn1.updatedState);

      expect(turn2.responseMessages[0].semanticUnderstanding?.object).toBe('SALES_ORDER');
      expect(turn2.responseMessages[0].semanticUnderstanding?.entity).toBe('SO-2026-0042');
      expect(turn2.updatedState.activeSalesOrderId).toBe('SO-2026-0042');
      expect(turn2.responseMessages[0].content).toContain('SO-2026-0042');
      expect(turn2.responseMessages[0].content).toContain('BELUM JALAN');
    });
  });

  // ==========================================================================
  // TEST 5 — EXPLICIT CONTEXT SWITCH
  // ==========================================================================
  describe('TEST 5: Explicit Context Switch ("JO-2026-0812" -> "customer ABC")', () => {
    test('explicit customer request switches context away from active Job Order', () => {
      const state0: ConversationalContextState = { conversationHistory: [] };
      const turn1 = ConversationalSandboxEngine.processUserMessage('JO-2026-0812', state0);
      expect(turn1.updatedState.activeJobOrderId).toBe('JO-2026-0812');

      // Explicit switch: "customer ABC"
      const turn2 = ConversationalSandboxEngine.processUserMessage('customer ABC', turn1.updatedState);

      expect(turn2.responseMessages[0].semanticUnderstanding?.intent).toBe('QUERY_ORDERS');
      expect(turn2.responseMessages[0].semanticUnderstanding?.entity).toBe('Customer ABC');
      expect(turn2.updatedState.activeCustomerName).toBe('Customer ABC');
      const resultMsg = turn2.responseMessages.find((m) => m.type === 'result') || turn2.responseMessages[0];
      expect(resultMsg.content).toContain('Customer ABC');
      expect(resultMsg.content).toContain('SO-2026-0041');
      expect(resultMsg.content).toContain('SO-2026-0042');
    });

    test('explicit SO lookup switches context away from active Job Order', () => {
      const state0: ConversationalContextState = { conversationHistory: [] };
      const turn1 = ConversationalSandboxEngine.processUserMessage('JO-2026-0812', state0);
      expect(turn1.updatedState.activeJobOrderId).toBe('JO-2026-0812');

      // Explicit switch: "SO-2026-0041"
      const turn2 = ConversationalSandboxEngine.processUserMessage('SO-2026-0041', turn1.updatedState);

      expect(turn2.responseMessages[0].semanticUnderstanding?.object).toBe('SALES_ORDER');
      expect(turn2.responseMessages[0].semanticUnderstanding?.entity).toBe('SO-2026-0041');
      expect(turn2.updatedState.activeSalesOrderId).toBe('SO-2026-0041');
      expect(turn2.responseMessages[0].content).toContain('SO-2026-0041');
    });
  });

  // ==========================================================================
  // TEST 6 — NO ACTIVE ENTITY
  // ==========================================================================
  describe('TEST 6: No Active Entity ("yang belum jalan" with no active entity)', () => {
    test('defaults to Customer ABC / Sales Order behavior when no active entity is set', () => {
      const state0: ConversationalContextState = { conversationHistory: [] };
      const turn = ConversationalSandboxEngine.processUserMessage('yang belum jalan', state0);

      expect(turn.responseMessages[0].semanticUnderstanding?.object).toBe('SALES_ORDER');
      expect(turn.responseMessages[0].semanticUnderstanding?.entity).toBe('Customer ABC');
      const resultMsg = turn.responseMessages.find((m) => m.type === 'result') || turn.responseMessages[0];
      expect(resultMsg.content).toContain('Customer ABC');
      expect(resultMsg.content).toContain('SO-2026-0041');
      expect(resultMsg.content).toContain('SO-2026-0042');
    });
  });

  // ==========================================================================
  // TEST 7 — NO FALSE EXECUTION & SAFETY BOUNDARY
  // ==========================================================================
  describe('TEST 7: No False Execution & Safety Boundary', () => {
    test('all refinement responses have isExecuted = false and no mutation services called', () => {
      const state0: ConversationalContextState = { conversationHistory: [] };
      const t1 = ConversationalSandboxEngine.processUserMessage('JO-2026-0812', state0);
      const t2 = ConversationalSandboxEngine.processUserMessage('sudah diganti drivernya?', t1.updatedState);
      const t3 = ConversationalSandboxEngine.processUserMessage('yang belum jalan', t2.updatedState);
      const t4 = ConversationalSandboxEngine.processUserMessage('statusnya apa?', t3.updatedState);

      const allMessages = [
        ...t1.responseMessages,
        ...t2.responseMessages,
        ...t3.responseMessages,
        ...t4.responseMessages,
      ];

      for (const msg of allMessages) {
        expect(msg.isExecuted).toBe(false);
      }
    });

    test('sandbox engine does not import operational mutation services or DB clients', () => {
      const engineSrc = fs.readFileSync(
        path.resolve(process.cwd(), 'lib/copilot/sandbox/sandbox-engine.ts'),
        'utf-8'
      );
      expect(engineSrc).not.toContain('execution-service');
      expect(engineSrc).not.toContain('JobOrderAssignmentService');
      expect(engineSrc).not.toContain('supabase.from');
    });
  });

  // ==========================================================================
  // RESOLVER PARITY TEST
  // ==========================================================================
  describe('ConversationalQueryResolver Parity', () => {
    test('resolver resolves status check directly against activeJobOrderId', () => {
      const state: ConversationalContextState = {
        conversationHistory: [],
        activeJobOrderId: 'JO-2026-0812',
      };

      const result = ConversationalQueryResolver.resolveQuery('statusnya apa?', state);
      expect(result.resolutionState).toBe('DIRECT_ANSWER');
      expect(result.matchedEntityIds).toContain('JO-2026-0812');
      expect(result.responseText).toContain('JO-2026-0812');
    });
  });
});
