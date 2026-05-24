import { createAdminClient } from "@/lib/supabase/admin";
import PublicTrackingClient from "./TrackingClient";
import { Info } from "lucide-react";

export default async function PublicTrackingPage({ params }: { params: Promise<{ token: string }> }) {
    const { token } = await params;
    const supabaseAdmin = createAdminClient();

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token);

    const query = supabaseAdmin
        .from('job_orders')
        .select(`
            id, jo_number, status, work_order_id, wo_item_id, fleet_id, driver_id, driver_link_token, tracking_token,
            created_at, updated_at
        `);

    if (isUuid) {
        query.or(`id.eq.${token},driver_link_token.eq.${token},tracking_token.eq.${token}`);
    } else {
        query.or(`driver_link_token.eq.${token},tracking_token.eq.${token}`);
    }

    const { data: job, error } = await query.maybeSingle();

    if (error) {
        console.error("TRACKING ERROR [SERVER]:", JSON.stringify(error, null, 2));
    }

    if (!job) {
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

    const isTrackable = ['accepted', 'picking_up', 'delivering', 'delivered'].includes(job.status);
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

    // Fetch related data separately to avoid FK schema mismatch issues
    const [woRes, woItemRes, fleetRes, trackingRes, docsRes] = await Promise.all([
        job.work_order_id
            ? supabaseAdmin.from('work_orders').select('id, wo_number, execution_date, notes, entity_id').eq('id', job.work_order_id).maybeSingle()
            : { data: null },
        job.wo_item_id
            ? supabaseAdmin.from('wo_items').select('id, item_code, item_data, wo_id').eq('id', job.wo_item_id).maybeSingle()
            : { data: null },
        job.fleet_id
            ? supabaseAdmin.from('md_fleets').select('id, plate_number, fleet_type_id').eq('id', job.fleet_id).maybeSingle()
            : { data: null },
        supabaseAdmin.from('tracking_updates').select('latitude, longitude, created_at').eq('job_order_id', job.id).order('created_at', { ascending: false }),
        supabaseAdmin.from('documents').select('id, file_url, doc_type, created_at').eq('job_order_id', job.id),
    ]);

    const wo = woRes.data;
    const woItem = woItemRes.data;
    const fleet = fleetRes.data;
    const trackingUpdates = trackingRes.data || [];
    const documents = docsRes.data || [];

    let entity = null;
    if (wo?.entity_id) {
        const { data: entityData } = await supabaseAdmin
            .from('md_entities')
            .select('id, name, logo_url, phone, billing_address')
            .eq('id', wo.entity_id)
            .maybeSingle();
        entity = entityData;
    }

    const stops = woItem?.item_data?.stops || [];
    const destStop = stops[stops.length - 1] || null;

    const enrichedJob = {
        ...job,
        work_orders: wo ? { ...wo, md_entities: entity } : null,
        wo_items: woItem,
        md_fleets: fleet,
        tracking_updates: trackingUpdates,
        documents,
        destination: destStop ? {
            name: destStop.location_name || destStop.name || 'Target Location',
            latitude: destStop.latitude || null,
            longitude: destStop.longitude || null,
        } : null,
    };

    console.log("TRACKING SUCCESS [SERVER]:", job.jo_number, "| Status:", job.status);
    return <PublicTrackingClient initialJob={enrichedJob} token={token} />;
}
