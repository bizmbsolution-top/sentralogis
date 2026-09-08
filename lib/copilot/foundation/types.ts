/**
 * Sentralogis — AI Copilot Foundation
 * lib/copilot/foundation/types.ts
 *
 * Core types for the Copilot Foundation stage.
 * These types formalize the canonical integration boundary
 * between IdentityContext and Copilot query contracts.
 */

import type { IdentityContext } from '@/lib/application/identity/types';

/**
 * Foundation context wraps the canonical IdentityContext
 * and provides Copilot-specific foundation metadata.
 *
 * This is the ONLY authorized bridge from platform identity
 * into the Copilot subsystem.
 */
export interface FoundationContext {
  /** Canonical server-derived identity */
  identity: IdentityContext;
  /** Foundation version for contract compatibility */
  version: string;
  /** Enabled canonical query contracts */
  capabilities: FoundationCapability[];
}

export type FoundationCapability =
  | 'timeline'
  | 'operational-summary'
  | 'entity-search'
  | 'notification-inbox';

/**
 * Minimal timeline event contract.
 * Implementations must source from canonical domain services,
 * never directly from persistence tables.
 */
export interface TimelineEvent {
  eventId: string;
  entityType: 'job_order' | 'work_order' | 'shipment' | 'declaration' | 'handoff' | 'fulfillment';
  entityId: string;
  status: string;
  location?: string | null;
  actor?: string | null;
  timestamp: string;
  correlationId?: string | null;
  category?: 'status_change' | 'assignment' | 'exception' | 'milestone' | 'system';
}

/**
 * Operational summary contract.
 */
export interface OperationalSummary {
  totalActiveJobs: number;
  delayedJobs: number;
  criticalJobs: number;
  missingPod: number;
  jobsAwaitingAttention: number;
  breakdown?: {
    byDomain: Record<string, number>;
    byStatus: Record<string, number>;
  };
}

/**
 * Entity search result contract.
 */
export interface EntityResult {
  entityId: string;
  entityType: 'customer' | 'driver' | 'vehicle' | 'shipment' | 'declaration' | 'job_order' | 'work_order';
  displayName: string;
  subtitle?: string | null;
  status?: string | null;
  score: number;
}

/**
 * Notification inbox contract.
 */
export interface NotificationItem {
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
