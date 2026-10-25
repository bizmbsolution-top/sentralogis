/**
 * Sentralogis — AI Copilot Conversation Persistence
 * lib/copilot/conversation/repository.ts
 *
 * Server repository for copilot_conversations and copilot_messages.
 * Invariants:
 *  - Strict tenant and owner_actor isolation.
 *  - Database client injection support for deterministic testing.
 *  - Monotonic sequence_no generation via locking/max query within parent conversation.
 *  - Idempotency key checking on user messages.
 *  - Soft delete support (UPDATE deleted_at = now()).
 */

import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type {
  CopilotConversation,
  CopilotMessage,
  ConversationStatus,
  AppendUserMessageInput,
  AppendAssistantMessageInput,
} from './types';

export interface ConversationDbClient {
  from(table: string): any;
  rpc?(fn: string, args: Record<string, unknown>): Promise<any>;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidConversationUuid(val?: string | null): boolean {
  if (!val || typeof val !== 'string') return false;
  return UUID_REGEX.test(val.trim());
}

export function normalizeIdempotencyUuid(key?: string | null): string {
  if (key && isValidConversationUuid(key)) {
    return key.trim();
  }
  if (key && typeof key === 'string' && key.trim().length > 0) {
    // Deterministically hash non-UUID idempotency keys into valid UUID v4-formatted hex
    const hash = crypto.createHash('sha256').update(key.trim()).digest('hex');
    return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
  }
  return crypto.randomUUID();
}

let _customDbClient: ConversationDbClient | null = null;
let _rpcAmbiguousColumnDetected = false;

export function setConversationDbClient(client: ConversationDbClient | null) {
  _customDbClient = client;
  _rpcAmbiguousColumnDetected = false;
}

export function isCustomConversationDbActive(): boolean {
  return _customDbClient !== null;
}

export function getConversationDb(): ConversationDbClient {
  return _customDbClient || (supabaseAdmin as unknown as ConversationDbClient);
}

function getDb(): ConversationDbClient {
  return getConversationDb();
}

export class ConversationRepository {
  /**
   * Create a new conversation owned by the actor within the tenant.
   */
  static async createConversation(params: {
    tenantId: string;
    ownerActorId: string;
    title?: string | null;
  }): Promise<CopilotConversation> {
    const db = getDb();
    const row = {
      tenant_id: params.tenantId,
      owner_actor_id: params.ownerActorId,
      title: params.title !== undefined ? params.title : 'Percakapan Baru',
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_activity_at: new Date().toISOString(),
      deleted_at: null,
    };

    const { data, error } = await db
      .from('copilot_conversations')
      .insert(row)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create conversation: ${error.message}`);
    }

    return this.mapConversationRow(data);
  }

  /**
   * Find conversation by ID with strict tenant and owner actor verification.
   */
  static async findConversation(params: {
    tenantId: string;
    ownerActorId: string;
    conversationId: string;
    includeDeleted?: boolean;
  }): Promise<CopilotConversation | null> {
    if (!_customDbClient && !isValidConversationUuid(params.conversationId)) {
      return null;
    }
    const db = getDb();
    let query = db
      .from('copilot_conversations')
      .select('*')
      .eq('id', params.conversationId)
      .eq('tenant_id', params.tenantId)
      .eq('owner_actor_id', params.ownerActorId);

    if (!params.includeDeleted) {
      query = query.is('deleted_at', null);
    }

    const { data, error } = await query.maybeSingle();
    if (error) {
      if (error.code === '22P02' || error.message?.includes('invalid input syntax for type uuid')) {
        return null;
      }
      throw new Error(`Failed to find conversation: ${error.message}`);
    }
    if (!data) return null;

    return this.mapConversationRow(data);
  }

  /**
   * List non-deleted conversations for a specific actor and tenant, ordered by last_activity_at DESC.
   */
  static async listConversations(params: {
    tenantId: string;
    ownerActorId: string;
    limit?: number;
    status?: ConversationStatus;
  }): Promise<CopilotConversation[]> {
    const db = getDb();
    let query = db
      .from('copilot_conversations')
      .select('*')
      .eq('tenant_id', params.tenantId)
      .eq('owner_actor_id', params.ownerActorId)
      .is('deleted_at', null)
      .order('last_activity_at', { ascending: false });

    if (params.status) {
      query = query.eq('status', params.status);
    }

    if (params.limit) {
      query = query.limit(params.limit);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`Failed to list conversations: ${error.message}`);
    }

    return (data || []).map((row: any) => this.mapConversationRow(row));
  }

  /**
   * Soft-delete a conversation.
   */
  static async softDeleteConversation(params: {
    tenantId: string;
    ownerActorId: string;
    conversationId: string;
  }): Promise<boolean> {
    if (!_customDbClient && !isValidConversationUuid(params.conversationId)) {
      return false;
    }
    const db = getDb();
    const now = new Date().toISOString();
    const { data, error } = await db
      .from('copilot_conversations')
      .update({
        deleted_at: now,
        updated_at: now,
      })
      .eq('id', params.conversationId)
      .eq('tenant_id', params.tenantId)
      .eq('owner_actor_id', params.ownerActorId)
      .is('deleted_at', null)
      .select();

    if (error) {
      if (error.code === '22P02' || error.message?.includes('invalid input syntax for type uuid')) {
        return false;
      }
      throw new Error(`Failed to soft-delete conversation: ${error.message}`);
    }

    return (data && data.length > 0) || false;
  }

  /**
   * Update conversation title or summary.
   */
  static async updateConversation(params: {
    tenantId: string;
    ownerActorId: string;
    conversationId: string;
    title?: string | null;
    contextSummary?: string | null;
  }): Promise<CopilotConversation | null> {
    if (!_customDbClient && !isValidConversationUuid(params.conversationId)) {
      return null;
    }
    const db = getDb();
    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (params.title !== undefined) updates.title = params.title;
    if (params.contextSummary !== undefined) updates.context_summary = params.contextSummary;

    const { data, error } = await db
      .from('copilot_conversations')
      .update(updates)
      .eq('id', params.conversationId)
      .eq('tenant_id', params.tenantId)
      .eq('owner_actor_id', params.ownerActorId)
      .is('deleted_at', null)
      .select()
      .maybeSingle();

    if (error) {
      if (error.code === '22P02' || error.message?.includes('invalid input syntax for type uuid')) {
        return null;
      }
      throw new Error(`Failed to update conversation: ${error.message}`);
    }
    if (!data) return null;

    return this.mapConversationRow(data);
  }

  /**
   * Check if a message with the given idempotency_key already exists for this (tenant, conversation).
   */
  static async findMessageByIdempotencyKey(params: {
    tenantId: string;
    conversationId: string;
    idempotencyKey: string;
  }): Promise<CopilotMessage | null> {
    const db = getDb();
    const { data, error } = await db
      .from('copilot_messages')
      .select('*')
      .eq('tenant_id', params.tenantId)
      .eq('conversation_id', params.conversationId)
      .eq('idempotency_key', params.idempotencyKey)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to query message by idempotency: ${error.message}`);
    }
    if (!data) return null;

    return this.mapMessageRow(data);
  }

  /**
   * Get the next sequence_no for a conversation.
   */
  static async getNextSequenceNo(conversationId: string): Promise<number> {
    const db = getDb();
    const { data, error } = await db
      .from('copilot_messages')
      .select('sequence_no')
      .eq('conversation_id', conversationId)
      .order('sequence_no', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to get next sequence_no: ${error.message}`);
    }

    if (!data || data.sequence_no === undefined || data.sequence_no === null) {
      return 1;
    }
    return Number(data.sequence_no) + 1;
  }

  /**
   * Append a user message. Requires valid idempotencyKey.
   * NOTE: per D-04R2 §8, last_activity_at does NOT advance here;
   * it advances ONLY when the full user+assistant dialogue turn completes successfully.
   */
  static async appendUserMessage(
    tenantId: string,
    actorId: string,
    input: AppendUserMessageInput
  ): Promise<CopilotMessage> {
    const db = getDb();
    const effectiveIdempotencyKey = _customDbClient
      ? input.idempotencyKey
      : normalizeIdempotencyUuid(input.idempotencyKey);

    // Prefer atomic procedure if RPC available and not flagged with 42702 ambiguity
    if (typeof db.rpc === 'function' && !_rpcAmbiguousColumnDetected) {
      const { data, error } = await db.rpc('append_copilot_message', {
        p_conversation_id: input.conversationId,
        p_tenant_id: tenantId,
        p_sender_actor_id: actorId,
        p_role: 'user',
        p_content_original: input.content,
        p_language: input.language || 'id',
        p_idempotency_key: effectiveIdempotencyKey,
        p_metadata: input.metadata || {},
      });

      if (error?.code === '42702') {
        _rpcAmbiguousColumnDetected = true;
      } else if (!error && data) {
        const row = Array.isArray(data) ? data[0] : data;
        if (row) return this.mapMessageRow(row);
      }
    }

    // Direct transaction / fallback path
    const existing = await this.findMessageByIdempotencyKey({
      tenantId,
      conversationId: input.conversationId,
      idempotencyKey: effectiveIdempotencyKey,
    });
    if (existing) {
      return existing;
    }

    let lastErr: any = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      const nextSeq = await this.getNextSequenceNo(input.conversationId);
      const now = new Date().toISOString();

      const row = {
        conversation_id: input.conversationId,
        tenant_id: tenantId,
        sender_actor_id: actorId,
        role: 'user',
        sequence_no: nextSeq,
        content_original: input.content,
        language: input.language || 'id',
        idempotency_key: effectiveIdempotencyKey,
        metadata: input.metadata || {},
        created_at: now,
      };

      const { data, error } = await db
        .from('copilot_messages')
        .insert(row)
        .select()
        .single();

      if (!error && data) {
        return this.mapMessageRow(data);
      }

      lastErr = error;
      if (error?.code === '23505' || error?.message?.includes('duplicate key')) {
        const recheck = await this.findMessageByIdempotencyKey({
          tenantId,
          conversationId: input.conversationId,
          idempotencyKey: effectiveIdempotencyKey,
        });
        if (recheck) return recheck;
        // Sequence collision — retry with fresh sequence_no
        continue;
      }
      break;
    }

    throw new Error(`Failed to append user message: ${lastErr?.message || 'Unknown error'}`);
  }

  /**
   * Append an assistant message.
   */
  static async appendAssistantMessage(
    tenantId: string,
    input: AppendAssistantMessageInput
  ): Promise<CopilotMessage> {
    const db = getDb();

    // Prefer atomic procedure if RPC available and not flagged with 42702 ambiguity
    if (typeof db.rpc === 'function' && !_rpcAmbiguousColumnDetected) {
      const { data, error } = await db.rpc('append_copilot_message', {
        p_conversation_id: input.conversationId,
        p_tenant_id: tenantId,
        p_sender_actor_id: null,
        p_role: 'assistant',
        p_content_original: input.content,
        p_language: input.language || 'id',
        p_idempotency_key: null,
        p_metadata: input.metadata || {},
      });

      if (error?.code === '42702') {
        _rpcAmbiguousColumnDetected = true;
      } else if (!error && data) {
        const row = Array.isArray(data) ? data[0] : data;
        if (row) return this.mapMessageRow(row);
      }
    }

    let insertedData: any = null;
    let insertedSeq = 1;
    let insertedNow = new Date().toISOString();
    let lastErr: any = null;

    for (let attempt = 0; attempt < 3; attempt++) {
      const nextSeq = await this.getNextSequenceNo(input.conversationId);
      const now = new Date().toISOString();

      const row = {
        conversation_id: input.conversationId,
        tenant_id: tenantId,
        sender_actor_id: null,
        role: 'assistant',
        sequence_no: nextSeq,
        content_original: input.content,
        language: input.language || 'id',
        idempotency_key: null,
        metadata: input.metadata || {},
        created_at: now,
      };

      const { data, error } = await db
        .from('copilot_messages')
        .insert(row)
        .select()
        .single();

      if (!error && data) {
        insertedData = data;
        insertedSeq = nextSeq;
        insertedNow = now;
        break;
      }

      lastErr = error;
      if (error?.code === '23505' || error?.message?.includes('duplicate key')) {
        continue;
      }
      break;
    }

    if (!insertedData) {
      throw new Error(`Failed to append assistant message: ${lastErr?.message || 'Unknown error'}`);
    }

    // Touch conversation last_activity_at only on successful completion of a user + assistant turn
    // Pairing invariant: The assistant message must resolve an unanswered user turn.
    // An unanswered user turn exists when the latest user message in the conversation has a higher sequence_no
    // than the latest successful assistant message.
    if (input.metadata?.status !== 'ERROR') {
      const { data: allMsgs } = await db
        .from('copilot_messages')
        .select('role, sequence_no, metadata')
        .eq('conversation_id', input.conversationId)
        .order('sequence_no', { ascending: false });

      const priorMsgs = (allMsgs || []).filter((m: any) => Number(m.sequence_no) < insertedSeq);
      const latestUser = priorMsgs.find((m: any) => m.role === 'user');
      const latestSuccessAssistant = priorMsgs.find(
        (m: any) => m.role === 'assistant' && m.metadata?.status !== 'ERROR'
      );

      const latestUserSeq = latestUser ? Number(latestUser.sequence_no) : 0;
      const latestSuccessAssistantSeq = latestSuccessAssistant ? Number(latestSuccessAssistant.sequence_no) : 0;

      if (latestUserSeq > latestSuccessAssistantSeq) {
        await this.touchConversationActivity(input.conversationId, tenantId, insertedNow);
      }
    }

    return this.mapMessageRow(insertedData);
  }

  /**
   * List messages for a conversation in chronological order (sequence_no ASC).
   */
  static async listMessages(
    conversationId: string,
    tenantId: string,
    limit?: number
  ): Promise<CopilotMessage[]> {
    const db = getDb();
    let query = db
      .from('copilot_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .eq('tenant_id', tenantId)
      .order('sequence_no', { ascending: true });

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`Failed to list messages: ${error.message}`);
    }

    return (data || []).map((row: any) => this.mapMessageRow(row));
  }

  /**
   * Fetch recent messages for hybrid context window (most recent N turns).
   */
  static async getRecentMessagesForContext(
    conversationId: string,
    tenantId: string,
    turnLimit: number = 8
  ): Promise<CopilotMessage[]> {
    const db = getDb();
    // Fetch last (turnLimit * 2) messages descending, then reverse to chronological order
    const maxMessages = turnLimit * 2;
    const { data, error } = await db
      .from('copilot_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .eq('tenant_id', tenantId)
      .order('sequence_no', { ascending: false })
      .limit(maxMessages);

    if (error) {
      throw new Error(`Failed to get recent messages: ${error.message}`);
    }

    const messages = (data || []).map((row: any) => this.mapMessageRow(row));
    return messages.reverse();
  }

  private static async touchConversationActivity(
    conversationId: string,
    tenantId: string,
    timestamp: string
  ): Promise<void> {
    const db = getDb();
    await db
      .from('copilot_conversations')
      .update({
        last_activity_at: timestamp,
        updated_at: timestamp,
      })
      .eq('id', conversationId)
      .eq('tenant_id', tenantId);
  }

  private static mapConversationRow(row: any): CopilotConversation {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      ownerActorId: row.owner_actor_id,
      title: row.title,
      status: row.status,
      contextSummary: row.context_summary,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastActivityAt: row.last_activity_at,
      deletedAt: row.deleted_at,
    };
  }

  private static mapMessageRow(row: any): CopilotMessage {
    return {
      id: row.id,
      conversationId: row.conversation_id,
      tenantId: row.tenant_id,
      senderActorId: row.sender_actor_id,
      role: row.role,
      sequenceNo: Number(row.sequence_no),
      contentOriginal: row.content_original,
      language: row.language,
      idempotencyKey: row.idempotency_key,
      metadata: typeof row.metadata === 'object' && row.metadata !== null ? row.metadata : {},
      createdAt: row.created_at,
    };
  }
}
