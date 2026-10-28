/**
 * Sentralogis — SBU Copilot Operational Intent & WO Need Assignment Verification Suite
 * lib/__tests__/copilot-sbu-operational-wo-intent.test.ts
 *
 * Verifies:
 *  1. ConversationalQueryResolver resolves operational vocabulary (WO baru, need assign, butuh armada, dll.)
 *     to objectType: 'WORK_ORDER', status: 'NEED_ASSIGNMENT', requestedOperation: 'FIND'.
 *  2. OperationalLiveReadGateway queries active work order items needing assignment for SBU Trucking.
 *  3. Form link / action URL is formatted correctly as:
 *     /sbu/trucking/work-orders?status=pending&itemId=<itemId>&action=assign
 *  4. Empty state is cleanly reported with a link to Assignment Console when no WOs need assignment.
 *  5. End-to-end CopilotEngine processCommand delivers actionable responses for SBU Trucking operators.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ConversationalQueryResolver } from '@/lib/copilot/sandbox/conversational-query-resolver';
import {
  OperationalLiveReadGateway,
  _setOperationalReadDelegate,
  type OperationalReadDelegate,
  type CanonicalWorkOrderRecord,
} from '@/lib/copilot/read/operational-live-read-gateway';
import { CopilotEngine } from '@/src/platforms/copilot/engine/CopilotEngine';
import { OperationalContext } from '@/src/platforms/copilot/context/OperationalContext';
import { TenantContext } from '@/src/platforms/copilot/context/TenantContext';
import { UserContext } from '@/src/platforms/copilot/context/UserContext';
import { PermissionContext } from '@/src/platforms/copilot/context/PermissionContext';
import { ConversationContext } from '@/src/platforms/copilot/context/ConversationContext';
import { WorkspaceContext } from '@/src/platforms/copilot/context/WorkspaceContext';
import type { IdentityContext } from '@/lib/application/identity/types';

describe('SBU Copilot — Operational Intent & WO Need Assignment', () => {
  const tenantId = '78846049-fb63-45a9-93da-3af3fea5b587'; // HALU
  const staffSbuId = 'a3a93260-6509-4205-be58-327f01fa30bd'; // totok@halu.com

  const identitySbuOps: IdentityContext = {
    tenantId,
    userId: staffSbuId,
    role: 'sbu_ops_tr',
    permissions: ['copilot:read', 'work_order:read', 'work_order:update', 'job_order:read', 'job_order:create'],
    isTenantOwner: false,
    membershipId: 'mem-totok',
    sbuScope: 'trucking',
  };

  const sampleNeedAssignWos: CanonicalWorkOrderRecord[] = [
    {
      id: 'wo-uuid-1026-001',
      woNumber: 'HALU-TPS-1026-001',
      customerId: 'cust-uuid-ajm',
      customerName: 'PT AJM Mandiri',
      status: 'pending',
      capability: 'TRUCKING',
      sbuType: 'TRUCKING',
      woItemId: 'item-uuid-tr01',
      itemCode: 'TR01',
      unitCount: 4,
      assignedUnitCount: 0,
      origin: 'Jakarta (Tanjung Priok)',
      destination: 'Surabaya (Rungkut)',
      cargoDescription: 'Consumer Goods (Palletized)',
      orderDate: '2026-10-28',
    },
    {
      id: 'wo-uuid-1026-002',
      woNumber: 'HALU-TOP-1026-002',
      customerId: 'cust-uuid-top',
      customerName: 'PT Sumber Berkat',
      status: 'need_assignment',
      capability: 'TRUCKING',
      sbuType: 'TRUCKING',
      woItemId: 'item-uuid-tr02',
      itemCode: 'TR02',
      unitCount: 2,
      assignedUnitCount: 1,
      origin: 'Semarang',
      destination: 'Solo',
      cargoDescription: 'Material Konstruksi',
      orderDate: '2026-10-28',
    },
  ];

  let mockDelegate: OperationalReadDelegate;

  beforeEach(() => {
    mockDelegate = {
      async findJobOrderByNumber() {
        return null;
      },
      async listJobOrders() {
        return [];
      },
      async findWorkOrderByNumber(ctx, woNum) {
        return sampleNeedAssignWos.find((w) => w.woNumber === woNum) || null;
      },
      async listWorkOrders(ctx, filters) {
        if (filters?.needAssignmentOnly || filters?.status === 'NEED_ASSIGNMENT') {
          return sampleNeedAssignWos;
        }
        return sampleNeedAssignWos;
      },
      async findSalesOrderByNumber() {
        return null;
      },
      async findShipmentByNumber() {
        return null;
      },
    };
    _setOperationalReadDelegate(mockDelegate);
  });

  afterEach(() => {
    _setOperationalReadDelegate(null as any);
  });

  it('1. ConversationalQueryResolver classifies "WO baru" and related operational queries correctly', () => {
    const queries = [
      'WO baru',
      'ada WO baru?',
      'list WO need assign',
      'tampilkan WO yang belum di-assign',
      'cek work order baru',
      'need assign',
      'belum ditugaskan armada',
      'new WO',
    ];

    for (const q of queries) {
      const res = ConversationalQueryResolver.resolveQueryContext(q);
      expect(res.context.objectType).toBe('WORK_ORDER');
      expect(res.context.status).toBe('NEED_ASSIGNMENT');
      expect(res.context.requestedOperation).toBe('FIND');
      // Ensure "need assign" or "wo baru" is NOT accidentally treated as a customer name
      expect(res.context.customer).toBeUndefined();
    }
  });

  it('2. OperationalLiveReadGateway returns list of WOs needing assignment with direct form action links', async () => {
    const qContext = ConversationalQueryResolver.resolveQueryContext('WO baru').context;
    const res = await OperationalLiveReadGateway.executeLiveRead(identitySbuOps, qContext);

    expect(res.resolutionState).toBe('DIRECT_ANSWER');
    expect(res.results.length).toBe(2);
    expect(res.counts?.total).toBe(2);

    // Summary text must describe the findings and include links
    expect(res.summaryText).toContain('HALU-TPS-1026-001');
    expect(res.summaryText).toContain('PT AJM Mandiri');
    expect(res.summaryText).toContain('4 Unit Truk');
    expect(res.summaryText).toContain('/sbu/trucking/work-orders?status=pending&itemId=item-uuid-tr01&action=assign');

    // Second item verification
    expect(res.summaryText).toContain('HALU-TOP-1026-002');
    expect(res.summaryText).toContain('PT Sumber Berkat');
    expect(res.summaryText).toContain('/sbu/trucking/work-orders?status=pending&itemId=item-uuid-tr02&action=assign');

    // Available actions must point directly to form
    expect(res.results[0].availableActions?.[0].target).toBe(
      '/sbu/trucking/work-orders?status=pending&itemId=item-uuid-tr01&action=assign'
    );
  });

  it('3. OperationalLiveReadGateway handles empty state cleanly when no WOs need assignment', async () => {
    _setOperationalReadDelegate({
      ...mockDelegate,
      async listWorkOrders() {
        return [];
      },
    });

    const qContext = ConversationalQueryResolver.resolveQueryContext('ada WO baru?').context;
    const res = await OperationalLiveReadGateway.executeLiveRead(identitySbuOps, qContext);

    expect(res.counts?.total).toBe(0);
    expect(res.results.length).toBe(0);
    expect(res.summaryText).toContain('tidak ada Work Order baru yang membutuhkan penugasan');
    expect(res.summaryText).toContain('/sbu/trucking/work-orders');
  });

  it('4. End-to-end CopilotEngine delivers actionable response for SBU Trucking operator', async () => {
    const sbuContext = OperationalContext.create({
      tenant: TenantContext.create({ id: tenantId, timezone: 'Asia/Jakarta' }),
      user: UserContext.create({ id: staffSbuId, displayName: 'Totok Operation', roles: ['sbu_ops_tr'] }),
      permissions: PermissionContext.create(['copilot:read', 'work_order:read', 'job_order:read']),
      conversation: ConversationContext.create({
        conversationId: 'conv-sbu-trucking-wo',
        conversationMemory: { scope: 'sbu' },
      }),
      workspace: WorkspaceContext.create({}),
    });

    const copilotRes = await CopilotEngine.processCommand('tampilkan list WO need assign', sbuContext, identitySbuOps);

    expect(copilotRes.type).toBe('text');
    expect(copilotRes.content).toContain('HALU-TPS-1026-001');
    expect(copilotRes.content).toContain('Buka Form Penugasan');
    expect(copilotRes.content).toContain('/sbu/trucking/work-orders?status=pending&itemId=item-uuid-tr01&action=assign');
  });
});
