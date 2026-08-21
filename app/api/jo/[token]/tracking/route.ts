import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyDriverJwt } from '@/lib/auth/driverJwt'
import { verifyGpsSessionToken } from '@/lib/auth/gpsSession'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const body = await request.json()
    const { latitude, longitude } = body
    const supabaseAdmin = createAdminClient()

    if (!token) {
      return NextResponse.json({ error: 'Token missing' }, { status: 400 })
    }

    if (!latitude || !longitude) {
      return NextResponse.json({ error: 'Coordinates missing' }, { status: 400 })
    }

    // 1. Ambil JO id berdasarkan token safely (handles UUID and short string formats)
    const isUuid = token.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    let joData = null;
    let fetchError = null;

    if (isUuid) {
      // Query UUID and varchar columns safely
      const { data, error } = await supabaseAdmin
        .from('job_orders')
        .select('id, status, driver_id, tenant_id')
        .or(`id.eq.${token},wa_token.eq.${token},tracking_token.eq.${token},driver_link_token.eq.${token}`)
        .maybeSingle();
      joData = data;
      fetchError = error;
    } else {
      // Query varchar columns only to avoid Postgres syntax errors
      const { data, error } = await supabaseAdmin
        .from('job_orders')
        .select('id, status, driver_id, tenant_id')
        .or(`tracking_token.eq."${token}",driver_link_token.eq."${token}"`)
        .maybeSingle();
      joData = data;
      fetchError = error;
    }

    if (fetchError || !joData) {
      return NextResponse.json({ error: 'Job Order not found' }, { status: 404 })
    }

    // 2. Strict Authentication & Ownership Check
    const authHeader = request.headers.get("authorization") || "";
    const cookieToken = request.cookies.get("sb-access-token")?.value;
    const rawToken = authHeader.replace(/^Bearer\s+/i, "").trim() || cookieToken || "";

    let isAuthorized = false;

    // Check GPS session token
    try {
      const gpsPayload = verifyGpsSessionToken(rawToken);
      if (
        gpsPayload &&
        gpsPayload.job_order_id === joData.id &&
        gpsPayload.driver_id === joData.driver_id &&
        gpsPayload.tenant_id === joData.tenant_id
      ) {
        isAuthorized = true;
      }
    } catch {
      // Check Driver Session JWT
      const verified = verifyDriverJwt(rawToken);
      if (
        verified &&
        (verified.driver_id === joData.driver_id ||
          (verified.linked_tenant_ids && verified.linked_tenant_ids.includes(joData.tenant_id)))
      ) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return NextResponse.json(
        { error: 'Akses ditolak: Token autentikasi atau GPS session tidak valid untuk JO ini' },
        { status: 403 }
      );
    }

    // 2. Simpan ke tracking_updates
    const { error: trackingError } = await supabaseAdmin
      .from('tracking_updates')
      .insert({
        job_order_id: joData.id,
        latitude,
        longitude,
        status_update: 'Live GPS Update',
        whatsapp_sent: false
      })

    if (trackingError) {
      console.error('Error saving live tracking:', trackingError)
      return NextResponse.json({ error: trackingError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('Tracking API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
