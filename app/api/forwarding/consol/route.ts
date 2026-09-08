import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { resolveSessionIdentity } from '@/lib/application/identity/session-source';
import { assertPermission } from '@/lib/application/identity/resolver';
import { IdentityResolutionError } from '@/lib/application/identity/errors';

export async function POST(req: NextRequest) {
  try {
    const ctx = await resolveSessionIdentity();
    assertPermission(ctx, 'commercial:manage');

    const body = await req.json();
    const {
      vessel_name,
      voyage_number,
      origin_port,
      destination_port,
      etd,
      eta,
      shipping_line_name,
      consol_warehouse_origin_id,
      consol_warehouse_destination_id,
    } = body;

    if (!vessel_name || !origin_port || !destination_port) {
      return NextResponse.json(
        { success: false, error: 'Vessel name, origin port, and destination port are required' },
        { status: 400 },
      );
    }

    const { data, error } = await supabaseAdmin
      .from('fw_consolidations')
      .insert({
        tenant_id: ctx.tenantId,
        vessel_name,
        voyage_number: voyage_number || null,
        origin_port,
        destination_port,
        etd: etd || null,
        eta: eta || null,
        shipping_line_name: shipping_line_name || null,
        consol_warehouse_origin_id: consol_warehouse_origin_id || null,
        consol_warehouse_destination_id: consol_warehouse_destination_id || null,
        status: 'open',
      })
      .select('id, consol_number, status')
      .single();

    if (error) {
      console.error('Create consolidation error:', error);
      return NextResponse.json(
        { success: false, error: error.message || 'Gagal membuat konsolidasi' },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error: any) {
    if (error instanceof IdentityResolutionError) {
      return NextResponse.json(
        { success: false, error: error.code, message: error.message },
        { status: error.statusCode },
      );
    }
    console.error('Create consolidation error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unexpected server error' },
      { status: 500 },
    );
  }
}
