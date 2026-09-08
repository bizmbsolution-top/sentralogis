/**
 * Sentralogis — AI Copilot Foundation
 *
 * Public surface for the Foundation stage.
 *
 * Foundation establishes:
 * - Canonical query contracts (TimelineQueryService, OperationalSummaryQuery,
 *   EntitySearchAPI, NotificationInboxQuery)
 * - Canonical identity/tenant integration boundary
 * - Implementation-ready interfaces without implementing READ/PROPOSE/EXECUTE
 */

export * from './types';
export * from './contracts';
export * from './integration';
