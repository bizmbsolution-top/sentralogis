import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenant_id");

    if (!tenantId) {
      return NextResponse.json({ error: "Missing tenant_id" }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data: jos, error } = await supabase
      .from("job_orders")
      .select(`
        id, jo_number, status, dispatch_ready_at, container_number,
        driver_id, fleet_id, transporter_id,
        sbu_metadata,
        wo_item_id,
        routes:job_routes(id, sequence, stop_type, location_name, address, status, latitude, longitude, contact_name, contact_phone)
      `)
      .eq("tenant_id", tenantId)
      .eq("dispatch_ready", true)
      .in("status", ["assigned", "ASSIGNED", "CONFIRMED_BY_DRIVER", "AUTO_CONFIRMED", "in_progress", "IN_PROGRESS", "DALAM PERJALANAN", "MENUJU", "TIBA DI LOKASI MUAT", "BERANGKAT DARI LOKASI MUAT", "TIBA DI LOKASI BONGKAR", "MENUNGGU SELESAI"])
      .order("dispatch_ready_at", { ascending: true, nullsFirst: false })
      .limit(100);

    if (error) throw error;

    const fleetIds = [...new Set(jos?.map((j: any) => j.fleet_id).filter(Boolean) || [])];
    const driverIds = [...new Set(jos?.map((j: any) => j.driver_id).filter(Boolean) || [])];
    const transporterIds = [...new Set(jos?.map((j: any) => j.transporter_id).filter(Boolean) || [])];

    const [fleets, drivers, transporters, events, woItems] = await Promise.all([
      fleetIds.length > 0
        ? supabase.from("md_fleets").select("id, plate_number, fleet_type:md_fleet_types!fleet_type_id(type_name)").in("id", fleetIds)
        : { data: [] },
      driverIds.length > 0
        ? supabase.from("md_drivers").select("id, name, phone").in("id", driverIds)
        : { data: [] },
      transporterIds.length > 0
        ? supabase.from("md_entities").select("id, name, phone").in("id", transporterIds)
        : { data: [] },
      supabase
        .from("ground_events")
        .select("id, job_order_id, event_type, created_at, photo_url, ocr_json")
        .in("job_order_id", jos?.map((j: any) => j.id) || [])
        .order("created_at", { ascending: false }),
      supabase
        .from("wo_items")
        .select("id, item_data")
        .in("id", [...new Set(jos?.map((j: any) => j.wo_item_id).filter(Boolean) || [])]),
    ]);

    const fleetMap = new Map((fleets.data || []).map((f: any) => [f.id, f]));
    const driverMap = new Map((drivers.data || []).map((d: any) => [d.id, d]));
    const transporterMap = new Map((transporters.data || []).map((t: any) => [t.id, t]));
    const woItemMap = new Map((woItems.data || []).map((w: any) => [w.id, w.item_data]));

    const lastEventMap = new Map<string, any>();
    const allEventsMap = new Map<string, any[]>();
    (events.data || []).forEach((e: any) => {
      if (!lastEventMap.has(e.job_order_id)) {
        lastEventMap.set(e.job_order_id, e);
      }
      const existing = allEventsMap.get(e.job_order_id) || [];
      existing.push(e);
      allEventsMap.set(e.job_order_id, existing);
    });

    const pickupStopIdx = (routes: any[]) => {
      const pickup = routes?.findIndex((r: any) => r.stop_type === "PICKUP");
      return pickup !== -1 ? pickup : 0;
    };

    const queue = (jos || []).map((jo: any) => {
      const stops = jo.routes || [];
      const pickupIdx = pickupStopIdx(stops);
      const pickup = stops[pickupIdx];
      const dropoff = stops[stops.length - 1];
      const lastEvent = lastEventMap.get(jo.id) || null;
      const joEvents = allEventsMap.get(jo.id) || [];
      const itemData = woItemMap.get(jo.wo_item_id) || {};
      const fleet = fleetMap.get(jo.fleet_id) || null;
      const driver = driverMap.get(jo.driver_id) || null;
      const transporter = transporterMap.get(jo.transporter_id) || null;

      const hasGateIn = joEvents.some((e: any) =>
        ["GATE_IN_DEPOT", "GATE_IN_FACTORY", "GATE_IN_PORT"].includes(e.event_type)
      );
      const hasGateOut = joEvents.some((e: any) =>
        ["GATE_OUT_DEPOT", "GATE_OUT_FACTORY", "GATE_OUT_PORT"].includes(e.event_type)
      );

      let flow_stage: "awaiting_gate_in" | "gate_in_done" | "gate_out_done" = "awaiting_gate_in";
      if (hasGateOut) flow_stage = "gate_out_done";
      else if (hasGateIn) flow_stage = "gate_in_done";

      return {
        jo_id: jo.id,
        jo_number: jo.jo_number,
        status: jo.status,
        dispatch_ready_at: jo.dispatch_ready_at,
        container_number: jo.container_number,
        fleet_plate: fleet?.plate_number || null,
        fleet_type: fleet?.fleet_type?.type_name || null,
        driver_name: driver?.name || null,
        driver_phone: driver?.phone || null,
        transporter_name: transporter?.name || null,
        transporter_phone: transporter?.phone || null,
        customer_name: itemData?.customer_name || null,
        pickup_location: pickup?.location_name || null,
        dropoff_location: dropoff?.location_name || null,
        route_stops: stops,
        last_event: lastEvent,
        last_event_type: lastEvent?.event_type || null,
        last_event_at: lastEvent?.created_at || null,
        site_name: null,
        eta_minutes: null,
        flow_stage,
      };
    });

    return NextResponse.json({ success: true, queue });
  } catch (err: any) {
    console.error("[Ground Queue] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
