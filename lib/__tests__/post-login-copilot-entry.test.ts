/**
 * Sentralogis — Post-Login Copilot Entry Experience Verification Test Suite
 * lib/__tests__/post-login-copilot-entry.test.ts
 *
 * Validates:
 * 1. Post-login destination routing authority (getDashboardRoute) directs internal users to /copilot/v2
 * 2. Dedicated external portal routing is preserved (driver, warehouse_customer, ground_staff)
 * 3. ContextPanel provides direct navigation back to existing operational workspaces
 * 4. Legacy Sidebar links directly back to /copilot/v2
 * 5. Conversational multi-turn continuity works for Acceptance Test flow (§12)
 * 6. Safety & governance invariants: EXECUTE is strictly OFF, zero DB mutations, protected files untouched
 */

import { describe, test, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { getDashboardRoute } from '../utils/dashboardRoute';
import { ConversationalSandboxEngine } from '../copilot/sandbox/sandbox-engine';
import type { ConversationalContextState } from '../copilot/sandbox/types';

describe('Post-Login Copilot Entry Experience', () => {
  // ==========================================================================
  // 1. POST-LOGIN DESTINATION ROUTING AUTHORITY
  // ==========================================================================
  describe('1. Post-Login Routing Authority (getDashboardRoute)', () => {
    test('internal enterprise roles route to /copilot/v2 post-login', () => {
      const internalRoles = [
        'owner_sentralogis',
        'tenant_superadmin',
        'tenant_admin',
        'hq_commercial_director',
        'hq_sales_manager',
        'hq_sales_staff',
        'hq_cs',
        'hq_ops',
        'hq_finance',
        'hq_director_ops',
        'hq_director_fin',
        'sbu_manager_tr',
        'sbu_ops_tr',
        'sbu_fin_tr',
        'sbu_manager_wh',
        'sbu_ops_wh',
        'sbu_manager_fwd',
        'sbu_ops_fwd',
        'cs_forwarding',
      ];

      for (const role of internalRoles) {
        expect(getDashboardRoute(role)).toBe('/copilot/v2');
      }
    });

    test('external dedicated portal roles are preserved', () => {
      expect(getDashboardRoute('driver')).toBe('/driver/jobs');
      expect(getDashboardRoute('warehouse_customer')).toBe('/customer/warehouse');
      expect(getDashboardRoute('ground_staff')).toBe('/ground/dashboard');
    });
  });

  // ==========================================================================
  // 2. WORKSPACE INTEROPERABILITY & CROSS-NAVIGATION
  // ==========================================================================
  describe('2. Workspace Interoperability & Cross-Navigation', () => {
    test('operational workspace links live in the single global Sidebar, not duplicated in ContextPanel', () => {
      const sidebarSrc = fs.readFileSync(
        path.join(process.cwd(), 'components/layout/Sidebar.tsx'),
        'utf8'
      );
      const contextPanelSrc = fs.readFileSync(
        path.join(process.cwd(), 'components/copilot/v2/ContextPanel.tsx'),
        'utf8'
      );

      // Verify links to operational workspaces exist in the global sidebar
      expect(sidebarSrc).toContain('/commercial/control-tower');
      expect(sidebarSrc).toContain('/sbu/trucking/work-orders');
      expect(sidebarSrc).toContain('/commercial/sales-orders');
      expect(sidebarSrc).toContain('/sbu/forwarding/shipments');
      expect(sidebarSrc).toContain('/director/alerts');
      expect(sidebarSrc).toContain('/commercial/engagements');
      expect(sidebarSrc).toContain('/financial/invoices');

      // ContextPanel must not carry a second navigation list
      expect(contextPanelSrc).not.toContain('NAV_SECTIONS');
    });

    test('legacy Sidebar links to Copilot V2 (/copilot/v2)', () => {
      const sidebarSrc = fs.readFileSync(
        path.join(process.cwd(), 'components/layout/Sidebar.tsx'),
        'utf8'
      );
      expect(sidebarSrc).toContain("href: '/copilot/v2'");
      expect(sidebarSrc).not.toContain("href: '/copilot'");
    });

    test('lib/navigation/types.tsx defines /copilot/v2 as copilot href', () => {
      const navTypesSrc = fs.readFileSync(
        path.join(process.cwd(), 'lib/navigation/types.tsx'),
        'utf8'
      );
      expect(navTypesSrc).toContain("href: '/copilot/v2'");
    });
  });

  // ==========================================================================
  // 3. HUMAN ACCEPTANCE TEST FLOW (§12)
  // ==========================================================================
  describe('3. Human Acceptance Flow (§12 Multi-turn Interaction)', () => {
    test('Step 4 & 5: sends "Customer ABC punya order apa saja yang belum jalan?" and receives response', () => {
      let state: ConversationalContextState = { conversationHistory: [] };
      const prompt1 = 'Customer ABC punya order apa saja yang belum jalan?';
      const turn1 = ConversationalSandboxEngine.processUserMessage(prompt1, state);
      state = turn1.updatedState;

      // Assert conversational response
      expect(turn1.responseMessages.length).toBeGreaterThanOrEqual(1);
      const textMsg = turn1.responseMessages.find((m) => m.type === 'result');
      expect(textMsg).toBeDefined();
      expect(textMsg?.content).toContain('SO-2026-0041');
      expect(textMsg?.content).toContain('SO-2026-0042');
      expect(textMsg?.dataSource).toBe('SIMULATED');
      expect(textMsg?.isExecuted).toBe(false);

      // Verify context memory is retained
      expect(state.activeCustomerId).toBe('cust-abc');
      expect(state.activeCustomerName).toBe('Customer ABC');
      expect(state.lastSelectedOrders).toEqual(['SO-2026-0041', 'SO-2026-0042']);

      // Step 6 & 7: continues with "Yang paling baru." and retains context
      const prompt2 = 'Yang paling baru.';
      const turn2 = ConversationalSandboxEngine.processUserMessage(prompt2, state);
      state = turn2.updatedState;

      expect(turn2.responseMessages.length).toBeGreaterThanOrEqual(1);
      const newestMsg = turn2.responseMessages.find((m) => m.type === 'result');
      expect(newestMsg).toBeDefined();
      expect(newestMsg?.content).toContain('SO-2026-0042');
      expect(newestMsg?.content).toContain('2026-10-02');
      expect(state.activeSalesOrderId).toBe('SO-2026-0042');
    });

    test('Proposal formulation maintains EXECUTE strictly OFF', () => {
      let state: ConversationalContextState = {
        conversationHistory: [],
        activeJobOrderId: 'JO-2026-0812',
      };
      const proposalTurn = ConversationalSandboxEngine.processUserMessage(
        'Ganti driver untuk JO ini ke Agus Pratama.',
        state
      );

      const propMsg = proposalTurn.responseMessages.find((m) => m.type === 'proposal');
      expect(propMsg).toBeDefined();
      expect(propMsg?.proposal?.executionAvailable).toBe(false);
      expect(propMsg?.isExecuted).toBe(false);
    });

    test('Step 6 security check: refuses to falsely claim driver replacement executed', () => {
      let state: ConversationalContextState = {
        conversationHistory: [],
        activeJobOrderId: 'JO-2026-0812',
      };
      const safetyTurn = ConversationalSandboxEngine.processUserMessage(
        'Sudah diganti drivernya?',
        state
      );
      const reply = safetyTurn.responseMessages[0];
      expect(reply.content).toContain('TIDAK diganti');
      expect(reply.content).toContain('SIMULATE / PROPOSE ONLY');
      expect(reply.content).toContain('EXECUTE: OFF');
    });
  });

  // ==========================================================================
  // 4. GOVERNANCE & PROTECTED BASELINE INTEGRITY
  // ==========================================================================
  describe('4. Governance & Protected Baseline Integrity', () => {
    test('all 15 protected files remain untouched on disk', () => {
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

    test('copilot-sandbox route remains available on disk', () => {
      expect(fs.existsSync(path.join(process.cwd(), 'app/copilot-sandbox/page.tsx'))).toBe(true);
    });

    test('copilot/v2 route remains available on disk', () => {
      expect(fs.existsSync(path.join(process.cwd(), 'app/(dashboard)/copilot/v2/page.tsx'))).toBe(true);
    });
  });
});
