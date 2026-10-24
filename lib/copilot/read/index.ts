/**
 * Sentralogis — AI Copilot Stage 1 READ
 *
 * Public surface for canonical Copilot READ providers.
 *
 * Each provider implements a Foundation contract and routes
 * through existing canonical domain services/APIs.
 */

export { TimelineQueryProvider } from './timeline-provider';
export { OperationalSummaryProvider } from './summary-provider';
export { EntitySearchProvider } from './entity-provider';
export { NotificationInboxProvider } from './notification-provider';
export { OperationalLiveReadGateway, _setOperationalReadDelegate } from './operational-live-read-gateway';
export type {
  OperationalEntityType,
  OperationalReadSource,
  OperationalReadAction,
  OperationalReadResult,
  LiveReadResolutionState,
  OperationalLiveReadResponse,
} from './types';
