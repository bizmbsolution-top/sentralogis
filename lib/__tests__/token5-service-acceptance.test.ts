
import { describe, test, expect, beforeEach } from 'vitest';
import { _setTokenDbClient } from '@/lib/token/repository';
import { TokenService } from '@/lib/token/service';
import type { IdentityContext } from '@/lib/application/identity/types';
import { TokenError } from '@/lib/token/types';

interface DbError { message: string; code?: string }
interface DbSingle { data: Record<string, unknown> | null; error: DbError | null }

class MockTokenDb {
  tokenPrices: Record<string, unknown>[] = [];
  serviceRates: Record<string, unknown>[] = [];
  consumptionEvents: Record<string, unknown>[] = [];
  tenants: Record<string, unknown>[] = [];

  constructor() {
    this.tokenPrices = [{ id: "tp-1", tenant_id: "t-1", price_per_token: 1000, currency: "IDR", is_active: true }];
    this.serviceRates = [{ id: "sr-1", tenant_id: "t-1", service_type: "TRUCKING", tokens_per_completion: 1, is_active: true }];
    this.consumptionEvents = [];
    this.tenants = [{ id: "t-1", token_balance: 100 }];
  }

  from(table: string) {
    const self = this;
    const chain: any = {
      _table: table,
      _filters: [] as Array<{ col: string; val: unknown }>,
      _limit: null as number | null,
      eq(col: string, val: unknown) { this._filters.push({ col, val }); return this; },
      order(_col: string, _opts: { ascending: boolean }) { return this; },
      limit(n: number) { this._limit = n; return this; },
      lte(_col: string, _val: unknown) { return this; },
      or(_s: string) { return this; },
      maybeSingle(): Promise<DbSingle> {
        const rows = self._select(this._table, this._filters, this._limit);
        return Promise.resolve({ data: rows[0] || null, error: null });
      },
      single(): Promise<DbSingle> {
        const rows = self._select(this._table, this._filters, this._limit);
        return Promise.resolve({ data: rows[0] || null, error: null });
      },
    };
    return {
      select: () => chain,
insert: (row: Record<string, unknown>) => ({
        select: () => ({
          single: async (): Promise<DbSingle> => {
            const idem = (row as any).idempotency_key;
            if (idem) {
              const existing = self.consumptionEvents.find((e) => e.idempotency_key === idem);
              if (existing) {
                return { data: null, error: { message: 'duplicate key value violates unique constraint', code: '23505' } };
              }
            }
            const inserted = { ...row, id: `ev-${self.consumptionEvents.length + 1}` };
            if (table === "token_consumption_events") self.consumptionEvents.push(inserted);
            return { data: inserted, error: null };
          },
        }),
      }),
      update: (row: Record<string, unknown>) => {
        const updateChain: any = {
          _filters: [] as Array<{ col: string; val: unknown }>,
          eq(col: string, val: unknown) { updateChain._filters.push({ col, val }); return updateChain; },
          select: () => ({
            single: async (): Promise<DbSingle> => {
              let target: Record<string, unknown> | undefined;
              for (const f of updateChain._filters) {
                target = self.tenants.find((x) => x[f.col] === f.val);
                if (target) break;
              }
              if (target) (target as any).token_balance = (row as any).token_balance;
              return { data: { token_balance: (row as any).token_balance }, error: null };
            },
          }),
        };
        return updateChain;
      },
    };
  }

private _select(table: string, filters: Array<{ col: string; val: unknown }>, limit: number | null): Record<string, unknown>[] {
    let rows: Record<string, unknown>[] = [];
    if (table === "tenant_service_rates") rows = [...this.serviceRates];
    else if (table === "tenant_token_prices") rows = [...this.tokenPrices];
    else if (table === "tenants") rows = [...this.tenants];
    else if (table === "token_consumption_events") rows = [...this.consumptionEvents];
    else return [];
const convert = (r: Record<string, unknown>): Record<string, unknown> => r;
    rows = rows.map(convert);
    for (const f of filters) rows = rows.filter((r) => r[f.col] === f.val);
    if (limit !== null) rows = rows.slice(0, limit);
    return rows;
  }

  rpc(): Promise<{ data: unknown; error: DbError | null }> {
    return Promise.resolve({ data: null, error: null });
  }

  reset() {
    this.tokenPrices = [{ id: "tp-1", tenant_id: "t-1", price_per_token: 1000, currency: "IDR", is_active: true }];
    this.serviceRates = [{ id: "sr-1", tenant_id: "t-1", service_type: "TRUCKING", tokens_per_completion: 1, is_active: true }];
    this.consumptionEvents = [];
    this.tenants = [{ id: "t-1", token_balance: 100 }];
  }
}

function makeCtx(overrides: Record<string, unknown> = {}): IdentityContext {
  return {
    userId: "user-1",
    tenantId: "t-1",
    role: "admin",
    permissions: ["commercial:read", "commercial:manage", "tenant:manage"],
    ...overrides,
  } as unknown as IdentityContext;
}

describe("Phase TOKEN-5 Token Service Acceptance", () => {
  let db: MockTokenDb;
  let svc: TokenService;

beforeEach(() => {
    db = new MockTokenDb();
    db.reset();
    _setTokenDbClient(db as any);
    svc = new TokenService(makeCtx());
  });

  describe("Contract J - Token Burn", () => {
    test("burns exactly configured token quantity on valid billable event", async () => {
      const event = await svc.consumeToken({
        sourceType: "JO",
        sourceId: "jo-1",
        serviceType: "TRUCKING",
      });
      expect(event.tokensConsumed).toBe(1);
      expect(event.tokenValueSnapshot).toBe(1000);
      expect(event.monetaryEquivalent).toBe(1000);
      expect(event.idempotencyKey).toBe("JO:jo-1:TRUCKING");
      expect(event.tenantId).toBe("t-1");
      expect(db.consumptionEvents.length).toBe(1);
    });

    test("ledger entry exists with correct tenant and source reference", async () => {
      await svc.consumeToken({ sourceType: "JO", sourceId: "jo-1", serviceType: "TRUCKING" });
      const entry = db.consumptionEvents[0];
      expect(entry.tenant_id).toBe("t-1");
      expect(entry.source_type).toBe("JO");
      expect(entry.source_id).toBe("jo-1");
      expect(entry.service_type).toBe("TRUCKING");
    });

    test("balance is decremented after burn", async () => {
      await svc.consumeToken({ sourceType: "JO", sourceId: "jo-1", serviceType: "TRUCKING" });
      expect(db.tenants[0].token_balance).toBe(99);
    });
  });

  describe("Contract K - Token Isolation", () => {
    test("tenant A burn does not affect tenant B balance", async () => {
      db.tenants.push({ id: "t-2", token_balance: 50 });
      const svcB = new TokenService(makeCtx({ tenantId: "t-2" }));
      db.serviceRates.push({ id: "sr-2", tenant_id: "t-2", service_type: "TRUCKING", tokens_per_completion: 1, is_active: true });
      db.tokenPrices.push({ id: "tp-2", tenant_id: "t-2", price_per_token: 1000, currency: "IDR", is_active: true });
      await svcB.consumeToken({ sourceType: "JO", sourceId: "jo-2", serviceType: "TRUCKING" });
      const t1 = db.tenants.find((t) => t.id === "t-1") as any;
      const t2 = db.tenants.find((t) => t.id === "t-2") as any;
      expect(t1.token_balance).toBe(100);
      expect(t2.token_balance).toBe(49);
      expect(db.consumptionEvents.filter((e) => e.tenant_id === "t-1").length).toBe(0);
      expect(db.consumptionEvents.filter((e) => e.tenant_id === "t-2").length).toBe(1);
    });
  });

  describe("Contract L - At-Most-Once Burn", () => {
    test("repeated event processing does not double-burn tokens", async () => {
      await svc.consumeToken({ sourceType: "JO", sourceId: "jo-1", serviceType: "TRUCKING" });
      await expect(svc.consumeToken({
        sourceType: "JO",
        sourceId: "jo-1",
        serviceType: "TRUCKING",
      })).rejects.toThrow(TokenError);
      try {
        await svc.consumeToken({ sourceType: "JO", sourceId: "jo-1", serviceType: "TRUCKING" });
      } catch (e: any) {
        expect(e.code).toBe("TOKEN_DUPLICATE_CONSUMPTION");
        expect(e.statusCode).toBe(409);
      }
      expect(db.consumptionEvents.length).toBe(1);
      expect(db.tenants[0].token_balance).toBe(99);
    });
  });

  describe("Error handling", () => {
    test("missing rate throws TOKEN_RATE_NOT_FOUND", async () => {
      db.serviceRates = [];
      await expect(svc.consumeToken({
        sourceType: "JO",
        sourceId: "jo-1",
        serviceType: "FORWARDING",
      })).rejects.toThrow(TokenError);
    });

    test("insufficient balance throws TOKEN_INSUFFICIENT_BALANCE", async () => {
      db.tenants = [{ id: "t-1", token_balance: 0 }];
      await expect(svc.consumeToken({
        sourceType: "JO",
        sourceId: "jo-1",
        serviceType: "TRUCKING",
      })).rejects.toThrow(TokenError);
    });
  });

  describe("Service API", () => {
    test("consumeToken method exists", () => {
      expect(typeof svc.consumeToken).toBe("function");
    });
    test("getBalance method exists", () => {
      expect(typeof svc.getBalance).toBe("function");
    });
    test("getActiveServiceRate method exists", () => {
      expect(typeof svc.getActiveServiceRate).toBe("function");
    });
  });
});
