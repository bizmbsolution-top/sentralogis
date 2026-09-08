import type { SupabaseClient } from '@supabase/supabase-js';
import { EntityOwnershipService, type OwnershipClassification } from '../entity/entity-ownership-service';

export class DriverAccessClassificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DriverAccessClassificationError';
  }
}

export type DriverAccessType = 'INTERNAL_PORTAL' | 'EXTERNAL_LINK' | 'NATIVE_APP';

export interface DriverAccessClassification {
  accessType: DriverAccessType;
  reason: string;
}

export class DriverAccessClassificationService {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly ownershipService: EntityOwnershipService,
  ) {}

  async classifyDriverAccess(
    tenantId: string,
    driverId: string | null,
    transporterId: string | null,
  ): Promise<DriverAccessClassification> {
    // 1. Native app detection (highest priority)
    if (driverId) {
      const driver = await this.loadDriver(tenantId, driverId);
      if (driver.has_native_app === true) {
        return { accessType: 'NATIVE_APP', reason: 'driver.has_native_app' };
      }
    }

    // 2. Driver entity ownership
    if (driverId) {
      const driverEntityId = await this.loadDriverEntityId(tenantId, driverId);
      if (driverEntityId) {
        const ownership = await this.ownershipService.classifyOwnership(tenantId, driverEntityId);
        if (ownership.isOwn === true) {
          return { accessType: 'INTERNAL_PORTAL', reason: 'driver.entity.is_own' };
        }
        if (ownership.isOwn === false) {
          return { accessType: 'EXTERNAL_LINK', reason: 'driver.entity.is_own' };
        }
        // NULL falls through to transporter fallback
      }
    }

    // 3. Transporter ownership fallback
    if (transporterId) {
      const ownership = await this.ownershipService.classifyOwnership(tenantId, transporterId);
      if (ownership.isOwn === true) {
        return { accessType: 'INTERNAL_PORTAL', reason: 'transporter.ownership.fallback' };
      }
      // FALSE or NULL → external (safe default)
      return { accessType: 'EXTERNAL_LINK', reason: 'transporter.ownership.fallback' };
    }

    // 4. Safe default
    return { accessType: 'EXTERNAL_LINK', reason: 'safe_default' };
  }

  private async loadDriver(tenantId: string, driverId: string): Promise<{ has_native_app: boolean | null }> {
    const { data, error } = await this.supabase
      .from('md_drivers')
      .select('has_native_app')
      .eq('tenant_id', tenantId)
      .eq('id', driverId)
      .maybeSingle();

    if (error) {
      throw new DriverAccessClassificationError(`Failed to load driver: ${error.message}`);
    }

    return {
      has_native_app: data?.has_native_app ?? false,
    };
  }

  private async loadDriverEntityId(tenantId: string, driverId: string): Promise<string | null> {
    const { data, error } = await this.supabase
      .from('md_drivers')
      .select('entity_id')
      .eq('tenant_id', tenantId)
      .eq('id', driverId)
      .maybeSingle();

    if (error) {
      throw new DriverAccessClassificationError(`Failed to load driver entity: ${error.message}`);
    }

    return data?.entity_id ?? null;
  }
}
