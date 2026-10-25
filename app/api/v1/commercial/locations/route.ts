import { NextRequest, NextResponse } from 'next/server';
import { resolveSessionIdentity } from '@/lib/application/identity/session-source';
import { assertAnyPermission } from '@/lib/application/identity/resolver';
import { LocationMatchingService } from '@/lib/location/location-matching-service';

export async function GET(req: NextRequest) {
  try {
    const identity = await resolveSessionIdentity(null, req);
    assertAnyPermission(identity, ['copilot:read', 'commercial:read', 'job_order:read', 'work_order:read']);

    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q') || '';

    const results = await LocationMatchingService.searchMasterLocations(query, identity.tenantId, 10);

    return NextResponse.json({
      success: true,
      data: results,
    });
  } catch (err: any) {
    console.error('[API Locations Search] Error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error' },
      { status: err.statusCode || 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const identity = await resolveSessionIdentity(null, req);
    assertAnyPermission(identity, ['copilot:read', 'commercial:read', 'job_order:read', 'work_order:read']);

    const body = await req.json();
    const { place } = body;

    if (!place || !place.address) {
      return NextResponse.json({ success: false, error: 'Place with address required' }, { status: 400 });
    }

    const matched = await LocationMatchingService.matchPlaceWithMaster(place, identity.tenantId);

    return NextResponse.json({
      success: true,
      data: matched,
    });
  } catch (err: any) {
    console.error('[API Locations Match] Error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error' },
      { status: err.statusCode || 500 }
    );
  }
}
