/**
 * Sentralogis Copilot — Operational Live Read Types
 * lib/copilot/read/types.ts
 *
 * Defines the canonical machine-readable operational result contract
 * for live operational reads (§23, §24, §26, §27).
 *
 * MANDATORY INVARIANTS:
 * 1. Read-only: Zero mutation properties, zero execution triggers.
 * 2. availableActions must NEVER imply execution authorization (only 'NAVIGATE' | 'PROPOSE').
 * 3. Source traceability: Distinguishes 'LIVE_CANONICAL_READ' from 'SIMULATED_DATA'.
 * 4. Result Card ready: Contains entityType, entityId, displayIdentifier without text parsing.
 */

import type { ProposalBlock } from '@/components/copilot/v2/types';

export type OperationalEntityType =
  | 'JOB_ORDER'
  | 'WORK_ORDER'
  | 'SALES_ORDER'
  | 'SHIPMENT'
  | 'INVOICE'
  | 'CUSTOMER';

export type OperationalReadSource = 'LIVE_CANONICAL_READ' | 'SIMULATED_DATA';

export interface OperationalReadAction {
  action: string;
  label: string;
  type: 'NAVIGATE' | 'PROPOSE';
  target?: string;
}

export interface OperationalReadResult {
  entityType: OperationalEntityType;
  entityId: string;
  displayIdentifier: string;
  summary: string;
  status: string;
  customer?: string;
  origin?: string;
  destination?: string;
  driver?: string;
  vehicle?: string;
  relevantDates?: Record<string, string>;
  source: OperationalReadSource;
  readAt: string;
  availableActions?: OperationalReadAction[];
  navigationRoute?: string;
  rawEntity?: Record<string, unknown>;
}

export type LiveReadResolutionState =
  | 'DIRECT_ANSWER'
  | 'CLARIFICATION_REQUIRED'
  | 'BROAD_SUMMARY'
  | 'NOT_FOUND'
  | 'UNKNOWN_OPERATIONAL'
  | 'UNAVAILABLE'
  | 'PROPOSAL';

export interface OperationalLiveReadResponse {
  resolutionState: LiveReadResolutionState;
  source: OperationalReadSource;
  readAt: string;
  results: OperationalReadResult[];
  counts: {
    total: number;
    distribution?: Record<string, number>;
  };
  summaryText: string;
  clarificationQuestion?: string;
  proposal?: ProposalBlock;
}
