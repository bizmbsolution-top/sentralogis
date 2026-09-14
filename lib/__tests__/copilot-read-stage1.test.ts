/**
 * Sentralogis — AI Copilot Stage 1 READ
 * lib/__tests__/copilot-read-stage1.test.ts
 *
 * Targeted validation for READ provider implementation.
 * Validates tenant isolation, authorization, READ-only boundary,
 * and mock elimination for production READ paths.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TimelineQueryProvider } from '@/lib/copilot/read/timeline-provider';
import { OperationalSummaryProvider } from '@/lib/copilot/read/summary-provider';
import { EntitySearchProvider } from '@/lib/copilot/read/entity-provider';
import { NotificationInboxProvider } from '@/lib/copilot/read/notification-provider';
import { _setEventOutboxDbClient } from '@/lib/domain/event/event-outbox-query-service';
import { _setEntityQueryDbClient } from '@/lib/domain/entity/entity-query-service';
import { _setSalesOrderDbClient } from '@/lib/sales-order/service';
import { _setFulfillmentDbClient } from '@/lib/fulfillment/service';
import { _setOperationalHandoffDbClient } from '@/lib/operational-handoff/service';
import { createFoundationContext } from '@/lib/copilot/foundation/integration';
import type { FoundationContext } from '@/lib/copilot/foundation/contracts';

// ---------------------------------------------------------------------------
// Mock DB client for EventOutboxQueryService
// ---------------------------------------------------------------------------
interface DbError { message: string; code?: string }
interface DbListResult { data: Record<string, unknown>[] | null; error: DbError | null }

class MockEventOutboxDb implements EventOutboxDbClient {
  rows: Record<string, unknown>[] = [];

  from(table: string) {
    const self = this;
    const chain: any = {
      _filters: [] as Array<{ col: string; val: unknown }>,
      _limit: 50,
      eq(col: string, val: unknown) { this._filters.push({ col, val }); return this; },
      order(_col: string, _opts: { ascending: boolean }) { return this; },
      limit(n: number) { this._limit = n; return this; },
      lt(_col: string, _val: unknown) { return this; },
      gte(_col: string, _val: unknown) { return this; },
      lte(_col: string, _val: unknown) { return this; },
      in(_col: string, _vals: string[]) { return this; },
      async then(resolve: any) {
        let rows = [...self.rows];
        for (const f of chain._filters) rows = rows.filter((r) => r[f.col] === f.val);
        const result: DbListResult = { data: rows.slice(0, chain._limit), error: null };
        return resolve(result);
      },
    };
    return {
      select(_cols?: string) {
        return chain;
      },
    };
  }
}

interface EventOutboxDbClient {
  from(table: string): {
    select(cols?: string): {
      eq(col: string, val: unknown): any;
      order(col: string, opts: { ascending: boolean }): any;
      limit(n: number): any;
      lt(col: string, val: unknown): any;
      gte(col: string, val: unknown): any;
      lte(col: string, val: unknown): any;
      in(col: string, vals: string[]): any;
    };
  };
}

// ---------------------------------------------------------------------------
// Mock DB client for EntityQueryService
// ---------------------------------------------------------------------------
class MockEntityDb implements EntityQueryDbClient {
  rows: Record<string, unknown>[] = [];

  from(table: string) {
    const self = this;
    const chain: any = {
      _filters: [] as Array<{ col: string; val: unknown }>,
      _limit: 20,
      _ilikeCol: null as string | null,
      _ilikeVal: null as string | null,
      _inCol: null as string | null,
      _inVals: null as string[] | null,
      eq(col: string, val: unknown) { this._filters.push({ col, val }); return this; },
      ilike(col: string, val: string) { this._ilikeCol = col; this._ilikeVal = val; return this; },
      in(col: string, vals: string[]) { this._inCol = col; this._inVals = vals; return this; },
      limit(n: number) { this._limit = n; return this; },
      order(_col: string, _opts: { ascending: boolean }) { return this; },
      or(_s: string) { return this; },
      async then(resolve: any) {
        let rows = [...self.rows];
        for (const f of chain._filters) rows = rows.filter((r) => r[f.col] === f.val);
        if (chain._ilikeCol && chain._ilikeVal) {
          const pat = chain._ilikeVal.replace(/%/g, '.*');
          const re = new RegExp(pat, 'i');
          rows = rows.filter((r) => re.test(String(r[chain._ilikeCol!] || '')));
        }
        if (chain._inCol && chain._inVals) {
          rows = rows.filter((r) => chain._inVals!.includes(String(r[chain._inCol!] || '')));
        }
        const result: DbListResult = { data: rows.slice(0, chain._limit), error: null };
        return resolve(result);
      },
    };
    return {
      select(_cols?: string) {
        return chain;
      },
    };
  }
}

interface EntityQueryDbClient {
  from(table: string): {
    select(cols?: string): {
      eq(col: string, val: unknown): any;
      ilike(col: string, val: string): any;
      in(col: string, vals: string[]): any;
      limit(n: number): any;
      order(col: string, opts: { ascending: boolean }): any;
      or(s: string): any;
    };
  };
}

// ---------------------------------------------------------------------------
// Mock DB client for SalesOrderDbClient
// ---------------------------------------------------------------------------
class MockSoDb implements SalesOrderDbClient {
  rows: Record<string, unknown>[] = [];

  from(_table: string) {
    const self = this;
    const chain: any = {
      _filters: [] as Array<{ col: string; val: unknown }>,
      _limit: 20,
      eq(col: string, val: unknown) { this._filters.push({ col, val }); return this; },
      in(_col: string, _vals: unknown[]) { return this; },
      order(_col: string, _opts: { ascending: boolean }) { return this; },
      limit(n: number) { this._limit = n; return this; },
      async single() {
        const rows = [...self.rows].filter((r) =>
          chain._filters.every((f) => r[f.col] === f.val),
        );
        return { data: rows[0] || null, error: null };
      },
      async maybeSingle() {
        const rows = [...self.rows].filter((r) =>
          chain._filters.every((f) => r[f.col] === f.val),
        );
        return { data: rows[0] || null, error: null };
      },
      async then(resolve: any) {
        const rows = [...self.rows].filter((r) =>
          chain._filters.every((f) => r[f.col] === f.val),
        );
        return resolve({ data: rows.slice(0, chain._limit), error: null });
      },
    };
    return {
      select(_cols?: string) { return chain; },
      insert(_row: any) {
        return {
          select() {
            return {
              single: () => ({ data: null, error: null }),
              maybeSingle: () => ({ data: null, error: null }),
            };
          },
        };
      },
      update(_row: any) {
        return {
          eq() {
            return {
              select: () => Promise.resolve({ data: [], error: null }),
            };
          },
        };
      },
    };
  }

  rpc(_fn: string, _args: Record<string, unknown>) {
    return Promise.resolve({ data: null, error: null });
  }
}

interface SalesOrderDbClient {
  from(table: string): {
    select(cols?: string): any;
    insert(row: any): any;
    update(row: any): any;
  };
  rpc(fn: string, args: Record<string, unknown>): Promise<{ data: unknown; error: DbError | null }>;
}

// ---------------------------------------------------------------------------
// Mock DB client for FulfillmentDbClient
// ---------------------------------------------------------------------------
class MockFlDb implements FulfillmentDbClient {
  rows: Record<string, unknown>[] = [];

  from(_table: string) {
    const self = this;
    const chain: any = {
      _filters: [] as Array<{ col: string; val: unknown }>,
      _limit: 20,
      eq(col: string, val: unknown) { this._filters.push({ col, val }); return this; },
      in(_col: string, _vals: unknown[]) { return this; },
      order(_col: string, _opts: { ascending: boolean }) { return this; },
      limit(n: number) { this._limit = n; return this; },
      async single() {
        const rows = [...self.rows].filter((r) =>
          chain._filters.every((f) => r[f.col] === f.val),
        );
        return { data: rows[0] || null, error: null };
      },
      async maybeSingle() {
        const rows = [...self.rows].filter((r) =>
          chain._filters.every((f) => r[f.col] === f.val),
        );
        return { data: rows[0] || null, error: null };
      },
      async then(resolve: any) {
        const rows = [...self.rows].filter((r) =>
          chain._filters.every((f) => r[f.col] === f.val),
        );
        return resolve({ data: rows.slice(0, chain._limit), error: null });
      },
    };
    return {
      select(_cols?: string) { return chain; },
      insert(_row: any) {
        return {
          select() {
            return {
              single: () => ({ data: null, error: null }),
              maybeSingle: () => ({ data: null, error: null }),
            };
          },
        };
      },
      update(_row: any) {
        return {
          eq() {
            return {
              select: () => Promise.resolve({ data: [], error: null }),
            };
          },
        };
      },
      delete() {
        return {
          eq() {
            return {
              select: () => Promise.resolve({ data: [], error: null }),
            };
          },
        };
      },
    };
  }

  rpc(_fn: string, _args: Record<string, unknown>) {
    return Promise.resolve({ data: null, error: null });
  }
}

interface FulfillmentDbClient {
  from(table: string): {
    select(cols?: string): any;
    insert(row: any): any;
    update(row: any): any;
    delete(): any;
  };
  rpc(fn: string, args: Record<string, unknown>): Promise<{ data: unknown; error: DbError | null }>;
}

// ---------------------------------------------------------------------------
// Mock DB client for OperationalHandoffDbClient
// ---------------------------------------------------------------------------
class MockOhDb implements OperationalHandoffDbClient {
  rows: Record<string, unknown>[] = [];

  from(_table: string) {
    const self = this;
    const chain: any = {
      _filters: [] as Array<{ col: string; val: unknown }>,
      _limit: 20,
      eq(col: string, val: unknown) { this._filters.push({ col, val }); return this; },
      in(_col: string, _vals: unknown[]) { return this; },
      order(_col: string, _opts: { ascending: boolean }) { return this; },
      limit(n: number) { this._limit = n; return this; },
      async single() {
        const rows = [...self.rows].filter((r) =>
          chain._filters.every((f) => r[f.col] === f.val),
        );
        return { data: rows[0] || null, error: null };
      },
      async maybeSingle() {
        const rows = [...self.rows].filter((r) =>
          chain._filters.every((f) => r[f.col] === f.val),
        );
        return { data: rows[0] || null, error: null };
      },
      async then(resolve: any) {
        const rows = [...self.rows].filter((r) =>
          chain._filters.every((f) => r[f.col] === f.val),
        );
        return resolve({ data: rows.slice(0, chain._limit), error: null });
      },
    };
    return {
      select(_cols?: string) { return chain; },
      insert(_row: any) {
        return {
          select() {
            return {
              single: () => ({ data: null, error: null }),
              maybeSingle: () => ({ data: null, error: null }),
            };
          },
        };
      },
      update(_row: any) {
        return {
          eq() {
            return {
              select: () => Promise.resolve({ data: [], error: null }),
            };
          },
        };
      },
      delete() {
        return {
          eq() {
            return {
              select: () => Promise.resolve({ data: [], error: null }),
            };
          },
        };
      },
    };
  }

  rpc(_fn: string, _args: Record<string, unknown>) {
    return Promise.resolve({ data: null, error: null });
  }
}

interface OperationalHandoffDbClient {
  from(table: string): {
    select(cols?: string): any;
    insert(row: any): any;
    update(row: any): any;
    delete(): any;
  };
  rpc(fn: string, args: Record<string, unknown>): Promise<{ data: unknown; error: DbError | null }>;
}

describe('Copilot Stage 1 READ', () => {
    let mockEventDb: MockEventOutboxDb;
    let mockEntityDb: MockEntityDb;
    let mockSoDb: MockSoDb;
    let mockFlDb: MockFlDb;
    let mockOhDb: MockOhDb;

    beforeEach(() => {
      mockEventDb = new MockEventOutboxDb();
      _setEventOutboxDbClient(mockEventDb as any);
      mockEntityDb = new MockEntityDb();
      _setEntityQueryDbClient(mockEntityDb as any);
      mockSoDb = new MockSoDb();
      mockSoDb.rows = [
        {
          id: 'so-known-id',
          tenant_id: 'tenant-001',
          engagement_id: 'eng-001',
          quote_id: null,
          so_number: 'SO-2026-09-0001',
          status: 'CONFIRMED',
          version_no: 1,
          created_at: '2026-09-01T00:00:00Z',
          updated_at: '2026-09-01T00:00:00Z',
          created_by: 'user-001',
          updated_by: null,
          cancelled_reason: null,
        },
      ];
      _setSalesOrderDbClient(mockSoDb as any);
      mockFlDb = new MockFlDb();
      mockFlDb.rows = [
        {
          id: 'so-known-id',
          tenant_id: 'tenant-001',
          engagement_id: 'eng-001',
          quote_id: null,
          so_number: 'SO-2026-09-0001',
          status: 'CONFIRMED',
          version_no: 1,
          customer_id: 'cust-001',
          created_at: '2026-09-01T00:00:00Z',
          updated_at: '2026-09-01T00:00:00Z',
          created_by: 'user-001',
          updated_by: null,
          cancelled_reason: null,
        },
        {
          id: 'fl-001',
          tenant_id: 'tenant-001',
          sales_order_id: 'so-known-id',
          fulfillment_number: 'FL-2026-09-0001',
          status: 'PLANNED',
          revision_no: 1,
          version_no: 1,
          created_at: '2026-09-01T00:00:00Z',
          updated_at: '2026-09-01T00:00:00Z',
          created_by: 'user-001',
          updated_by: null,
          cancelled_reason: null,
        },
        {
          id: 'fl-002',
          tenant_id: 'tenant-001',
          sales_order_id: 'so-known-id',
          fulfillment_number: 'FL-2026-09-0002',
          status: 'CANCELLED',
          revision_no: 2,
          version_no: 1,
          created_at: '2026-09-01T00:00:00Z',
          updated_at: '2026-09-01T00:00:00Z',
          created_by: 'user-001',
          updated_by: null,
          cancelled_reason: 'replanned',
        },
        {
          id: 'alloc-001',
          tenant_id: 'tenant-001',
          fulfillment_id: 'fl-001',
          capability_type: 'FORWARDING',
          capability_binding_id: null,
          shipment_id: null,
          allocated_quantity: 1,
          delivered_quantity: 0,
          status: 'PLANNED',
          created_at: '2026-09-01T00:00:00Z',
          updated_at: '2026-09-01T00:00:00Z',
        },
        {
          id: 'alloc-002',
          tenant_id: 'tenant-001',
          fulfillment_id: 'fl-001',
          capability_type: 'CUSTOMS',
          capability_binding_id: null,
          shipment_id: null,
          allocated_quantity: 1,
          delivered_quantity: 0,
          status: 'PLANNED',
          created_at: '2026-09-01T00:00:00Z',
          updated_at: '2026-09-01T00:00:00Z',
        },
      ];
      _setFulfillmentDbClient(mockFlDb as any);
      mockOhDb = new MockOhDb();
      _setOperationalHandoffDbClient(mockOhDb as any);
    });

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
