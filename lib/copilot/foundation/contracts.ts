/**
 * Sentralogis — AI Copilot Foundation
 * lib/copilot/foundation/contracts.ts
 *
 * Minimum architectural contracts for the four canonical
 * Copilot query services required by the Foundation stage.
 *
 * These interfaces define the authorized access boundary.
 * Implementations must route through canonical domain services,
 * never directly query persistence tables.
 *
 * Database tables are persistence authorities, NOT approved
 * Copilot access interfaces.
 */

import type {
  FoundationContext,
  TimelineEvent,
  OperationalSummary,
  EntityResult,
  NotificationItem,
} from './types';

export type {
  FoundationContext,
  TimelineEvent,
  OperationalSummary,
  EntityResult,
  NotificationItem,
};

// ============================================================================
// TimelineQueryService
// ============================================================================

/**
 * Canonical operational timeline retrieval.
 *
 * Owning domain: Trucking / Forwarding / Customs (cross-domain)
 * Purpose: Unified chronological view of operational events for a given entity.
 */
export interface TimelineQueryService {
  /**
   * Retrieve timeline events for the specified entities within the tenant.
   * @param context - Foundation context with server-derived tenant/permissions
   * @param params - Query parameters
   * @returns Chronological event list
   */
  getTimeline(
    context: FoundationContext,
    params: TimelineQueryParams,
  ): Promise<TimelineQueryResult>;
}

export interface TimelineQueryParams {
  /** Entity references to build timeline for */
  entityIds: string[];
  /** Optional time range filter */
  from?: string | null;
  to?: string | null;
  /** Optional event category filter */
  categories?: Array<'status_change' | 'assignment' | 'exception' | 'milestone' | 'system'>;
  /** Pagination cursor */
  cursor?: string | null;
  /** Maximum results per page */
  limit?: number;
}

export interface TimelineQueryResult {
  events: TimelineEvent[];
  nextCursor?: string | null;
  hasMore: boolean;
}

// ============================================================================
// OperationalSummaryQuery
// ============================================================================

/**
 * Canonical aggregated operational status.
 *
 * Owning domain: Control Tower / Fulfillment
 * Purpose: Aggregated operational health metrics for Copilot situational awareness.
 */
export interface OperationalSummaryQuery {
  /**
   * Retrieve operational summary for the tenant.
   * @param context - Foundation context with server-derived tenant/permissions
   * @param params - Optional filters
   * @returns Aggregated operational metrics
   */
  getSummary(
    context: FoundationContext,
    params?: OperationalSummaryParams,
  ): Promise<OperationalSummary>;
}

export interface OperationalSummaryParams {
  /** Optional Sales Order scope — delegates to Control Tower when provided */
  salesOrderId?: string | null;
  /** Optional SBU filter */
  sbuType?: 'trucking' | 'warehouse' | 'clearances' | 'forwarding' | null;
  /** Optional date range */
  from?: string | null;
  to?: string | null;
  /** Optional status filter */
  status?: string | null;
}

// ============================================================================
// EntitySearchAPI
// ============================================================================

/**
 * Canonical tenant-scoped entity lookup/search.
 *
 * Owning domain: Multiple domains (Party/Entity, Trucking, Forwarding, Customs)
 * Purpose: Type-ahead / search across canonical entities.
 */
export interface EntitySearchAPI {
  /**
   * Search entities accessible to the actor within the tenant.
   * @param context - Foundation context with server-derived tenant/permissions
   * @param query - Search query string
   * @returns Ranked entity results
   */
  search(
    context: FoundationContext,
    query: string,
    options?: EntitySearchOptions,
  ): Promise<EntitySearchResult>;
}

export interface EntitySearchOptions {
  /** Filter by entity type(s) */
  entityTypes?: Array<'customer' | 'driver' | 'vehicle' | 'shipment' | 'declaration' | 'job_order' | 'work_order'>;
  /** Only active entities */
  activeOnly?: boolean;
  /** Maximum results */
  limit?: number;
  /** Pagination cursor */
  cursor?: string | null;
}

export interface EntitySearchResult {
  results: EntityResult[];
  nextCursor?: string | null;
  hasMore: boolean;
}

// ============================================================================
// NotificationInboxQuery
// ============================================================================

/**
 * Canonical operational notification/inbox retrieval.
 *
 * Owning domain: Event Outbox / Operational Handoff
 * Purpose: Unified inbox of operational notifications relevant to the actor.
 */
export interface NotificationInboxQuery {
  /**
   * Retrieve notifications for the actor within the tenant.
   * @param context - Foundation context with server-derived tenant/permissions
   * @param options - Inbox filters
   * @returns Notification list
   */
  getInbox(
    context: FoundationContext,
    options?: NotificationInboxOptions,
  ): Promise<NotificationInboxResult>;
}

export interface NotificationInboxOptions {
  /** Filter by read/unread */
  read?: boolean | null;
  /** Filter by category */
  categories?: Array<'status_change' | 'exception' | 'handoff' | 'system'>;
  /** Filter by priority */
  priority?: 'low' | 'normal' | 'high' | 'critical' | null;
  /** Time range */
  from?: string | null;
  to?: string | null;
  /** Pagination cursor */
  cursor?: string | null;
  /** Maximum results per page */
  limit?: number;
}

export interface NotificationInboxResult {
  items: NotificationItem[];
  nextCursor?: string | null;
  hasMore: boolean;
  unreadCount: number;
}
