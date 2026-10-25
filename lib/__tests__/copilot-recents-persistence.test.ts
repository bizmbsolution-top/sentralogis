import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { ConversationService } from '@/lib/copilot/conversation/service';
import {
  setConversationDbClient,
  isValidConversationUuid,
  normalizeIdempotencyUuid,
} from '@/lib/copilot/conversation/repository';
import {
  CustomerIntentHandler,
  _setCustomerDbClient,
} from '@/lib/copilot/customer/customer-intent-handler';
import {
  ConversationalOrderWorkspace,
  _setWorkspaceDbClient,
} from '@/lib/copilot/workflow/conversational-order-workspace';
import { CopilotEngine } from '@/src/platforms/copilot/engine/CopilotEngine';
import { OperationalContext } from '@/src/platforms/copilot/context/OperationalContext';
import { TenantContext } from '@/src/platforms/copilot/context/TenantContext';
import { UserContext } from '@/src/platforms/copilot/context/UserContext';
import { PermissionContext } from '@/src/platforms/copilot/context/PermissionContext';
import { ConversationContext } from '@/src/platforms/copilot/context/ConversationContext';
import { WorkspaceContext } from '@/src/platforms/copilot/context/WorkspaceContext';
import { mapBackendResponseToV2Messages } from '@/components/copilot/v2/copilot-api-client';
import type { IdentityContext } from '@/lib/application/identity/types';

describe('Copilot Recents & Persistent Conversations (End-to-End Continuity)', () => {
  const TENANT_A = '11111111-1111-4111-8111-111111111111';
  const TENANT_B = '22222222-2222-4222-8222-222222222222';
  const USER_A1 = 'aaaa1111-aaaa-4111-8aaa-111111111111';
  const USER_A2 = 'aaaa2222-aaaa-4222-8aaa-222222222222';

  const identityA1: IdentityContext = {
    tenantId: TENANT_A,
    userId: USER_A1,
    role: 'tenant_admin',
    permissions: ['copilot:read', 'customer:read', 'customer:register', 'commercial:manage'],
    isTenantOwner: true,
    membershipId: 'mem-a1',
    sbuScope: null,
  };

  const identityA2: IdentityContext = {
    tenantId: TENANT_A,
    userId: USER_A2,
    role: 'hq_cs',
    permissions: ['copilot:read', 'customer:read', 'customer:register'],
    isTenantOwner: false,
    membershipId: 'mem-a2',
    sbuScope: null,
  };

  const identityB1: IdentityContext = {
    tenantId: TENANT_B,
    userId: 'bbbb1111-bbbb-4111-8bbb-111111111111',
    role: 'tenant_admin',
    permissions: ['copilot:read', 'customer:read', 'customer:register'],
    isTenantOwner: true,
    membershipId: 'mem-b1',
    sbuScope: null,
  };

  let conversationsTable: any[] = [];
  let messagesTable: any[] = [];
  let entitiesTable: any[] = [];
  let partyRolesTable: any[] = [];
  let auditLogsTable: any[] = [];
  let simulateAmbiguousRpc42702 = false;

  function buildConversationDbMock() {
    return {
      from: (table: string) => {
        if (table === 'copilot_conversations') {
          return {
            insert: (row: any) => ({
              select: () => ({
                single: async () => {
                  const id = crypto.randomUUID();
                  const record = { ...row, id };
                  conversationsTable.push(record);
                  return { data: record, error: null };
                },
              }),
            }),
            select: (_cols?: string) => {
              let rows = [...conversationsTable];
              const builder: any = {
                eq: (col: string, val: any) => {
                  if (col === 'id' && !isValidConversationUuid(val)) {
                    throw new Error('22P02: invalid input syntax for type uuid');
                  }
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
                maybeSingle: async () => ({ data: rows[0] || null, error: null }),
                single: async () =>
                  rows[0]
                    ? { data: rows[0], error: null }
                    : { data: null, error: { message: 'Not found' } },
                then: (resolve: any) => Promise.resolve({ data: rows, error: null }).then(resolve),
              };
              return builder;
            },
            update: (updates: any) => {
              let idVal: any = null;
              let tenantVal: any = null;
              let actorVal: any = null;
              const updateBuilder: any = {
                eq: (col: string, val: any) => {
                  if (col === 'id') idVal = val;
                  if (col === 'tenant_id') tenantVal = val;
                  if (col === 'owner_actor_id') actorVal = val;
                  return updateBuilder;
                },
                is: () => updateBuilder,
                select: () => {
                  const affected: any[] = [];
                  conversationsTable.forEach((r) => {
                    if (
                      (!idVal || r.id === idVal) &&
                      (!tenantVal || r.tenant_id === tenantVal) &&
                      (!actorVal || r.owner_actor_id === actorVal) &&
                      r.deleted_at === null
                    ) {
                      Object.assign(r, updates);
                      affected.push(r);
                    }
                  });
                  return {
                    maybeSingle: async () => ({ data: affected[0] || null, error: null }),
                    then: (resolve: any) => Promise.resolve({ data: affected, error: null }).then(resolve),
                  };
                },
              };
              return updateBuilder;
            },
          };
        }

        if (table === 'copilot_messages') {
          return {
            insert: (row: any) => ({
              select: () => ({
                single: async () => {
                  if (row.idempotency_key) {
                    const dup = messagesTable.find(
                      (m) =>
                        m.tenant_id === row.tenant_id &&
                        m.conversation_id === row.conversation_id &&
                        m.idempotency_key === row.idempotency_key
                    );
                    if (dup) {
                      return {
                        data: null,
                        error: { code: '23505', message: 'duplicate idempotency_key' },
                      };
                    }
                  }
                  const seqDup = messagesTable.find(
                    (m) =>
                      m.conversation_id === row.conversation_id && m.sequence_no === row.sequence_no
                  );
                  if (seqDup) {
                    return {
                      data: null,
                      error: { code: '23505', message: 'duplicate sequence_no' },
                    };
                  }
                  const record = { ...row, id: crypto.randomUUID() };
                  messagesTable.push(record);
                  return { data: record, error: null };
                },
              }),
            }),
            select: () => {
              let rows = [...messagesTable];
              const builder: any = {
                eq: (col: string, val: any) => {
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
                maybeSingle: async () => ({ data: rows[0] || null, error: null }),
                then: (resolve: any) => Promise.resolve({ data: rows, error: null }).then(resolve),
              };
              return builder;
            },
          };
        }

        if (table === 'audit_logs' || table === 'wo_audit_logs') {
          return {
            insert: async (row: any) => {
              auditLogsTable.push(row);
              return { data: row, error: null };
            },
          };
        }

        throw new Error(`Unexpected table in conversation mock: ${table}`);
      },
      rpc: async (fn: string, args: any) => {
        if (fn === 'append_copilot_message') {
          if (simulateAmbiguousRpc42702) {
            return {
              data: null,
              error: { code: '42702', message: 'column reference "id" is ambiguous' },
            };
          }
          const conv = conversationsTable.find(
            (c) =>
              c.id === args.p_conversation_id &&
              c.tenant_id === args.p_tenant_id &&
              c.deleted_at === null
          );
          if (!conv) {
            return { data: null, error: { message: 'Conversation not found or deleted' } };
          }
          if (args.p_idempotency_key) {
            const existing = messagesTable.find(
              (m) =>
                m.tenant_id === args.p_tenant_id &&
                m.conversation_id === args.p_conversation_id &&
                m.idempotency_key === args.p_idempotency_key
            );
            if (existing) return { data: [existing], error: null };
          }
          const convMsgs = messagesTable.filter((m) => m.conversation_id === args.p_conversation_id);
          const nextSeq = convMsgs.reduce((max, m) => (m.sequence_no > max ? m.sequence_no : max), 0) + 1;
          const now = new Date().toISOString();
          const record = {
            id: crypto.randomUUID(),
            conversation_id: args.p_conversation_id,
            tenant_id: args.p_tenant_id,
            sender_actor_id: args.p_sender_actor_id,
            role: args.p_role,
            sequence_no: nextSeq,
            content_original: args.p_content_original,
            language: args.p_language || 'id',
            idempotency_key: args.p_idempotency_key,
            metadata: args.p_metadata || {},
            created_at: now,
          };
          messagesTable.push(record);
          if (args.p_role === 'assistant' && args.p_metadata?.status !== 'ERROR') {
            conv.last_activity_at = now;
            conv.updated_at = now;
          }
          return { data: [record], error: null };
        }
        throw new Error(`Unexpected RPC: ${fn}`);
      },
    };
  }

  function buildCustomerDbMock() {
    return {
      from: (table: string) => {
        if (table === 'md_entities') {
          return {
            select: () => {
              let rows = [...entitiesTable];
              const builder: any = {
                eq: (col: string, val: any) => {
                  rows = rows.filter((r) => r[col] === val);
                  return builder;
                },
                ilike: (col: string, pattern: string) => {
                  const clean = pattern.replace(/%/g, '').toLowerCase();
                  rows = rows.filter((r) => String(r[col] || '').toLowerCase().includes(clean));
                  return builder;
                },
                limit: (n: number) => {
                  rows = rows.slice(0, n);
                  return builder;
                },
                maybeSingle: async () => ({ data: rows[0] || null, error: null }),
                single: async () => ({ data: rows[0] || null, error: null }),
                then: (resolve: any) => Promise.resolve({ data: rows, error: null }).then(resolve),
              };
              return builder;
            },
            insert: (row: any) => ({
              select: () => ({
                single: async () => {
                  const record = {
                    ...row,
                    id: crypto.randomUUID(),
                    created_at: new Date().toISOString(),
                  };
                  entitiesTable.push(record);
                  return { data: record, error: null };
                },
              }),
            }),
            update: (updates: any) => {
              let idVal: any = null;
              let tenantVal: any = null;
              const builder: any = {
                eq: (col: string, val: any) => {
                  if (col === 'id') idVal = val;
                  if (col === 'tenant_id') tenantVal = val;
                  return builder;
                },
                select: () => ({
                  single: async () => {
                    const target = entitiesTable.find(
                      (e) => e.id === idVal && (!tenantVal || e.tenant_id === tenantVal)
                    );
                    if (!target) return { data: null, error: { message: 'Not found' } };
                    Object.assign(target, updates);
                    return { data: target, error: null };
                  },
                }),
              };
              return builder;
            },
          };
        }
        if (table === 'party_roles') {
          return {
            select: () => {
              let rows = [...partyRolesTable];
              const builder: any = {
                eq: (col: string, val: any) => {
                  rows = rows.filter((r) => r[col] === val);
                  return builder;
                },
                maybeSingle: async () => ({ data: rows[0] || null, error: null }),
                then: (resolve: any) => Promise.resolve({ data: rows, error: null }).then(resolve),
              };
              return builder;
            },
            insert: async (row: any) => {
              partyRolesTable.push({ ...row, id: crypto.randomUUID() });
              return { data: row, error: null };
            },
          };
        }
        if (table === 'wo_audit_logs') {
          return {
            insert: async (row: any) => {
              auditLogsTable.push(row);
              return { data: row, error: null };
            },
          };
        }
        return {
          select: () => ({
            eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }),
          }),
        };
      },
    };
  }

  function buildOperationalContext(conversationId: string, identity: IdentityContext = identityA1) {
    return OperationalContext.create({
      tenant: TenantContext.create({ id: identity.tenantId, timezone: 'Asia/Jakarta' }),
      user: UserContext.create({
        id: identity.userId,
        displayName: identity.userId,
        roles: [identity.role],
      }),
      permissions: PermissionContext.create(identity.permissions || []),
      conversation: ConversationContext.create({ conversationId }),
      workspace: WorkspaceContext.create({}),
    });
  }

  beforeEach(() => {
    conversationsTable = [];
    messagesTable = [];
    entitiesTable = [];
    partyRolesTable = [];
    auditLogsTable = [];
    simulateAmbiguousRpc42702 = false;
    ConversationalOrderWorkspace.resetAllSessions();
    setConversationDbClient(buildConversationDbMock());
    _setCustomerDbClient(buildCustomerDbMock() as any);
    _setWorkspaceDbClient(buildCustomerDbMock() as any);
  });

  afterEach(() => {
    setConversationDbClient(null);
    _setCustomerDbClient(null);
    _setWorkspaceDbClient(null);
    ConversationalOrderWorkspace.resetAllSessions();
  });

  it('1 & 2. Creating a conversation via ensureConversationForTurn and appending user/assistant messages persists ordered sequence_no in copilot_conversations and copilot_messages (including when RPC 42702 fallback activates)', async () => {
    simulateAmbiguousRpc42702 = true;

    // Legacy non-UUID conversationId ('default-session' or 'conv-123') must NOT throw 22P02 and must allocate a real UUID conversation
    const { conversation: conv, created } = await ConversationService.ensureConversationForTurn(
      identityA1,
      'default-session',
      'Daftarkan customer baru PT ANDALAN SIAPA AKU'
    );

    expect(created).toBe(true);
    expect(isValidConversationUuid(conv.id)).toBe(true);
    expect(conv.title).toContain('Daftarkan customer baru PT ANDALAN SIAPA AKU');
    expect(conversationsTable).toHaveLength(1);

    const userMsg = await ConversationService.appendUserMessage(identityA1, {
      conversationId: conv.id,
      content: 'Daftarkan customer baru PT ANDALAN SIAPA AKU',
      idempotencyKey: normalizeIdempotencyUuid('turn-1-key'),
    });
    const assistantMsg = await ConversationService.appendAssistantMessage(identityA1, {
      conversationId: conv.id,
      content: 'Konfirmasi Pendaftaran Customer Baru: PT ANDALAN SIAPA AKU',
      metadata: { status: 'SUCCESS' },
    });

    expect(userMsg.sequenceNo).toBe(1);
    expect(assistantMsg.sequenceNo).toBe(2);

    const messages = await ConversationService.listMessages(identityA1, conv.id);
    expect(messages).toHaveLength(2);
    expect(messages[0].sequenceNo).toBe(1);
    expect(messages[0].role).toBe('user');
    expect(messages[1].sequenceNo).toBe(2);
    expect(messages[1].role).toBe('assistant');
  });

  it('3 & 4. Recents list returns conversations ordered by last_activity_at DESC and reopening a conversation loads messages read-only in sequence_no ASC order without mutating state', async () => {
    const conv1 = await ConversationService.createConversation(identityA1, {
      title: 'Percakapan Lama',
    });
    await new Promise((r) => setTimeout(r, 15));
    const conv2 = await ConversationService.createConversation(identityA1, {
      title: 'Percakapan Kedua',
    });

    // Advance conv1 with a new completed turn so conv1 becomes the most recent
    await new Promise((r) => setTimeout(r, 15));
    await ConversationService.appendUserMessage(identityA1, {
      conversationId: conv1.id,
      content: 'Update di percakapan pertama',
      idempotencyKey: crypto.randomUUID(),
    });
    await ConversationService.appendAssistantMessage(identityA1, {
      conversationId: conv1.id,
      content: 'Respons asisten untuk percakapan pertama',
      metadata: {
        status: 'SUCCESS',
        proposal: {
          id: 'prop-1',
          intent: 'REGISTER_CUSTOMER_CONFIRMATION',
          title: 'Konfirmasi Customer',
          description: 'Daftarkan customer baru?',
          impact: 'Master Data',
          confidence: 0.95,
          parameters: { candidateName: 'PT CONTOH' },
        },
      },
    });

    const recents = await ConversationService.listConversations(identityA1, { limit: 20 });
    expect(recents).toHaveLength(2);
    expect(recents[0].id).toBe(conv1.id);
    expect(recents[1].id).toBe(conv2.id);

    const entitiesCountBefore = entitiesTable.length;
    const activityBeforeReopen = recents[0].lastActivityAt;

    // Reopen conv1 from Recents (read-only)
    const history = await ConversationService.listMessages(identityA1, conv1.id);
    expect(history).toHaveLength(2);
    expect(history[0].sequenceNo).toBe(1);
    expect(history[1].sequenceNo).toBe(2);

    // Hydrate into UI messages (proposal has executionAvailable: false)
    const uiMsgs = mapBackendResponseToV2Messages({
      type: 'action_proposal',
      content: history[1].contentOriginal,
      proposal: history[1].metadata?.proposal,
    });
    const proposalMsg = uiMsgs.find((m) => m.type === 'proposal');
    expect(proposalMsg).toBeDefined();
    expect(proposalMsg?.proposal?.executionAvailable).toBe(false);

    // Verify zero side-effects or DB mutations occurred when reopening
    expect(entitiesTable.length).toBe(entitiesCountBefore);
    const convAfterReopen = await ConversationService.getConversation(identityA1, conv1.id);
    expect(convAfterReopen?.lastActivityAt).toBe(activityBeforeReopen);
  });

  it('5, 6 & 7. Full Customer Registration & Correction Continuity across navigation ("Daftarkan customer baru PT ANDALAN SIAPA AKU" -> "Perbaiki yang benar PT ANJUNGAN SIAPA AKU"), plus New Chat isolation', async () => {
    // Step 1: User starts conversation in Copilot
    const { conversation: conv } = await ConversationService.ensureConversationForTurn(
      identityA1,
      null,
      'Daftarkan customer baru PT ANDALAN SIAPA AKU'
    );

    const ctx1 = buildOperationalContext(conv.id, identityA1);
    const turn1Response = await CopilotEngine.processCommand(
      'Daftarkan customer baru PT ANDALAN SIAPA AKU',
      ctx1,
      identityA1
    );

    expect(turn1Response.content).toContain('PT ANDALAN SIAPA AKU');
    // Must NOT execute DB mutation before confirmation
    expect(entitiesTable).toHaveLength(0);

    const pendingAfterTurn1 = CustomerIntentHandler.getPendingRegistration(
      identityA1,
      conv.id
    );
    expect(pendingAfterTurn1?.candidateName).toBe('PT ANDALAN SIAPA AKU');

    // Persist turn 1 to Supabase conversation tables (including durable conversationState)
    await ConversationService.appendUserMessage(identityA1, {
      conversationId: conv.id,
      content: 'Daftarkan customer baru PT ANDALAN SIAPA AKU',
      idempotencyKey: crypto.randomUUID(),
    });
    await ConversationService.appendAssistantMessage(identityA1, {
      conversationId: conv.id,
      content: turn1Response.content,
      metadata: {
        status: 'SUCCESS',
        proposal: turn1Response.proposal,
        conversationState: {
          pendingCustomerRegistration: pendingAfterTurn1,
        },
      },
    });

    // Step 2: Simulate navigating from Copilot -> Master Contact -> Copilot (even across a serverless cold start)
    CustomerIntentHandler.clearPendingRegistration(identityA1, conv.id);
    ConversationalOrderWorkspace.resetAllSessions();

    // Hydrate durable state from the conversation's persisted messages (as app/api/copilot/route.ts does)
    const persistedHistory = await ConversationService.listMessages(identityA1, conv.id);
    const lastAssistant = [...persistedHistory].reverse().find((m) => m.role === 'assistant');
    const savedPending = (lastAssistant?.metadata as any)?.conversationState
      ?.pendingCustomerRegistration;
    expect(savedPending?.candidateName).toBe('PT ANDALAN SIAPA AKU');
    CustomerIntentHandler.savePendingRegistration(
      identityA1,
      savedPending.candidateName,
      conv.id
    );

    // Step 3: User sends correction in the SAME conversation:
    // "Perbaiki yang benar PT ANJUNGAN SIAPA AKU"
    const turn2Response = await CopilotEngine.processCommand(
      'Perbaiki yang benar PT ANJUNGAN SIAPA AKU',
      ctx1,
      identityA1
    );

    expect(turn2Response.content).toContain('PT ANJUNGAN SIAPA AKU');
    // Still 0 rows in md_entities because user only corrected the draft before confirming
    expect(entitiesTable).toHaveLength(0);

    const pendingAfterCorrection = CustomerIntentHandler.getPendingRegistration(
      identityA1,
      conv.id
    );
    expect(pendingAfterCorrection?.candidateName).toBe('PT ANJUNGAN SIAPA AKU');

    // Step 4: User clicks "New Chat" -> starts a brand new conversation
    const newConv = await ConversationService.createConversation(identityA1, {
      title: 'Percakapan Baru',
    });
    expect(newConv.id).not.toBe(conv.id);

    // New conversation must NOT inherit the uncommitted pending registration from conv 1
    expect(
      CustomerIntentHandler.getPendingRegistration(identityA1, newConv.id)
    ).toBeNull();
    expect(
      ConversationalOrderWorkspace.getSessionState(identityA1, undefined, newConv.id)
    ).toBeNull();

    // Meanwhile, conv 1 still retains its corrected candidate "PT ANJUNGAN SIAPA AKU"
    expect(
      CustomerIntentHandler.getPendingRegistration(identityA1, conv.id)?.candidateName
    ).toBe('PT ANJUNGAN SIAPA AKU');

    // Step 5: User switches back to conv 1 from Recents and confirms with "YA"
    const turn3Response = await CopilotEngine.processCommand('YA', ctx1, identityA1);
    expect(turn3Response.content).toContain('PT ANJUNGAN SIAPA AKU');
    expect(entitiesTable).toHaveLength(1);
    expect(entitiesTable[0].name).toBe('PT ANJUNGAN SIAPA AKU');
    expect(entitiesTable[0].legal_name).toBe('PT ANJUNGAN SIAPA AKU');
  });

  it('8 & 9. Enforces idempotency deduplication, tenant/actor isolation, and AppShell persistent provider wiring', async () => {
    const convA1 = await ConversationService.createConversation(identityA1, {
      title: 'Isolasi Tenant & Actor',
    });

    const idemKey = normalizeIdempotencyUuid('custom-retry-key-001');
    const msg1 = await ConversationService.appendUserMessage(identityA1, {
      conversationId: convA1.id,
      content: 'Pesan idempoten',
      idempotencyKey: idemKey,
    });
    const msgRetry = await ConversationService.appendUserMessage(identityA1, {
      conversationId: convA1.id,
      content: 'Pesan idempoten',
      idempotencyKey: idemKey,
    });
    expect(msgRetry.id).toBe(msg1.id);

    // Cross-user in same tenant cannot read, rename, or delete A1's conversation
    expect(await ConversationService.getConversation(identityA2, convA1.id)).toBeNull();
    expect(
      await ConversationService.updateConversation(identityA2, convA1.id, { title: 'Bajakan' })
    ).toBeNull();
    expect(await ConversationService.deleteConversation(identityA2, convA1.id)).toBe(false);

    // Cross-tenant user B1 cannot read, list, rename, or delete A1's conversation
    expect(await ConversationService.getConversation(identityB1, convA1.id)).toBeNull();
    expect(await ConversationService.listConversations(identityB1)).toHaveLength(0);

    // Verify AppShell mounts CopilotV2Provider and CopilotRecentsDrawer so state persists across routes
    const appShellCode = fs.readFileSync(
      path.resolve(process.cwd(), 'components/layout/AppShell.tsx'),
      'utf8'
    );
    expect(appShellCode).toContain('<CopilotV2Provider>');
    expect(appShellCode).toContain('<CopilotRecentsDrawer />');
  });
});
