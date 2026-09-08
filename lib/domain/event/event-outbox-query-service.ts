/**
 * Sentralogis — AI Copilot Stage 1 READ Boundary Repair
 * lib/domain/event/event-outbox-query-service.ts
 *
 * Canonical tenant-scoped event outbox query service.
 *
 * This is a minimal canonical domain service, NOT Copilot-specific.
 * It provides the authorized persistence boundary for notification/event reads.
 *
 * Persistence boundary:
 *   NotificationInboxProvider
 *     → EventOutboxQueryService (this file)
 *     → Persistence Authority
 */

import type { IdentityContext } from '@/lib/application/identity/types';
import { assertPermission } from '@/lib/application/identity/resolver';
import { supabaseAdmin } from '@/lib/supabase/admin';

export interface EventOutboxQueryOptions {
  categories?: Array<'status_change' | 'exception' | 'handoff' | 'system'>;
  from?: string | null;
  to?: string | null;
  limit?: number;
  cursor?: string | null;
}

export interface EventOutboxItem {
  notificationId: string;
  category: 'status_change' | 'exception' | 'handoff' | 'system';
  priority: 'low' | 'normal' | 'high' | 'critical';
  title: string;
  message: string;
  entityReference?: {
    entityType: string;
    entityId: string;
  };
  timestamp: string;
  read: boolean;
}

export interface EventOutboxQueryResult {
  items: EventOutboxItem[];
  hasMore: boolean;
  unreadCount: number;
}

export class EventOutboxQueryService {
  static async getInbox(
    context: IdentityContext,
    options?: EventOutboxQueryOptions,
  ): Promise<EventOutboxQueryResult> {
    assertPermission(context, 'commercial:read');

    const tenantId = context.tenantId;
    const limit = options?.limit ?? 50;
    const cursor = options?.cursor ?? null;

    let query = supabaseAdmin
      .from('event_outbox')
      .select('id, event_name, payload, created_at, tenant_id, aggregate_type, aggregate_id')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (cursor) {
      query = query.lt('created_at', cursor);
    }

    if (options?.categories && options.categories.length > 0) {
      const mapped = options.categories.map((c) => `SENTRALOGIS.${c.toUpperCase()}`);
      query = query.in('event_name', mapped);
    }

    if (options?.from) {
      query = query.gte('created_at', options.from);
    }
    if (options?.to) {
      query = query.lte('created_at', options.to);
    }

    const { data, error } = await query;

    if (error || !data || data.length === 0) {
      return {
        items: [],
        hasMore: false,
        unreadCount: 0,
      };
    }

    const items: EventOutboxItem[] = data.map((row) => {
      const payload = (row.payload as Record<string, any>) || {};
      return {
        notificationId: row.id,
        category: this.mapEventNameToCategory(row.event_name),
        priority: this.mapPriority(payload),
        title: payload.title || payload.subject || row.event_name,
        message: payload.message || payload.description || '',
        entityReference: payload.entity_reference
          ? {
              entityType: payload.entity_reference.entity_type || row.aggregate_type || 'unknown',
              entityId: payload.entity_reference.entity_id || row.aggregate_id || '',
            }
          : undefined,
        timestamp: row.created_at,
        read: false,
      };
    });

    return {
      items,
      hasMore: data.length >= limit,
      unreadCount: items.length,
    };
  }

  private static mapEventNameToCategory(eventName: string): EventOutboxItem['category'] {
    const normalized = eventName.toLowerCase();
    if (normalized.includes('exception') || normalized.includes('error') || normalized.includes('failed')) {
      return 'exception';
    }
    if (normalized.includes('handoff')) {
      return 'handoff';
    }
    if (normalized.includes('status') || normalized.includes('milestone')) {
      return 'status_change';
    }
    return 'system';
  }

  private static mapPriority(payload: Record<string, any>): EventOutboxItem['priority'] {
    const severity = payload.severity?.toLowerCase();
    if (severity === 'critical' || severity === 'blocking') return 'critical';
    if (severity === 'warning') return 'high';
    if (severity === 'info') return 'low';
    return 'normal';
  }
}
