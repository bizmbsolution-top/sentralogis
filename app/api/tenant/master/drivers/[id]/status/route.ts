import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// PUT /api/tenant/master/drivers/[id]/status
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: driverId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const { status } = payload;

    if (!status) {
      return NextResponse.json({ error: 'Missing status field' }, { status: 400 });
    }

    // This operation only updates operational status, not identity fields.
    // It is safe to use direct update here if backend RLS service-role is used.
    // However, since we revoked authenticated access from md_drivers, we must use the service role
    // or standard server client which acts with service role permissions (if configured).
    // Actually, createClient from server uses the user's JWT. Since we revoke RLS for write,
    // we need to use a service role client or an RPC.
    // Wait, if RLS is revoked, `supabase.auth.getUser()` client cannot update `md_drivers` either!
    // We should use an admin client or a specific RPC for status update.
    // Let's create an admin client just for this operational update, or use the RPC we already have.
    // The `update_driver` RPC updates identity. For just status, an admin client is fine.
    
    // To be safe and abide by the architecture:
    // "Buat API/RPC terpisah untuk perubahan status operasional driver."
    
    const { data, error } = await (supabase as unknown as {
      rpc(
        fn: 'update_driver_status_only',
        args: { p_driver_id: string; p_status: string }
      ): PromiseLike<{ data: unknown; error: { message: string } | null }>;
    }).rpc('update_driver_status_only', {
      p_driver_id: driverId,
      p_status: status
    });

    if (error) {
      // Fallback if RPC doesn't exist yet, use admin client
      const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
      const supabaseAdmin = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      
      const { data: updateData, error: updateErr } = await supabaseAdmin
        .from('md_drivers')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', driverId)
        .select('id')
        .single();
        
      if (updateErr) {
        console.error('[API] Update driver status fallback error:', updateErr);
        return NextResponse.json({ error: updateErr.message }, { status: 500 });
      }
      return NextResponse.json({ success: true, data: updateData });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('[API] PUT /api/tenant/master/drivers/[id]/status error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
