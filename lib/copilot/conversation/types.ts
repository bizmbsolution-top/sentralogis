/**
 * Sentralogis — AI Copilot Conversation Persistence
 * lib/copilot/conversation/types.ts
 *
 * Domain contracts, entities, and DTOs for Conversation Persistence.
 * Ratified in D-COPILOT-CONVERSATION-03 & D-04R2.
 */

export type ConversationStatus = 'ACTIVE' | 'ARCHIVED';
export type ConversationScope = 'cs' | 'sbu' | 'general';
export type MessageRole = 'user' | 'assistant' | 'system';

export interface CopilotConversation {
  id: string;
  tenantId: string;
  ownerActorId: string;
  scope?: ConversationScope;
  title: string | null;
  status: ConversationStatus;
  contextSummary: string | null;
  createdAt: string;
  updatedAt: string;
  lastActivityAt: string;
  deletedAt: string | null;
}

export interface CopilotMessageMetadata {
  intent?: string;
  confidence?: number;
  entities?: Record<string, any>;
  aiStatus?: 'AVAILABLE' | 'DEGRADED' | 'UNAVAILABLE';
  resolutionSource?: 'OPENAI' | 'DETERMINISTIC_FALLBACK' | 'NONE';
  failureClass?: string;
  status?: 'SUCCESS' | 'ERROR';
  errorDetails?: string;
  [key: string]: any;
}

export interface CopilotMessage {
  id: string;
  conversationId: string;
  tenantId: string;
  senderActorId: string | null;
  role: MessageRole;
  sequenceNo: number;
  contentOriginal: string;
  language: string | null;
  idempotencyKey: string | null;
  metadata: CopilotMessageMetadata;
  createdAt: string;
}

export interface CreateConversationInput {
  title?: string | null;
  scope?: ConversationScope;
}

export interface ListConversationsParams {
  limit?: number;
  status?: ConversationStatus;
  scope?: ConversationScope;
}

export interface AppendUserMessageInput {
  conversationId: string;
  content: string;
  idempotencyKey: string;
  language?: string;
  metadata?: CopilotMessageMetadata;
}

export interface AppendAssistantMessageInput {
  conversationId: string;
  content: string;
  language?: string;
  metadata?: CopilotMessageMetadata;
}

export interface HybridContextResult {
  systemPrompt: string;
  recentMessages: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  totalTurnCount: number;
}
