/**
 * Sentralogis — AI Copilot Stage 1 READ
 * lib/copilot/read/timeline-provider.ts
 *
 * Canonical TimelineQueryService implementation.
 *
 * Routes through existing canonical domain services:
 * - ShipmentService for shipment milestones/exceptions
 * - OperationalHandoffService for handoff timelines
 * - CustomsService for declaration audit events
 *
 * Never queries persistence tables directly from Copilot.
 */

import type {
  FoundationContext,
  TimelineEvent,
  TimelineQueryParams,
  TimelineQueryResult,
} from '@/lib/copilot/foundation/contracts';
import { ShipmentService } from '@/lib/domain/shipment/shipment-service';
import {
  findOperationalHandoffById,
  listOperationalHandoffsByFulfillment,
} from '@/lib/operational-handoff/service';
import { assertPermission } from '@/lib/application/identity/resolver';

const service = new ShipmentService();

export class TimelineQueryProvider {
  static async getTimeline(
    context: FoundationContext,
    params: TimelineQueryParams,
  ): Promise<TimelineQueryResult> {
    assertPermission(context.identity, 'commercial:read');

    const { entityIds, from, to, categories, limit = 50 } = params;
    const events: TimelineEvent[] = [];

    for (const entityId of entityIds) {
      const entityEvents = await this.resolveEntityTimeline(
        context,
        entityId,
        categories,
      );
      events.push(...entityEvents);
    }

    const filtered = this.applyFilters(events, from, to);
    const sorted = filtered.sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );

    return {
      events: sorted.slice(0, limit),
      hasMore: sorted.length > limit,
    };
  }

  private static async resolveEntityTimeline(
    context: FoundationContext,
    entityId: string,
    categories?: Array<'status_change' | 'assignment' | 'exception' | 'milestone' | 'system'>,
  ): Promise<TimelineEvent[]> {
    const events: TimelineEvent[] = [];

    // Try shipment timeline
    try {
      const aggregate = await service.getShipment(entityId, context.identity.tenantId);
      for (const m of aggregate.milestones) {
        if (!categories || categories.includes('milestone')) {
          events.push({
            eventId: `milestone-${m.id}`,
            entityType: 'shipment',
            entityId,
            status: m.milestone_code,
            location: m.location_id || null,
            timestamp: m.occurred_at,
            category: 'milestone',
          });
        }
      }
      for (const e of aggregate.exceptions) {
        if (!categories || categories.includes('exception')) {
          events.push({
            eventId: `exception-${e.id}`,
            entityType: 'shipment',
            entityId,
            status: e.exception_type,
            timestamp: e.created_at,
            category: 'exception',
            correlationId: e.id,
          });
        }
      }
    } catch {
      // Not a shipment or not accessible
    }

    // Try handoff timeline
    try {
      const handoff = await findOperationalHandoffById(context.identity, entityId);
      const handoffEvents = this.handoffToTimelineEvents(handoff);
      events.push(...handoffEvents);
    } catch {
      // Not a handoff or not accessible
    }

    return events;
  }

  private static handoffToTimelineEvents(handoff: any): TimelineEvent[] {
    const events: TimelineEvent[] = [];
    const add = (status: string, timestamp: string | null, category: TimelineEvent['category']) => {
      if (!timestamp) return;
      events.push({
        eventId: `${handoff.id}-${status}`,
        entityType: 'handoff',
        entityId: handoff.id,
        status,
        timestamp,
        category,
      });
    };

    add('ISSUED', handoff.issuedAt, 'status_change');
    add('ACKNOWLEDGED', handoff.acknowledgedAt, 'status_change');
    add('ACCEPTED', handoff.acceptedAt, 'status_change');
    add('EXECUTING', handoff.executingAt, 'status_change');
    add('FULFILLED', handoff.fulfilledAt, 'status_change');
    add('FAILED', handoff.failedAt, 'exception');
    add('REJECTED', handoff.rejectedAt, 'exception');

    return events;
  }

  private static applyFilters(
    events: TimelineEvent[],
    from?: string | null,
    to?: string | null,
  ): TimelineEvent[] {
    return events.filter((e) => {
      const t = new Date(e.timestamp).getTime();
      if (from && t < new Date(from).getTime()) return false;
      if (to && t > new Date(to).getTime()) return false;
      return true;
    });
  }
}
