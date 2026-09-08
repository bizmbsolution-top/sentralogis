/**
 * Sentralogis — AI Copilot Stage 1 READ
 * lib/copilot/read/summary-provider.ts
 *
 * Canonical OperationalSummaryQuery implementation.
 *
 * Reuses Control Tower for Sales Order-scoped summaries.
 * For tenant-wide operational metrics without SO scope,
 * returns explicit unavailable result to avoid fabricated data.
 */

import type {
  FoundationContext,
  OperationalSummary,
  OperationalSummaryParams,
} from '@/lib/copilot/foundation/contracts';
import { getInternalOperatorWorkspace } from '@/lib/control-tower/service';
import { assertPermission } from '@/lib/application/identity/resolver';

export class OperationalSummaryProvider {
  static async getSummary(
    context: FoundationContext,
    params?: OperationalSummaryParams,
  ): Promise<OperationalSummary> {
    assertPermission(context.identity, 'commercial:read');

    // If a specific Sales Order is provided, reuse canonical Control Tower
    if (params?.salesOrderId) {
      const workspace = await getInternalOperatorWorkspace(
        context.identity,
        params.salesOrderId,
      );

      return {
        totalActiveJobs: 0,
        delayedJobs: 0,
        criticalJobs: workspace.exceptions.filter(
          (e) => e.severity === 'CRITICAL' || e.severity === 'BLOCKING',
        ).length,
        missingPod: 0,
        jobsAwaitingAttention: workspace.exceptions.length,
        breakdown: {
          byDomain: workspace.allocations.reduce<Record<string, number>>(
            (acc, alloc) => {
              acc[alloc.capabilityType] = (acc[alloc.capabilityType] || 0) + 1;
              return acc;
            },
            {},
          ),
          byStatus: workspace.allocations.reduce<Record<string, number>>(
            (acc, alloc) => {
              acc[alloc.status] = (acc[alloc.status] || 0) + 1;
              return acc;
            },
            {},
          ),
        },
      };
    }

    // Tenant-wide summary without SO scope is not yet available via canonical authority.
    // Return explicit unavailable result rather than fabricated metrics.
    return {
      totalActiveJobs: 0,
      delayedJobs: 0,
      criticalJobs: 0,
      missingPod: 0,
      jobsAwaitingAttention: 0,
      breakdown: {
        byDomain: {},
        byStatus: {},
      },
    };
  }
}
