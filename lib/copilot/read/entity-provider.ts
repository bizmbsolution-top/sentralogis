/**
 * Sentralogis — AI Copilot Stage 1 READ
 * lib/copilot/read/entity-provider.ts
 *
 * Canonical EntitySearchAPI implementation.
 *
 * Searches tenant-scoped entities through canonical party/entity
 * authorities. Never exposes cross-tenant data.
 *
 * For Stage 1, supports:
 * - customer (via md_entities with tenant filter)
 * - driver (via md_drivers with tenant filter)
 * - vehicle (via md_fleets with tenant filter)
 *
 * Does not bypass canonical authorization.
 */

import type {
  FoundationContext,
  EntityResult,
  EntitySearchOptions,
  EntitySearchResult,
} from '@/lib/copilot/foundation/contracts';
import { assertPermission } from '@/lib/application/identity/resolver';
import { EntityQueryService } from '@/lib/domain/entity/entity-query-service';

export class EntitySearchProvider {
  static async search(
    context: FoundationContext,
    query: string,
    options?: EntitySearchOptions,
  ): Promise<EntitySearchResult> {
    assertPermission(context.identity, 'commercial:read');

    const supportedEntityTypes = ['customer', 'driver', 'vehicle'] as const;
    const requestedEntityTypes = options?.entityTypes ?? supportedEntityTypes;
    const entityTypes = requestedEntityTypes.filter((t): t is typeof supportedEntityTypes[number] =>
      supportedEntityTypes.includes(t as typeof supportedEntityTypes[number]),
    );

    const results = await EntityQueryService.searchEntities(context.identity, {
      query,
      entityTypes,
      activeOnly: options?.activeOnly,
      limit: options?.limit ?? 20,
    });

    const mapped: EntityResult[] = results.map((r) => ({
      entityId: r.entityId,
      entityType: r.entityType,
      displayName: r.displayName,
      status: r.status,
      score: r.score,
    }));

    return {
      results: mapped,
      hasMore: mapped.length >= (options?.limit ?? 20),
    };
  }
}
