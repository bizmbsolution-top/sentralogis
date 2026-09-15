/**
 * Sentralogis — AI Copilot Stage 1 READ Boundary Repair
 * lib/domain/entity/entity-query-service.ts
 *
 * Canonical tenant-scoped entity query service.
 *
 * This is a minimal canonical domain service, NOT Copilot-specific.
 * It provides the authorized persistence boundary for entity search.
 *
 * Persistence boundary:
 *   EntitySearchProvider
 *     → EntityQueryService (this file)
 *     → Persistence Authority
 */

import type { IdentityContext } from '@/lib/application/identity/types';
import { assertPermission } from '@/lib/application/identity/resolver';
import { supabaseAdmin } from '@/lib/supabase/admin';

// ============================================================================
// DATABASE CLIENT INJECTION (testability — READ-1)
// ============================================================================
type DbRow = Record<string, unknown>;
interface DbError { message: string; code?: string }
interface DbListResult { data: DbRow[] | null; error: DbError | null }

/**
 * Minimal typed projection for entity search rows.
 * Casts the generic DbRow to the fields actually selected by each query.
 */
interface EntityDbRow {
  id: string;
  name?: string | null;
  plate_number?: string | null;
  brand?: string | null;
  model?: string | null;
  status?: string | null;
  is_active?: boolean | null;
}

export interface EntityQueryDbClient {
  from(table: string): {
    select(cols?: string): EntityQueryChain;
  };
}

interface EntityQueryChain extends PromiseLike<DbListResult> {
  eq(col: string, val: unknown): EntityQueryChain;
  ilike(col: string, val: string): EntityQueryChain;
  in(col: string, vals: string[]): EntityQueryChain;
  or(expr: string): EntityQueryChain;
  limit(n: number): EntityQueryChain;
  order(col: string, opts: { ascending: boolean }): EntityQueryChain;
}

let _injectedDb: EntityQueryDbClient = supabaseAdmin as unknown as EntityQueryDbClient;

export function _setEntityQueryDbClient(client: EntityQueryDbClient | null): void {
  _injectedDb = client ?? (supabaseAdmin as unknown as EntityQueryDbClient);
}

function db(): EntityQueryDbClient {
  return _injectedDb;
}

export interface EntitySearchFilters {
  query: string;
  entityTypes?: Array<'customer' | 'driver' | 'vehicle'>;
  activeOnly?: boolean;
  limit?: number;
}

export interface EntitySearchResultItem {
  entityId: string;
  entityType: 'customer' | 'driver' | 'vehicle';
  displayName: string;
  status?: string | null;
  score: number;
}

export class EntityQueryService {
  static async searchEntities(
    context: IdentityContext,
    filters: EntitySearchFilters,
  ): Promise<EntitySearchResultItem[]> {
    assertPermission(context, 'commercial:read');

    const tenantId = context.tenantId;
    const entityTypes = filters.entityTypes ?? ['customer', 'driver', 'vehicle'];
    const activeOnly = filters.activeOnly ?? false;
    const limit = filters.limit ?? 20;
    const query = filters.query.trim();

    const results: EntitySearchResultItem[] = [];

    if (entityTypes.includes('customer')) {
      const customers = await this.searchCustomers(tenantId, query, limit, activeOnly);
      results.push(...customers);
    }

    if (entityTypes.includes('driver')) {
      const drivers = await this.searchDrivers(tenantId, query, limit, activeOnly);
      results.push(...drivers);
    }

    if (entityTypes.includes('vehicle')) {
      const vehicles = await this.searchVehicles(tenantId, query, limit, activeOnly);
      results.push(...vehicles);
    }

    results.sort((a, b) => b.score - a.score);

    return results.slice(0, limit);
  }

  private static async searchCustomers(
    tenantId: string,
    query: string,
    limit: number,
    activeOnly: boolean,
  ): Promise<EntitySearchResultItem[]> {
    const isUuid = query.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    let q = db()
      .from('md_entities')
      .select('id, name, is_active')
      .eq('tenant_id', tenantId);

    if (isUuid) {
      q = q.eq('id', query);
    } else {
      q = q.ilike('name', `%${query}%`);
    }

    if (activeOnly) {
      q = q.eq('is_active', true);
    }

    q = q.limit(limit);

    const { data, error } = await q;
    if (error || !data) return [];

    return (data as unknown as EntityDbRow[]).map((row) => ({
      entityId: row.id,
      entityType: 'customer' as const,
      displayName: row.name || row.id,
      status: row.is_active ? 'ACTIVE' : 'INACTIVE',
      score: isUuid ? 1.0 : 0.8,
    }));
  }

  private static async searchDrivers(
    tenantId: string,
    query: string,
    limit: number,
    activeOnly: boolean,
  ): Promise<EntitySearchResultItem[]> {
    const isUuid = query.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    let q = db()
      .from('md_drivers')
      .select('id, name, status, is_active')
      .eq('tenant_id', tenantId);

    if (isUuid) {
      q = q.eq('id', query);
    } else {
      q = q.or(`name.ilike.%${query}%,phone.ilike.%${query}%`);
    }

    if (activeOnly) {
      q = q.eq('is_active', true);
    }

    q = q.limit(limit);

    const { data, error } = await q;
    if (error || !data) return [];

    return (data as unknown as EntityDbRow[]).map((row) => ({
      entityId: row.id,
      entityType: 'driver' as const,
      displayName: row.name || row.id,
      status: row.status ?? null,
      score: isUuid ? 1.0 : 0.7,
    }));
  }

  private static async searchVehicles(
    tenantId: string,
    query: string,
    limit: number,
    activeOnly: boolean,
  ): Promise<EntitySearchResultItem[]> {
    const isUuid = query.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    let q = db()
      .from('md_fleets')
      .select('id, plate_number, brand, model, status, is_active')
      .eq('tenant_id', tenantId);

    if (isUuid) {
      q = q.eq('id', query);
    } else {
      q = q.ilike('plate_number', `%${query}%`);
    }

    if (activeOnly) {
      q = q.eq('is_active', true);
    }

    q = q.limit(limit);

    const { data, error } = await q;
    if (error || !data) return [];

    return (data as unknown as EntityDbRow[]).map((row) => ({
      entityId: row.id,
      entityType: 'vehicle' as const,
      displayName: `${row.plate_number}${row.brand ? ` (${row.brand}${row.model ? ` ${row.model}` : ''})` : ''}`,
      status: row.status ?? null,
      score: isUuid ? 1.0 : 0.7,
    }));
  }
}
