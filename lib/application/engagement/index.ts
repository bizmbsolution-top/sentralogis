/**
 * Sentralogis — Phase 4B-1b / U-03
 * lib/application/engagement/index.ts
 *
 * Barrel export for the Engagement Resolve-or-Create Bridge module.
 */

// --- Types ---
export type {
  Engagement,
  EngagementStatus,
  ResolveOrCreateEngagementInput,
  EngagementResult,
  LegacyWoBridge,
  WoNumberParams,
  EngagementErrorCode,
} from './types';
export { OPEN_ENGAGEMENT_STATUSES, EngagementError } from './types';

// --- Bridge service ---
export {
  resolveOrCreateEngagement,
  resolveLegacyBridge,
  mapRowToEngagement,
  _setEngagementDbClient,
} from './engagement-bridge';
export type { EngagementDbClient } from './engagement-bridge';
