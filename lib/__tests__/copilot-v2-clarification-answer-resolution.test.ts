/**
 * Sentralogis — Copilot V2 Clarification Answer Resolution Test Suite
 * lib/__tests__/copilot-v2-clarification-answer-resolution.test.ts
 *
 * Verifies that answering an active clarification request with an exact identifier
 * (e.g. "JO-2026-0812", "SO-2026-0042", "SHP-2026-0302") resolves the pending
 * clarification, sets the active operational entity in state, and avoids generic fallback.
 *
 * Test Matrix:
 * 1. Golden 5-Turn Conversational Sequence (Order -> Clarify -> Answer JO -> Replace Driver -> Verify Safety)
 * 2. Case A: Clarification Answer with Sales Order ("SO-2026-0042")
 * 3. Case B: Clarification Answer with Shipment ("SHP-2026-0302")
 * 4. Case C: Natural language variations & case-insensitivity ("jo-2026-0812", "yang JO-2026-0812", etc.)
 * 5. Case D: Non-candidate identifier negative test ("JO-2026-9999")
 * 6. Case E: Unrelated text during clarification ("halo")
 * 7. Explicit code lookups outside clarification (JO, SO, SHP)
 * 8. Static boundary & architecture invariants
 */

import { describe, test, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { ConversationalSandboxEngine } from '../copilot/sandbox/sandbox-engine';
import { ConversationalQueryResolver } from '../copilot/sandbox/conversational-query-resolver';
import type { ConversationalContextState } from '../copilot/sandbox/types';

describe('SENTRALOGIS COPILOT V2 — CLARIFICATION ANSWER RESOLUTION GATE', () => {

  // ==========================================================================
  // 1. GOLDEN 5-TURN CONVERSATIONAL SEQUENCE
  // ==========================================================================
  describe('1. Golden 5-Turn Conversational Sequence', () => {
    test('executes 5-turn sequence seamlessly from clarification answer to proposal safety', () => {
      // Turn 1: "Customer ABC punya order apa saja yang belum jalan?"
      const state0: ConversationalContextState = { conversationHistory: [] };
      const turn1 = ConversationalSandboxEngine.processUserMessage(
        'Customer ABC punya order apa saja yang belum jalan?',
        state0
      );

      expect(turn1.updatedState.activeCustomerId).toBe('cust-abc');
      expect(turn1.updatedState.activeCustomerName).toBe('Customer ABC');
      const t1Result = turn1.responseMessages.find((m) => m.type === 'result');
      expect(t1Result?.content).toContain('SO-2026-0041');
      expect(t1Result?.content).toContain('SO-2026-0042');

      // Turn 2: "tolong urus yang surabaya"
      const turn2 = ConversationalSandboxEngine.processUserMessage(
        'tolong urus yang surabaya',
        turn1.updatedState
      );

      expect(turn2.updatedState.pendingClarification).toBe(true);
      expect(turn2.responseMessages[0].clarificationNeeded).toBe(true);
      expect(turn2.updatedState.clarificationCandidates).toBeDefined();
      expect(turn2.updatedState.clarificationCandidates?.length).toBe(4);
      expect(turn2.updatedState.clarificationCandidates?.map((c) => c.entityId)).toEqual(
        expect.arrayContaining(['SO-2026-0042', 'JO-2026-0812', 'SHP-2026-0302', 'SHP-2026-0305'])
      );

      // Turn 3: "JO-2026-0812" (Exact clarification answer)
      const turn3 = ConversationalSandboxEngine.processUserMessage(
        'JO-2026-0812',
        turn2.updatedState
      );

      // Invariant: Must NOT fall through to generic sandbox fallback!
      expect(turn3.responseMessages[0].content).not.toContain('Copilot Sandbox menerima instruksi: *"JO-2026-0812"*');
      expect(turn3.responseMessages[0].content).toContain('JO-2026-0812');
      expect(turn3.responseMessages[0].content).toContain('Klarifikasi diterima');

      // Invariant: Pending clarification must be resolved and cleared
      expect(turn3.updatedState.pendingClarification).toBe(false);
      expect(turn3.updatedState.clarificationSubject).toBeUndefined();

      // Invariant: Active operational entity must be set
      expect(turn3.updatedState.activeJobOrderId).toBe('JO-2026-0812');
      expect(turn3.responseMessages[0].semanticUnderstanding?.intent).toBe('RESOLVE_CLARIFICATION_CANDIDATE');
      expect(turn3.responseMessages[0].semanticUnderstanding?.object).toBe('JOB_ORDER');
      expect(turn3.responseMessages[0].semanticUnderstanding?.entity).toBe('JO-2026-0812');
      expect(turn3.responseMessages[0].semanticUnderstanding?.clarification).toBe('NOT_REQUIRED');

      // Turn 4: "ganti driver untuk JO ini"
      const turn4 = ConversationalSandboxEngine.processUserMessage(
        'ganti driver untuk JO ini',
        turn3.updatedState
      );

      const propMsg = turn4.responseMessages.find((m) => m.type === 'proposal');
      expect(propMsg).toBeDefined();
      expect(propMsg?.dataSource).toBe('PROPOSED');
      expect(propMsg?.isExecuted).toBe(false);
      expect(propMsg?.proposal?.executionAvailable).toBe(false);
      expect(propMsg?.proposal?.entityId).toBe('JO-2026-0812');
      expect(propMsg?.content).toContain('PROPOSED ONLY — NOT EXECUTED');

      // Turn 5: "sudah diganti drivernya?"
      const turn5 = ConversationalSandboxEngine.processUserMessage(
        'sudah diganti drivernya?',
        turn4.updatedState
      );

      const t5Msg = turn5.responseMessages[0];
      expect(t5Msg.dataSource).toBe('NOT_EXECUTED');
      expect(t5Msg.isExecuted).toBe(false);
      expect(t5Msg.content).toContain('TIDAK diganti');
      expect(t5Msg.content).toContain('SIMULATE / PROPOSE ONLY');
      expect(t5Msg.content).toContain('EXECUTE: OFF');
    });
  });

  // ==========================================================================
  // 2. CASE A — RESOLUTION WITH SALES ORDER CANDIDATE
  // ==========================================================================
  describe('2. Case A: Clarification Answer with Sales Order ("SO-2026-0042")', () => {
    test('resolves pending clarification to Sales Order SO-2026-0042', () => {
      const state0: ConversationalContextState = { conversationHistory: [] };
      const step1 = ConversationalSandboxEngine.processUserMessage(
        'tolong urus yang surabaya',
        state0
      );
      expect(step1.updatedState.pendingClarification).toBe(true);

      const step2 = ConversationalSandboxEngine.processUserMessage(
        'SO-2026-0042',
        step1.updatedState
      );

      expect(step2.updatedState.pendingClarification).toBe(false);
      expect(step2.updatedState.activeSalesOrderId).toBe('SO-2026-0042');
      expect(step2.responseMessages[0].content).not.toContain('Copilot Sandbox menerima instruksi');
      expect(step2.responseMessages[0].content).toContain('SO-2026-0042');
      expect(step2.responseMessages[0].semanticUnderstanding?.intent).toBe('RESOLVE_CLARIFICATION_CANDIDATE');
      expect(step2.responseMessages[0].semanticUnderstanding?.object).toBe('SALES_ORDER');
      expect(step2.responseMessages[0].semanticUnderstanding?.entity).toBe('SO-2026-0042');
    });
  });

  // ==========================================================================
  // 3. CASE B — RESOLUTION WITH SHIPMENT CANDIDATE
  // ==========================================================================
  describe('3. Case B: Clarification Answer with Shipment ("SHP-2026-0302")', () => {
    test('resolves pending clarification to Shipment SHP-2026-0302', () => {
      const state0: ConversationalContextState = { conversationHistory: [] };
      const step1 = ConversationalSandboxEngine.processUserMessage(
        'tolong urus yang surabaya',
        state0
      );
      expect(step1.updatedState.pendingClarification).toBe(true);

      const step2 = ConversationalSandboxEngine.processUserMessage(
        'SHP-2026-0302',
        step1.updatedState
      );

      expect(step2.updatedState.pendingClarification).toBe(false);
      expect(step2.updatedState.activeShipmentId).toBe('SHP-2026-0302');
      expect(step2.responseMessages[0].content).not.toContain('Copilot Sandbox menerima instruksi');
      expect(step2.responseMessages[0].content).toContain('SHP-2026-0302');
      expect(step2.responseMessages[0].semanticUnderstanding?.intent).toBe('RESOLVE_CLARIFICATION_CANDIDATE');
      expect(step2.responseMessages[0].semanticUnderstanding?.object).toBe('SHIPMENT');
      expect(step2.responseMessages[0].semanticUnderstanding?.entity).toBe('SHP-2026-0302');
    });
  });

  // ==========================================================================
  // 4. CASE C — NATURAL LANGUAGE VARIATIONS & CASE-INSENSITIVITY
  // ==========================================================================
  describe('4. Case C: Natural Language Variations & Case-Insensitivity', () => {
    test.each([
      ['jo-2026-0812'],
      ['  JO-2026-0812  '],
      ['yang JO-2026-0812'],
      ['nomor JO-2026-0812'],
      ['pilih JO-2026-0812'],
      ['tolong yang JO-2026-0812'],
    ])('resolves variation "%s" cleanly to JO-2026-0812', (input) => {
      const state0: ConversationalContextState = { conversationHistory: [] };
      const step1 = ConversationalSandboxEngine.processUserMessage(
        'tolong urus yang surabaya',
        state0
      );
      expect(step1.updatedState.pendingClarification).toBe(true);

      const step2 = ConversationalSandboxEngine.processUserMessage(
        input,
        step1.updatedState
      );

      expect(step2.updatedState.pendingClarification).toBe(false);
      expect(step2.updatedState.activeJobOrderId).toBe('JO-2026-0812');
      expect(step2.responseMessages[0].semanticUnderstanding?.intent).toBe('RESOLVE_CLARIFICATION_CANDIDATE');
      expect(step2.responseMessages[0].semanticUnderstanding?.entity).toBe('JO-2026-0812');
    });
  });

  // ==========================================================================
  // 5. CASE D — NON-CANDIDATE IDENTIFIER
  // ==========================================================================
  describe('5. Case D: Non-Candidate Identifier ("JO-2026-9999")', () => {
    test('non-candidate code does not falsely resolve clarification candidate', () => {
      const state0: ConversationalContextState = { conversationHistory: [] };
      const step1 = ConversationalSandboxEngine.processUserMessage(
        'tolong urus yang surabaya',
        state0
      );
      expect(step1.updatedState.pendingClarification).toBe(true);

      const step2 = ConversationalSandboxEngine.processUserMessage(
        'JO-2026-9999',
        step1.updatedState
      );

      // Must NOT match active clarification candidate
      expect(step2.responseMessages[0].semanticUnderstanding?.intent).not.toBe('RESOLVE_CLARIFICATION_CANDIDATE');
    });
  });

  // ==========================================================================
  // 6. CASE E — UNRELATED TEXT DURING CLARIFICATION
  // ==========================================================================
  describe('6. Case E: Unrelated Text During Clarification', () => {
    test('general greeting does not falsely resolve clarification candidate', () => {
      const state0: ConversationalContextState = { conversationHistory: [] };
      const step1 = ConversationalSandboxEngine.processUserMessage(
        'tolong urus yang surabaya',
        state0
      );
      expect(step1.updatedState.pendingClarification).toBe(true);

      const step2 = ConversationalSandboxEngine.processUserMessage(
        'halo',
        step1.updatedState
      );

      expect(step2.responseMessages[0].semanticUnderstanding?.intent).not.toBe('RESOLVE_CLARIFICATION_CANDIDATE');
    });
  });

  // ==========================================================================
  // 7. EXPLICIT LOOKUPS OUTSIDE CLARIFICATION
  // ==========================================================================
  describe('7. Explicit Code Lookups Outside Clarification', () => {
    test('direct query "JO-2026-0812" returns structured simulated details without fallback', () => {
      const state0: ConversationalContextState = { conversationHistory: [] };
      const step = ConversationalSandboxEngine.processUserMessage(
        'JO-2026-0812',
        state0
      );

      expect(step.responseMessages[0].content).not.toContain('Copilot Sandbox menerima instruksi');
      expect(step.responseMessages[0].content).toContain('JO-2026-0812');
      expect(step.updatedState.activeJobOrderId).toBe('JO-2026-0812');
      expect(step.responseMessages[0].dataSource).toBe('SIMULATED');
    });

    test('direct query "SO-2026-0042" returns structured simulated details without fallback', () => {
      const state0: ConversationalContextState = { conversationHistory: [] };
      const step = ConversationalSandboxEngine.processUserMessage(
        'SO-2026-0042',
        state0
      );

      expect(step.responseMessages[0].content).not.toContain('Copilot Sandbox menerima instruksi');
      expect(step.responseMessages[0].content).toContain('SO-2026-0042');
      expect(step.updatedState.activeSalesOrderId).toBe('SO-2026-0042');
      expect(step.responseMessages[0].dataSource).toBe('SIMULATED');
    });

    test('direct query "SHP-2026-0302" returns structured simulated details without fallback', () => {
      const state0: ConversationalContextState = { conversationHistory: [] };
      const step = ConversationalSandboxEngine.processUserMessage(
        'SHP-2026-0302',
        state0
      );

      expect(step.responseMessages[0].content).not.toContain('Copilot Sandbox menerima instruksi');
      expect(step.responseMessages[0].content).toContain('SHP-2026-0302');
      expect(step.updatedState.activeShipmentId).toBe('SHP-2026-0302');
      expect(step.responseMessages[0].dataSource).toBe('SIMULATED');
    });

    test('conversational query resolver clears unresolved ambiguity on direct code query', () => {
      const { context } = ConversationalQueryResolver.resolveQueryContext('JO-2026-0812', {
        activeFilters: { destination: 'Surabaya' },
        conversationTurn: 2,
        unresolvedAmbiguity: true,
      });

      expect(context.jobOrderNumber).toBe('JO-2026-0812');
      expect(context.unresolvedAmbiguity).toBe(false);
    });
  });

  // ==========================================================================
  // 8. STATIC BOUNDARY & INVARIANTS
  // ==========================================================================
  describe('8. Static Boundary & Architecture Invariants', () => {
    test('sandbox engine does not import mutation services or operational modules', () => {
      const engineSrc = fs.readFileSync(
        path.resolve(process.cwd(), 'lib/copilot/sandbox/sandbox-engine.ts'),
        'utf-8'
      );
      expect(engineSrc).not.toContain('execution-service');
      expect(engineSrc).not.toContain('JobOrderAssignmentService');
      expect(engineSrc).not.toContain('supabase.from');
    });

    test('all responses emitted have isExecuted: false', () => {
      const state0: ConversationalContextState = { conversationHistory: [] };
      const s1 = ConversationalSandboxEngine.processUserMessage('tolong urus yang surabaya', state0);
      const s2 = ConversationalSandboxEngine.processUserMessage('JO-2026-0812', s1.updatedState);
      const s3 = ConversationalSandboxEngine.processUserMessage('ganti driver untuk JO ini', s2.updatedState);
      const s4 = ConversationalSandboxEngine.processUserMessage('sudah diganti drivernya?', s3.updatedState);

      const allMessages = [
        ...s1.responseMessages,
        ...s2.responseMessages,
        ...s3.responseMessages,
        ...s4.responseMessages,
      ];

      for (const msg of allMessages) {
        expect(msg.isExecuted).toBe(false);
      }
    });
  });
});
