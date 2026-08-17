import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { TrackingService } from "@/src/application/tracking/services/TrackingService";
import { SupabaseTrackingRepository } from "@/src/infrastructure/repositories/tracking/SupabaseTrackingRepository";
import { DriverPortalQuery } from "@/src/infrastructure/repositories/trucking/DriverPortalQuery";
import { DriverPortalCommandRepository } from "@/src/infrastructure/repositories/trucking/DriverPortalCommandRepository";
import { JoAutoCompleteService } from "@/src/application/trucking/services/JoAutoCompleteService";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Fake permission engine and request context for interim
const mockPermissionEngine = {
  can: () => true,
};
const mockCtx = {
  tenantId: "SYSTEM",
  userId: "SYSTEM",
  role: "system",
  trace: { traceId: "jo", spanId: "jo" },
};

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

// Upload a base64 image to storage (pod_documents first, fallback driver-portal)
async function uploadPhotoToStorage(
  supabase: any,
  joId: string,
  routeId: string,
  base64: string,
  name?: string,
): Promise<string> {
  const base64Data = base64.split(",")[1] || base64;
  const buffer = Buffer.from(base64Data, "base64");
  const fileExt = (name?.split(".").pop() || "jpg").toLowerCase();
  const safeExt = ["jpg", "jpeg", "png", "webp"].includes(fileExt)
    ? fileExt
    : "jpg";
  const fileName = `${joId}/${routeId}-photo-${Date.now()}.${safeExt}`;
  const filePath = `location-photos/${fileName}`;

  let uploadBucket = "pod_documents";
  const { error: uploadError } = await supabase.storage
    .from(uploadBucket)
    .upload(filePath, buffer, {
      contentType: `image/${safeExt === "jpg" ? "jpeg" : safeExt}`,
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
        contentType: `image/${safeExt === "jpg" ? "jpeg" : safeExt}`,
        cacheControl: "3600",
        upsert: false,
      });
    if (fallback.error) throw fallback.error;
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(uploadBucket).getPublicUrl(filePath);

  return publicUrl;
}

// Insert one location photo into documents table (1-to-many per route)
async function insertLocationPhoto(
  supabase: any,
  jo: any,
  routeId: string,
  publicUrl: string,
  name?: string,
) {
  await supabase.from("documents").insert({
    job_order_id: jo.id,
    job_route_id: routeId,
    doc_type: "LOCATION_PHOTO",
    file_url: publicUrl,
    document_name: name || "Foto Lokasi",
    uploaded_by: jo.driver_id || null,
  });
}

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

    const queryService = new DriverPortalQuery(supabase);
    const jobOrderData = await queryService.getJobOrderData(token);

    if (!jobOrderData) {
      return NextResponse.json(
        { error: "Job Order tidak ditemukan" },
        { status: 404 },
      );
    }

    // Lazy auto-complete: if this JO is waiting for completion and the driver
    // (or anyone) is fetching it, finish it without waiting for the cron window.
    if (jobOrderData.status === "MENUNGGU SELESAI") {
      const autoComplete = new JoAutoCompleteService(supabase);
      await autoComplete.maybeAutoComplete(jobOrderData.id);
    }

    const refreshed = await queryService.getJobOrderData(token);

    return NextResponse.json({
      success: true,
      data: refreshed,
    });
  } catch (err: any) {
    console.error("[API] GET error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

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
      lat,
      lng,
      recorded_at,
      container_number,
      seal_number,
      rejection_note,
      route_id,
      route_status,
      route_notes,
      pod_photo_base64,
      pod_photo_name,
      speed,
      source,
    } = body;

    const supabase = createAdminClient();
    const queryService = new DriverPortalQuery(supabase);
    const commandRepo = new DriverPortalCommandRepository(supabase);

    const trackingRepo = new SupabaseTrackingRepository(supabase);
    const trackingService = new TrackingService(
      mockPermissionEngine as any,
      trackingRepo,
    );

    // Identify JO
    const jo = await queryService.getJobOrderData(token);
    if (!jo)
      return NextResponse.json({ error: "JO not found" }, { status: 404 });

    // ─────────────────────────────────────────────────────────────────────
    // [PHASE 2] STRICT SERVER-SIDE DRIVER SESSION AUTHORIZATION
    // ─────────────────────────────────────────────────────────────────────
    const driverIdHeader = request.headers.get("x-driver-id");
    
    // BACKWARDS COMPATIBILITY: If action is missing but route_id and route_status exist, infer route_status
    let effectiveAction = action;
    if (!effectiveAction && route_id && route_status) {
      effectiveAction = "route_status";
    }
    
    const isBackgroundAction = effectiveAction === "gps_ping" || effectiveAction === "gps_ping_batch" || effectiveAction === "native_heartbeat";
    
    // Photo uploads don't have an action field in the legacy contract, so they are not background actions.
    if (!isBackgroundAction) {
       if (!driverIdHeader) {
           return NextResponse.json({ error: "Sesi driver tidak valid (Missing X-Driver-ID)" }, { status: 401 });
       }
       if (jo.driver_id !== driverIdHeader) {
           return NextResponse.json({ error: "Akses ditolak: Anda tidak berhak memodifikasi JO ini" }, { status: 403 });
       }
    }

    // ─────────────────────────────────────────────────────────────────────
    // PHOTO UPLOAD — multiple photos per location (no action required)
    // Frontend sends { route_id, pod_photo_base64, pod_photo_name, lat, lng }
    // ─────────────────────────────────────────────────────────────────────
    if (pod_photo_base64 && route_id && !action) {
      try {
        const publicUrl = await uploadPhotoToStorage(
          supabase,
          jo.id,
          route_id,
          pod_photo_base64,
          pod_photo_name,
        );
        await insertLocationPhoto(
          supabase,
          jo,
          route_id,
          publicUrl,
          pod_photo_name,
        );

        // Legacy backfill: keep the latest photo on job_routes for old readers
        try {
          await supabase
            .from("job_routes")
            .update({ pod_photo_url: publicUrl })
            .eq("id", route_id);
        } catch (e) {
          console.warn("[API] job_routes.pod_photo_url backfill skipped:", e);
        }

        // Tracking log entry
        try {
          const { data: routeInfo } = await supabase
            .from("job_routes")
            .select("location_name")
            .eq("id", route_id)
            .maybeSingle();
          await supabase.from("job_tracking").insert({
            job_order_id: jo.id,
            job_route_id: route_id,
            status_update: `📷 Foto lokasi ditambahkan (${routeInfo?.location_name || "Lokasi"})`,
            latitude: lat || null,
            longitude: lng || null,
            photo_url: publicUrl,
            notes: "Foto lokasi diunggah dari Driver",
            ...(recorded_at ? { recorded_at } : {}),
          });
        } catch (e) {
          console.warn("[API] Tracking log for photo skipped:", e);
        }

        return NextResponse.json({ success: true, publicUrl });
      } catch (uploadErr: any) {
        console.error("[API] Photo upload failed:", uploadErr);
        return NextResponse.json(
          { error: "Gagal upload foto: " + uploadErr.message },
          { status: 500 },
        );
      }
    }

    // ─────────────────────────────────────────────────────────────────────
    // ACTIONS
    // ─────────────────────────────────────────────────────────────────────
    switch (effectiveAction) {
      case "update_container":
        await commandRepo.updateContainer(
          jo.id,
          container_number,
          seal_number,
          jo.sbu_metadata,
        );
        return NextResponse.json({ success: true });

      case "accept":
        await commandRepo.acceptJob(jo.id);
        return NextResponse.json({ success: true });

      case "reject":
        await commandRepo.rejectJob(jo.id, rejection_note || "Ditolak driver");
        return NextResponse.json({ success: true });

      case "route_status":
        if (!route_id || !route_status)
          return NextResponse.json(
            { error: "Missing route info" },
            { status: 400 },
          );
        await commandRepo.updateRouteStatus(
          route_id,
          route_status,
          route_notes,
          body.pod_photo_url,
        );

        // [AI] Fix: If the job was still ASSIGNED but the driver arrived at a route, auto-start the job globally.
        if (jo.status === "ASSIGNED") {
          await supabase
            .from("job_orders")
            .update({
              status: "ON JOURNEY",
              started_at: new Date().toISOString(),
              departure_detected_at: new Date().toISOString(), // Use as early timelog
              updated_at: new Date().toISOString(),
            })
            .eq("id", jo.id);
        }

        return NextResponse.json({ success: true });

      // ─────────────────────────────────────────────────────────────────
      // NATIVE HEARTBEAT — deterministic native app identification
      // ─────────────────────────────────────────────────────────────────
      case "native_heartbeat":
        if (jo.driver_id) {
          await supabase
            .from("md_drivers")
            .update({
              has_native_app: true,
              last_app_open_at: new Date().toISOString(),
            })
            .eq("id", jo.driver_id);
          return NextResponse.json({ success: true, message: "Native heartbeat recorded" });
        }
        return NextResponse.json({ error: "No driver attached" }, { status: 400 });

      // ─────────────────────────────────────────────────────────────────
      // GPS PING — record into job_tracking (source of truth for peta utama)
      // + geofence arrival/departure/re-entry detection
      // ─────────────────────────────────────────────────────────────────
      case "gps_ping": {
        console.log(`[API] GPS_REQUEST_RECEIVED driver_id=${jo.driver_id} job_order_id=${jo.id} tenant_id=${jo.tenant_id} recorded_at=${recorded_at} has_lat=${!!lat} has_lng=${!!lng}`);
        if (!lat || !lng) {
          console.warn(`[API] GPS_REQUEST_REJECTED reason=Missing lat/lng`);
          return NextResponse.json(
            { error: "Missing lat/lng" },
            { status: 400 },
          );
        }

        const nLat = Number(lat);
        const nLng = Number(lng);

        // Also persist to tracking_points via the tracking domain (kept for compat)
        const result = await trackingService.recordPing(
          mockCtx,
          "JOB_ORDER",
          jo.id,
          nLat,
          nLng,
          recorded_at ? new Date(recorded_at) : new Date(),
          body.accuracy,
        );
        if (result.isFailure) {
          console.warn(
            "[Tracking] tracking_points ping failed (non-fatal):",
            result.error,
          );
        }

        // 1. Server-side debounce: skip insert if same coords within 60s
        const { data: lastPing } = await supabase
          .from("job_tracking")
          .select("latitude, longitude, created_at")
          .eq("job_order_id", jo.id)
          .eq("status_update", "GPS_PING")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (lastPing && lastPing.latitude && lastPing.longitude) {
          const distM = calculateHaversineDistance(
            nLat,
            nLng,
            Number(lastPing.latitude),
            Number(lastPing.longitude),
          );
          const timeSinceMs =
            Date.now() - new Date(lastPing.created_at).getTime();
          if (distM < 50 && timeSinceMs < 60_000) {
            return NextResponse.json({
              success: true,
              skipped: true,
              reason: "duplicate_coords",
              geofence_triggered: false,
              jo_status: jo.status,
            });
          }
        }

        // 2. Insert GPS ping into job_tracking (peta utama reads this)
        const pingPayload: any = {
          job_order_id: jo.id,
          status_update: "GPS_PING",
          latitude: nLat,
          longitude: nLng,
          source: source || "pwa",
          notes: "Auto GPS ping dari driver",
        };
        if (recorded_at) pingPayload.recorded_at = recorded_at;
        if (body.accuracy !== undefined) pingPayload.accuracy = body.accuracy;
        if (body.speed !== undefined) pingPayload.speed = body.speed;
        if (body.battery !== undefined) pingPayload.battery_level = body.battery;
        const { error: pingErr } = await supabase
          .from("job_tracking")
          .insert(pingPayload);
        if (pingErr) {
          console.error(`[API] GPS_REQUEST_REJECTED reason=DB Insert Error (${pingErr.message})`);
          return NextResponse.json({ error: pingErr.message }, { status: 500 });
        }
        console.log(`[API] GPS_RECORD_INSERTED job_order_id=${jo.id} source=${pingPayload.source}`);

        // 2b. Upsert fleet_gps_status so Fleet Performance shows phone GPS
        // [FIX] Skip for EasyGo-synced fleets — the hardware feed (provider='easygo',
        // engine_on/fuel_level/odometer) is authoritative. Phone still writes
        // job_tracking + tracking_points for JO-level tracking.
        const isEasyGoFleet = !!(jo.fleet?.easygo_vehicle_id);
        if (jo.fleet_id && jo.tenant_id && !isEasyGoFleet) {
          const nSpeed = Number(speed) || 0;
          const gpsSource = source || "pwa";
          try {
            await supabase.from("fleet_gps_status").upsert(
              {
                fleet_id: jo.fleet_id,
                tenant_id: jo.tenant_id,
                latitude: nLat,
                longitude: nLng,
                speed: nSpeed,
                gps_time: recorded_at || new Date().toISOString(),
                status_vehicle: nSpeed > 5 ? 2 : nSpeed > 0 ? 1 : 0,
                engine_on: true,
                provider: gpsSource,
                updated_at: new Date().toISOString(),
              },
              { onConflict: "fleet_id" },
            );
          } catch (e) {
            console.warn("[API] fleet_gps_status upsert skipped:", e);
          }
        }

        // 3. Device health update if provided by native app
        if (
          body.internet_connected !== undefined ||
          body.background_running !== undefined ||
          body.battery !== undefined
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
        }

        // 4. Geofence check (<= 2000m from nearest pending stop)
        // Supports out-of-sequence: driver can arrive at any stop, skipped stops auto-completed
        const GEOFENCE_RADIUS_M = 2000;
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

          // 4a. Arrivals — find NEAREST pending stop within radius (supports out-of-sequence)
          let nearestPending: any = null;
          let nearestDist = Infinity;

          for (const route of pendingRoutes) {
            if (route.latitude && route.longitude) {
              const distM = calculateHaversineDistance(
                nLat,
                nLng,
                Number(route.latitude),
                Number(route.longitude),
              );

              // Skip if recently triggered (5 min cooldown)
              if (route.geofence_triggered_at) {
                const lastTrigger = new Date(
                  route.geofence_triggered_at,
                ).getTime();
                if (Date.now() - lastTrigger < 5 * 60 * 1000) {
                  continue;
                }
              }

              if (distM <= GEOFENCE_RADIUS_M && distM < nearestDist) {
                nearestDist = distM;
                nearestPending = route;
              }
            }
          }

          if (nearestPending) {
            geofenceTriggered = true;
            arrivedStopName =
              nearestPending.location_name || `Stop #${nearestPending.sequence}`;
            geofenceDistanceM = Math.round(nearestDist);

            // Mark this stop as arrived
            await supabase
              .from("job_routes")
              .update({
                status: "arrived",
                actual_arrival: new Date().toISOString(),
                geofence_triggered_at: new Date().toISOString(),
              })
              .eq("id", nearestPending.id);

            // Auto-complete ALL prior stops (skipped stops get marked completed)
            const priorStops = activeRoutes.filter(
              (r: any) =>
                r.sequence < nearestPending.sequence && r.status !== "completed",
            );
            for (const prior of priorStops) {
              const update: any = {
                status: "completed",
                actual_departure: new Date().toISOString(),
              };
              if (!prior.actual_arrival) {
                update.actual_arrival = new Date().toISOString();
                update.notes = "Auto-completed (driver arrived at later stop)";
              }
              await supabase
                .from("job_routes")
                .update(update)
                .eq("id", prior.id);

              // Log skipped stop
              await supabase.from("job_tracking").insert({
                job_order_id: jo.id,
                job_route_id: prior.id,
                status_update: `⏭️ Stop dilewati: ${prior.location_name || `Stop #${prior.sequence}`}`,
                latitude: nLat,
                longitude: nLng,
                notes: `Otomatis dilompati karena driver tiba di ${arrivedStopName} terlebih dahulu.`,
                ...(recorded_at ? { recorded_at } : {}),
              });
            }

                let newJoStatus: string | null = null;
                if (nearestPending.sequence === 1 || nearestPending.stop_type === "PICKUP") {
                  newJoStatus = "TIBA DI LOKASI MUAT";
                } else if (
                  nearestPending.stop_type === "DROPOFF" ||
                  nearestPending.sequence === activeRoutes.length
                ) {
                  newJoStatus = "TIBA DI LOKASI BONGKAR";
                } else {
                  newJoStatus = "TIBA DI LOKASI TRANSIT";
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
                  job_route_id: nearestPending.id,
                  status_update: `📍 Tiba di ${arrivedStopName} (Geofence Auto)`,
                  latitude: nLat,
                  longitude: nLng,
                  notes: `Otomatis terdeteksi dalam radius ${geofenceDistanceM}m dari titik rute.`,
                  ...(recorded_at ? { recorded_at } : {}),
                });

                await supabase.from("notifications").insert({
                  role: "tenant_admin",
                  tenant_id: jo.tenant_id || null,
                  type: "geofence_arrival",
                  title: `📍 Armada Tiba di ${arrivedStopName}`,
                  message: `Truk untuk JO ${jo.jo_number} otomatis terdeteksi tiba di ${arrivedStopName} (Radius ${geofenceDistanceM}m via Geofence).`,
                  link: `/sbu/trucking/work-orders/${jo.id}`,
                });
          }

          // 4b. Departures (arrived -> completed)
          for (const route of arrivedRoutes) {
            if (route.latitude && route.longitude) {
              const distM = calculateHaversineDistance(
                nLat,
                nLng,
                Number(route.latitude),
                Number(route.longitude),
              );

              if (route.actual_arrival) {
                const arrivalTime = new Date(route.actual_arrival).getTime();
                if (Date.now() - arrivalTime < 30_000) continue;
              }

              if (distM > 500) {
                departedStopName =
                  route.location_name || `Stop #${route.sequence}`;

                await supabase
                  .from("job_routes")
                  .update({
                    status: "completed",
                    actual_departure: new Date().toISOString(),
                  })
                  .eq("id", route.id);

                let departJoStatus: string | null = null;
                const updateJoPayload: any = {
                  updated_at: new Date().toISOString(),
                };

                if (route.sequence === 1 || route.stop_type === "PICKUP") {
                  departJoStatus = "BERANGKAT DARI LOKASI MUAT";
                  updateJoPayload.loaded_at = new Date().toISOString();
                } else if (
                  route.stop_type === "DROPOFF" ||
                  route.sequence === activeRoutes.length
                ) {
                  departJoStatus = "MENUNGGU SELESAI";
                  updateJoPayload.unloaded_at = new Date().toISOString();
                  updateJoPayload.departure_detected_at =
                    new Date().toISOString();
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
                  latitude: nLat,
                  longitude: nLng,
                  notes: `Otomatis terdeteksi keluar dari radius ${Math.round(distM)}m dari titik rute.`,
                  ...(recorded_at ? { recorded_at } : {}),
                });

                await supabase.from("notifications").insert({
                  role: "tenant_admin",
                  tenant_id: jo.tenant_id || null,
                  type: "geofence_departure",
                  title: `🚦 Armada Keluar dari ${departedStopName}`,
                  message: `Truk untuk JO ${jo.jo_number} terdeteksi keluar dari ${departedStopName} (Radius ${Math.round(distM)}m via Geofence).`,
                  link: `/sbu/trucking/work-orders/${jo.id}`,
                });
              }
            }
          }

          // 4c. Re-entry detection (completed -> arrived) for final stop when MENUNGGU SELESAI
          if (jo.status === "MENUNGGU SELESAI") {
            for (const route of completedRoutes) {
              if (
                route.stop_type === "DROPOFF" ||
                route.sequence === activeRoutes.length
              ) {
                if (route.latitude && route.longitude) {
                  const distM = calculateHaversineDistance(
                    nLat,
                    nLng,
                    Number(route.latitude),
                    Number(route.longitude),
                  );
                  if (distM <= 300) {
                    if (route.geofence_triggered_at) {
                      const lastTrigger = new Date(
                        route.geofence_triggered_at,
                      ).getTime();
                      if (Date.now() - lastTrigger < 5 * 60 * 1000) {
                        continue;
                      }
                    }
                    geofenceTriggered = true;
                    arrivedStopName = route.location_name || "Lokasi Bongkar";
                    await supabase
                      .from("job_routes")
                      .update({
                        status: "arrived",
                        actual_departure: null,
                        geofence_triggered_at: new Date().toISOString(),
                      })
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
                      status_update: `🔙 Kembali ke ${arrivedStopName} (Re-entry)`,
                      latitude: nLat,
                      longitude: nLng,
                      notes: `Sistem mendeteksi armada kembali masuk ke radius 300m.`,
                      ...(recorded_at ? { recorded_at } : {}),
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

      // ─────────────────────────────────────────────────────────────────
      // GPS PING BATCH — Queue-First Store and Forward Endpoint
      // ─────────────────────────────────────────────────────────────────
      case "gps_ping_batch": {
        console.info(`[GPS_SYNC_FORENSIC] server_received: PATCH /api/jo/${jo.id}`);
        const pings = body.pings || [];
        console.info(`[GPS_SYNC_FORENSIC] server_batch_count: ${pings.length}`);
        
        if (!Array.isArray(pings) || pings.length === 0) {
          return NextResponse.json({ error: "Empty batch" }, { status: 400 });
        }

        const accepted: string[] = [];
        const duplicates: string[] = [];
        const failed: any[] = [];
        let geofenceTriggered = false;
        let arrivedStopName: string | null = null;
        let geofenceDistanceM: number | null = null;
        let departedStopName: string | null = null;

        // Sort pings chronologically
        pings.sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime());

        // We fetch active routes once per batch to process geofence sequentially
        let { data: activeRoutes } = await supabase
          .from("job_routes")
          .select("*")
          .eq("job_order_id", jo.id)
          .in("status", jo.status === "MENUNGGU SELESAI" ? ["pending", "arrived", "completed"] : ["pending", "arrived"])
          .order("sequence", { ascending: true });
        
        let currentJoStatus = jo.status;
        const GEOFENCE_RADIUS_M = 2000;

        for (const ping of pings) {
          const canonicalPingId = ping.client_ping_id || ping.id;
          if (!canonicalPingId || !ping.latitude || !ping.longitude) {
            failed.push({ id: canonicalPingId, reason: "invalid_data" });
            continue;
          }

          const nLat = Number(ping.latitude);
          const nLng = Number(ping.longitude);
          const recordedAt = ping.recorded_at ? new Date(ping.recorded_at) : new Date();

          // 1. Idempotency Check & Insert
          const pingPayload: any = {
            client_ping_id: canonicalPingId,
            job_order_id: jo.id,
            status_update: "GPS_PING_BATCH",
            latitude: nLat,
            longitude: nLng,
            source: ping.source || "pwa_batch",
            notes: "Batch GPS ping",
            recorded_at: recordedAt.toISOString()
          };
          if (ping.accuracy !== undefined) pingPayload.accuracy = ping.accuracy;
          if (ping.speed !== undefined) pingPayload.speed = ping.speed;
          if (ping.battery !== undefined) pingPayload.battery_level = ping.battery;

          console.info(`[GPS_SYNC_FORENSIC] supabase_insert_start: canonical_ping_id=${canonicalPingId}, job_order_id=${jo.id}, recorded_at=${recordedAt.toISOString()}`);
          const { error: pingErr } = await supabase
            .from("job_tracking")
            .insert(pingPayload);
          
          if (pingErr) {
            if (pingErr.code === '23505' || pingErr.message.includes('unique')) {
              console.info(`[GPS_SYNC_FORENSIC] supabase_insert_error: UNIQUE (duplicate) for ${canonicalPingId}`);
              duplicates.push(canonicalPingId);
            } else {
              console.info(`[GPS_SYNC_FORENSIC] supabase_insert_error: ${pingErr.message} for ${canonicalPingId}`);
              failed.push({ id: canonicalPingId, reason: pingErr.message });
              continue; // Skip geofence for failed inserts
            }
          } else {
            console.info(`[GPS_SYNC_FORENSIC] supabase_insert_success: ${canonicalPingId}`);
            accepted.push(canonicalPingId);

            // Persist to tracking_points (ignoring errors for this supplementary table)
            await trackingService.recordPing(
              mockCtx,
              "JOB_ORDER",
              jo.id,
              nLat,
              nLng,
              recordedAt,
              ping.accuracy,
            );
          }

          // 2. Process Geofence for this point
          if (activeRoutes && activeRoutes.length > 0) {
            const pendingRoutes = activeRoutes.filter((r: any) => r.status === "pending");
            const arrivedRoutes = activeRoutes.filter((r: any) => r.status === "arrived");
            const completedRoutes = activeRoutes.filter((r: any) => r.status === "completed");

            // 2a. Arrivals
            let nearestPending: any = null;
            let nearestDist = Infinity;
            for (const route of pendingRoutes) {
              if (route.latitude && route.longitude) {
                const distM = calculateHaversineDistance(nLat, nLng, Number(route.latitude), Number(route.longitude));
                if (route.geofence_triggered_at) {
                  const lastTrigger = new Date(route.geofence_triggered_at).getTime();
                  if (recordedAt.getTime() - lastTrigger < 5 * 60 * 1000) continue;
                }
                if (distM <= GEOFENCE_RADIUS_M && distM < nearestDist) {
                  nearestDist = distM;
                  nearestPending = route;
                }
              }
            }

            if (nearestPending) {
              geofenceTriggered = true;
              arrivedStopName = nearestPending.location_name || `Stop #${nearestPending.sequence}`;
              geofenceDistanceM = Math.round(nearestDist);
              
              nearestPending.status = "arrived";
              nearestPending.actual_arrival = recordedAt.toISOString();
              nearestPending.geofence_triggered_at = recordedAt.toISOString();

              await supabase.from("job_routes").update({
                status: "arrived", actual_arrival: nearestPending.actual_arrival, geofence_triggered_at: nearestPending.geofence_triggered_at
              }).eq("id", nearestPending.id);

              // Auto-complete prior stops
              const priorStops = activeRoutes.filter((r: any) => r.sequence < nearestPending.sequence && r.status !== "completed");
              for (const prior of priorStops) {
                prior.status = "completed";
                prior.actual_departure = recordedAt.toISOString();
                if (!prior.actual_arrival) prior.actual_arrival = recordedAt.toISOString();
                
                await supabase.from("job_routes").update({
                  status: prior.status, actual_departure: prior.actual_departure, actual_arrival: prior.actual_arrival, notes: "Auto-completed"
                }).eq("id", prior.id);

                await supabase.from("job_tracking").insert({
                  job_order_id: jo.id, job_route_id: prior.id, status_update: `⏭️ Stop dilewati: ${prior.location_name || 'Stop #' + prior.sequence}`,
                  latitude: nLat, longitude: nLng, recorded_at: recordedAt.toISOString(), notes: `Otomatis dilompati karena driver tiba di ${arrivedStopName}.`
                });
              }

              let newJoStatus: string | null = null;
              if (nearestPending.sequence === 1 || nearestPending.stop_type === "PICKUP") newJoStatus = "TIBA DI LOKASI MUAT";
              else if (nearestPending.stop_type === "DROPOFF" || nearestPending.sequence === activeRoutes.length) newJoStatus = "TIBA DI LOKASI BONGKAR";
              else newJoStatus = "TIBA DI LOKASI TRANSIT";

              const updateJoPayload: any = { status: newJoStatus, updated_at: new Date().toISOString() };
              if (currentJoStatus === "ASSIGNED") {
                updateJoPayload.accepted_at = recordedAt.toISOString();
                updateJoPayload.started_at = recordedAt.toISOString();
                updateJoPayload.driver_response = "accepted";
              }
              currentJoStatus = newJoStatus;
              await supabase.from("job_orders").update(updateJoPayload).eq("id", jo.id);

              await supabase.from("job_tracking").insert({
                job_order_id: jo.id, job_route_id: nearestPending.id, status_update: `📍 Tiba di ${arrivedStopName} (Geofence Auto)`,
                latitude: nLat, longitude: nLng, recorded_at: recordedAt.toISOString(), notes: `Otomatis terdeteksi dalam radius ${geofenceDistanceM}m.`
              });
            }

            // 2b. Departures
            for (const route of arrivedRoutes) {
              if (route.latitude && route.longitude) {
                const distM = calculateHaversineDistance(nLat, nLng, Number(route.latitude), Number(route.longitude));
                if (route.actual_arrival && recordedAt.getTime() - new Date(route.actual_arrival).getTime() < 30_000) continue;

                if (distM > 500) {
                  departedStopName = route.location_name || `Stop #${route.sequence}`;
                  route.status = "completed";
                  route.actual_departure = recordedAt.toISOString();

                  await supabase.from("job_routes").update({ status: "completed", actual_departure: route.actual_departure }).eq("id", route.id);

                  let departJoStatus: string | null = null;
                  const updateJoPayload: any = { updated_at: new Date().toISOString() };
                  if (route.sequence === 1 || route.stop_type === "PICKUP") {
                    departJoStatus = "BERANGKAT DARI LOKASI MUAT"; updateJoPayload.loaded_at = recordedAt.toISOString();
                  } else if (route.stop_type === "DROPOFF" || route.sequence === activeRoutes.length) {
                    departJoStatus = "MENUNGGU SELESAI"; updateJoPayload.unloaded_at = recordedAt.toISOString(); updateJoPayload.departure_detected_at = recordedAt.toISOString();
                  } else {
                    departJoStatus = "MELANJUTKAN PERJALANAN";
                  }
                  
                  currentJoStatus = departJoStatus;
                  updateJoPayload.status = departJoStatus;
                  await supabase.from("job_orders").update(updateJoPayload).eq("id", jo.id);

                  await supabase.from("job_tracking").insert({
                    job_order_id: jo.id, job_route_id: route.id, status_update: `🚦 Keluar dari ${departedStopName} (Geofence Auto)`,
                    latitude: nLat, longitude: nLng, recorded_at: recordedAt.toISOString(), notes: `Otomatis terdeteksi keluar dari radius ${Math.round(distM)}m.`
                  });
                }
              }
            }

            // 2c. Re-entry
            if (currentJoStatus === "MENUNGGU SELESAI") {
              for (const route of completedRoutes) {
                if (route.stop_type === "DROPOFF" || route.sequence === activeRoutes.length) {
                  if (route.latitude && route.longitude) {
                    const distM = calculateHaversineDistance(nLat, nLng, Number(route.latitude), Number(route.longitude));
                    if (distM <= 300) {
                      if (route.geofence_triggered_at && recordedAt.getTime() - new Date(route.geofence_triggered_at).getTime() < 5 * 60 * 1000) continue;
                      
                      geofenceTriggered = true;
                      arrivedStopName = route.location_name || "Lokasi Bongkar";
                      route.status = "arrived";
                      route.actual_departure = null;
                      route.geofence_triggered_at = recordedAt.toISOString();

                      await supabase.from("job_routes").update({ status: "arrived", actual_departure: null, geofence_triggered_at: route.geofence_triggered_at }).eq("id", route.id);
                      currentJoStatus = "TIBA DI LOKASI BONGKAR";
                      await supabase.from("job_orders").update({ status: currentJoStatus, departure_detected_at: null, updated_at: new Date().toISOString() }).eq("id", jo.id);
                      await supabase.from("job_tracking").insert({
                        job_order_id: jo.id, job_route_id: route.id, status_update: `🔙 Kembali ke ${arrivedStopName} (Re-entry)`,
                        latitude: nLat, longitude: nLng, recorded_at: recordedAt.toISOString(), notes: `Sistem mendeteksi armada kembali masuk ke radius 300m.`
                      });
                      break;
                    }
                  }
                }
              }
            }
          }
        }

        // Upsert fleet_gps_status with the last ping
        if (pings.length > 0) {
          const lastPing = pings[pings.length - 1];
          const isEasyGoFleet = !!(jo.fleet?.easygo_vehicle_id);
          if (jo.fleet_id && jo.tenant_id && !isEasyGoFleet) {
            const nSpeed = Number(lastPing.speed) || 0;
            try {
              await supabase.from("fleet_gps_status").upsert({
                fleet_id: jo.fleet_id, tenant_id: jo.tenant_id, latitude: Number(lastPing.latitude), longitude: Number(lastPing.longitude),
                speed: nSpeed, gps_time: lastPing.recorded_at || new Date().toISOString(), status_vehicle: nSpeed > 5 ? 2 : nSpeed > 0 ? 1 : 0,
                engine_on: true, provider: lastPing.source || "pwa_batch", updated_at: new Date().toISOString()
              }, { onConflict: "fleet_id" });
            } catch (e) {
              console.warn("[API] fleet_gps_status upsert skipped:", e);
            }
          }
          
          if (body.internet_connected !== undefined || body.background_running !== undefined || body.battery !== undefined) {
             let health_status = "GOOD";
             if (body.internet_connected === false || body.background_running === false) health_status = "CRITICAL";
             else if (body.battery !== undefined && body.battery < 20) health_status = "WARNING";
             await supabase.from("job_orders").update({
               device_health: health_status, last_device_health_ping_at: new Date().toISOString(), gps_status: "ACTIVE"
             }).eq("id", jo.id);
          }
        }

        return NextResponse.json({
          success: true,
          ack: { accepted, duplicates, failed },
          geofence_triggered: geofenceTriggered,
          arrived_stop: arrivedStopName,
          departed_stop: departedStopName,
          jo_status: currentJoStatus
        });
      }

      // ─────────────────────────────────────────────────────────────────
      // PANIC BUTTON SOS
      // ─────────────────────────────────────────────────────────────────
      case "panic_button": {
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
            latitude: Number(lat),
            longitude: Number(lng),
            notes: notesText,
            ...(recorded_at ? { recorded_at } : {}),
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

      // ─────────────────────────────────────────────────────────────────
      // TIMELINE EVENT (driver portal live updates) with optional photo
      // ─────────────────────────────────────────────────────────────────
      case "add_timeline_event": {
        try {
          let uploadedPublicUrl: string | null = null;
          if (pod_photo_base64 && route_id) {
            uploadedPublicUrl = await uploadPhotoToStorage(
              supabase,
              jo.id,
              route_id,
              pod_photo_base64,
              pod_photo_name,
            );
            await insertLocationPhoto(
              supabase,
              jo,
              route_id,
              uploadedPublicUrl,
              pod_photo_name,
            );
          }

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
                matchedRouteId = closestRoute.id;
                locationName = closestRoute.location_name || "Lokasi Terdekat";
              }
            }
          }

          const fullPayload: any = {
            job_order_id: jo.id,
            job_route_id: matchedRouteId || null,
            status_update: `Laporan di ${locationName}`,
            latitude: lat ? Number(lat) : null,
            longitude: lng ? Number(lng) : null,
            photo_url: uploadedPublicUrl || null,
            notes: route_notes || "Mengirim laporan / foto",
          };

          const { error: fullErr } = await supabase
            .from("job_tracking")
            .insert(fullPayload);
          if (fullErr) {
            throw new Error(fullErr.message || "Database insert failed");
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

      default:
        // Fall through to legacy global status handler below (no action = status update)
        break;
    }

    // ─────────────────────────────────────────────────────────────────
    // GLOBAL STATUS UPDATE (accept/reject/in_progress/completed)
    // Frontend sends { status, lat, lng } without action for these
    // ─────────────────────────────────────────────────────────────────
    if (status) {
      const newStatus = status;
      let dbStatus = newStatus;
      let smartStatusLog = newStatus.toUpperCase();

      if (newStatus === "accepted" || newStatus === "rejected") {
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
      if (newStatus === "completed") {
        updateData.completed_at = new Date().toISOString();
      }

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

      // Fleet & driver stats + journaling on completion
      if (newStatus === "completed") {
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

            // 🪙 Award driver coin (1 koin = Rp 5.000) — idempotent via RPC
            try {
              const { data: coinAwarded, error: coinErr } = await supabase.rpc(
                "award_driver_coin",
                {
                  p_driver_id: jo.driver_id,
                  p_tenant_id: jo.tenant_id,
                  p_job_order_id: jo.id,
                },
              );
              if (coinErr) {
                console.warn("[API] Coin award failed:", coinErr.message);
              } else if (coinAwarded) {
                console.log(
                  `[API] 🪙 Coin awarded to driver ${jo.driver_id} for JO ${jo.jo_number}`,
                );
              }
            } catch (e) {
              console.warn("[API] Coin award error:", e);
            }
          } catch (e) {
            console.error("[API] Driver stats update failed:", e);
          }
        }
      }

      // Log to job_tracking
      try {
        await supabase.from("job_tracking").insert({
          job_order_id: jo.id,
          status_update: smartStatusLog,
          latitude: lat ? Number(lat) : null,
          longitude: lng ? Number(lng) : null,
          notes: "Update status global dari Driver",
          ...(recorded_at ? { recorded_at } : {}),
        });
      } catch (e) {
        console.warn("[API] Tracking log failed:", e);
      }

      return NextResponse.json({ success: true });
    }

    // No recognized action / status
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    console.error("[API] PATCH error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// [Phase 4D.17] Allow POST requests (acting as PATCH) for Android Native GPS fallback
// because Android's built-in HttpURLConnection does not support PATCH.
export const POST = PATCH;

