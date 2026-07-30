import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenant_id");
    const siteId = searchParams.get("site_id");

    if (!tenantId) {
      return NextResponse.json({ error: "Missing tenant_id" }, { status: 400 });
    }

    const supabase = createAdminClient();

    let query = supabase
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

    const { data: jos, error } = await query;

    if (error) throw error;

    const fleetIds = [...new Set(jos?.map((j: any) => j.fleet_id).filter(Boolean) || [])];
    const driverIds = [...new Set(jos?.map((j: any) => j.driver_id).filter(Boolean) || [])];
    const transporterIds = [...new Set(jos?.map((j: any) => j.transporter_id).filter(Boolean) || [])];
    const joIds = jos?.map((j: any) => j.id) || [];

    const [fleets, drivers, transporters, events, woItems, picAssignments] = await Promise.all([
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
        .select("id, job_order_id, event_type, created_at, photo_url, ocr_json, verification_type, verified_against, verified_match")
        .in("job_order_id", joIds)
        .order("created_at", { ascending: false }),
      supabase
        .from("wo_items")
        .select("id, item_data")
        .in("id", [...new Set(jos?.map((j: any) => j.wo_item_id).filter(Boolean) || [])]),
      supabase
        .from("ground_assignment_pics")
        .select("id, job_order_id, pic1_staff_id, pic2_staff_id, pic1:ground_staff_profiles!pic1_staff_id(name), pic2:ground_staff_profiles!pic2_staff_id(name)")
        .in("job_order_id", joIds),
    ]);

    const fleetMap = new Map((fleets.data || []).map((f: any) => [f.id, f]));
    const driverMap = new Map((drivers.data || []).map((d: any) => [d.id, d]));
    const transporterMap = new Map((transporters.data || []).map((t: any) => [t.id, t]));
    const woItemMap = new Map((woItems.data || []).map((w: any) => [w.id, w.item_data]));
    const picAssignmentMap = new Map((picAssignments.data || []).map((p: any) => [p.job_order_id, p]));

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

    const computeFlowStages = (joEvents: any[]) => {
      const hasPIC1GateIn = joEvents.some((e: any) => e.event_type === "PIC1_GATE_IN");
      const hasPIC2GateOut = joEvents.some((e: any) => e.event_type === "PIC2_GATE_OUT");
      const hasDropoffArrive = joEvents.some((e: any) => e.event_type === "PIC1_DROPOFF_ARRIVE");
      const hasDropoffDoc = joEvents.some((e: any) => e.event_type === "PIC_DROPOFF_DOCUMENT");

      const oldHasGateIn = joEvents.some((e: any) =>
        ["GATE_IN_DEPOT", "GATE_IN_FACTORY", "GATE_IN_PORT"].includes(e.event_type)
      );
      const oldHasGateOut = joEvents.some((e: any) =>
        ["GATE_OUT_DEPOT", "GATE_OUT_FACTORY", "GATE_OUT_PORT"].includes(e.event_type)
      );

      let pickupFlow: "awaiting_pic1" | "pic1_done" | "pic2_done" | "pickup_complete" = "awaiting_pic1";
      if (hasPIC2GateOut || oldHasGateOut) pickupFlow = "pickup_complete";
      else if (hasPIC1GateIn || oldHasGateIn) pickupFlow = "pic1_done";

      let dropoffFlow: "awaiting_arrival" | "arrived" | "documents_done" | "dropoff_complete" = "awaiting_arrival";
      if (hasDropoffDoc) dropoffFlow = "dropoff_complete";
      else if (hasDropoffArrive) dropoffFlow = "arrived";

      return { pickupFlow, dropoffFlow };
    };

    const determineSiteRole = (staffLat?: number, staffLng?: number, routes?: any[]): "pickup" | "dropoff" | null => {
      if (!staffLat || !staffLng || !routes || routes.length === 0) return null;
      const pickupIdx = pickupStopIdx(routes);
      const pickup = routes[pickupIdx];
      const dropoff = routes[routes.length - 1];
      if (!pickup?.latitude || !pickup?.longitude) return null;

      const distToPickup = Math.sqrt(
        Math.pow((staffLat - pickup.latitude) * 111320, 2) +
        Math.pow((staffLng - pickup.longitude) * 111320 * Math.cos(staffLat * Math.PI / 180), 2)
      );
      const distToDropoff = dropoff?.latitude
        ? Math.sqrt(
            Math.pow((staffLat - dropoff.latitude) * 111320, 2) +
            Math.pow((staffLng - dropoff.longitude) * 111320 * Math.cos(staffLat * Math.PI / 180), 2)
          )
        : Infinity;

      if (distToPickup < distToDropoff && distToPickup < 500) return "pickup";
      if (distToDropoff < distToPickup && distToDropoff < 500) return "dropoff";
      return null;
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
      const picAssignment = picAssignmentMap.get(jo.id) || null;

      const { pickupFlow, dropoffFlow } = computeFlowStages(joEvents);

      const hasGateIn = joEvents.some((e: any) =>
        ["GATE_IN_DEPOT", "GATE_IN_FACTORY", "GATE_IN_PORT", "PIC1_GATE_IN"].includes(e.event_type)
      );
      const hasGateOut = joEvents.some((e: any) =>
        ["GATE_OUT_DEPOT", "GATE_OUT_FACTORY", "GATE_OUT_PORT", "PIC2_GATE_OUT"].includes(e.event_type)
      );

      let flowStage: "awaiting_gate_in" | "gate_in_done" | "gate_out_done" = "awaiting_gate_in";
      if (hasGateOut) flowStage = "gate_out_done";
      else if (hasGateIn) flowStage = "gate_in_done";

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
        flow_stage: flowStage,
        pickup_flow_stage: pickupFlow,
        dropoff_flow_stage: dropoffFlow,
        pic1_assigned_to: picAssignment?.pic1?.name || null,
        pic2_assigned_to: picAssignment?.pic2?.name || null,
        site_role: null,
      };
    });

    return NextResponse.json({ success: true, queue });
  } catch (err: any) {
    console.error("[Ground Queue] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
