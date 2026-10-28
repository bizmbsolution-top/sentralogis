/**
 * Sentralogis — CS vs SBU Copilot Chat Separation Verification Suite
 * lib/__tests__/copilot-cs-sbu-chat-separation.test.ts
 *
 * Verifies:
 *  1. resolveEffectiveScope strictly enforces role-based scope locks (SBU roles locked to 'sbu', CS roles locked to 'cs').
 *  2. Cross-domain authority roles (admin/owner) cleanly segregate conversations by active scope.
 *  3. ConversationRepository persists scope (and context_summary fallback) and filters listConversations strictly by scope.
 *  4. ConversationService prevents cross-scope chat mixing (CS chats never appear in SBU lists and vice versa).
 *  5. IntentStage adapts greeting persona and guards commercial customer/order creation from SBU context.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ConversationRepository, setConversationDbClient } from '@/lib/copilot/conversation/repository';
import { ConversationService } from '@/lib/copilot/conversation/service';
import { CopilotEngine } from '@/src/platforms/copilot/engine/CopilotEngine';
import { OperationalContext } from '@/src/platforms/copilot/context/OperationalContext';
import { TenantContext } from '@/src/platforms/copilot/context/TenantContext';
import { UserContext } from '@/src/platforms/copilot/context/UserContext';
import { PermissionContext } from '@/src/platforms/copilot/context/PermissionContext';
import { ConversationContext } from '@/src/platforms/copilot/context/ConversationContext';
import { WorkspaceContext } from '@/src/platforms/copilot/context/WorkspaceContext';
import type { IdentityContext } from '@/lib/application/identity/types';

describe('Copilot CS vs SBU Chat Separation & Staff Isolation', () => {
  const tenantId = '11111111-2222-3333-4444-555555555555';
  const staffCSId = 'aaaa1111-0000-0000-0000-000000000001';
  const staffSBUId = 'bbbb2222-0000-0000-0000-000000000002';
  const staffAdminId = 'cccc3333-0000-0000-0000-000000000003';

  const identityCS: IdentityContext = {
    tenantId,
    userId: staffCSId,
    role: 'hq_cs',
    permissions: ['copilot:read', 'commercial:read', 'commercial:manage'],
    isTenantOwner: false,
    membershipId: 'mem-cs',
    sbuScope: null,
  };

  const identitySBU: IdentityContext = {
    tenantId,
    userId: staffSBUId,
    role: 'sbu_ops_tr',
    permissions: ['copilot:read', 'work_order:read', 'job_order:read'],
    isTenantOwner: false,
    membershipId: 'mem-sbu',
    sbuScope: 'trucking',
  };

  const identityAdmin: IdentityContext = {
    tenantId,
    userId: staffAdminId,
    role: 'tenant_admin',
    permissions: ['copilot:read', 'commercial:read', 'commercial:manage', 'work_order:read'],
    isTenantOwner: false,
    membershipId: 'mem-admin',
    sbuScope: null,
  };

  let mockConversationsTable: any[] = [];
  let mockMessagesTable: any[] = [];

  function createMockDbClient() {
    return {
      from: (table: string) => {
        if (table === 'copilot_conversations') {
          return {
            insert: (row: any) => ({
              select: () => ({
                single: async () => {
                  const id = 'conv-' + (mockConversationsTable.length + 1);
                  const record = { ...row, id };
                  mockConversationsTable.push(record);
                  return { data: record, error: null };
                },
              }),
            }),
            select: (_cols?: string) => {
              let rows = [...mockConversationsTable];
              const builder: any = {
                eq: (col: string, val: any) => {
                  rows = rows.filter((r) => r[col] === val);
                  return builder;
                },
                is: (col: string, val: any) => {
                  rows = rows.filter((r) => r[col] === val);
                  return builder;
                },
                order: (col: string, opts?: { ascending?: boolean }) => {
                  rows.sort((a, b) => {
                    if (opts?.ascending) return a[col] > b[col] ? 1 : -1;
                    return a[col] < b[col] ? 1 : -1;
                  });
                  return builder;
                },
                limit: (n: number) => {
                  rows = rows.slice(0, n);
                  return builder;
                },
                then: (resolve: any) => Promise.resolve({ data: rows, error: null }).then(resolve),
                maybeSingle: async () => ({
                  data: rows[0] || null,
                  error: null,
                }),
              };
              return builder;
            },
            update: (updates: any) => ({
              eq: (_col1: string, val1: any) => ({
                eq: (_col2: string, _val2: any) => ({
                  is: () => ({
                    select: async () => {
                      const idx = mockConversationsTable.findIndex((r) => r.id === val1);
                      if (idx >= 0) {
                        mockConversationsTable[idx] = { ...mockConversationsTable[idx], ...updates };
                        return { data: [mockConversationsTable[idx]], error: null };
                      }
                      return { data: [], error: null };
                    },
                    maybeSingle: async () => {
                      const idx = mockConversationsTable.findIndex((r) => r.id === val1);
                      if (idx >= 0) {
                        mockConversationsTable[idx] = { ...mockConversationsTable[idx], ...updates };
                        return { data: mockConversationsTable[idx], error: null };
                      }
                      return { data: null, error: null };
                    },
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'copilot_messages') {
          return {
            insert: (row: any) => ({
              select: () => ({
                single: async () => {
                  const id = 'msg-' + (mockMessagesTable.length + 1);
                  const record = { ...row, id };
                  mockMessagesTable.push(record);
                  return { data: record, error: null };
                },
              }),
            }),
            select: () => ({
              eq: () => ({
                order: () => ({
                  limit: () => Promise.resolve({ data: mockMessagesTable, error: null }),
                  then: (resolve: any) => Promise.resolve({ data: mockMessagesTable, error: null }).then(resolve),
                }),
              }),
            }),
          };
        }
        return {
          insert: () => ({ select: () => ({ single: async () => ({ data: {}, error: null }) }) }),
          select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }),
        };
      },
    };
  }

  beforeEach(() => {
    mockConversationsTable = [];
    mockMessagesTable = [];
    setConversationDbClient(createMockDbClient() as any);
  });

  afterEach(() => {
    setConversationDbClient(null);
  });

  it('1. resolveEffectiveScope strictly enforces role-based scope locks', () => {
    // SBU roles are locked to 'sbu' even if client requested 'cs'
    expect(ConversationService.resolveEffectiveScope(identitySBU, 'cs')).toBe('sbu');
    expect(ConversationService.resolveEffectiveScope({ ...identitySBU, role: 'sbu_manager_wh' }, 'cs')).toBe('sbu');
    expect(ConversationService.resolveEffectiveScope({ ...identitySBU, role: 'driver' }, 'cs')).toBe('sbu');

    // CS roles are locked to 'cs' even if client requested 'sbu'
    expect(ConversationService.resolveEffectiveScope(identityCS, 'sbu')).toBe('cs');
    expect(ConversationService.resolveEffectiveScope({ ...identityCS, role: 'hq_director_cs' }, 'sbu')).toBe('cs');
    expect(ConversationService.resolveEffectiveScope({ ...identityCS, role: 'hq_commercial_director' }, 'sbu')).toBe('cs');

    // Multi-role admin/owner honors active requested scope
    expect(ConversationService.resolveEffectiveScope(identityAdmin, 'sbu')).toBe('sbu');
    expect(ConversationService.resolveEffectiveScope(identityAdmin, 'cs')).toBe('cs');
    expect(ConversationService.resolveEffectiveScope(identityAdmin, null)).toBe('cs');
  });

  it('2. ConversationService creates conversations with explicit scope and isolates lists per scope', async () => {
    // Admin creates 1 CS conversation and 1 SBU conversation
    const csConv = await ConversationService.createConversation(identityAdmin, {
      title: 'Percakapan Order CS Pelanggan PT ABC',
      scope: 'cs',
    });
    expect(csConv.scope).toBe('cs');

    const sbuConv = await ConversationService.createConversation(identityAdmin, {
      title: 'Percakapan Armada SBU Trucking Rute Jakarta',
      scope: 'sbu',
    });
    expect(sbuConv.scope).toBe('sbu');

    // When querying CS scope, only CS conversation is returned
    const csList = await ConversationService.listConversations(identityAdmin, { scope: 'cs' });
    expect(csList.length).toBe(1);
    expect(csList[0].id).toBe(csConv.id);
    expect(csList[0].scope).toBe('cs');

    // When querying SBU scope, only SBU conversation is returned
    const sbuList = await ConversationService.listConversations(identityAdmin, { scope: 'sbu' });
    expect(sbuList.length).toBe(1);
    expect(sbuList[0].id).toBe(sbuConv.id);
    expect(sbuList[0].scope).toBe('sbu');
  });

  it('3. Dedicated SBU staff can only list SBU conversations and dedicated CS staff can only list CS conversations', async () => {
    // SBU staff creates conversation
    const sbuConv = await ConversationService.createConversation(identitySBU, {
      title: 'Pemeriksaan Muatan Trucking JO-101',
    });
    expect(sbuConv.scope).toBe('sbu');

    // CS staff creates conversation
    const csConv = await ConversationService.createConversation(identityCS, {
      title: 'Pendaftaran Customer PT Baru',
    });
    expect(csConv.scope).toBe('cs');

    // SBU staff lists conversations -> receives only their SBU conversations
    const sbuList = await ConversationService.listConversations(identitySBU);
    expect(sbuList.length).toBe(1);
    expect(sbuList[0].id).toBe(sbuConv.id);

    // CS staff lists conversations -> receives only their CS conversations
    const csList = await ConversationService.listConversations(identityCS);
    expect(csList.length).toBe(1);
    expect(csList[0].id).toBe(csConv.id);
  });

  it('4. IntentStage returns SBU-specific greeting when active scope is SBU and CS greeting when CS', async () => {
    const sbuContext = OperationalContext.create({
      tenant: TenantContext.create({ id: tenantId, timezone: 'Asia/Jakarta' }),
      user: UserContext.create({ id: staffSBUId, displayName: 'SBU Operator', roles: ['sbu_ops_tr'] }),
      permissions: PermissionContext.create(['copilot:read', 'work_order:read', 'job_order:read']),
      conversation: ConversationContext.create({
        conversationId: 'conv-sbu',
        conversationMemory: { scope: 'sbu' },
      }),
      workspace: WorkspaceContext.create({}),
    });

    const sbuRes = await CopilotEngine.processCommand('halo', sbuContext, identitySBU);
    expect(sbuRes.content).toContain('SBU Operasional');
    expect(sbuRes.content).toContain('Job Order');

    const csContext = OperationalContext.create({
      tenant: TenantContext.create({ id: tenantId, timezone: 'Asia/Jakarta' }),
      user: UserContext.create({ id: staffCSId, displayName: 'CS Agent', roles: ['hq_cs'] }),
      permissions: PermissionContext.create(['copilot:read', 'commercial:read', 'commercial:manage']),
      conversation: ConversationContext.create({
        conversationId: 'conv-cs',
        conversationMemory: { scope: 'cs' },
      }),
      workspace: WorkspaceContext.create({}),
    });

    const csRes = await CopilotEngine.processCommand('halo', csContext, identityCS);
    expect(csRes.content).toContain('Customer Service & Commercial');
  });

  it('5. IntentStage prevents SBU staff from triggering CS customer/order registration flows', async () => {
    const sbuContext = OperationalContext.create({
      tenant: TenantContext.create({ id: tenantId, timezone: 'Asia/Jakarta' }),
      user: UserContext.create({ id: staffSBUId, displayName: 'SBU Operator', roles: ['sbu_ops_tr'] }),
      permissions: PermissionContext.create(['copilot:read', 'work_order:read', 'job_order:read']),
      conversation: ConversationContext.create({
        conversationId: 'conv-sbu-guard',
        conversationMemory: { scope: 'sbu' },
      }),
      workspace: WorkspaceContext.create({}),
    });

    const res = await CopilotEngine.processCommand('buat sales order untuk customer PT ABC', sbuContext, identitySBU);
    expect(res.content).toContain('Anda saat ini berada dalam Copilot SBU Operasional');
    expect(res.content).toContain('wewenang Customer Service (CS) / Commercial');
  });
});
