// EasyGo Sync Service
// Orchestrates vehicle and GPS data synchronization between EasyGo and SentraLogis

import { SupabaseClient } from '@supabase/supabase-js';
import { EasyGoClient, EasyGoVehicle, EasyGoLastPosition } from '@/src/infrastructure/external/EasyGoClient';

export interface SyncVehiclesResult {
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
  vehicles: Array<{ nopol: string; fleet_id: string; status: 'created' | 'updated' | 'skipped' }>;
}

export interface SyncGpsResult {
  synced: number;
  errors: string[];
}

export class EasyGoSyncService {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  /**
   * Get EasyGo client for a specific tenant
   */
  private async getEasyGoClient(tenantId: string): Promise<EasyGoClient | null> {
    const { data: config, error } = await this.supabase
      .from('gps_provider_configs')
      .select('api_url, api_token')
      .eq('tenant_id', tenantId)
      .eq('provider_name', 'easygo')
      .eq('is_active', true)
      .single();

    if (error || !config) {
      return null;
    }

    return new EasyGoClient(config.api_url, config.api_token);
  }

  /**
   * Generate fleet_code from nopol
   * Format: EG-{nopol} (e.g., EG-B9950UWY)
   */
  private generateFleetCode(nopol: string): string {
    const cleanNopol = nopol.replace(/\s+/g, '').toUpperCase();
    return `EG-${cleanNopol}`;
  }

  /**
   * Map EasyGo vehicle type to fleet_type
   * Returns the type_name to search or create in md_fleet_types
   */
  private mapVehicleType(easygoType: string, easygoModel: string): string {
    const typeLower = (easygoType || '').toLowerCase();
    const modelLower = (easygoModel || '').toLowerCase();

    if (typeLower.includes('trailer') || modelLower.includes('trailer')) return 'Trailer';
    if (typeLower.includes('wing') || modelLower.includes('wingbox')) return 'Wingbox';
    if (typeLower.includes('elf') || typeLower.includes('cde')) return 'Elf/CDE';
    if (typeLower.includes('tronton') || typeLower.includes('giga')) return 'Tronton';
    if (typeLower.includes('box')) return 'Box';
    if (typeLower.includes('cold')) return 'Reefer Box';
    if (typeLower.includes('bak') || typeLower.includes('losbak')) return 'Losbak';
    return 'Truck Lainnya';
  }

  /**
   * Find or create fleet_type in md_fleet_types
   */
  private async findOrCreateFleetType(
    tenantId: string,
    typeName: string
  ): Promise<string | null> {
    // Try to find existing type
    const { data: existing } = await this.supabase
      .from('md_fleet_types')
      .select('id')
      .eq('tenant_id', tenantId)
      .ilike('type_name', typeName)
      .eq('is_active', true)
      .limit(1)
      .single();

    if (existing) {
      return existing.id;
    }

    // Create new type
    const typeCode = typeName.replace(/\s+/g, '-').toUpperCase().substring(0, 20);
    const { data: newType, error } = await this.supabase
      .from('md_fleet_types')
      .insert({
        tenant_id: tenantId,
        type_code: typeCode,
        type_name: typeName,
        is_active: true,
      })
      .select('id')
      .single();

    if (error) {
      console.error('[EasyGoSync] Failed to create fleet type:', error);
      return null;
    }

    return newType?.id || null;
  }

  /**
   * Find vendor entity for EasyGo (PT Armada Transport Mandiri)
   */
  private async findOrCreateVendorEntity(tenantId: string): Promise<string | null> {
    // Try to find existing vendor
    const { data: existing } = await this.supabase
      .from('md_entities')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('is_vendor', true)
      .ilike('name', '%ATM%')
      .limit(1)
      .single();

    if (existing) {
      return existing.id;
    }

    // Create new vendor entity
    const { data: newEntity, error } = await this.supabase
      .from('md_entities')
      .insert({
        tenant_id: tenantId,
        entity_code: 'VND/EASYGO',
        name: 'PT Armada Transport Mandiri',
        legal_name: 'PT Armada Transport Mandiri',
        is_vendor: true,
        is_active: true,
      })
      .select('id')
      .single();

    if (error) {
      console.error('[EasyGoSync] Failed to create vendor entity:', error);
      return null;
    }

    return newEntity?.id || null;
  }

  /**
   * Sync vehicles from EasyGo to md_fleets
   */
  async syncVehicles(tenantId: string): Promise<SyncVehiclesResult> {
    const client = await this.getEasyGoClient(tenantId);
    if (!client) {
      return {
        created: 0,
        updated: 0,
        skipped: 0,
        errors: ['EasyGo not configured for this tenant'],
        vehicles: [],
      };
    }

    const result: SyncVehiclesResult = {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [],
      vehicles: [],
    };

    try {
      // Get vehicles from EasyGo
      const easygoVehicles = await client.getVehicles();

      // Get vendor entity
      const vendorEntityId = await this.findOrCreateVendorEntity(tenantId);

      // Get existing fleets with easygo_vehicle_id
      const { data: existingFleets } = await this.supabase
        .from('md_fleets')
        .select('id, easygo_vehicle_id, plate_number')
        .eq('tenant_id', tenantId)
        .not('easygo_vehicle_id', 'is', null);

      const existingMap = new Map(
        (existingFleets || []).map((f) => [f.easygo_vehicle_id, f])
      );

      for (const vehicle of easygoVehicles) {
        try {
          const nopol = vehicle.nopol.trim();
          if (!nopol) {
            result.skipped++;
            result.vehicles.push({ nopol: 'UNKNOWN', fleet_id: '', status: 'skipped' });
            continue;
          }

          const fleetCode = this.generateFleetCode(nopol);
          const typeName = this.mapVehicleType(vehicle.type, vehicle.model);
          const fleetTypeId = await this.findOrCreateFleetType(tenantId, typeName);

          const existingFleet = existingMap.get(vehicle.vehicle_id);

          if (existingFleet) {
            // Update existing fleet with EasyGo mapping + latest vehicle data
            const { error } = await this.supabase
              .from('md_fleets')
              .update({
                easygo_vehicle_id: vehicle.vehicle_id,
                easygo_nopol: nopol,
                brand: vehicle.brand || undefined,
                model: vehicle.model || undefined,
                engine_number: vehicle.engine_no || undefined,
                chassis_number: vehicle.chasis_no || undefined,
                updated_at: new Date().toISOString(),
              })
              .eq('id', existingFleet.id);

            if (error) {
              result.errors.push(`Update failed for ${nopol}: ${error.message}`);
            } else {
              result.updated++;
              result.vehicles.push({ nopol, fleet_id: existingFleet.id, status: 'updated' });
            }
          } else {
            // Also check by plate_number without easygo_vehicle_id (existing fleet not yet linked)
            const { data: existingByPlate } = await this.supabase
              .from('md_fleets')
              .select('id')
              .eq('tenant_id', tenantId)
              .eq('plate_number', nopol)
              .limit(1)
              .single();

            if (existingByPlate) {
              // Link existing fleet to EasyGo
              const { error } = await this.supabase
                .from('md_fleets')
                .update({
                  easygo_vehicle_id: vehicle.vehicle_id,
                  easygo_nopol: nopol,
                  brand: vehicle.brand || undefined,
                  model: vehicle.model || undefined,
                  engine_number: vehicle.engine_no || undefined,
                  chassis_number: vehicle.chasis_no || undefined,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', existingByPlate.id);

              if (error) {
                result.errors.push(`Link failed for ${nopol}: ${error.message}`);
              } else {
                result.updated++;
                result.vehicles.push({ nopol, fleet_id: existingByPlate.id, status: 'updated' });
              }
            } else {
              // Try insert
              const { data: newFleet, error: insertError } = await this.supabase
                .from('md_fleets')
                .insert({
                  tenant_id: tenantId,
                  fleet_code: fleetCode,
                  plate_number: nopol,
                  brand: vehicle.brand || null,
                  model: vehicle.model || null,
                  engine_number: vehicle.engine_no || null,
                  chassis_number: vehicle.chasis_no || null,
                  fleet_type_id: fleetTypeId || null,
                  entity_id: vendorEntityId || null,
                  easygo_vehicle_id: vehicle.vehicle_id,
                  easygo_nopol: nopol,
                  stnk_expiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                  kir_expiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                  status: 'available',
                  is_active: true,
                })
                .select('id')
                .single();

              if (insertError) {
                if (insertError.message.includes('unique constraint') || insertError.message.includes('duplicate key')) {
                  // Global plate_number unique constraint violated - find and link
                  const { data: globalMatch } = await this.supabase
                    .from('md_fleets')
                    .select('id')
                    .eq('plate_number', nopol)
                    .limit(1)
                    .single();

                  if (globalMatch) {
                    const { error: linkError } = await this.supabase
                      .from('md_fleets')
                      .update({
                        easygo_vehicle_id: vehicle.vehicle_id,
                        easygo_nopol: nopol,
                        brand: vehicle.brand || undefined,
                        model: vehicle.model || undefined,
                        engine_number: vehicle.engine_no || undefined,
                        chassis_number: vehicle.chasis_no || undefined,
                        updated_at: new Date().toISOString(),
                      })
                      .eq('id', globalMatch.id);

                    if (linkError) {
                      result.errors.push(`Global link failed for ${nopol}: ${linkError.message}`);
                    } else {
                      result.updated++;
                      result.vehicles.push({ nopol, fleet_id: globalMatch.id, status: 'updated' });
                    }
                  } else {
                    result.errors.push(`Insert + no global match for ${nopol}: ${insertError.message}`);
                  }
                } else {
                  result.errors.push(`Insert failed for ${nopol}: ${insertError.message}`);
                }
              } else if (newFleet) {
                result.created++;
                result.vehicles.push({ nopol, fleet_id: newFleet.id, status: 'created' });
              }
            }
          }
        } catch (err: any) {
          result.errors.push(`Error processing ${vehicle.nopol}: ${err.message}`);
        }
      }
    } catch (err: any) {
      result.errors.push(`Failed to fetch vehicles from EasyGo: ${err.message}`);
    }

    return result;
  }

  /**
   * Sync GPS positions from EasyGo to job_tracking
   */
  async syncLastPositions(tenantId: string): Promise<SyncGpsResult> {
    const client = await this.getEasyGoClient(tenantId);
    if (!client) {
      return { synced: 0, errors: ['EasyGo not configured for this tenant'] };
    }

    const result: SyncGpsResult = { synced: 0, errors: [] };

    try {
      // Get all fleets with easygo_vehicle_id for this tenant
      const { data: fleets, error: fleetError } = await this.supabase
        .from('md_fleets')
        .select('id, easygo_vehicle_id, plate_number')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .not('easygo_vehicle_id', 'is', null);

      if (fleetError || !fleets || fleets.length === 0) {
        return { synced: 0, errors: ['No fleets with EasyGo mapping found'] };
      }

      // Get nopol list for EasyGo API
      const nopolList = fleets.map((f) => f.plate_number);
      const fleetMap = new Map(fleets.map((f) => [f.plate_number, f]));

      // Get last positions from EasyGo
      const positions = await client.getLastPosition(nopolList);

      for (const pos of positions) {
        try {
          const fleet = fleetMap.get(pos.nopol);
          if (!fleet) continue;

          // Skip if no valid coordinates
          if (!pos.lat || !pos.lon) continue;

          // Check for duplicate (same position within 50m and 60s)
          const { data: lastPing } = await this.supabase
            .from('job_tracking')
            .select('latitude, longitude, created_at')
            .eq('fleet_id', fleet.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          if (lastPing) {
            const timeDiff =
              (new Date().getTime() - new Date(lastPing.created_at).getTime()) / 1000;
            if (timeDiff < 60) {
              // Skip if same position within 60 seconds
              const latDiff = Math.abs(lastPing.latitude - pos.lat);
              const lonDiff = Math.abs(lastPing.longitude - pos.lon);
              if (latDiff < 0.0005 && lonDiff < 0.0005) {
                continue;
              }
            }
          }

          // Insert GPS point to job_tracking (if there's an active JO)
          const { data: activeJO } = await this.supabase
            .from('job_orders')
            .select('id')
            .eq('fleet_id', fleet.id)
            .in('status', ['assigned', 'in_progress', 'DISPATCHED'])
            .limit(1)
            .single();

          if (activeJO) {
            await this.supabase.from('job_tracking').insert({
              job_order_id: activeJO.id,
              latitude: pos.lat,
              longitude: pos.lon,
              speed: pos.speed,
              heading: parseFloat(pos.direction) || 0,
              recorded_at: pos.gps_time_iso || new Date().toISOString(),
              source: 'easygo',
              notes: pos.addr || undefined,
            });
          }

          // Always insert to tracking_points for fleet-level telemetry
          // Use fleet as reference (FLEET type) for non-JO tracking
          const referenceType = activeJO ? 'JOB_ORDER' : 'FLEET';
          const referenceId = activeJO ? activeJO.id : fleet.id;

          let sessionId: string | null = null;
          const { data: session } = await this.supabase
            .from('tracking_sessions')
            .select('id')
            .eq('reference_type', referenceType)
            .eq('reference_id', referenceId)
            .eq('status', 'ACTIVE')
            .limit(1)
            .single();

          if (session) {
            sessionId = session.id;
          } else {
            const { data: newSession } = await this.supabase
              .from('tracking_sessions')
              .insert({
                tenant_id: tenantId,
                reference_type: referenceType,
                reference_id: referenceId,
                status: 'ACTIVE',
              })
              .select('id')
              .single();
            sessionId = newSession?.id || null;
          }

          if (sessionId) {
            await this.supabase.from('tracking_points').insert({
              session_id: sessionId,
              latitude: pos.lat,
              longitude: pos.lon,
              speed: pos.speed,
              heading: parseFloat(pos.direction) || 0,
              accuracy: 10,
              recorded_at: pos.gps_time_iso || new Date().toISOString(),
            });
          }

          result.synced++;
        } catch (err: any) {
          result.errors.push(`Error syncing GPS for ${pos.nopol}: ${err.message}`);
        }
      }
    } catch (err: any) {
      result.errors.push(`Failed to sync GPS positions: ${err.message}`);
    }

    return result;
  }
}
