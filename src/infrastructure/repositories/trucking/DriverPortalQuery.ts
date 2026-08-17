import { SupabaseClient } from '@supabase/supabase-js';

// Phase 3D.7: Extracted read-model to remove SQL from the API controller
export class DriverPortalQuery {
  constructor(private readonly supabase: SupabaseClient) {}

  public async getJobOrderData(token: string): Promise<any> {
    const isUuid = token.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    const selectColumns = `id, jo_number, status, tenant_id, wo_item_id, tracking_token, driver_link_token, driver_phone, created_at, completed_at, pod_photo_url, driver_response, advance_amount, advance_status, advance_receipt_url, driver_id, fleet_id, base_price, driver_share_percentage, driver_payment_amount, purchase_price, transporter_id, vendor_id, accepted_at, started_at, rejection_note, container_number, sbu_metadata, notes, assignment_documents`;

    let jobOrder;
    if (isUuid) {
      const { data } = await this.supabase
        .from("job_orders")
        .select(selectColumns)
        .or(`id.eq.${token},wa_token.eq.${token},tracking_token.eq.${token},driver_link_token.eq.${token}`)
        .maybeSingle();
      if (data) jobOrder = data;
    }

    if (!jobOrder) {
      const { data } = await this.supabase
        .from("job_orders")
        .select(selectColumns)
        .or(`tracking_token.eq.${token},driver_link_token.eq.${token}`)
        .maybeSingle();
      jobOrder = data;
    }

    if (!jobOrder) return null;

    let woItem = null;
    if (jobOrder.wo_item_id) {
      const { data } = await this.supabase
        .from("wo_items")
        .select("id, item_code, sbu_type, item_data, wo_id")
        .eq("id", jobOrder.wo_item_id)
        .maybeSingle();
      woItem = data;
    }

    let workOrder = null;
    if (woItem?.wo_id) {
      const { data } = await this.supabase
        .from("work_orders")
        .select("id, wo_number, customer_id, execution_date, notes")
        .eq("id", woItem.wo_id)
        .maybeSingle();
      workOrder = data;
    }

    let { data: routes } = await this.supabase
      .from("job_routes")
      .select("*")
      .eq("job_order_id", jobOrder.id)
      .order("sequence", { ascending: true });

    // Fetch location photos (1-to-many from documents) grouped by route
    let routePhotosByRoute: Record<string, any[]> = {};
    try {
      const { data: locationPhotos } = await this.supabase
        .from("documents")
        .select("id, job_route_id, file_url, document_name, created_at")
        .eq("job_order_id", jobOrder.id)
        .eq("doc_type", "LOCATION_PHOTO")
        .order("created_at", { ascending: true });
      if (locationPhotos) {
        for (const doc of locationPhotos) {
          if (!doc.job_route_id) continue;
          if (!routePhotosByRoute[doc.job_route_id]) routePhotosByRoute[doc.job_route_id] = [];
          routePhotosByRoute[doc.job_route_id].push({
            id: doc.id,
            file_url: doc.file_url,
            document_name: doc.document_name,
            created_at: doc.created_at,
          });
        }
      }
    } catch (e) {
      console.warn("[DriverPortalQuery] documents fetch skipped:", e);
    }

    if (routes && routes.length > 0) {
      routes = routes.map((r: any) => ({
        ...r,
        route_photos: routePhotosByRoute[r.id] || [],
      }));
    }

    let customer = null;
    if (workOrder?.customer_id) {
      const { data } = await this.supabase
        .from("md_entities")
        .select("name, billing_address, phone")
        .eq("id", workOrder.customer_id)
        .single();
      if (data) customer = { name: data.name, address: data.billing_address, phone: data.phone };
    }

    let driverInfo = null;
    let fleetInfo = null;

    if (jobOrder.driver_id) {
      const { data } = await this.supabase.from("md_drivers").select("id, name, phone").eq("id", jobOrder.driver_id).maybeSingle();
      if (data) {
        let profile_id = null;
        if (jobOrder.tenant_id) {
          const { data: linkData } = await this.supabase
            .from("driver_tenant_links")
            .select("profile_id")
            .eq("driver_id", jobOrder.driver_id)
            .eq("tenant_id", jobOrder.tenant_id)
            .maybeSingle();
          if (linkData) profile_id = linkData.profile_id;
        }
        driverInfo = { ...data, profile_id };
      }
    }

    if (jobOrder.fleet_id) {
      const { data } = await this.supabase.from("md_fleets").select("id, plate_number, easygo_vehicle_id, md_fleet_types!fleet_type_id(type_name)").eq("id", jobOrder.fleet_id).maybeSingle();
      if (data) fleetInfo = { plate_number: data.plate_number, type_name: (data as any).md_fleet_types?.type_name || "Truck", easygo_vehicle_id: data.easygo_vehicle_id || null };
    }

    let tenantName = "SENTRALOGIS";
    if (jobOrder.tenant_id) {
      const { data } = await this.supabase.from("tenants").select("name").eq("id", jobOrder.tenant_id).maybeSingle();
      if (data?.name) tenantName = data.name;
    }

    const { data: trackingLogs } = await this.supabase
      .from("job_tracking")
      .select("*")
      .eq("job_order_id", jobOrder.id)
      .order("created_at", { ascending: true });

    return {
      ...jobOrder,
      routes: routes || [],
      customer,
      driver: driverInfo,
      fleet: fleetInfo,
      tenant_name: tenantName,
      tracking_logs: trackingLogs || [],
      wo_details: {
        wo_number: workOrder?.wo_number || "N/A",
        execution_date: workOrder?.execution_date || woItem?.item_data?.execution_date || null,
        execution_time: woItem?.item_data?.execution_time || null,
      },
    };
  }
}
