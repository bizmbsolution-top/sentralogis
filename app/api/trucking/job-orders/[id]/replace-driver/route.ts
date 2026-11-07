import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { resolveFromArrays } from '@/lib/application/identity/membership-source';
import { resolveIdentityContext, assertPermission } from '@/lib/application/identity/resolver';
import { assertSbuAccess } from '@/lib/application/identity/authorization';
import { DriverReplacementService } from '@/lib/domain/jo/job-order-domain-service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: jobOrderId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Resolve tenant and role from canonical membership records, never request body.
    const [
      { data: staffRows, error: staffError },
      { data: ownedRows, error: ownedError },
      { data: activeProfile, error: profileError },
    ] = await Promise.all([
      supabaseAdmin
        .from('tenant_users')
        .select('id, tenant_id, role_code')
        .eq('user_id', user.id),
      supabaseAdmin
        .from('tenants')
        .select('id, tenant_code')
        .eq('user_id', user.id),
      supabaseAdmin
        .from('user_profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .maybeSingle(),
    ]);

    if (staffError || ownedError || profileError) {
      console.error('[trucking/replace-driver] Identity lookup failed:', staffError || ownedError || profileError);
      return NextResponse.json({ error: 'Unable to resolve authorized tenant identity' }, { status: 500 });
    }
    if (!activeProfile?.tenant_id) {
      return NextResponse.json({ error: 'Active tenant context not found' }, { status: 403 });
    }

    const source = resolveFromArrays(staffRows || [], ownedRows || []);
    const identity = resolveIdentityContext({
      userId: user.id,
      requestedTenantId: activeProfile.tenant_id,
      source,
    });
    assertPermission(identity, 'job_order:update');
    assertSbuAccess(identity, 'trucking');

    const body = await request.json();
    const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
    const driverId = typeof body.driverId === 'string' ? body.driverId : '';
    const fleetId = typeof body.vehicleId === 'string' ? body.vehicleId : '';
    const transporterId = typeof body.transporterId === 'string' ? body.transporterId : '';

    if (!reason || !driverId || !fleetId || !transporterId) {
      return NextResponse.json(
        { error: 'Reason, transporter, fleet, and driver are required' },
        { status: 400 }
      );
    }

    const result = await new DriverReplacementService().replaceDriver(identity, {
      jobOrderId,
      newDriverId: driverId,
      newFleetId: fleetId,
      newTransporterId: transporterId,
      reason,
    });

    if (!result.success) {
      const statusCode =
        result.code === 'NOT_FOUND' ? 404 :
        result.code === 'FORBIDDEN' ? 403 :
        result.code === 'INVALID_STATE' || result.code === 'RESOURCE_CONFLICT' ? 409 : 400;
      return NextResponse.json({ error: result.error || 'Driver replacement failed', code: result.code }, { status: statusCode });
    }

    return NextResponse.json({ success: true, jobOrder: result.jobOrder }, { status: 200 });
  } catch (error: any) {
    const statusCode = Number(error?.statusCode) || (error?.code === 'FORBIDDEN_PERMISSION' ? 403 : 500);
    if (statusCode >= 500) console.error('[trucking/replace-driver] error:', error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: statusCode });
  }
}
