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
import { ConversationRepository } from './repository';
import { HybridContextBuilder } from './hybrid-context';
import type {
  CopilotConversation,
  CopilotMessage,
  CreateConversationInput,
  ListConversationsParams,
  AppendUserMessageInput,
  AppendAssistantMessageInput,
  HybridContextResult,
} from './types';
import { supabaseAdmin } from '@/lib/supabase/admin';

export class ConversationService {
  /**
   * Create a new conversation owned by the authenticated actor.
   */
  static async createConversation(
    identity: IdentityContext,
    input?: CreateConversationInput
  ): Promise<CopilotConversation> {
    assertPermission(identity, 'copilot:read');

    const conversation = await ConversationRepository.createConversation({
      tenantId: identity.tenantId,
      ownerActorId: identity.userId,
      title: input?.title,
    });

    await this.recordAuditLog({
      tenantId: identity.tenantId,
      actorId: identity.userId,
      operation: 'COPILOT_CONVERSATION_CREATED',
      conversationId: conversation.id,
      details: { title: conversation.title },
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

    return ConversationRepository.listConversations({
      tenantId: identity.tenantId,
      ownerActorId: identity.userId,
      limit: params?.limit,
      status: params?.status,
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
      input
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
      input
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
