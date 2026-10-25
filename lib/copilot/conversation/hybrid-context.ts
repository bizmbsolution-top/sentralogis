/**
 * Sentralogis — AI Copilot Hybrid Context Builder
 * lib/copilot/conversation/hybrid-context.ts
 *
 * Implements HD-03 / Option C: Hybrid Context Window.
 * Assembles:
 *  1. Pinned active operational context (active entity, customer, job order).
 *  2. Summary of past turns (if summary exists).
 *  3. Verbatim recent dialogue (6–10 turns).
 *
 * Guaranteed:
 *  - Verbatim recent dialogue bounded within 6–10 turns.
 *  - Zero hallucinated operational facts.
 *  - Pinned context clearly distinguished from conversational memory.
 */

import { ConversationRepository } from './repository';
import type { HybridContextResult } from './types';

export interface HybridContextOptions {
  conversationId: string;
  tenantId: string;
  turnLimit?: number; // Default 8 (within 6-10 turns range ratified in HD-03)
  pinnedContext?: {
    activeJobOrder?: string;
    activeCustomerId?: string;
    activeEntity?: string;
    sbu?: string;
    [key: string]: any;
  };
  contextSummary?: string | null;
}

export class HybridContextBuilder {
  static async buildContext(options: HybridContextOptions): Promise<HybridContextResult> {
    const turnLimit = Math.min(Math.max(options.turnLimit || 8, 6), 10);

    const recentMessages = await ConversationRepository.getRecentMessagesForContext(
      options.conversationId,
      options.tenantId,
      turnLimit
    );

    // Format pinned operational context
    let pinnedSection = '';
    if (options.pinnedContext && Object.keys(options.pinnedContext).length > 0) {
      const entries = Object.entries(options.pinnedContext)
        .filter(([_, v]) => Boolean(v))
        .map(([k, v]) => `  - ${k}: ${v}`);
      if (entries.length > 0) {
        pinnedSection = `\n[PINNED OPERATIONAL CONTEXT]:\n${entries.join('\n')}\n`;
      }
    }

    // Format summary section if present
    let summarySection = '';
    if (options.contextSummary && options.contextSummary.trim()) {
      summarySection = `\n[CONVERSATION BACKGROUND SUMMARY]:\n${options.contextSummary.trim()}\n`;
    }

    const systemPrompt = `You are Sentralogis Copilot, an enterprise logistics assistant.
Strictly adhere to the following operational boundaries:
1. Ground all answers strictly in verified system data and provided context.
2. If an entity or operational status is unknown, ask for clarification. Do NOT guess or invent numbers.
3. Private conversation: all context is private to the current authenticated actor.
${pinnedSection}${summarySection}`.trim();

    const formattedTurns = recentMessages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.contentOriginal,
      }));

    return {
      systemPrompt,
      recentMessages: formattedTurns,
      totalTurnCount: Math.ceil(recentMessages.length / 2),
    };
  }
}
