import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createJournalEntry } from "@/lib/finance/journaling";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// [AI] Haversine formula helper to calculate distance between two coordinates in meters
function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// [AI] Safe utility to find Job Order by any of the token columns or ID
// Bypasses PostgREST type casting issues with mixed UUID and string columns
async function findJobOrder(supabase: any, token: string) {
  if (!token) return null;

  const isUuid = token.match(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  );
  const selectColumns = `
    id, jo_number, status, tenant_id, wo_item_id, tracking_token, 
    driver_link_token, driver_phone, created_at, completed_at, pod_photo_url, driver_response, 
    advance_amount, advance_status, advance_receipt_url, 
    driver_id, fleet_id, base_price, driver_share_percentage, driver_payment_amount,
    purchase_price, transporter_id, vendor_id,
    accepted_at, started_at, rejection_note, container_number, sbu_metadata, notes, assignment_documents
  `;

  if (isUuid) {
    // [AI] For valid UUID format: query ID and UUID/VARCHAR token columns safely using .or()
    const { data, error } = await supabase
      .from("job_orders")
      .select(selectColumns)
      .or(
        `id.eq.${token},wa_token.eq.${token},tracking_token.eq.${token},driver_link_token.eq.${token}`,
      )
      .maybeSingle();

    if (error) {
      console.error("[AI] findJobOrder UUID query failed:", error);
    }
    if (data) return data;
  }

  // [AI] For non-UUID format or if UUID match failed: query only VARCHAR columns to prevent invalid UUID syntax error
  const { data, error } = await supabase
    .from("job_orders")
    .select(selectColumns)
    .or(`tracking_token.eq.${token},driver_link_token.eq.${token}`)
    .maybeSingle();

  if (error) {
    console.error("[AI] findJobOrder VARCHAR query failed:", error);
  }
  return data;
}

// GET: Ambil data JO berdasarkan tracking_token ATAU wa_token
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;
    const supabase = createAdminClient();

    if (!token) {
      return NextResponse.json(
        { error: "Token tidak ditemukan" },
        { status: 400 },
      );
    }

    // [AI] Find Job Order securely using our unified look-up helper
    const jobOrder = await findJobOrder(supabase, token);
    if (!jobOrder)
      return NextResponse.json(
        { error: "Job Order tidak ditemukan" },
        { status: 404 },
      );

    // Fetch wo_item separately
    let woItem: any = null;
    if (jobOrder.wo_item_id) {
      const { data: woItemData } = await supabase
        .from("wo_items")
        .select("id, item_code, sbu_type, item_data, wo_id")
        .eq("id", jobOrder.wo_item_id)
        .maybeSingle();
      woItem = woItemData;
    }

    // Fetch work_order separately
    let workOrder: any = null;
    if (woItem?.wo_id) {
      const { data: woData } = await supabase
        .from("work_orders")
        .select("id, wo_number, customer_id, execution_date, notes")
        .eq("id", woItem.wo_id)
        .maybeSingle();
      workOrder = woData;
    }

    // 2. Ambil rute terpisah + Self-healing jika rute kosong
    let { data: routes } = await supabase
      .from("job_routes")
      .select("*")
      .eq("job_order_id", jobOrder.id)
      .order("sequence", { ascending: true });

    if ((!routes || routes.length === 0) && woItem?.item_data?.stops) {
      const stops = woItem.item_data.stops;
      const routePayloads = stops.map((stop: any, idx: number) => ({
        job_order_id: jobOrder.id,
        sequence: idx + 1,
        stop_type: stop.stop_type || (idx === 0 ? "PICKUP" : "DROPOFF"),
        source_type: stop.source_type || "MD_LOCATION",
        source_id: String(stop.source_id || "LEGACY"),
        location_name: stop.location_name || "-",
        address: stop.address || "-",
        latitude: stop.latitude != null ? Number(stop.latitude) : null,
        longitude: stop.longitude != null ? Number(stop.longitude) : null,
        contact_name: stop.contact_name || "-",
        contact_phone: stop.contact_phone || "-",
        status: "pending",
      }));

      const { data: newRoutes } = await supabase
        .from("job_routes")
        .insert(routePayloads)
        .select("*")
        .order("sequence", { ascending: true });
      if (newRoutes) routes = newRoutes;
    }

    // 3. Ambil customer info
    let customer = null;
    if (workOrder?.customer_id) {
      const { data: customerData } = await supabase
        .from("md_entities")
        .select("name, billing_address, phone")
        .eq("id", workOrder.customer_id)
        .single();

      if (customerData) {
        customer = {
          name: customerData.name,
          address: customerData.billing_address,
          phone: customerData.phone,
        };
      }
    }

    // 4. Ambil Driver & Fleet details (Rule #1 compliance)
    let driverInfo = null;
    let fleetInfo = null;

    if (jobOrder.driver_id) {
      const { data: dData } = await supabase
        .from("md_drivers")
        .select("id, name, phone, driver_type")
        .eq("id", jobOrder.driver_id)
        .maybeSingle();
      if (dData) driverInfo = dData;
    }

    if (jobOrder.fleet_id) {
      const { data: fData } = await supabase
        .from("md_fleets")
        .select("id, plate_number, md_fleet_types!fleet_type_id(type_name)")
        .eq("id", jobOrder.fleet_id)
        .maybeSingle();
      if (fData)
        fleetInfo = {
          plate_number: fData.plate_number,
          type_name: (fData as any).md_fleet_types?.type_name || "Truck",
        };
    }

    // 5. Ambil Tenant Info
    let tenantName = "SENTRALOGIS";
    if (jobOrder.tenant_id) {
      const { data: tenantData } = await supabase
        .from("tenants")
        .select("name")
        .eq("id", jobOrder.tenant_id)
        .maybeSingle();
      if (tenantData?.name) tenantName = tenantData.name;
    }

    // 6. Ambil Tracking Logs (Timeline Updates)
    const { data: trackingLogs } = await supabase
      .from("job_tracking")
      .select("*")
      .eq("job_order_id", jobOrder.id)
      .order("created_at", { ascending: true });

    return NextResponse.json({
      success: true,
      data: {
        ...jobOrder,
        routes: routes || [],
        customer,
        driver: driverInfo,
        fleet: fleetInfo,
        tenant_name: tenantName,
        tracking_logs: trackingLogs || [],
        wo_details: {
          wo_number: workOrder?.wo_number || "N/A",
          execution_date:
            workOrder?.execution_date ||
            woItem?.item_data?.execution_date ||
            null,
          execution_time: woItem?.item_data?.execution_time || null,
        },
      },
    });
  } catch (err: any) {
    console.error("[API] GET error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH: Update status & tracking
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;
    const body = await request.json();
    const {
      action,
      status,
      route_id,
      route_status,
      pod_photo_url,
      pod_photo_base64,
      pod_photo_name,
      lat,
      lng,
      rejection_note,
      route_notes,
      container_number,
      seal_number,
    } = body;
    const supabase = createAdminClient();

    // [AI] Find Job Order securely using our unified look-up helper
    const jo = await findJobOrder(supabase, token);
    if (!jo)
      return NextResponse.json({ error: "JO not found" }, { status: 404 });

    if (action === "update_container") {
      const sbuMeta =
        jo.sbu_metadata && typeof jo.sbu_metadata === "object"
          ? jo.sbu_metadata
          : {};
      const updatedMeta = {
        ...sbuMeta,
        ...(seal_number !== undefined ? { seal_number } : {}),
      };

      const updatePayload: any = {
        sbu_metadata: updatedMeta,
        updated_at: new Date().toISOString(),
      };
      if (container_number !== undefined)
        updatePayload.container_number = container_number;

      const { error: updErr } = await supabase
        .from("job_orders")
        .update(updatePayload)
        .eq("id", jo.id);

      if (updErr)
        return NextResponse.json({ error: updErr.message }, { status: 500 });
      return NextResponse.json({
        success: true,
        container_number,
        seal_number,
      });
    }

    // [AI] GPS Ping — driver's phone sends lat/lng every 10 seconds while page is open (Dual-write & Geofence check)
    if (action === "gps_ping") {
      if (!lat || !lng)
        return NextResponse.json({ error: "Missing lat/lng" }, { status: 400 });

      // 1. Dual-write to job_tracking AND tracking_updates so Ops LiveTrackingMap sees it real-time
      const { error: pingErr } = await supabase.from("job_tracking").insert({
        job_order_id: jo.id,
        status_update: "GPS_PING",
        latitude: lat,
        longitude: lng,
        notes: "Auto GPS ping dari driver (10-Sec Interval)",
      });

      // [AI] Update device health if health info is provided from Native app
      if (
        body.internet_connected !== undefined ||
        body.background_running !== undefined
      ) {
        let health_status = "GOOD";
        if (
          body.internet_connected === false ||
          body.background_running === false
        ) {
          health_status = "CRITICAL";
        } else if (body.battery !== undefined && body.battery < 20) {
          health_status = "WARNING";
        } else if (body.accuracy !== undefined && body.accuracy > 100) {
          health_status = "WARNING";
        }

        await supabase
          .from("job_orders")
          .update({
            device_health: health_status,
            last_device_health_ping_at: new Date().toISOString(),
            gps_status: "ACTIVE",
          })
          .eq("id", jo.id);

        await supabase.from("device_health_logs").insert({
          job_order_id: jo.id,
          driver_id: jo.driver_id,
          internet_connected: body.internet_connected ?? true,
          gps_active: true,
          background_running: body.background_running ?? true,
          battery_level: body.battery,
          accuracy: body.accuracy,
        });
      }

      await supabase.from("tracking_updates").insert({
        job_order_id: jo.id,
        latitude: lat,
        longitude: lng,
        status_update: "GPS_PING",
        whatsapp_sent: false,
      });

      if (pingErr)
        return NextResponse.json({ error: pingErr.message }, { status: 500 });

      // 2. Geofence Check (<= 500 meters from any pending/arrived stop) — with debounce
      const { data: activeRoutes } = await supabase
        .from("job_routes")
        .select("*")
        .eq("job_order_id", jo.id)
        .in(
          "status",
          jo.status === "MENUNGGU SELESAI"
            ? ["pending", "arrived", "completed"]
            : ["pending", "arrived"],
        )
        .order("sequence", { ascending: true });

      let geofenceTriggered = false;
      let arrivedStopName: string | null = null;
      let geofenceDistanceM: number | null = null;
      let departedStopName: string | null = null;

      if (activeRoutes && activeRoutes.length > 0) {
        const pendingRoutes = activeRoutes.filter(
          (r: any) => r.status === "pending",
        );
        const arrivedRoutes = activeRoutes.filter(
          (r: any) => r.status === "arrived",
        );
        const completedRoutes = activeRoutes.filter(
          (r: any) => r.status === "completed",
        );

        // 2a. Check for new arrivals (pending -> arrived)
        for (const route of pendingRoutes) {
          if (route.latitude && route.longitude) {
            const distM = calculateHaversineDistance(
              Number(lat),
              Number(lng),
              Number(route.latitude),
              Number(route.longitude),
            );

            // Debounce: cek apakah route ini sudah di-trigger geofence dalam 5 menit terakhir
            if (route.geofence_triggered_at) {
              const lastTrigger = new Date(
                route.geofence_triggered_at,
              ).getTime();
              const now = Date.now();
              if (now - lastTrigger < 5 * 60 * 1000) {
                continue; // Skip trigger ulang dalam 5 menit
              }
            }

            if (distM <= 500) {
              geofenceTriggered = true;
              arrivedStopName =
                route.location_name || `Stop #${route.sequence}`;
              geofenceDistanceM = Math.round(distM);

              // 1. Mark this route as arrived
              await supabase
                .from("job_routes")
                .update({
                  status: "arrived",
                  actual_arrival: new Date().toISOString(),
                  geofence_triggered_at: new Date().toISOString(),
                })
                .eq("id", route.id);

              // 2. Auto-complete any prior stops (pending → completed, arrived → completed)
              const priorStops = activeRoutes.filter(
                (r: any) =>
                  r.sequence < route.sequence && r.status !== "completed",
              );
              for (const prior of priorStops) {
                const update: any = {
                  status: "completed",
                  actual_departure: new Date().toISOString(),
                };
                if (!prior.actual_arrival) {
                  update.actual_arrival = new Date().toISOString();
                }
                await supabase
                  .from("job_routes")
                  .update(update)
                  .eq("id", prior.id);
              }

              let newJoStatus: string | null = null;
              if (route.sequence === 1 || route.stop_type === "PICKUP") {
                newJoStatus = "TIBA DI LOKASI MUAT";
              } else if (
                route.stop_type === "DROPOFF" ||
                route.sequence === activeRoutes.length
              ) {
                newJoStatus = "TIBA DI LOKASI BONGKAR";
              } else {
                newJoStatus = `TIBA DI LOKASI TRANSIT`;
              }

              if (newJoStatus) {
                const updateJoPayload: any = {
                  status: newJoStatus,
                  updated_at: new Date().toISOString(),
                };
                if (jo.status === "ASSIGNED") {
                  updateJoPayload.accepted_at = new Date().toISOString();
                  updateJoPayload.started_at = new Date().toISOString();
                  updateJoPayload.driver_response = "accepted";
                }
                await supabase
                  .from("job_orders")
                  .update(updateJoPayload)
                  .eq("id", jo.id);
              }

              await supabase.from("job_tracking").insert({
                job_order_id: jo.id,
                job_route_id: route.id,
                status_update: `📍 Tiba di ${arrivedStopName} (Geofence Auto)`,
                latitude: lat,
                longitude: lng,
                notes: `Otomatis terdeteksi dalam radius ${geofenceDistanceM}m dari titik rute.`,
              });

              await supabase.from("tracking_updates").insert({
                job_order_id: jo.id,
                latitude: lat,
                longitude: lng,
                status_update: `📍 Tiba di ${arrivedStopName} (Geofence Auto)`,
                whatsapp_sent: false,
              });

              await supabase.from("notifications").insert({
                role: "tenant_admin",
                tenant_id: jo.tenant_id || null,
                type: "geofence_arrival",
                title: `📍 Armada Tiba di ${arrivedStopName}`,
                message: `Truk untuk JO ${jo.jo_number} otomatis terdeteksi tiba di ${arrivedStopName} (Radius ${geofenceDistanceM}m via Geofence).`,
                link: `/sbu/trucking/work-orders/${jo.id}`,
              });

              break;
            }
          }
        }

        // 2b. Check for departures (arrived -> completed)
        for (const route of arrivedRoutes) {
          if (route.latitude && route.longitude) {
            const distM = calculateHaversineDistance(
              Number(lat),
              Number(lng),
              Number(route.latitude),
              Number(route.longitude),
            );
            if (distM > 300) {
              departedStopName =
                route.location_name || `Stop #${route.sequence}`;

              await supabase
                .from("job_routes")
                .update({
                  status: "completed",
                  actual_departure: new Date().toISOString(),
                })
                .eq("id", route.id);

              // Update JO status on departure
              let departJoStatus: string | null = null;
              let updateJoPayload: any = {
                updated_at: new Date().toISOString(),
              };

              if (route.sequence === 1 || route.stop_type === "PICKUP") {
                departJoStatus = "BERANGKAT DARI LOKASI MUAT";
                updateJoPayload.loaded_at = new Date().toISOString();
              } else if (
                route.stop_type === "DROPOFF" ||
                route.sequence === activeRoutes.length
              ) {
                departJoStatus = "PEKERJAAN SELESAI";
                updateJoPayload.unloaded_at = new Date().toISOString();
                updateJoPayload.completed_at = new Date().toISOString();
              } else {
                departJoStatus = "MELANJUTKAN PERJALANAN";
              }

              updateJoPayload.status = departJoStatus;

              await supabase
                .from("job_orders")
                .update(updateJoPayload)
                .eq("id", jo.id);

              await supabase.from("job_tracking").insert({
                job_order_id: jo.id,
                job_route_id: route.id,
                status_update: `🚦 Keluar dari ${departedStopName} (Geofence Auto)`,
                latitude: lat,
                longitude: lng,
                notes: `Otomatis terdeteksi keluar dari radius ${Math.round(distM)}m dari titik rute.`,
              });

              await supabase.from("tracking_updates").insert({
                job_order_id: jo.id,
                latitude: lat,
                longitude: lng,
                status_update: `🚦 Keluar dari ${departedStopName} (Geofence Auto)`,
                whatsapp_sent: false,
              });

              // Notification on departure
              await supabase.from("notifications").insert({
                role: "tenant_admin",
                tenant_id: jo.tenant_id || null,
                type: "geofence_departure",
                title: `🚦 Armada Keluar dari ${departedStopName}`,
                message: `Truk untuk JO ${jo.jo_number} terdeteksi keluar dari ${departedStopName} (Radius ${Math.round(distM)}m via Geofence).`,
                link: `/sbu/trucking/work-orders/${jo.id}`,
              });

              // Auto-complete cascade when final stop departs
              if (departJoStatus === "PEKERJAAN SELESAI") {
                if (jo.wo_item_id) {
                  await supabase
                    .from("wo_items")
                    .update({ status: "PEKERJAAN SELESAI" })
                    .eq("id", jo.wo_item_id)
                    .neq("status", "PEKERJAAN SELESAI");
                }
                if (jo.fleet_id) {
                  await supabase
                    .from("md_fleets")
                    .update({ status: "available" })
                    .eq("id", jo.fleet_id);
                }
                if (jo.driver_id) {
                  try {
                    const { data: driverData } = await supabase
                      .from("md_drivers")
                      .select("total_jobs_completed, total_km_driven")
                      .eq("id", jo.driver_id)
                      .single();
                    const estimatedKM = 50;
                    await supabase
                      .from("md_drivers")
                      .update({
                        total_jobs_completed:
                          (driverData?.total_jobs_completed || 0) + 1,
                        total_km_driven:
                          (driverData?.total_km_driven || 0) + estimatedKM,
                      })
                      .eq("id", jo.driver_id);
                    await supabase
                      .from("driver_performance_logs")
                      .insert({
                        driver_id: jo.driver_id,
                        job_order_id: jo.id,
                        type: "KM_LOG",
                        total_km: estimatedKM,
                        review_notes: "Auto-complete via Geofence",
                        tenant_id: jo.tenant_id,
                      });
                  } catch (e) {
                    console.warn("[Geofence] Driver stats update failed:", e);
                  }
                }
              }
            }
          }
        }

        // 2c. Check for re-entry (completed -> arrived) for final stop when status is MENUNGGU SELESAI
        if (jo.status === "MENUNGGU SELESAI") {
          for (const route of completedRoutes) {
            if (
              route.stop_type === "DROPOFF" ||
              route.sequence === activeRoutes.length
            ) {
              if (route.latitude && route.longitude) {
                const distM = calculateHaversineDistance(
                  Number(lat),
                  Number(lng),
                  Number(route.latitude),
                  Number(route.longitude),
                );
                if (distM <= 300) {
                  // Debounce: skip if already triggered in last 5 minutes
                  if (route.geofence_triggered_at) {
                    const lastTrigger = new Date(route.geofence_triggered_at).getTime();
                    if (Date.now() - lastTrigger < 5 * 60 * 1000) {
                      continue;
                    }
                  }
                  geofenceTriggered = true;
                  await supabase
                    .from("job_routes")
                    .update({ status: "arrived", actual_departure: null, geofence_triggered_at: new Date().toISOString() })
                    .eq("id", route.id);

                  await supabase
                    .from("job_orders")
                    .update({
                      status: "TIBA DI LOKASI BONGKAR",
                      departure_detected_at: null,
                      updated_at: new Date().toISOString(),
                    })
                    .eq("id", jo.id);

                  await supabase.from("job_tracking").insert({
                    job_order_id: jo.id,
                    job_route_id: route.id,
                    status_update: `🔙 Kembali ke ${route.location_name || "Lokasi Bongkar"} (Re-entry)`,
                    latitude: lat,
                    longitude: lng,
                    notes: `Sistem mendeteksi armada kembali masuk ke radius 300m.`,
                  });
                  break;
                }
              }
            }
          }
        }
      }

      // Fetch final JO status so client can stop GPS if done
      const { data: finalJo } = await supabase
        .from("job_orders")
        .select("status")
        .eq("id", jo.id)
        .single();
      const currentStatus = finalJo?.status || jo.status;

      return NextResponse.json({
        success: true,
        geofence_triggered: geofenceTriggered,
        arrived_stop: arrivedStopName,
        distance_m: geofenceDistanceM,
        departed_stop: departedStopName,
        jo_status: currentStatus,
      });
    }

    // [AI] Action: Panic Button SOS Emergency Alert (Structured Auto-Questions)
    if (action === "panic_button") {
      const panicType = body.panic_type || "general";
      const reason = body.reason || "Kondisi Darurat di Jalan";
      const hasCargo =
        body.has_cargo !== undefined ? Boolean(body.has_cargo) : true;
      const cargoText = hasCargo
        ? "⚠️ ADA MUATAN DI ATAS TRUK"
        : "Kosong (Truk Tanpa Muatan)";

      const typeLabel =
        panicType === "swap_fleet"
          ? "MINTA GANTI ARMADA"
          : panicType === "swap_driver"
            ? "MINTA GANTI SUPIR"
            : "SINYAL DARURAT SOS";

      const statusUpdateText = `🚨 ${typeLabel}: ${reason} (${cargoText})`;
      const notesText = `[Auto-Question SOS] Kategori: ${typeLabel}. Alasan: "${reason}". Status Muatan: ${cargoText}. Kontak Driver: ${jo.driver_phone || "-"}`;

      if (lat && lng) {
        await supabase.from("job_tracking").insert({
          job_order_id: jo.id,
          status_update: statusUpdateText,
          latitude: lat,
          longitude: lng,
          notes: notesText,
        });

        await supabase.from("tracking_updates").insert({
          job_order_id: jo.id,
          latitude: lat,
          longitude: lng,
          status_update: statusUpdateText,
          whatsapp_sent: false,
        });
      }

      await supabase.from("notifications").insert({
        role: "tenant_admin",
        tenant_id: jo.tenant_id || null,
        type: "emergency_sos",
        title: `🚨 ${typeLabel}: JO #${jo.jo_number}`,
        message: `Driver mengajukan ${typeLabel}. Alasan: "${reason}". Status Muatan: ${cargoText}. Segera putuskan tindakan di Head Ops HQ!`,
        link: `/sbu/trucking/work-orders/${jo.id}`,
      });

      return NextResponse.json({
        success: true,
        emergency_triggered: true,
        panic_type: panicType,
      });
    }

    // Handle photo upload via base64
    let uploadedPublicUrl = pod_photo_url;
    if (pod_photo_base64 && route_id) {
      try {
        const base64Data = pod_photo_base64.split(",")[1];
        const buffer = Buffer.from(base64Data, "base64");
        const fileExt = pod_photo_name?.split(".").pop() || "jpg";
        const fileName = `${jo.id}/${route_id}-timeline-${Date.now()}.${fileExt}`;
        const filePath = `tracking/${fileName}`;

        // Try pod_documents bucket first, fallback to driver-portal
        let uploadBucket = "pod_documents";
        let { error: uploadError } = await supabase.storage
          .from(uploadBucket)
          .upload(filePath, buffer, {
            contentType: `image/${fileExt === "png" ? "png" : "jpeg"}`,
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          console.warn(
            "[API] pod_documents bucket unavailable, trying driver-portal:",
            uploadError.message,
          );
          uploadBucket = "driver-portal";
          const fallback = await supabase.storage
            .from(uploadBucket)
            .upload(filePath, buffer, {
              contentType: `image/${fileExt === "png" ? "png" : "jpeg"}`,
              cacheControl: "3600",
              upsert: false,
            });
          if (fallback.error) throw fallback.error;
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from(uploadBucket).getPublicUrl(filePath);

        uploadedPublicUrl = publicUrl;

        // Insert into documents table for audit (silent fail if table doesn't exist)
        try {
          await supabase.from("documents").insert({
            job_order_id: jo.id,
            doc_type: "MILESTONE_PHOTO",
            file_url: publicUrl,
            document_name: `Timeline Photo for Route ${route_id}`,
            uploaded_by: (jo as any).driver_id || null,
          });
        } catch (docErr) {
          console.warn("[API] Documents table insert skipped:", docErr);
        }
      } catch (uploadErr: any) {
        console.error("[API] Photo upload failed:", uploadErr);
        return NextResponse.json(
          { error: "Gagal upload foto: " + uploadErr.message },
          { status: 500 },
        );
      }
    }

    // NEW: Action for live timeline updates per route (with Smart Geotagged Auto-Matching)
    if (action === "add_timeline_event") {
      try {
        let matchedRouteId = route_id;
        let locationName = "Lokasi";

        if (matchedRouteId) {
          const { data: routeInfo } = await supabase
            .from("job_routes")
            .select("location_name")
            .eq("id", matchedRouteId)
            .maybeSingle();
          locationName = routeInfo?.location_name || "Lokasi";
        } else if (lat && lng) {
          // [AI] Auto-match closest route using Haversine if route_id not explicitly selected
          const { data: allRoutes } = await supabase
            .from("job_routes")
            .select("id, location_name, latitude, longitude")
            .eq("job_order_id", jo.id);
          if (allRoutes && allRoutes.length > 0) {
            let minDist = Infinity;
            let closestRoute: any = null;
            for (const r of allRoutes) {
              if (r.latitude && r.longitude) {
                const d = calculateHaversineDistance(
                  Number(lat),
                  Number(lng),
                  Number(r.latitude),
                  Number(r.longitude),
                );
                if (d < minDist) {
                  minDist = d;
                  closestRoute = r;
                }
              }
            }
            if (closestRoute && minDist <= 5000) {
              // within 5km threshold
              matchedRouteId = closestRoute.id;
              locationName = closestRoute.location_name || "Lokasi Terdekat";
            }
          }
        }

        // Try with full columns first, fallback to basic columns if columns missing
        let insertError: any = null;
        const fullPayload: any = {
          job_order_id: jo.id,
          job_route_id: matchedRouteId || null,
          status_update: `Laporan di ${locationName}`,
          latitude: lat,
          longitude: lng,
          photo_url: uploadedPublicUrl || null,
          notes: route_notes || "Mengirim laporan / foto",
        };

        const { error: fullErr } = await supabase
          .from("job_tracking")
          .insert(fullPayload);
        if (fullErr) {
          console.warn(
            "[API] Full job_tracking insert failed, trying basic columns:",
            fullErr.message,
          );
          const basicPayload: any = {
            job_order_id: jo.id,
            status_update: `Laporan di ${locationName}`,
            latitude: lat,
            longitude: lng,
            notes: route_notes || "Mengirim laporan / foto",
          };
          const { error: basicErr } = await supabase
            .from("job_tracking")
            .insert(basicPayload);
          insertError = basicErr;
        }

        if (insertError) {
          throw new Error(insertError.message || "Database insert failed");
        }

        return NextResponse.json({
          success: true,
          publicUrl: uploadedPublicUrl,
          matched_route_id: matchedRouteId,
        });
      } catch (e: any) {
        console.error("[API] Timeline tracking log failed:", e);
        return NextResponse.json(
          { error: "Gagal menyimpan laporan: " + e.message },
          { status: 500 },
        );
      }
    }

    // LEGACY Photo upload direct handling (returns early)
    if (pod_photo_base64 && route_id && !action) {
      // Update route with photo URL (silent fail if column doesn't exist)
      try {
        await supabase
          .from("job_routes")
          .update({ pod_photo_url: uploadedPublicUrl })
          .eq("id", route_id);
      } catch (e) {
        console.warn(
          "[API] job_routes.pod_photo_url update skipped (column may not exist)",
        );
      }
      return NextResponse.json({ success: true, publicUrl: uploadedPublicUrl });
    }

    // 2. UPDATE RUTE PER STOP
    if (route_id && (route_status || pod_photo_url)) {
      // VALIDASI: Cek urutan stop
      let { data: allRoutes } = await supabase
        .from("job_routes")
        .select("id, sequence, status, stop_type, location_name")
        .eq("job_order_id", jo.id)
        .order("sequence", { ascending: true });

      const currentRoute = allRoutes?.find((r: any) => r.id === route_id);
      const currentIndex =
        allRoutes?.findIndex((r: any) => r.id === route_id) ?? -1;

      // Validasi: Tidak boleh skip stop
      if (currentIndex > 0) {
        const prevRoute = allRoutes?.[currentIndex - 1];
        if (prevRoute?.status !== "completed") {
          return NextResponse.json(
            {
              error: `Anda harus menyelesaikan stop sebelumnya (${prevRoute?.stop_type === "PICKUP" ? "Muat" : "Bongkar"} di ${prevRoute?.location_name}) terlebih dahulu sebelum melanjutkan.`,
            },
            { status: 400 },
          );
        }
      }

      const routeUpdate: any = {};
      if (route_status) routeUpdate.status = route_status;
      // pod_photo_url removed from routeUpdate - photo URL stored separately via photo upload path
      if (route_notes !== undefined) routeUpdate.notes = route_notes;

      if (lat && lng) {
        routeUpdate.latitude = lat;
        routeUpdate.longitude = lng;
      }

      if (route_status === "arrived")
        routeUpdate.actual_arrival = new Date().toISOString();
      if (route_status === "completed")
        routeUpdate.actual_departure = new Date().toISOString();

      const { error: routeError } = await supabase
        .from("job_routes")
        .update(routeUpdate)
        .eq("id", route_id);

      if (routeError) throw routeError;

      // [AI] Re-fetch allRoutes to get the latest updated status and prevent stale granularStatus calculations
      const { data: updatedRoutes } = await supabase
        .from("job_routes")
        .select("id, sequence, status, stop_type, location_name")
        .eq("job_order_id", jo.id)
        .order("sequence", { ascending: true });
      if (updatedRoutes) allRoutes = updatedRoutes;

      // AUTO-UPDATE loaded_at / unloaded_at on JO and granular status
      let granularStatus = "IN PROGRESS";
      // allRoutes already fetched above for validation

      // Self-healing in PATCH if routes are missing (prevents premature completion)
      if (
        (!allRoutes || allRoutes.length === 0) &&
        (jo as any).wo_item?.item_data?.stops
      ) {
        const stops = (jo as any).wo_item.item_data.stops;
        const routePayloads = stops.map((stop: any, idx: number) => ({
          job_order_id: jo.id,
          sequence: idx + 1,
          stop_type: stop.stop_type || (idx === 0 ? "PICKUP" : "DROPOFF"),
          source_type: stop.source_type || "MD_LOCATION",
          source_id: String(stop.source_id || "LEGACY"),
          location_name: stop.location_name || "-",
          address: stop.address || "-",
          latitude: stop.latitude != null ? Number(stop.latitude) : null,
          longitude: stop.longitude != null ? Number(stop.longitude) : null,
          contact_name: stop.contact_name || "-",
          contact_phone: stop.contact_phone || "-",
          status: "pending",
        }));

        const { data: newRoutes } = await supabase
          .from("job_routes")
          .insert(routePayloads)
          .select("*")
          .order("sequence", { ascending: true });
        if (newRoutes) allRoutes = newRoutes;
      }

      const activeStop = allRoutes?.find((r: any) => r.status === "arrived");
      const nextStop = allRoutes?.find((r: any) => r.status === "pending");

      if (activeStop) {
        granularStatus =
          `TIBA DI ${activeStop.location_name?.toUpperCase()}`.substring(0, 30);
      } else if (nextStop) {
        granularStatus =
          `MENUJU ${nextStop.location_name?.toUpperCase()}`.substring(0, 30);
      } else {
        granularStatus = "MENUNGGU SELESAI";
      }

      await supabase
        .from("job_orders")
        .update({ status: granularStatus })
        .eq("id", jo.id);
      if (jo.wo_item_id) {
        await supabase
          .from("wo_items")
          .update({ status: granularStatus })
          .eq("id", jo.wo_item_id);
      }

      if (route_status === "completed") {
        const routeInfo = allRoutes?.find((r: any) => r.id === route_id);
        if (routeInfo?.stop_type === "PICKUP") {
          await supabase
            .from("job_orders")
            .update({ updated_at: new Date().toISOString() })
            .eq("id", jo.id);
        } else if (routeInfo?.stop_type === "DROPOFF") {
          await supabase
            .from("job_orders")
            .update({ updated_at: new Date().toISOString() })
            .eq("id", jo.id);
        }
      }

      // Log ke job_tracking
      try {
        await supabase.from("job_tracking").insert({
          job_order_id: jo.id,
          status_update: granularStatus,
          latitude: lat,
          longitude: lng,
          notes: `Route ID: ${route_id}${pod_photo_url ? " (Photo Attached)" : ""}${route_notes ? " | Catatan: " + route_notes : ""}`,
        });
      } catch (e) {
        console.warn("[API] Tracking log failed:", e);
      }

      return NextResponse.json({ success: true });
    }

    // 3. UPDATE STATUS GLOBAL JO
    if (status) {
      const newStatus = status;
      let dbStatus = newStatus;
      let smartStatusLog = newStatus.toUpperCase();

      if (newStatus === "accepted" || newStatus === "rejected") {
        // [AI] Use Atomic RPC for Race-Condition safe confirmation
        const { data: rpcRes, error: rpcErr } = await supabase.rpc(
          "vendor_job_confirmation",
          {
            p_jo_id: jo.id,
            p_is_accepted: newStatus === "accepted",
            p_is_timeout: false,
            p_rejection_reason: rejection_note || null,
            p_lat: lat || null,
            p_lng: lng || null,
          },
        );

        if (rpcErr || !rpcRes?.success) {
          return NextResponse.json(
            {
              error:
                rpcErr?.message || rpcRes?.error || "Gagal konfirmasi tugas",
            },
            { status: 400 },
          );
        }

        // If accepted, update response and notify finance
        if (newStatus === "accepted") {
          await supabase
            .from("job_orders")
            .update({ driver_response: "accepted" })
            .eq("id", jo.id);
          try {
            await supabase.from("notifications").insert({
              tenant_id: jo.tenant_id,
              user_id: null,
              role: "sbu_fin_tr",
              title: "Request Driver Payout",
              message: `Driver accepted JO ${jo.jo_number}. Please process payout for IDR ${jo.driver_payment_amount || 0}`,
              metadata: { jo_id: jo.id, wo_item_id: jo.wo_item_id },
              is_read: false,
            });
          } catch (e) {
            console.warn("[API] Finance notification failed:", e);
          }
        }

        return NextResponse.json({
          success: true,
          new_status: rpcRes.new_status,
        });
      }

      if (newStatus === "completed") {
        dbStatus = "PEKERJAAN SELESAI";
        smartStatusLog = "🏁 Misi Selesai";
      } else if (newStatus === "in_progress") {
        dbStatus = "DALAM PERJALANAN";
        smartStatusLog = "📍 Memulai Perjalanan";

        // Smart Intelligence: detect the first stop location
        const { data: firstRoute } = await supabase
          .from("job_routes")
          .select("location_name")
          .eq("job_order_id", jo.id)
          .eq("sequence", 1)
          .maybeSingle();

        if (firstRoute && firstRoute.location_name) {
          dbStatus =
            `MENUJU ${firstRoute.location_name.toUpperCase()}`.substring(0, 30);
          smartStatusLog = `📍 Berangkat Menuju: ${firstRoute.location_name}`;
        }
      }

      const updateData: any = {
        status: dbStatus,
        updated_at: new Date().toISOString(),
      };

      if (newStatus === "in_progress") {
        updateData.started_at = new Date().toISOString();
      }
      if (newStatus === "completed")
        updateData.completed_at = new Date().toISOString();

      const { error: joUpdateError } = await supabase
        .from("job_orders")
        .update(updateData)
        .eq("id", jo.id);

      if (joUpdateError) throw joUpdateError;

      // Update WO_ITEM status too
      if (jo.wo_item_id) {
        const itemStatus =
          newStatus === "accepted"
            ? "ORDER DITERIMA"
            : newStatus === "rejected"
              ? "ORDER DITOLAK"
              : newStatus === "in_progress"
                ? "DALAM PERJALANAN"
                : newStatus === "completed"
                  ? "PEKERJAAN SELESAI"
                  : newStatus.toUpperCase();

        await supabase
          .from("wo_items")
          .update({ status: itemStatus })
          .eq("id", jo.wo_item_id);
      }

      // AUTO-JOURNALING ON COMPLETION
      if (newStatus === "completed" && jo.base_price > 0) {
        try {
          await createJournalEntry({
            jobOrderId: jo.id,
            amount: jo.base_price,
            description: `Main Revenue for JO ${jo.jo_number}`,
            sourceType: "job_order_revenue",
            metadata: {
              driver_share_percentage: jo.driver_share_percentage,
            },
          });
        } catch (e) {
          console.error("[API] Auto-journaling revenue failed:", e);
        }
      }

      // AUTO-JOURNALING VENDOR COST ON COMPLETION
      if (newStatus === "completed" && Number(jo.purchase_price) > 0) {
        try {
          await createJournalEntry({
            jobOrderId: jo.id,
            amount: Number(jo.purchase_price),
            description: `Vendor Cost for JO ${jo.jo_number}`,
            sourceType: "vendor_cost",
          });
        } catch (e) {
          console.error("[API] Auto-journaling vendor cost failed:", e);
        }
      }

      // [AI] Fleet & Driver stats update on completion (admin client, not browser)
      if (newStatus === "completed") {
        // Mark fleet as available
        if (jo.fleet_id) {
          try {
            await supabase
              .from("md_fleets")
              .update({ status: "available" })
              .eq("id", jo.fleet_id);
          } catch (e) {
            console.error("[API] Fleet status update failed:", e);
          }
        }
        // Increment driver stats
        if (jo.driver_id) {
          try {
            const { data: driverData } = await supabase
              .from("md_drivers")
              .select("total_jobs_completed, total_km_driven")
              .eq("id", jo.driver_id)
              .single();
            const estimatedKM = 50;
            await supabase
              .from("md_drivers")
              .update({
                total_jobs_completed:
                  (driverData?.total_jobs_completed || 0) + 1,
                total_km_driven:
                  (driverData?.total_km_driven || 0) + estimatedKM,
              })
              .eq("id", jo.driver_id);
            await supabase.from("driver_performance_logs").insert({
              driver_id: jo.driver_id,
              job_order_id: jo.id,
              type: "KM_LOG",
              total_km: estimatedKM,
              review_notes: "Tugas diselesaikan melalui Driver Portal",
              tenant_id: jo.tenant_id,
            });
          } catch (e) {
            console.error("[API] Driver stats update failed:", e);
          }
        }
      }

      // SINKRONISASI STATUS BERTAHAP
      if (jo.wo_item_id) {
        try {
          // Cek apakah SEMUA JO untuk WO_ITEM ini sudah selesai?
          const { data: siblingJos } = await supabase
            .from("job_orders")
            .select("id, status")
            .eq("wo_item_id", jo.wo_item_id);

          const isFinished = (s: string) =>
            [
              "completed",
              "PEKERJAAN SELESAI",
              "done",
              "ready_for_billing",
            ].includes(s);

          const allJosDone = siblingJos?.every((j) => isFinished(j.status));

          if (allJosDone) {
            // Jika semua truk di item ini selesai, update status WO_ITEM
            await supabase
              .from("wo_items")
              .update({ status: "completed" })
              .eq("id", jo.wo_item_id);

            // Cek apakah SEMUA ITEM di WO ini sudah selesai?
            const { data: currentItem } = await supabase
              .from("wo_items")
              .select("wo_id")
              .eq("id", jo.wo_item_id)
              .maybeSingle();

            if (currentItem?.wo_id) {
              const { data: allWoItems } = await supabase
                .from("wo_items")
                .select("id, status")
                .eq("wo_id", currentItem.wo_id);

              const allItemsDone = allWoItems?.every((i) =>
                isFinished(i.status),
              );

              if (allItemsDone) {
                await supabase
                  .from("work_orders")
                  .update({
                    status: "completed",
                    completed_at: new Date().toISOString(),
                  })
                  .eq("id", currentItem.wo_id);
              }
            }
          } else {
            // Jika belum semua selesai, WO_ITEM tetap sesuai status yg sudah di-set di atas
            // (skip — first sync already set the proper display status like "DALAM PERJALANAN")
          }
        } catch (e) {
          console.warn("Sync Hierarchy failed:", e);
        }
      }

      // Log ke job_tracking (optional)
      try {
        await supabase.from("job_tracking").insert({
          job_order_id: jo.id,
          status_update: smartStatusLog,
          latitude: lat,
          longitude: lng,
          notes: "Update status global dari Driver Portal",
        });
      } catch (e) {
        console.warn("[API] Tracking log failed:", e);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[API] PATCH error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
