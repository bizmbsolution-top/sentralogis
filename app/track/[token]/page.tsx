import { createAdminClient } from "@/lib/supabase/admin";
import PublicTrackingClient from "./TrackingClient";
import { Info, Truck } from "lucide-react";

interface Params {
    token: string;
}

export default async function PublicTrackingPage({ params }: { params: Promise<Params> }) {
    const { token } = await params;
    const supabaseAdmin = createAdminClient();

    // Fetch Job Data Securely on Server (Bypassing RLS for public view)
    const { data: job, error } = await supabaseAdmin
        .from('job_orders')
        .select(`
            *,
            work_orders!work_order_id (*, organizations!organization_id (*)),
            work_order_items!work_order_item_id (*, destination_location:destination_location_id (*)),
            fleets!fleet_id (*),
            tracking_updates(*),
            documents(*)
        `)
        .eq('driver_link_token', token)
        .single();

    if (error) {
        console.error("❌ TRACKING ERROR [SERVER]:", JSON.stringify(error, null, 2));
    }

    if (job) {
        console.log("📍 TRACKING SUCCESS [SERVER]:", job.jo_number, "| Status:", job.status);
    }

    const isTrackable = job && ['accepted', 'picking_up', 'delivering', 'delivered'].includes(job.status);

    if (!isTrackable) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-10 text-center">
                <div className="w-20 h-20 bg-rose-500/20 rounded-3xl flex items-center justify-center text-rose-500 mb-6">
                    <Info className="w-10 h-10" />
                </div>
                <h1 className="text-white text-2xl font-black uppercase italic mb-2 tracking-tighter">Tracking Inactive</h1>
                <p className="text-slate-400 text-sm max-w-xs">Tautan ini belum aktif atau pengiriman belum dimulai. Silakan hubungi operator kami untuk bantuan.</p>
            </div>
        );
    }

    return <PublicTrackingClient initialJob={job} token={token} />;
}
