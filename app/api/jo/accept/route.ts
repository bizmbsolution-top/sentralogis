import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// POST: Driver accepts a JO using the private driver_link_token capability.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const token = typeof body?.token === 'string' ? body.token.trim() : '';

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Token is required' },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();

    // Never accept a raw JO UUID as authorization. The private link token is
    // the capability that proves the driver received this specific assignment.
    const { data: jobOrder, error: fetchError } = await supabase
      .from('job_orders')
      .select('id, tenant_id, wo_item_id, jo_number, driver_id, driver_link_token')
      .eq('driver_link_token', token)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!jobOrder) {
      return NextResponse.json(
        { success: false, error: 'Job Order tidak ditemukan atau tautan tidak valid' },
        { status: 404 },
      );
    }

    const { data: result, error: confirmError } = await supabase.rpc(
      'vendor_job_confirmation',
      {
        p_jo_id: jobOrder.id,
        p_is_accepted: true,
        p_is_timeout: false,
        p_rejection_reason: null,
        p_lat: null,
        p_lng: null,
      },
    );

    if (confirmError) throw confirmError;
    if (!result?.success) {
      return NextResponse.json(
        { success: false, error: result?.error || 'Respons driver tidak dapat diproses' },
        { status: 409 },
      );
    }

    try {
      await supabase.from('notifications').insert({
        tenant_id: jobOrder.tenant_id,
        user_id: null,
        role: 'sbu_fin_tr',
        title: 'Driver Accepted Job Order',
        message: `Driver accepted JO ${jobOrder.jo_number}.`,
        metadata: { jo_id: jobOrder.id, wo_item_id: jobOrder.wo_item_id },
        is_read: false,
      });
    } catch (notificationError) {
      console.warn('[API] Finance notification failed:', notificationError);
    }

    return NextResponse.json({
      success: true,
      message: 'Job berhasil diterima. Status JO: On Journey.',
      new_status: result.new_status,
    });
  } catch (error: any) {
    console.error('ERROR ACCEPT JO:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Internal server error' },
      { status: 500 },
    );
  }
}
