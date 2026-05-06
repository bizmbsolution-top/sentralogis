import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// =====================================================
// POST: ACCEPT JOB
// =====================================================
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { token } = body;
        const supabase = createAdminClient();

        console.log("Accept JO request:", token);

        // VALIDASI
        if (!token) {
            return NextResponse.json(
                { success: false, error: 'Token is required' },
                { status: 400 }
            );
        }

        // =====================================================
        // 1. CARI JOB ORDER BERDASARKAN TOKEN
        // =====================================================
        const { data: jobOrder, error: fetchError } = await supabase
            .from('job_orders')
            .select('*')
            .eq('driver_link_token', token)
            .single();

        if (fetchError || !jobOrder) {
            console.error("JO not found:", fetchError);
            return NextResponse.json(
                { success: false, error: 'Job Order tidak ditemukan' },
                { status: 404 }
            );
        }

        // =====================================================
        // 2. CEK STATUS (BIAR TIDAK DOUBLE ACCEPT)
        // =====================================================
        if (jobOrder.status === 'accepted') {
            return NextResponse.json({
                success: true,
                message: 'Job sudah pernah di-accept',
            });
        }

        // =====================================================
        // 3. UPDATE STATUS KE ACCEPTED
        // =====================================================
        const { error: updateError } = await supabase
            .from('job_orders')
            .update({
                status: 'accepted',
                accepted_at: new Date().toISOString(),
            })
            .eq('id', jobOrder.id);

        if (updateError) {
            console.error("Update error:", updateError);
            throw updateError;
        }

        // =====================================================
        // 4. KIRIM NOTIFIKASI KE FINANCE SBU
        // =====================================================
        try {
            await supabase
                .from('notifications')
                .insert({
                    role: 'sbu_fin_tr',
                    title: 'New Disbursement Ready',
                    message: `Job ${jobOrder.jo_number} accepted by driver. Ready for payout.`,
                    link: '/sbu/trucking/cost-management',
                    is_read: false
                });
        } catch (notifError) {
            console.error("Failed to send notification:", notifError);
            // Don't fail the whole request if notification fails
        }

        console.log("JO accepted:", jobOrder.id);

        return NextResponse.json({
            success: true,
            message: 'Job berhasil di-accept',
            data: jobOrder,
        });

    } catch (error: any) {
        console.error("ERROR ACCEPT JO:", error);
        return NextResponse.json(
            { success: false, error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}