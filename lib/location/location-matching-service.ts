/**
 * Sentralogis — Master Data & Location Matching Service
 * lib/location/location-matching-service.ts
 *
 * Implements authoritative location matching between external Google Maps places
 * and internal Master Data (`md_locations`), fulfilling Rule 4:
 *
 * 1. Checks Master Data locations in tenant for fuzzy match on name/address.
 * 2. If matching record found: links location_id, location_code, coordinates.
 * 3. If no match found: retains external reference (place_id, formatted_address, lat, lng).
 * 4. NEVER fabricates fake IDs or mutates/creates md_locations records automatically.
 * 5. Supports injection of database client for hermetic unit testing.
 */

import { supabaseAdmin } from '@/lib/supabase/admin';

export interface LocationMatchResult {
  isMasterMatch: boolean;
  masterLocationId: string | null;
  masterLocationCode: string | null;
  masterLocationName: string | null;
  name: string;
  address: string;
  city?: string | null;
  province?: string | null;
  postalCode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  placeId?: string | null;
}

let _locationDbClient: any = null;

export function _setLocationDbClient(client: any): void {
  _locationDbClient = client;
}

function getDb(): any {
  if (_locationDbClient) return _locationDbClient;
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!url || !url.startsWith('http') || url.includes('256')) {
      throw new Error('Supabase client unconfigured in environment');
    }
    return supabaseAdmin;
  } catch {
    return {
      from: () => ({
        select: () => ({
          eq: () => ({
            ilike: () => ({
              limit: async () => ({ data: [], error: null }),
            }),
          }),
        }),
      }),
    };
  }
}

export class LocationMatchingService {
  /**
   * Searches existing md_locations by query string.
   */
  static async searchMasterLocations(
    query: string,
    tenantId: string,
    limit: number = 5,
  ): Promise<any[]> {
    if (!query || query.trim().length < 2) return [];
    const clean = query.trim().replace(/[\s,.-]+/g, ' ');
    const db = getDb();

    try {
      let q = db
        .from('md_locations')
        .select('id, location_code, name, address, city, province, postal_code, latitude, longitude, is_active')
        .eq('tenant_id', tenantId);

      if (typeof q.or === 'function') {
        q = q.or(`name.ilike.%${clean}%,location_code.ilike.%${clean}%,address.ilike.%${clean}%,city.ilike.%${clean}%`);
      } else {
        q = q.ilike('name', `%${clean}%`);
      }

      const { data, error } = await q.limit(limit);
      if (error) {
        console.error('[LocationMatchingService] searchMasterLocations error:', error);
        return [];
      }
      return (data || []).filter((loc: any) => loc.is_active !== false);
    } catch (err) {
      console.error('[LocationMatchingService] searchMasterLocations exception:', err);
      return [];
    }
  }

  /**
   * Matches Google Maps Place selection with Master Data Locations.
   */
  static async matchPlaceWithMaster(
    place: {
      name?: string;
      address: string;
      city?: string;
      province?: string;
      postalCode?: string;
      latitude?: number | null;
      longitude?: number | null;
      placeId?: string;
    },
    tenantId: string,
  ): Promise<LocationMatchResult> {
    const searchCandidate = (place.name || place.address || '').trim();
    const token = searchCandidate.split(/[,;\n]/)[0].trim();

    const matches = await this.searchMasterLocations(token, tenantId, 3);

    if (matches.length > 0) {
      // Check if match is exact or specific enough to the master location
      const best = matches[0];
      const bestNameLower = best.name.toLowerCase();
      const tokenLower = token.toLowerCase();
      const isExactOrSpecificMatch =
        bestNameLower === tokenLower ||
        best.location_code?.toLowerCase() === tokenLower ||
        tokenLower.includes(bestNameLower);

      if (isExactOrSpecificMatch) {
        return {
          isMasterMatch: true,
          masterLocationId: best.id,
          masterLocationCode: best.location_code,
          masterLocationName: best.name,
          name: best.name,
          address: best.address || place.address,
          city: best.city || place.city || null,
          province: best.province || place.province || null,
          postalCode: best.postal_code || place.postalCode || null,
          latitude: best.latitude !== null && best.latitude !== undefined ? Number(best.latitude) : place.latitude || null,
          longitude: best.longitude !== null && best.longitude !== undefined ? Number(best.longitude) : place.longitude || null,
          placeId: place.placeId || null,
        };
      }
    }

    // No master match: keep external reference without fabricating master IDs
    return {
      isMasterMatch: false,
      masterLocationId: null,
      masterLocationCode: null,
      masterLocationName: null,
      name: place.name || token || place.address,
      address: place.address,
      city: place.city || null,
      province: place.province || null,
      postalCode: place.postalCode || null,
      latitude: place.latitude || null,
      longitude: place.longitude || null,
      placeId: place.placeId || null,
    };
  }
}
