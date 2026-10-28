/**
 * Sentralogis — AI Copilot Conversation Service
 * lib/copilot/conversation/service.ts
 *
 * Application service orchestrating conversation lifecycle,
 * actor/tenant access verification, idempotency, audit logging,
 * and hybrid context retrieval.
 */

import type { IdentityContext } from '@/lib/application/identity/types';
import { assertPermission } from '@/lib/application/identity/resolver';
import {
  ConversationRepository,
  isValidConversationUuid,
  isCustomConversationDbActive,
} from './repository';
import { HybridContextBuilder } from './hybrid-context';
import type {
  CopilotConversation,
  CopilotMessage,
  ConversationStatus,
  ConversationScope,
  CreateConversationInput,
  ListConversationsParams,
  AppendUserMessageInput,
  AppendAssistantMessageInput,
  HybridContextResult,
} from './types';
import { supabaseAdmin } from '@/lib/supabase/admin';

const SENSITIVE_META_KEY_REGEX = /^(authorization|access_token|refresh_token|password|secret|api_key|apikey|private_key|cookie|session_token|bearer)$/i;

export function sanitizeConversationMetadata(meta?: Record<string, any> | null): Record<string, any> {
  if (!meta || typeof meta !== 'object') return {};
  const clean: Record<string, any> = {};
  for (const [key, val] of Object.entries(meta)) {
    if (SENSITIVE_META_KEY_REGEX.test(key)) continue;
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      clean[key] = sanitizeConversationMetadata(val);
    } else {
      clean[key] = val;
    }
  }
  return clean;
}

export class ConversationService {
  /**
   * Derive a concise, human-friendly title from the user's message.
   */
  static deriveConversationTitle(userMessage: string): string {
    const raw = (userMessage || '')
      .replace(/\[SYSTEM ENRICHED OCR TEXT[\s\S]*$/i, '')
      .replace(/\[Attached:[\s\S]*$/i, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!raw) return 'Percakapan Baru';

    // Strip leading greetings if followed by a real command
    const strippedGreeting = raw
      .replace(/^(?:halo|hai|selamat\s+(?:pagi|siang|sore|malam)|pagi|siang|sore|malam)[\s,!.:;-]+/i, '')
      .trim();

    const candidate = strippedGreeting.length >= 3 ? strippedGreeting : raw;

    // Ignore trivial single-word confirmations as titles
    if (/^(ya|ya,?\s*daftarkan|ok|yes|setuju|lanjut|lanjutkan|simpan|batal|batalkan|cancel|halo|hai|tes|test)$/i.test(candidate)) {
      return 'Percakapan Baru';
    }

    if (candidate.length <= 60) {
      return candidate;
    }

    const truncated = candidate.slice(0, 57);
    const lastSpace = truncated.lastIndexOf(' ');
    return (lastSpace > 25 ? truncated.slice(0, lastSpace) : truncated).trim() + '...';
  }

  /**
   * Resolve effective scope based on identity role and optional requested scope.
   * Ensures strict separation between CS (Commercial) and SBU (Operations).
   */
  static resolveEffectiveScope(
    identity: IdentityContext,
    requestedScope?: ConversationScope | string | null
  ): ConversationScope {
    const role = (identity.role || '').toLowerCase();
    // Dedicated SBU operational roles are strictly locked to 'sbu'
    if (role.startsWith('sbu_') || role === 'driver' || role === 'ground_staff') {
      return 'sbu';
    }
    // Dedicated CS / Commercial roles are strictly locked to 'cs'
    if (
      role === 'hq_cs' ||
      role === 'hq_director_cs' ||
      role === 'hq_commercial_director' ||
      role === 'hq_sales_manager' ||
      role === 'hq_sales_staff'
    ) {
      return 'cs';
    }
    // Roles with multi-workspace access (admin, owner, general dispatcher) honor the active context
    const cleanReq = (requestedScope || '').trim().toLowerCase();
    if (cleanReq === 'sbu') return 'sbu';
    if (cleanReq === 'general') return 'general';
    return 'cs';
  }

  /**
   * Ensure a valid, actor-owned conversation exists for the current turn,
   * creating one automatically if needed, and updating the default title
   * when the first meaningful user message arrives.
   */
  static async ensureConversationForTurn(
    identity: IdentityContext,
    requestedConversationId: string | null | undefined,
    userMessageText: string,
    requestedScope?: ConversationScope | string | null
  ): Promise<{ conversation: CopilotConversation; created: boolean }> {
    assertPermission(identity, 'copilot:read');

    const effectiveScope = this.resolveEffectiveScope(identity, requestedScope);
    const candidateId = (requestedConversationId || '').trim();
    const canLookup =
      candidateId &&
      candidateId !== 'default-session' &&
      candidateId !== 'default' &&
      (isValidConversationUuid(candidateId) || isCustomConversationDbActive());

    const derivedTitle = this.deriveConversationTitle(userMessageText);

    if (canLookup) {
      const existing = await this.getConversation(identity, candidateId);
      if (existing) {
        if (
          (!existing.title || existing.title === 'Percakapan Baru') &&
          derivedTitle !== 'Percakapan Baru'
        ) {
          const updated = await this.updateConversation(identity, existing.id, {
            title: derivedTitle,
          });
          if (updated) {
            return { conversation: updated, created: false };
          }
        }
        return { conversation: existing, created: false };
      }
    }

    const created = await this.createConversation(identity, {
      title: derivedTitle,
      scope: effectiveScope,
    });
    return { conversation: created, created: true };
  }

  /**
   * Update conversation title or summary with actor ownership verification.
   */
  static async updateConversation(
    identity: IdentityContext,
    conversationId: string,
    updates: { title?: string | null; contextSummary?: string | null }
  ): Promise<CopilotConversation | null> {
    assertPermission(identity, 'copilot:read');

    const safeTitle =
      updates.title !== undefined && updates.title !== null
        ? updates.title.trim().slice(0, 120) || 'Percakapan Baru'
        : updates.title;

    return ConversationRepository.updateConversation({
      tenantId: identity.tenantId,
      ownerActorId: identity.userId,
      conversationId,
      title: safeTitle,
      contextSummary: updates.contextSummary,
    });
  }
  /**
   * Create a new conversation owned by the authenticated actor.
   */
  static async createConversation(
    identity: IdentityContext,
    input?: CreateConversationInput
  ): Promise<CopilotConversation> {
    assertPermission(identity, 'copilot:read');

    const effectiveScope = this.resolveEffectiveScope(identity, input?.scope);

    const conversation = await ConversationRepository.createConversation({
      tenantId: identity.tenantId,
      ownerActorId: identity.userId,
      title: input?.title,
      scope: effectiveScope,
    });

    await this.recordAuditLog({
      tenantId: identity.tenantId,
      actorId: identity.userId,
      operation: 'COPILOT_CONVERSATION_CREATED',
      conversationId: conversation.id,
      details: { title: conversation.title, scope: effectiveScope },
    });

    return conversation;
  }

  /**
   * List conversations owned by the authenticated actor.
   */
  static async listConversations(
    identity: IdentityContext,
    params?: ListConversationsParams
  ): Promise<CopilotConversation[]> {
    assertPermission(identity, 'copilot:read');

    const effectiveScope = this.resolveEffectiveScope(identity, params?.scope);

    return ConversationRepository.listConversations({
      tenantId: identity.tenantId,
      ownerActorId: identity.userId,
      limit: params?.limit,
      status: params?.status,
      scope: effectiveScope,
    });
  }

  /**
   * Get a conversation by ID, enforcing private-by-actor ownership.
   */
  static async getConversation(
    identity: IdentityContext,
    conversationId: string
  ): Promise<CopilotConversation | null> {
    assertPermission(identity, 'copilot:read');

    return ConversationRepository.findConversation({
      tenantId: identity.tenantId,
      ownerActorId: identity.userId,
      conversationId,
    });
  }

  /**
   * Soft-delete a conversation.
   */
  static async deleteConversation(
    identity: IdentityContext,
    conversationId: string
  ): Promise<boolean> {
    assertPermission(identity, 'copilot:read');

    const success = await ConversationRepository.softDeleteConversation({
      tenantId: identity.tenantId,
      ownerActorId: identity.userId,
      conversationId,
    });

    if (success) {
      await this.recordAuditLog({
        tenantId: identity.tenantId,
        actorId: identity.userId,
        operation: 'COPILOT_CONVERSATION_DELETED',
        conversationId,
      });
    }

    return success;
  }

  /**
   * Append user message after validating conversation ownership.
   */
  static async appendUserMessage(
    identity: IdentityContext,
    input: AppendUserMessageInput
  ): Promise<CopilotMessage> {
    assertPermission(identity, 'copilot:read');

    // Ensure conversation exists and is owned by caller
    const conv = await this.getConversation(identity, input.conversationId);
    if (!conv) {
      throw new Error('Conversation not found or access denied');
    }

    return ConversationRepository.appendUserMessage(
      identity.tenantId,
      identity.userId,
      {
        ...input,
        metadata: sanitizeConversationMetadata(input.metadata),
      }
    );
  }

  /**
   * Append assistant message to an owned conversation.
   */
  static async appendAssistantMessage(
    identity: IdentityContext,
    input: AppendAssistantMessageInput
  ): Promise<CopilotMessage> {
    assertPermission(identity, 'copilot:read');

    const conv = await this.getConversation(identity, input.conversationId);
    if (!conv) {
      throw new Error('Conversation not found or access denied');
    }

    return ConversationRepository.appendAssistantMessage(
      identity.tenantId,
      {
        ...input,
        metadata: sanitizeConversationMetadata(input.metadata),
      }
    );
  }

  /**
   * List messages in a conversation.
   */
  static async listMessages(
    identity: IdentityContext,
    conversationId: string,
    limit?: number
  ): Promise<CopilotMessage[]> {
    assertPermission(identity, 'copilot:read');

    const conv = await this.getConversation(identity, conversationId);
    if (!conv) {
      throw new Error('Conversation not found or access denied');
    }

    return ConversationRepository.listMessages(
      conversationId,
      identity.tenantId,
      limit
    );
  }

  /**
   * Build hybrid context for OpenAI completion prompt.
   */
  static async buildHybridContext(
    identity: IdentityContext,
    conversationId: string,
    pinnedContext?: Record<string, any>
  ): Promise<HybridContextResult> {
    assertPermission(identity, 'copilot:read');

    const conv = await this.getConversation(identity, conversationId);
    if (!conv) {
      throw new Error('Conversation not found or access denied');
    }

    return HybridContextBuilder.buildContext({
      conversationId,
      tenantId: identity.tenantId,
      pinnedContext,
      contextSummary: conv.contextSummary,
    });
  }

  /**
   * Write a lifecycle audit record to public.audit_logs per D-04R2.
   */
  private static async recordAuditLog(params: {
    tenantId: string;
    actorId: string;
    operation: string;
    conversationId: string;
    details?: Record<string, any>;
  }): Promise<void> {
    try {
      const db = (await import('./repository')).getConversationDb();
      await db.from('audit_logs').insert({
        tenant_id: params.tenantId,
        entity_type: 'copilot_conversation',
        entity_id: params.conversationId,
        operation: params.operation,
        performed_by: params.actorId,
        new_data: params.details || {},
        changed_fields: ['copilot_conversation'],
      });
    } catch (err) {
      // Audit log error should not crash core conversation flow, but is logged
      console.warn('[ConversationService] Audit log recording failed:', err);
    }
  }
}
