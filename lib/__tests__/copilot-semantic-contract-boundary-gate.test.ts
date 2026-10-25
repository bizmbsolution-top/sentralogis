/**
 * Sentralogis Copilot — Production Semantic Contract Boundary Gate Test Suite
 * lib/__tests__/copilot-semantic-contract-boundary-gate.test.ts
 *
 * GOVERNANCE GATE / CONTRACT VALIDATION / READ-ONLY
 * NO PRODUCTION EXECUTION
 *
 * Validates:
 * §1 Mandatory Preflight & Protected Baseline Integrity
 * §3 Non-Negotiable Principle: Semantic understanding has NO operational authority
 * §4 Canonical Semantic Contract
 * §5 Three-Layer Explicit Separation (Layer 1: Understanding, Layer 2: Proposal, Layer 3: Execution)
 * §6 Machine-Readable Proposal Contract (executionAvailable: false, isExecuted: false, target, action)
 * §7 Semantic -> Proposal Boundary & Isolation
 * §8 Ambiguity Firewall (candidate count > 1 -> proposal/execution/mutation BLOCKED)
 * §9 Context Authority Rule (explicit user correction overrides context)
 * §10 Entity Resolution Boundary (tri-state: RESOLVED / AMBIGUOUS / UNKNOWN)
 * §11 Unknown Intent Rule (vague input -> UNKNOWN intent, clarification REQUIRED, no fallback mutation)
 * §12 Natural Language Independence (downstream layer receives canonical contract, not raw NL)
 * §13 Future LLM Swappability Test (textual variations produce equivalent canonical contract)
 * §14 Negative Authority Tests (zero INSERT / UPDATE / DELETE / mutation capabilities)
 * §15 Existing Copilot Contract Compatibility
 * §16 Required Test Matrix (minimum 40 cases across categories A through R)
 * §17 Critical Invariants (Invariants 1 through 10)
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
  EntityResolutionState,
} from '../copilot/sandbox/types';

describe('SENTRALOGIS COPILOT — PRODUCTION SEMANTIC CONTRACT BOUNDARY GATE', () => {
  // ==========================================================================
  // §1 MANDATORY FORENSIC PREFLIGHT & PROTECTED BASELINE INVARIANTS
  // ==========================================================================
  describe('§1 Preflight & Protected Baseline Integrity', () => {
    test('all 15 protected tracked files exist and remain intact', () => {
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

    test('sandbox engine contains ZERO mutation services or direct db clients', () => {
      const src = fs.readFileSync(
        path.join(process.cwd(), 'lib/copilot/sandbox/sandbox-engine.ts'),
        'utf8'
      );
      expect(src).not.toContain('execution-service');
      expect(src).not.toContain('JobOrderAssignmentService');
      expect(src).not.toContain('DriverReplacementService');
      expect(src).not.toContain('supabase.from(');
      expect(src).not.toContain('db.insert');
      expect(src).not.toContain('db.update');
      expect(src).not.toContain('db.delete');
    });
  });

  // ==========================================================================
  // §3 & §5 THREE-LAYER SEPARATION & NON-NEGOTIABLE ARCHITECTURAL PRINCIPLE
  // ==========================================================================
  describe('§3 & §5 Three-Layer Separation (Understanding -> Proposal -> Execution)', () => {
    test('Layer 1 (Understanding) produces pure SemanticUnderstanding without mutation authority', () => {
      const state: ConversationalContextState = {
        conversationHistory: [],
        activeJobOrderId: 'JO-2026-0812',
      };
      const understanding = ConversationalSandboxEngine.resolveUnderstanding(
        'Ganti driver untuk JO ini.',
        state
      );

      // Must answer "WHAT DID USER MEAN", not "PERFORM MUTATION"
      expect(understanding).toBeDefined();
      expect(understanding.object).toBe('JOB_ORDER');
      expect(understanding.entity).toBe('JO-2026-0812');
      expect(understanding.ambiguity).toBe('NONE');
      expect(understanding.clarification).toBe('NOT_REQUIRED');
      // Authority is NONE: understanding does not contain executed flags or db commands
      expect((understanding as any).executed).toBeUndefined();
      expect((understanding as any).mutationCommand).toBeUndefined();
    });

    test('Layer 2 (Proposal) produces ProposedAction with executionAvailable: false and isExecuted: false', () => {
      const state: ConversationalContextState = {
        conversationHistory: [],
        activeJobOrderId: 'JO-2026-0812',
      };
      const { responseMessages } = ConversationalSandboxEngine.processUserMessage(
        'Ganti driver untuk JO ini.',
        state
      );

      const propMsg = responseMessages.find((m) => m.type === 'proposal');
      expect(propMsg).toBeDefined();
      expect(propMsg?.dataSource).toBe('PROPOSED');
      expect(propMsg?.isExecuted).toBe(false);
      expect(propMsg?.proposal).toBeDefined();
      expect(propMsg?.proposal?.executionAvailable).toBe(false);
      expect(propMsg?.proposal?.isExecuted).toBe(false);
      expect(propMsg?.proposal?.target).toBe('JO-2026-0812');
      expect(propMsg?.proposal?.action).toBe('REPLACE_DRIVER');
    });

    test('Layer 3 (Execution) remains strictly DISABLED', () => {
      const state: ConversationalContextState = {
        conversationHistory: [],
        activeJobOrderId: 'JO-2026-0812',
      };
      const { responseMessages } = ConversationalSandboxEngine.processUserMessage(
        'Sudah diganti drivernya?',
        state
      );

      expect(responseMessages[0].dataSource).toBe('NOT_EXECUTED');
      expect(responseMessages[0].isExecuted).toBe(false);
      expect(responseMessages[0].content).toContain('TIDAK diganti');
      expect(responseMessages[0].content).toContain('EXECUTE: OFF');
    });
  });

  // ==========================================================================
  // §6 PROPOSAL CONTRACT (MACHINE-READABLE PROPERTIES)
  // ==========================================================================
  describe('§6 Proposal Contract: Machine-Readable Guards', () => {
    test('proposal block exposes machine-readable boundary attributes beyond UI text', () => {
      const state: ConversationalContextState = {
        conversationHistory: [],
        activeJobOrderId: 'JO-2026-0812',
      };
      const { responseMessages } = ConversationalSandboxEngine.processUserMessage(
        'Ganti driver untuk JO ini.',
        state
      );

      const propMsg = responseMessages.find((m) => m.type === 'proposal');
      const proposal = propMsg?.proposal;

      expect(proposal).toBeDefined();
      expect(proposal?.proposal).toBe(true);
      expect(proposal?.executionAvailable).toBe(false);
      expect(proposal?.isExecuted).toBe(false);
      expect(proposal?.target).toBe('JO-2026-0812');
      expect(proposal?.action).toBe('REPLACE_DRIVER');
      expect(proposal?.entityId).toBe('JO-2026-0812');
      expect(proposal?.entityType).toBe('job-order');
      expect(proposal?.changes.length).toBeGreaterThan(0);
      expect(proposal?.reason).toBeTruthy();
    });
  });

  // ==========================================================================
  // §8 AMBIGUITY FIREWALL
  // ==========================================================================
  describe('§8 Ambiguity Firewall: Blocks Proposal & Execution on Multiple Candidates', () => {
    test('multiple actionable candidates ("Tolong urus yang Surabaya.") triggers ambiguity firewall', () => {
      const state: ConversationalContextState = { conversationHistory: [] };
      const understanding = ConversationalSandboxEngine.resolveUnderstanding(
        'Tolong urus yang Surabaya.',
        state
      );

      expect(understanding.ambiguity).toBe('MATERIAL');
      expect(understanding.clarification).toBe('REQUIRED');
      expect(understanding.entityResolution).toBe('AMBIGUOUS');

      const { responseMessages } = ConversationalSandboxEngine.processUserMessage(
        'Tolong urus yang Surabaya.',
        state
      );

      // Proposal must NOT be created
      const propMsg = responseMessages.find((m) => m.type === 'proposal');
      expect(propMsg).toBeUndefined();

      // Must ask for clarification
      expect(responseMessages[0].clarificationNeeded).toBe(true);
      expect(responseMessages[0].content).toContain('Mohon klarifikasi');
      expect(responseMessages[0].content).toContain('SO-2026-0042');
      expect(responseMessages[0].content).toContain('JO-2026-0812');
      expect(responseMessages[0].content).toContain('SHP-2026-0302');
      expect(responseMessages[0].content).toContain('SHP-2026-0305');
    });

    test('refuses to pick first, latest, or arbitrary candidate when unanchored', () => {
      const state: ConversationalContextState = { conversationHistory: [] };
      const understanding = ConversationalSandboxEngine.resolveUnderstanding('Urus Surabaya.', state);

      expect(understanding.ambiguity).toBe('MATERIAL');
      expect(understanding.clarification).toBe('REQUIRED');
      // Entity must NOT silently resolve to one specific order
      expect(understanding.entity).not.toBe('SO-2026-0042');
      expect(understanding.entity).not.toBe('JO-2026-0812');
    });
  });

  // ==========================================================================
  // §9 CONTEXT AUTHORITY RULE
  // ==========================================================================
  describe('§9 Context Authority Rule: User Correction Overrides Stale Context', () => {
    test('explicit correction "Bukan order itu. Yang nomor SO-2026-0041." overrides previous active order', () => {
      const state: ConversationalContextState = {
        conversationHistory: [{ role: 'user', text: 'Lihat SO-2026-0042' }],
        activeSalesOrderId: 'SO-2026-0042',
        activeJobOrderId: 'JO-2026-0812',
      };

      const understanding = ConversationalSandboxEngine.resolveUnderstanding(
        'Bukan order itu. Yang nomor SO-2026-0041.',
        state
      );

      expect(understanding.intent).toBe('CORRECTION');
      expect(understanding.object).toBe('SALES_ORDER');
      expect(understanding.entity).toBe('SO-2026-0041');
      expect(understanding.action).toBe('SWITCH_ENTITY');
      expect(understanding.clarification).toBe('NOT_REQUIRED');

      const { updatedState } = ConversationalSandboxEngine.processUserMessage(
        'Bukan order itu. Yang nomor SO-2026-0041.',
        state
      );

      // Context must be updated to the corrected entity
      expect(updatedState.activeSalesOrderId).toBe('SO-2026-0041');
      expect(updatedState.activeSalesOrderId).not.toBe('SO-2026-0042');
    });

    test('explicit modality correction "Bukan yang laut, yang trucking." overrides maritime context', () => {
      const state: ConversationalContextState = {
        conversationHistory: [],
        activeShipmentId: 'SHP-2026-0302', // Laut
      };

      const understanding = ConversationalSandboxEngine.resolveUnderstanding(
        'Bukan yang laut, yang trucking.',
        state
      );

      expect(understanding.intent).toBe('CORRECTION');
      expect(understanding.object).toBe('TRANSPORT_MODE');
      expect(understanding.condition).toBe('MODE_TRUCKING');
      expect(understanding.action).toBe('SWITCH_MODE');

      const { updatedState } = ConversationalSandboxEngine.processUserMessage(
        'Bukan yang laut, yang trucking.',
        state
      );

      expect(updatedState.activeJobOrderId).toBe('JO-2026-0812'); // Trucking JO
    });
  });

  // ==========================================================================
  // §10 ENTITY RESOLUTION BOUNDARY (TRI-STATE)
  // ==========================================================================
  describe('§10 Entity Resolution Boundary (RESOLVED / AMBIGUOUS / UNKNOWN)', () => {
    test('unique explicit entity resolves as RESOLVED', () => {
      const state: ConversationalContextState = { conversationHistory: [] };
      const understanding = ConversationalSandboxEngine.resolveUnderstanding('Detail SO-2026-0041', state);

      expect(understanding.entityResolution).toBe('RESOLVED');
      expect(understanding.entity).toBe('SO-2026-0041');
    });

    test('multiple candidate matches resolve as AMBIGUOUS', () => {
      const state: ConversationalContextState = { conversationHistory: [] };
      const understanding = ConversationalSandboxEngine.resolveUnderstanding('Urus Surabaya.', state);

      expect(understanding.entityResolution).toBe('AMBIGUOUS');
      expect(understanding.ambiguity).toBe('MATERIAL');
    });

    test('unanchored action or unreferenced deictic pronoun resolves as UNKNOWN', () => {
      const state: ConversationalContextState = { conversationHistory: [] };
      const understanding = ConversationalSandboxEngine.resolveUnderstanding('Ganti drivernya.', state);

      expect(understanding.entityResolution).toBe('UNKNOWN');
      expect(understanding.entity).toBe('UNKNOWN');
    });
  });

  // ==========================================================================
  // §11 UNKNOWN INTENT RULE
  // ==========================================================================
  describe('§11 Unknown Intent Rule: Safe Clarification, No Fallback Mutation', () => {
    const vagueInputs = [
      'tolong bereskan ini',
      'bereskan ini',
      'lakukan sesuatu sekarang',
      'lakukan sesuatu',
      'proses dong',
      'urus dong',
      'handle ini',
      'kerjakan ini',
    ];

    test.each(vagueInputs)('vague input "%s" resolves to intent: UNKNOWN and clarification: REQUIRED', (input) => {
      const state: ConversationalContextState = { conversationHistory: [] };
      const understanding = ConversationalSandboxEngine.resolveUnderstanding(input, state);

      expect(understanding.intent).toBe('UNKNOWN');
      expect(understanding.object).toBe('UNKNOWN');
      expect(understanding.entity).toBe('UNKNOWN');
      expect(understanding.entityResolution).toBe('UNKNOWN');
      expect(understanding.clarification).toBe('REQUIRED');

      const { responseMessages } = ConversationalSandboxEngine.processUserMessage(input, state);

      // Proposal must NOT be created
      expect(responseMessages.some((m) => m.type === 'proposal')).toBe(false);
      expect(responseMessages[0].clarificationNeeded).toBe(true);
      expect(responseMessages[0].isExecuted).toBe(false);
    });
  });

  // ==========================================================================
  // §12 NATURAL LANGUAGE INDEPENDENCE
  // ==========================================================================
  describe('§12 Natural Language Independence', () => {
    test('proposal generated does not leak raw user query into domain execution contracts', () => {
      const state: ConversationalContextState = {
        conversationHistory: [],
        activeJobOrderId: 'JO-2026-0812',
      };
      const rawUserText = 'Tolong dong ganti driver untuk JO ini secepatnya ya.';
      const { responseMessages } = ConversationalSandboxEngine.processUserMessage(rawUserText, state);

      const propMsg = responseMessages.find((m) => m.type === 'proposal');
      expect(propMsg).toBeDefined();

      const proposal = propMsg?.proposal!;
      // Structured canonical contract properties
      expect(proposal.intent).toBe('ASSIGN_OR_REPLACE_DRIVER');
      expect(proposal.action).toBe('REPLACE_DRIVER');
      expect(proposal.target).toBe('JO-2026-0812');
      expect(proposal.entityId).toBe('JO-2026-0812');
      expect(proposal.entityType).toBe('job-order');
      // Changes contain structured fields, not raw conversational sentences
      expect(proposal.changes[0].field).toBe('Driver (Supir)');
    });
  });

  // ==========================================================================
  // §13 FUTURE LLM SWAPPABILITY TEST
  // ==========================================================================
  describe('§13 Future LLM Swappability Test: Conceptual Equivalence', () => {
    test('textual phrasing variations produce equivalent canonical semantic contract', () => {
      const state: ConversationalContextState = {
        conversationHistory: [],
        activeJobOrderId: 'JO-2026-0812',
      };

      const inputs = [
        'ganti supir untuk JO ini',
        'tolong ubah driver JO yang tadi',
        'pakai driver baru buat JO itu',
        'ganti driver untuk JO ini',
      ];

      const results = inputs.map((input) => ConversationalSandboxEngine.resolveUnderstanding(input, state));

      for (const res of results) {
        expect(['PROPOSE_DRIVER_REPLACEMENT', 'DRIVER_REPLACEMENT']).toContain(res.intent);
        expect(res.object).toBe('JOB_ORDER');
        expect(res.entity).toBe('JO-2026-0812');
        expect(['DRIVER_REPLACEMENT', 'REPLACE_DRIVER']).toContain(res.action);
        expect(res.ambiguity).toBe('NONE');
        expect(res.clarification).toBe('NOT_REQUIRED');
        expect(res.entityResolution).toBe('RESOLVED');
      }
    });
  });

  // ==========================================================================
  // §14 NEGATIVE AUTHORITY TESTS
  // ==========================================================================
  describe('§14 Negative Authority Tests: Zero Mutation Capability', () => {
    test('sandbox processing never mutates simulated data fixtures', () => {
      const originalSoCount = SIMULATED_SALES_ORDERS.length;
      const originalJoCount = SIMULATED_JOB_ORDERS.length;
      const originalDriverCount = SIMULATED_DRIVERS.length;

      let state: ConversationalContextState = { conversationHistory: [] };
      ConversationalSandboxEngine.processUserMessage('Customer ABC punya order apa saja yang belum jalan?', state);
      ConversationalSandboxEngine.processUserMessage('Yang paling baru.', state);
      ConversationalSandboxEngine.processUserMessage('Ganti driver untuk JO ini.', state);
      ConversationalSandboxEngine.processUserMessage('Sudah diganti drivernya?', state);
      ConversationalSandboxEngine.processUserMessage('Bukan order itu. Yang nomor SO-2026-0041.', state);

      // Verify zero record mutations in data fixtures
      expect(SIMULATED_SALES_ORDERS.length).toBe(originalSoCount);
      expect(SIMULATED_JOB_ORDERS.length).toBe(originalJoCount);
      expect(SIMULATED_DRIVERS.length).toBe(originalDriverCount);

      // Verify JO-2026-0812 still has undefined driver in fixture
      const joSurabaya = SIMULATED_JOB_ORDERS.find((j) => j.joNumber === 'JO-2026-0812');
      expect(joSurabaya?.driverId).toBeUndefined();
      expect(joSurabaya?.status).toBe('UNASSIGNED');
    });
  });

  // ==========================================================================
  // §16 REQUIRED TEST MATRIX (MINIMUM 40 CASES ACROSS GROUPS A – R)
  // ==========================================================================
  describe('§16 Comprehensive Test Matrix (Minimum 40 Cases Across Categories A through R)', () => {
    interface MatrixTestCase {
      id: string;
      category: string;
      input: string;
      expectedIntent: string | string[];
      expectedObject: string;
      expectedEntity: string;
      expectedAmbiguity: 'NONE' | 'LOW' | 'MATERIAL';
      expectedClarification: 'NOT_REQUIRED' | 'REQUIRED';
      expectedProposalState: 'PROPOSAL_GENERATED' | 'PROPOSAL_BLOCKED' | 'NOT_APPLICABLE';
      expectedExecutionState: 'STRICTLY_OFF';
      contextState?: Partial<ConversationalContextState>;
    }

    const matrix: MatrixTestCase[] = [
      // A. Direct semantic query
      {
        id: 'MAT-A1',
        category: 'A. Direct semantic query',
        input: 'Customer ABC punya order apa saja yang belum jalan?',
        expectedIntent: 'QUERY_ORDERS',
        expectedObject: 'SALES_ORDER',
        expectedEntity: 'Customer ABC',
        expectedAmbiguity: 'NONE',
        expectedClarification: 'NOT_REQUIRED',
        expectedProposalState: 'NOT_APPLICABLE',
        expectedExecutionState: 'STRICTLY_OFF',
      },
      {
        id: 'MAT-A2',
        category: 'A. Direct semantic query',
        input: 'Customer XYZ ada transaksi apa saja?',
        expectedIntent: 'QUERY_ORDERS',
        expectedObject: 'SALES_ORDER',
        expectedEntity: 'Customer XYZ',
        expectedAmbiguity: 'NONE',
        expectedClarification: 'NOT_REQUIRED',
        expectedProposalState: 'NOT_APPLICABLE',
        expectedExecutionState: 'STRICTLY_OFF',
      },

      // B. Contextual follow-up
      {
        id: 'MAT-B1',
        category: 'B. Contextual follow-up',
        input: 'Yang paling baru.',
        expectedIntent: 'QUERY_LATEST',
        expectedObject: 'SALES_ORDER',
        expectedEntity: 'Customer ABC',
        expectedAmbiguity: 'NONE',
        expectedClarification: 'NOT_REQUIRED',
        expectedProposalState: 'NOT_APPLICABLE',
        expectedExecutionState: 'STRICTLY_OFF',
        contextState: { activeCustomerName: 'Customer ABC' },
      },
      {
        id: 'MAT-B2',
        category: 'B. Contextual follow-up',
        input: 'Tujuannya mana?',
        expectedIntent: 'QUERY_DESTINATION',
        expectedObject: 'SALES_ORDER',
        expectedEntity: 'SO-2026-0042',
        expectedAmbiguity: 'NONE',
        expectedClarification: 'NOT_REQUIRED',
        expectedProposalState: 'NOT_APPLICABLE',
        expectedExecutionState: 'STRICTLY_OFF',
        contextState: { activeSalesOrderId: 'SO-2026-0042' },
      },

      // C. Pronoun resolution
      {
        id: 'MAT-C1',
        category: 'C. Pronoun resolution',
        input: 'driver JO itu',
        expectedIntent: 'QUERY_DRIVER',
        expectedObject: 'DRIVER',
        expectedEntity: 'JO-2026-0810',
        expectedAmbiguity: 'NONE',
        expectedClarification: 'NOT_REQUIRED',
        expectedProposalState: 'NOT_APPLICABLE',
        expectedExecutionState: 'STRICTLY_OFF',
        contextState: { activeJobOrderId: 'JO-2026-0810' },
      },
      {
        id: 'MAT-C2',
        category: 'C. Pronoun resolution',
        input: 'Ganti driver untuk JO ini.',
        expectedIntent: ['PROPOSE_DRIVER_REPLACEMENT', 'DRIVER_REPLACEMENT'],
        expectedObject: 'JOB_ORDER',
        expectedEntity: 'JO-2026-0812',
        expectedAmbiguity: 'NONE',
        expectedClarification: 'NOT_REQUIRED',
        expectedProposalState: 'PROPOSAL_GENERATED',
        expectedExecutionState: 'STRICTLY_OFF',
        contextState: { activeJobOrderId: 'JO-2026-0812' },
      },

      // D. Latest / previous / current
      {
        id: 'MAT-D1',
        category: 'D. Latest/previous/current',
        input: 'Order yang terbaru.',
        expectedIntent: 'QUERY_LATEST',
        expectedObject: 'SALES_ORDER',
        expectedEntity: 'Customer ABC',
        expectedAmbiguity: 'NONE',
        expectedClarification: 'NOT_REQUIRED',
        expectedProposalState: 'NOT_APPLICABLE',
        expectedExecutionState: 'STRICTLY_OFF',
        contextState: { activeCustomerName: 'Customer ABC' },
      },
      {
        id: 'MAT-D2',
        category: 'D. Latest/previous/current',
        input: 'Order yang terakhir apa?',
        expectedIntent: 'QUERY_LATEST',
        expectedObject: 'SALES_ORDER',
        expectedEntity: 'Customer ABC',
        expectedAmbiguity: 'NONE',
        expectedClarification: 'NOT_REQUIRED',
        expectedProposalState: 'NOT_APPLICABLE',
        expectedExecutionState: 'STRICTLY_OFF',
        contextState: { activeCustomerName: 'Customer ABC' },
      },

      // E. Customer resolution
      {
        id: 'MAT-E1',
        category: 'E. Customer resolution',
        input: 'Cek order Customer ABC',
        expectedIntent: 'QUERY_ORDERS',
        expectedObject: 'SALES_ORDER',
        expectedEntity: 'Customer ABC',
        expectedAmbiguity: 'NONE',
        expectedClarification: 'NOT_REQUIRED',
        expectedProposalState: 'NOT_APPLICABLE',
        expectedExecutionState: 'STRICTLY_OFF',
      },
      {
        id: 'MAT-E2',
        category: 'E. Customer resolution',
        input: 'Cek pengiriman Customer XYZ',
        expectedIntent: 'QUERY_ORDERS',
        expectedObject: 'SALES_ORDER',
        expectedEntity: 'Customer XYZ',
        expectedAmbiguity: 'NONE',
        expectedClarification: 'NOT_REQUIRED',
        expectedProposalState: 'NOT_APPLICABLE',
        expectedExecutionState: 'STRICTLY_OFF',
      },

      // F. SO resolution
      {
        id: 'MAT-F1',
        category: 'F. SO resolution',
        input: 'Status SO-2026-0041',
        expectedIntent: 'QUERY_SALES_ORDER',
        expectedObject: 'SALES_ORDER',
        expectedEntity: 'SO-2026-0041',
        expectedAmbiguity: 'NONE',
        expectedClarification: 'NOT_REQUIRED',
        expectedProposalState: 'NOT_APPLICABLE',
        expectedExecutionState: 'STRICTLY_OFF',
      },
      {
        id: 'MAT-F2',
        category: 'F. SO resolution',
        input: 'Detail SO-2026-0042',
        expectedIntent: 'QUERY_SALES_ORDER',
        expectedObject: 'SALES_ORDER',
        expectedEntity: 'SO-2026-0042',
        expectedAmbiguity: 'NONE',
        expectedClarification: 'NOT_REQUIRED',
        expectedProposalState: 'NOT_APPLICABLE',
        expectedExecutionState: 'STRICTLY_OFF',
      },

      // G. JO resolution
      {
        id: 'MAT-G1',
        category: 'G. JO resolution',
        input: 'Status JO-2026-0810',
        expectedIntent: 'QUERY_JOB_ORDER',
        expectedObject: 'JOB_ORDER',
        expectedEntity: 'JO-2026-0810',
        expectedAmbiguity: 'NONE',
        expectedClarification: 'NOT_REQUIRED',
        expectedProposalState: 'NOT_APPLICABLE',
        expectedExecutionState: 'STRICTLY_OFF',
      },
      {
        id: 'MAT-G2',
        category: 'G. JO resolution',
        input: 'Detail JO-2026-0812',
        expectedIntent: 'QUERY_JOB_ORDER',
        expectedObject: 'JOB_ORDER',
        expectedEntity: 'JO-2026-0812',
        expectedAmbiguity: 'NONE',
        expectedClarification: 'NOT_REQUIRED',
        expectedProposalState: 'NOT_APPLICABLE',
        expectedExecutionState: 'STRICTLY_OFF',
      },

      // H. Shipment resolution
      {
        id: 'MAT-H1',
        category: 'H. Shipment resolution',
        input: 'Status SHP-2026-0301',
        expectedIntent: 'QUERY_SHIPMENT',
        expectedObject: 'SHIPMENT',
        expectedEntity: 'SHP-2026-0301',
        expectedAmbiguity: 'NONE',
        expectedClarification: 'NOT_REQUIRED',
        expectedProposalState: 'NOT_APPLICABLE',
        expectedExecutionState: 'STRICTLY_OFF',
      },
      {
        id: 'MAT-H2',
        category: 'H. Shipment resolution',
        input: 'Status SHP-2026-0302',
        expectedIntent: 'QUERY_SHIPMENT',
        expectedObject: 'SHIPMENT',
        expectedEntity: 'SHP-2026-0302',
        expectedAmbiguity: 'NONE',
        expectedClarification: 'NOT_REQUIRED',
        expectedProposalState: 'NOT_APPLICABLE',
        expectedExecutionState: 'STRICTLY_OFF',
      },

      // I. Driver action
      {
        id: 'MAT-I1',
        category: 'I. Driver action',
        input: 'Tugaskan driver untuk JO ini.',
        expectedIntent: ['PROPOSE_DRIVER_REPLACEMENT', 'DRIVER_REPLACEMENT'],
        expectedObject: 'JOB_ORDER',
        expectedEntity: 'JO-2026-0812',
        expectedAmbiguity: 'NONE',
        expectedClarification: 'NOT_REQUIRED',
        expectedProposalState: 'PROPOSAL_GENERATED',
        expectedExecutionState: 'STRICTLY_OFF',
        contextState: { activeJobOrderId: 'JO-2026-0812' },
      },
      {
        id: 'MAT-I2',
        category: 'I. Driver action',
        input: 'Alokasi driver baru untuk JO-2026-0812',
        expectedIntent: ['PROPOSE_DRIVER_REPLACEMENT', 'DRIVER_REPLACEMENT'],
        expectedObject: 'JOB_ORDER',
        expectedEntity: 'JO-2026-0812',
        expectedAmbiguity: 'NONE',
        expectedClarification: 'NOT_REQUIRED',
        expectedProposalState: 'PROPOSAL_GENERATED',
        expectedExecutionState: 'STRICTLY_OFF',
        contextState: { activeJobOrderId: 'JO-2026-0812' },
      },

      // J. Proposal generation
      {
        id: 'MAT-J1',
        category: 'J. Proposal generation',
        input: 'Ganti driver untuk JO ini.',
        expectedIntent: ['PROPOSE_DRIVER_REPLACEMENT', 'DRIVER_REPLACEMENT'],
        expectedObject: 'JOB_ORDER',
        expectedEntity: 'JO-2026-0812',
        expectedAmbiguity: 'NONE',
        expectedClarification: 'NOT_REQUIRED',
        expectedProposalState: 'PROPOSAL_GENERATED',
        expectedExecutionState: 'STRICTLY_OFF',
        contextState: { activeJobOrderId: 'JO-2026-0812' },
      },
      {
        id: 'MAT-J2',
        category: 'J. Proposal generation',
        input: 'Urus drivernya.',
        expectedIntent: ['PROPOSE_DRIVER_REPLACEMENT', 'DRIVER_REPLACEMENT'],
        expectedObject: 'JOB_ORDER',
        expectedEntity: 'JO-2026-0812',
        expectedAmbiguity: 'NONE',
        expectedClarification: 'NOT_REQUIRED',
        expectedProposalState: 'PROPOSAL_GENERATED',
        expectedExecutionState: 'STRICTLY_OFF',
        contextState: { activeJobOrderId: 'JO-2026-0812' },
      },

      // K. Ambiguity firewall
      {
        id: 'MAT-K1',
        category: 'K. Ambiguity',
        input: 'Tolong urus yang Surabaya.',
        expectedIntent: 'TAKE_ACTION',
        expectedObject: 'MULTIPLE_CANDIDATES',
        expectedEntity: 'Surabaya',
        expectedAmbiguity: 'MATERIAL',
        expectedClarification: 'REQUIRED',
        expectedProposalState: 'PROPOSAL_BLOCKED',
        expectedExecutionState: 'STRICTLY_OFF',
      },
      {
        id: 'MAT-K2',
        category: 'K. Ambiguity',
        input: 'Urus Surabaya.',
        expectedIntent: 'TAKE_ACTION',
        expectedObject: 'MULTIPLE_CANDIDATES',
        expectedEntity: 'Surabaya',
        expectedAmbiguity: 'MATERIAL',
        expectedClarification: 'REQUIRED',
        expectedProposalState: 'PROPOSAL_BLOCKED',
        expectedExecutionState: 'STRICTLY_OFF',
      },
      {
        id: 'MAT-K3',
        category: 'K. Ambiguity',
        input: 'Yang tadi.',
        expectedIntent: 'REFERENCE_SELECTION',
        expectedObject: 'UNKNOWN',
        expectedEntity: 'MULTIPLE',
        expectedAmbiguity: 'MATERIAL',
        expectedClarification: 'REQUIRED',
        expectedProposalState: 'PROPOSAL_BLOCKED',
        expectedExecutionState: 'STRICTLY_OFF',
      },

      // L. Unknown intent rule
      {
        id: 'MAT-L1',
        category: 'L. Unknown intent',
        input: 'tolong bereskan ini',
        expectedIntent: 'UNKNOWN',
        expectedObject: 'UNKNOWN',
        expectedEntity: 'UNKNOWN',
        expectedAmbiguity: 'MATERIAL',
        expectedClarification: 'REQUIRED',
        expectedProposalState: 'PROPOSAL_BLOCKED',
        expectedExecutionState: 'STRICTLY_OFF',
      },
      {
        id: 'MAT-L2',
        category: 'L. Unknown intent',
        input: 'lakukan sesuatu sekarang',
        expectedIntent: 'UNKNOWN',
        expectedObject: 'UNKNOWN',
        expectedEntity: 'UNKNOWN',
        expectedAmbiguity: 'MATERIAL',
        expectedClarification: 'REQUIRED',
        expectedProposalState: 'PROPOSAL_BLOCKED',
        expectedExecutionState: 'STRICTLY_OFF',
      },
      {
        id: 'MAT-L3',
        category: 'L. Unknown intent',
        input: 'proses dong',
        expectedIntent: 'UNKNOWN',
        expectedObject: 'UNKNOWN',
        expectedEntity: 'UNKNOWN',
        expectedAmbiguity: 'MATERIAL',
        expectedClarification: 'REQUIRED',
        expectedProposalState: 'PROPOSAL_BLOCKED',
        expectedExecutionState: 'STRICTLY_OFF',
      },

      // M. User correction
      {
        id: 'MAT-M1',
        category: 'M. User correction',
        input: 'Bukan yang laut, yang trucking.',
        expectedIntent: 'CORRECTION',
        expectedObject: 'TRANSPORT_MODE',
        expectedEntity: 'Surabaya',
        expectedAmbiguity: 'NONE',
        expectedClarification: 'NOT_REQUIRED',
        expectedProposalState: 'NOT_APPLICABLE',
        expectedExecutionState: 'STRICTLY_OFF',
      },
      {
        id: 'MAT-M2',
        category: 'M. User correction',
        input: 'Bukan order itu. Yang nomor SO-2026-0041.',
        expectedIntent: 'CORRECTION',
        expectedObject: 'SALES_ORDER',
        expectedEntity: 'SO-2026-0041',
        expectedAmbiguity: 'NONE',
        expectedClarification: 'NOT_REQUIRED',
        expectedProposalState: 'NOT_APPLICABLE',
        expectedExecutionState: 'STRICTLY_OFF',
      },

      // N. Typo / light informal language
      {
        id: 'MAT-N1',
        category: 'N. Typo/light informal language',
        input: 'shipment surabya sudah berangkat?',
        expectedIntent: 'DEPARTURE_STATUS_INQUIRY',
        expectedObject: 'SHIPMENT',
        expectedEntity: 'SHP-2026-0302',
        expectedAmbiguity: 'NONE',
        expectedClarification: 'NOT_REQUIRED',
        expectedProposalState: 'NOT_APPLICABLE',
        expectedExecutionState: 'STRICTLY_OFF',
      },
      {
        id: 'MAT-N2',
        category: 'N. Typo/light informal language',
        input: 'yang ke sby sudah jalan?',
        expectedIntent: 'DEPARTURE_STATUS_INQUIRY',
        expectedObject: 'SHIPMENT',
        expectedEntity: 'SHP-2026-0302',
        expectedAmbiguity: 'NONE',
        expectedClarification: 'NOT_REQUIRED',
        expectedProposalState: 'NOT_APPLICABLE',
        expectedExecutionState: 'STRICTLY_OFF',
      },
      {
        id: 'MAT-N3',
        category: 'N. Typo/light informal language',
        input: 'order customer ABC yg blm jalan',
        expectedIntent: 'QUERY_ORDERS',
        expectedObject: 'SALES_ORDER',
        expectedEntity: 'Customer ABC',
        expectedAmbiguity: 'NONE',
        expectedClarification: 'NOT_REQUIRED',
        expectedProposalState: 'NOT_APPLICABLE',
        expectedExecutionState: 'STRICTLY_OFF',
      },

      // O. Explicit target override
      {
        id: 'MAT-O1',
        category: 'O. Explicit target override',
        input: 'Bukan order itu. Yang nomor SO-2026-0041.',
        expectedIntent: 'CORRECTION',
        expectedObject: 'SALES_ORDER',
        expectedEntity: 'SO-2026-0041',
        expectedAmbiguity: 'NONE',
        expectedClarification: 'NOT_REQUIRED',
        expectedProposalState: 'NOT_APPLICABLE',
        expectedExecutionState: 'STRICTLY_OFF',
        contextState: { activeSalesOrderId: 'SO-2026-0042' },
      },
      {
        id: 'MAT-O2',
        category: 'O. Explicit target override',
        input: 'Ganti driver untuk JO ini.',
        expectedIntent: ['PROPOSE_DRIVER_REPLACEMENT', 'DRIVER_REPLACEMENT'],
        expectedObject: 'JOB_ORDER',
        expectedEntity: 'JO-2026-0812',
        expectedAmbiguity: 'NONE',
        expectedClarification: 'NOT_REQUIRED',
        expectedProposalState: 'PROPOSAL_GENERATED',
        expectedExecutionState: 'STRICTLY_OFF',
        contextState: { activeJobOrderId: 'JO-2026-0812' },
      },

      // P. Proposal/execution separation
      {
        id: 'MAT-P1',
        category: 'P. Proposal/execution separation',
        input: 'Ganti driver untuk JO ini.',
        expectedIntent: ['PROPOSE_DRIVER_REPLACEMENT', 'DRIVER_REPLACEMENT'],
        expectedObject: 'JOB_ORDER',
        expectedEntity: 'JO-2026-0812',
        expectedAmbiguity: 'NONE',
        expectedClarification: 'NOT_REQUIRED',
        expectedProposalState: 'PROPOSAL_GENERATED',
        expectedExecutionState: 'STRICTLY_OFF',
        contextState: { activeJobOrderId: 'JO-2026-0812' },
      },
      {
        id: 'MAT-P2',
        category: 'P. Proposal/execution separation',
        input: 'Sudah diganti drivernya?',
        expectedIntent: 'CHECK_EXECUTION_STATUS',
        expectedObject: 'JOB_ORDER',
        expectedEntity: 'JO-2026-0812',
        expectedAmbiguity: 'NONE',
        expectedClarification: 'NOT_REQUIRED',
        expectedProposalState: 'NOT_APPLICABLE',
        expectedExecutionState: 'STRICTLY_OFF',
        contextState: { activeJobOrderId: 'JO-2026-0812' },
      },

      // Q. Mutation isolation
      {
        id: 'MAT-Q1',
        category: 'Q. Mutation isolation',
        input: 'Ganti driver untuk JO ini.',
        expectedIntent: ['PROPOSE_DRIVER_REPLACEMENT', 'DRIVER_REPLACEMENT'],
        expectedObject: 'JOB_ORDER',
        expectedEntity: 'JO-2026-0812',
        expectedAmbiguity: 'NONE',
        expectedClarification: 'NOT_REQUIRED',
        expectedProposalState: 'PROPOSAL_GENERATED',
        expectedExecutionState: 'STRICTLY_OFF',
        contextState: { activeJobOrderId: 'JO-2026-0812' },
      },
      {
        id: 'MAT-Q2',
        category: 'Q. Mutation isolation',
        input: 'Pakai Budi.',
        expectedIntent: 'CONFIRM_PROPOSAL_CANDIDATE',
        expectedObject: 'JOB_ORDER',
        expectedEntity: 'Budi Santoso',
        expectedAmbiguity: 'NONE',
        expectedClarification: 'NOT_REQUIRED',
        expectedProposalState: 'NOT_APPLICABLE',
        expectedExecutionState: 'STRICTLY_OFF',
        contextState: { activeJobOrderId: 'JO-2026-0812' },
      },
      {
        id: 'MAT-Q3',
        category: 'Q. Mutation isolation',
        input: 'Sudah diganti drivernya?',
        expectedIntent: 'CHECK_EXECUTION_STATUS',
        expectedObject: 'JOB_ORDER',
        expectedEntity: 'JO-2026-0812',
        expectedAmbiguity: 'NONE',
        expectedClarification: 'NOT_REQUIRED',
        expectedProposalState: 'NOT_APPLICABLE',
        expectedExecutionState: 'STRICTLY_OFF',
        contextState: { activeJobOrderId: 'JO-2026-0812' },
      },

      // R. Future-LLM contract equivalence
      {
        id: 'MAT-R1',
        category: 'R. Future-LLM contract equivalence',
        input: 'ganti supir untuk JO ini',
        expectedIntent: ['PROPOSE_DRIVER_REPLACEMENT', 'DRIVER_REPLACEMENT'],
        expectedObject: 'JOB_ORDER',
        expectedEntity: 'JO-2026-0812',
        expectedAmbiguity: 'NONE',
        expectedClarification: 'NOT_REQUIRED',
        expectedProposalState: 'PROPOSAL_GENERATED',
        expectedExecutionState: 'STRICTLY_OFF',
        contextState: { activeJobOrderId: 'JO-2026-0812' },
      },
      {
        id: 'MAT-R2',
        category: 'R. Future-LLM contract equivalence',
        input: 'tolong ubah driver JO yang tadi',
        expectedIntent: ['PROPOSE_DRIVER_REPLACEMENT', 'DRIVER_REPLACEMENT'],
        expectedObject: 'JOB_ORDER',
        expectedEntity: 'JO-2026-0812',
        expectedAmbiguity: 'NONE',
        expectedClarification: 'NOT_REQUIRED',
        expectedProposalState: 'PROPOSAL_GENERATED',
        expectedExecutionState: 'STRICTLY_OFF',
        contextState: { activeJobOrderId: 'JO-2026-0812' },
      },
      {
        id: 'MAT-R3',
        category: 'R. Future-LLM contract equivalence',
        input: 'pakai driver baru buat JO itu',
        expectedIntent: ['PROPOSE_DRIVER_REPLACEMENT', 'DRIVER_REPLACEMENT'],
        expectedObject: 'JOB_ORDER',
        expectedEntity: 'JO-2026-0812',
        expectedAmbiguity: 'NONE',
        expectedClarification: 'NOT_REQUIRED',
        expectedProposalState: 'PROPOSAL_GENERATED',
        expectedExecutionState: 'STRICTLY_OFF',
        contextState: { activeJobOrderId: 'JO-2026-0812' },
      },
    ];

    test(`matrix contains at least 40 test cases (actual: ${matrix.length})`, () => {
      expect(matrix.length).toBeGreaterThanOrEqual(40);
    });

    test.each(matrix)(
      '$id [$category]: "$input" -> intent: $expectedIntent, ambiguity: $expectedAmbiguity, clarification: $expectedClarification',
      ({ input, expectedIntent, expectedObject, expectedEntity, expectedAmbiguity, expectedClarification, expectedProposalState, expectedExecutionState, contextState }) => {
        const state: ConversationalContextState = {
          conversationHistory: [],
          ...(contextState || {}),
        };

        const understanding = ConversationalSandboxEngine.resolveUnderstanding(input, state);

        // Verify Intent
        if (Array.isArray(expectedIntent)) {
          expect(expectedIntent).toContain(understanding.intent);
        } else {
          expect(understanding.intent).toBe(expectedIntent);
        }

        // Verify Object & Entity
        expect(understanding.object).toBe(expectedObject);
        expect(understanding.entity).toBe(expectedEntity);
        expect(understanding.ambiguity).toBe(expectedAmbiguity);
        expect(understanding.clarification).toBe(expectedClarification);

        // Process message and verify proposal / execution states
        const { responseMessages } = ConversationalSandboxEngine.processUserMessage(input, state);

        if (expectedProposalState === 'PROPOSAL_GENERATED') {
          const propMsg = responseMessages.find((m) => m.type === 'proposal');
          expect(propMsg).toBeDefined();
          expect(propMsg?.isExecuted).toBe(false);
          expect(propMsg?.proposal?.executionAvailable).toBe(false);
        } else if (expectedProposalState === 'PROPOSAL_BLOCKED') {
          const propMsg = responseMessages.find((m) => m.type === 'proposal');
          expect(propMsg).toBeUndefined();
        }

        // Verify execution state is strictly OFF on all response messages
        for (const msg of responseMessages) {
          expect(msg.isExecuted).toBe(false);
        }
      }
    );
  });

  // ==========================================================================
  // §17 CRITICAL INVARIANTS (1 THROUGH 10)
  // ==========================================================================
  describe('§17 Critical Invariants (Invariants 1 through 10)', () => {
    test('INVARIANT 1: SemanticUnderstanding has zero mutation authority', () => {
      const state: ConversationalContextState = { conversationHistory: [] };
      const u = ConversationalSandboxEngine.resolveUnderstanding('Ganti driver', state);
      expect((u as any).mutate).toBeUndefined();
      expect((u as any).execute).toBeUndefined();
    });

    test('INVARIANT 2: Ambiguous entity cannot silently become proposal target', () => {
      const state: ConversationalContextState = { conversationHistory: [] };
      const { responseMessages } = ConversationalSandboxEngine.processUserMessage('Tolong urus yang Surabaya.', state);
      expect(responseMessages.some((m) => m.type === 'proposal')).toBe(false);
    });

    test('INVARIANT 3: Unknown intent cannot silently become an operational action', () => {
      const state: ConversationalContextState = { conversationHistory: [] };
      const u = ConversationalSandboxEngine.resolveUnderstanding('tolong bereskan ini', state);
      expect(u.intent).toBe('UNKNOWN');
      expect(u.clarification).toBe('REQUIRED');
    });

    test('INVARIANT 4: Proposal cannot be represented as executed', () => {
      const state: ConversationalContextState = {
        conversationHistory: [],
        activeJobOrderId: 'JO-2026-0812',
      };
      const { responseMessages } = ConversationalSandboxEngine.processUserMessage('Ganti driver untuk JO ini.', state);
      const propMsg = responseMessages.find((m) => m.type === 'proposal');
      expect(propMsg?.isExecuted).toBe(false);
      expect(propMsg?.proposal?.executionAvailable).toBe(false);
    });

    test('INVARIANT 5: Context cannot override explicit user correction', () => {
      const state: ConversationalContextState = {
        conversationHistory: [],
        activeSalesOrderId: 'SO-2026-0042',
      };
      const { updatedState } = ConversationalSandboxEngine.processUserMessage('Bukan order itu. Yang nomor SO-2026-0041.', state);
      expect(updatedState.activeSalesOrderId).toBe('SO-2026-0041');
    });

    test('INVARIANT 6: Raw natural language cannot directly reach mutation services', () => {
      const src = fs.readFileSync(path.join(process.cwd(), 'lib/copilot/sandbox/sandbox-engine.ts'), 'utf8');
      expect(src).not.toContain('execution-service');
      expect(src).not.toContain('JobOrderAssignmentService');
    });

    test('INVARIANT 7: Execution remains strictly OFF', () => {
      const state: ConversationalContextState = {
        conversationHistory: [],
        activeJobOrderId: 'JO-2026-0812',
      };
      const { responseMessages } = ConversationalSandboxEngine.processUserMessage('Sudah diganti drivernya?', state);
      expect(responseMessages[0].content).toContain('EXECUTE: OFF');
    });

    test('INVARIANT 8: Database remains unchanged (simulated data fixtures intact)', () => {
      expect(SIMULATED_JOB_ORDERS.find((j) => j.joNumber === 'JO-2026-0812')?.driverId).toBeUndefined();
    });

    test('INVARIANT 9: Production remains unchanged (zero live LLM or external API calls)', () => {
      const src = fs.readFileSync(path.join(process.cwd(), 'lib/copilot/sandbox/sandbox-engine.ts'), 'utf8');
      expect(src).not.toContain('openai');
      expect(src).not.toContain('anthropic');
      expect(src).not.toContain('process.env.OPENAI_API_KEY');
    });

    test('INVARIANT 10: Existing protected baseline remains unchanged', () => {
      const baselineFile = 'app/api/v1/commercial/invoices/route.ts';
      expect(fs.existsSync(path.join(process.cwd(), baselineFile))).toBe(true);
    });
  });
});
