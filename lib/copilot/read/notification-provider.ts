/**
 * Sentralogis — AI Copilot Stage 1 READ
 * lib/copilot/read/notification-provider.ts
 *
 * Canonical NotificationInboxQuery implementation.
 *
 * Reads from the canonical event_outbox with tenant/user filtering.
 * READ only — no mark-as-read, acknowledge, or mutation.
 *
 * If event_outbox is unavailable, returns empty inbox rather than
 * fabricated notifications.
 */

import type {
  FoundationContext,
  NotificationItem,
  NotificationInboxOptions,
  NotificationInboxResult,
} from '@/lib/copilot/foundation/contracts';
import { assertPermission } from '@/lib/application/identity/resolver';
import { EventOutboxQueryService } from '@/lib/domain/event/event-outbox-query-service';

export class NotificationInboxProvider {
  static async getInbox(
    context: FoundationContext,
    options?: NotificationInboxOptions,
  ): Promise<NotificationInboxResult> {
    assertPermission(context.identity, 'commercial:read');

    const result = await EventOutboxQueryService.getInbox(context.identity, {
      categories: options?.categories,
      from: options?.from,
      to: options?.to,
      limit: options?.limit ?? 50,
      cursor: options?.cursor ?? null,
    });

    return {
      items: result.items.map((item) => ({
        notificationId: item.notificationId,
        category: item.category,
        priority: item.priority,
        title: item.title,
        message: item.message,
        entityReference: item.entityReference,
        timestamp: item.timestamp,
        read: item.read,
      })),
      hasMore: result.hasMore,
      unreadCount: result.unreadCount,
    };
  }
}
