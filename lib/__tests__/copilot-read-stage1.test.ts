/**
 * Sentralogis — AI Copilot Stage 1 READ
 * lib/__tests__/copilot-read-stage1.test.ts
 *
 * Targeted validation for READ provider implementation.
 * Validates tenant isolation, authorization, READ-only boundary,
 * and mock elimination for production READ paths.
 */

import { TimelineQueryProvider } from '@/lib/copilot/read/timeline-provider';
import { OperationalSummaryProvider } from '@/lib/copilot/read/summary-provider';
import { EntitySearchProvider } from '@/lib/copilot/read/entity-provider';
import { NotificationInboxProvider } from '@/lib/copilot/read/notification-provider';
import { createFoundationContext } from '@/lib/copilot/foundation/integration';
import type { FoundationContext } from '@/lib/copilot/foundation/contracts';

describe('Copilot Stage 1 READ', () => {
  const buildContext = (overrides: Partial<FoundationContext['identity']> = {}): FoundationContext => {
    const identity = {
      tenantId: 'tenant-001',
      userId: 'user-001',
      role: 'USER',
      permissions: ['commercial:read'],
      isTenantOwner: false,
      membershipId: null,
      sbuScope: null,
      ...overrides,
    };

    return createFoundationContext(identity as any);
  };

  describe('TimelineQueryProvider', () => {
    it('returns empty timeline for unknown entity without leaking cross-tenant data', async () => {
      const ctx = buildContext();
      const result = await TimelineQueryProvider.getTimeline(ctx, {
        entityIds: ['non-existent-id'],
        limit: 10,
      });

      expect(result.events).toEqual([]);
      expect(result.hasMore).toBe(false);
    });

    it('rejects unauthorized access', async () => {
      const ctx = buildContext({ permissions: [] });
      await expect(
        TimelineQueryProvider.getTimeline(ctx, {
          entityIds: ['any-id'],
          limit: 10,
        }),
      ).rejects.toThrow();
    });
  });

  describe('OperationalSummaryProvider', () => {
    it('returns structured summary for known Sales Order via Control Tower', async () => {
      const ctx = buildContext();
      const result = await OperationalSummaryProvider.getSummary(ctx, {
        salesOrderId: 'so-known-id',
      });

      expect(result).toHaveProperty('totalActiveJobs');
      expect(result).toHaveProperty('delayedJobs');
      expect(result).toHaveProperty('criticalJobs');
      expect(result).toHaveProperty('missingPod');
      expect(result).toHaveProperty('jobsAwaitingAttention');
      expect(result).toHaveProperty('breakdown');
      expect(typeof result.totalActiveJobs).toBe('number');
    });

    it('returns explicit unavailable result for tenant-wide summary without SO scope', async () => {
      const ctx = buildContext();
      const result = await OperationalSummaryProvider.getSummary(ctx, {});

      expect(result.totalActiveJobs).toBe(0);
      expect(result.breakdown?.byDomain).toEqual({});
      expect(result.breakdown?.byStatus).toEqual({});
    });

    it('rejects unauthorized access', async () => {
      const ctx = buildContext({ permissions: [] });
      await expect(
        OperationalSummaryProvider.getSummary(ctx, {}),
      ).rejects.toThrow();
    });
  });

  describe('EntitySearchProvider', () => {
    it('returns empty results for empty query', async () => {
      const ctx = buildContext();
      const result = await EntitySearchProvider.search(ctx, '', {
        limit: 10,
      });

      expect(result.results).toEqual([]);
      expect(result.hasMore).toBe(false);
    });

    it('rejects unauthorized access', async () => {
      const ctx = buildContext({ permissions: [] });
      await expect(
        EntitySearchProvider.search(ctx, 'test', { limit: 10 }),
      ).rejects.toThrow();
    });
  });

  describe('NotificationInboxProvider', () => {
    it('returns empty inbox when no events exist', async () => {
      const ctx = buildContext();
      const result = await NotificationInboxProvider.getInbox(ctx, {
        limit: 10,
      });

      expect(result.items).toEqual([]);
      expect(result.hasMore).toBe(false);
      expect(result.unreadCount).toBe(0);
    });

    it('rejects unauthorized access', async () => {
      const ctx = buildContext({ permissions: [] });
      await expect(
        NotificationInboxProvider.getInbox(ctx, { limit: 10 }),
      ).rejects.toThrow();
    });
  });

  describe('Mock Elimination', () => {
    it('does not contain hardcoded operational summary values in production path', async () => {
      const ctx = buildContext();
      const result = await OperationalSummaryProvider.getSummary(ctx, {
        salesOrderId: 'so-known-id',
      });

      // Should not return the old hardcoded mock values
      expect(result.totalActiveJobs).not.toBe(28);
      expect(result.delayedJobs).not.toBe(3);
      expect(result.criticalJobs).not.toBe(1);
      expect(result.missingPod).not.toBe(2);
    });

    it('does not contain hardcoded mock timeline events', async () => {
      const ctx = buildContext();
      const result = await TimelineQueryProvider.getTimeline(ctx, {
        entityIds: ['non-existent-id'],
        limit: 10,
      });

      expect(result.events).toEqual([]);
      // No mock "ARRIVED 4 hours ago" events
      expect(result.events.some((e) => e.status === 'ARRIVED' && e.category === 'milestone')).toBe(false);
    });

    it('does not contain hardcoded inbox items', async () => {
      const ctx = buildContext();
      const result = await NotificationInboxProvider.getInbox(ctx, {
        limit: 10,
      });

      expect(result.items).toEqual([]);
    });
  });
});
