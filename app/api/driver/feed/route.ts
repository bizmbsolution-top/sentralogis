import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizePhone } from "@/lib/utils/phone";
import { verifyDriverJwt } from "@/lib/auth/driverJwt";
import { isJoRejected } from "@/lib/domain/jo/status";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = createAdminClient();

    // 1. Resolve Driver Identity from Cryptographic Bearer Token or Cookie
    const authHeader = request.headers.get("authorization") || "";
    const cookieToken = request.cookies.get("sb-access-token")?.value;
    const token = authHeader.replace(/^Bearer\s+/i, "").trim() || cookieToken || "";

    const verified = verifyDriverJwt(token);

    if (!verified || !verified.driver_id) {
      console.warn("[DRIVER_FEED] Unauthorized request: missing or invalid signature JWT token");
      return NextResponse.json(
        { success: false, code: "UNAUTHORIZED", error: "Sesi tidak valid atau token kadaluarsa" },
        { status: 401 }
      );
    }

    const metaDriverId = verified.driver_id;
    const metaProfileId = verified.profile_id;

    // 2. Discover all linked driver IDs across all tenants
    let canonicalProfile: any = null;
    let driverIds: string[] = [];
    let tenantIds: string[] = [];
    let canonicalDriverInfo: any = null;

    if (metaProfileId) {
      const { data: profile } = await supabaseAdmin
        .from("driver_profiles")
        .select("id, phone, full_name, trust_score, total_jobs_completed, total_km_driven")
        .eq("id", metaProfileId)
        .maybeSingle();

      if (profile) {
        canonicalProfile = profile;
      }

      // Resolve driver_ids from driver_tenant_links
      const { data: links } = await supabaseAdmin
        .from("driver_tenant_links")
        .select("driver_id, tenant_id")
        .eq("profile_id", metaProfileId)
        .eq("is_active", true);

      if (links && links.length > 0) {
        driverIds = links.map((l) => l.driver_id).filter(Boolean);
        tenantIds = Array.from(new Set(links.map((l) => l.tenant_id).filter(Boolean)));
      }
    }

    if (metaDriverId && !driverIds.includes(metaDriverId)) {
      driverIds.push(metaDriverId);
    }

    // Query md_drivers without referencing non-existent md_drivers.profile_id column
    if (driverIds.length > 0) {
      const { data: linkedDrivers } = await supabaseAdmin
        .from("md_drivers")
        .select("id, name, whatsapp, pin, entity_id, is_active, tenant_id, photo_url, sim_number, sim_class, sim_expiry, bank_name, bank_account, bank_account_name, is_working, status, total_km_driven, trust_score")
        .in("id", driverIds);

      if (linkedDrivers && linkedDrivers.length > 0) {
        canonicalDriverInfo = linkedDrivers[0];
        linkedDrivers.forEach((d) => {
          if (d.tenant_id && !tenantIds.includes(d.tenant_id)) {
            tenantIds.push(d.tenant_id);
          }
        });

        // If no canonical profile yet, search by phone — [Multi-Tenant] collect ALL
        // profiles sharing the phone (duplicates) and union their links.
        if (!canonicalProfile && canonicalDriverInfo?.whatsapp) {
          const norm = normalizePhone(canonicalDriverInfo.whatsapp);
          const { data: profsByPhone } = await supabaseAdmin
            .from("driver_profiles")
            .select("id, phone, full_name, trust_score, total_jobs_completed, total_km_driven")
            .eq("phone", norm)
            .order("created_at", { ascending: true });

          if (profsByPhone && profsByPhone.length > 0) {
            canonicalProfile = profsByPhone[0];
            const profIds = profsByPhone.map((p: any) => p.id);
            // Union links across every duplicate profile
            const { data: moreLinks } = await supabaseAdmin
              .from("driver_tenant_links")
              .select("driver_id, tenant_id")
              .in("profile_id", profIds)
              .eq("is_active", true);

            if (moreLinks && moreLinks.length > 0) {
              moreLinks.forEach((l) => {
                if (l.driver_id && !driverIds.includes(l.driver_id)) driverIds.push(l.driver_id);
                if (l.tenant_id && !tenantIds.includes(l.tenant_id)) tenantIds.push(l.tenant_id);
              });
            }
          }
        }
      }
    }

    // [Multi-Tenant Safety Net] Include ANY active md_drivers record sharing the
    // same normalized WhatsApp number, even if its tenant link row is missing or
    // points at a duplicate profile. Guarantees no tenant's JOs are invisible.
    try {
      const normPhone =
        canonicalProfile?.phone ||
        (canonicalDriverInfo?.whatsapp ? normalizePhone(canonicalDriverInfo.whatsapp) : null);
      if (normPhone) {
        const clean = normPhone.replace(/^62/, "");
        const { data: phoneDrivers } = await supabaseAdmin
          .from("md_drivers")
          .select("id, tenant_id")
          .eq("is_active", true)
          .or(
            `whatsapp.eq.${normPhone},whatsapp.eq.0${clean},whatsapp.eq.${clean}`
          )
          .limit(50);
        (phoneDrivers || []).forEach((pd: any) => {
          if (pd.id && !driverIds.includes(pd.id)) driverIds.push(pd.id);
          if (pd.tenant_id && !tenantIds.includes(pd.tenant_id)) tenantIds.push(pd.tenant_id);
        });
      }
    } catch (e) {
      console.warn("[DRIVER_FEED] Phone safety-net warning:", e);
    }

    if (driverIds.length === 0) {
      return NextResponse.json(
        { success: false, code: "DRIVER_NOT_FOUND", error: "Profil supir tidak ditemukan" },
        { status: 404 }
      );
    }

    // 3. Query All Job Orders Across All Linked Tenants
    const { data: rawJobs, error: jobsErr } = await supabaseAdmin
      .from("job_orders")
      .select("*")
      .in("driver_id", driverIds)
      .order("created_at", { ascending: false })
      .limit(100);

    if (jobsErr) {
      console.error("[DRIVER_FEED] Error fetching job orders:", jobsErr);
      return NextResponse.json(
        { success: false, code: "DB_ERROR", error: jobsErr.message },
        { status: 500 }
      );
    }

    const allJobs = rawJobs || [];
    const allJoIds = allJobs.map((j) => j.id);
    const woItemIds = allJobs.map((j) => j.wo_item_id).filter(Boolean);
    const fleetIds = allJobs.map((j) => j.fleet_id).filter(Boolean);
    const jobTenantIds = Array.from(new Set(allJobs.map((j) => j.tenant_id).filter(Boolean)));

    // 4. Batch Fetch Related Data (Bypassing RLS with Admin Client)
    const [woRes, routesRes, fleetsRes, paymentsRes, tenantsRes, trackingRes, coinsRes, shiftRes] = await Promise.all([
      woItemIds.length > 0
        ? supabaseAdmin
            .from("wo_items")
            .select("id, item_code, item_data, wo_id, tenant_id, status")
            .in("id", woItemIds)
        : Promise.resolve({ data: [], error: null }),
      allJoIds.length > 0
        ? supabaseAdmin
            .from("job_routes")
            .select("*")
            .in("job_order_id", allJoIds)
            .order("sequence", { ascending: true })
        : Promise.resolve({ data: [], error: null }),
      fleetIds.length > 0
        ? supabaseAdmin
            .from("md_fleets")
            .select("id, plate_number, vehicle_type, tenant_id")
            .in("id", fleetIds)
        : Promise.resolve({ data: [], error: null }),
      allJoIds.length > 0
        ? supabaseAdmin
            .from("job_order_payments")
            .select("*")
            .in("job_order_id", allJoIds)
        : Promise.resolve({ data: [], error: null }),
      jobTenantIds.length > 0
        ? supabaseAdmin
            .from("tenants")
            .select("id, name, logo_url")
            .in("id", jobTenantIds)
        : Promise.resolve({ data: [], error: null }),
      allJoIds.length > 0
        ? supabaseAdmin
            .from("job_tracking")
            .select("id, job_order_id, job_route_id, notes, photo_url, created_at, recorded_at")
            .in("job_order_id", allJoIds)
            .order("created_at", { ascending: true })
        : Promise.resolve({ data: [], error: null }),
      supabaseAdmin
        .from("driver_coins")
        .select("id, amount, status, description, created_at")
        .in("driver_id", driverIds),
      supabaseAdmin
        .from("driver_attendance")
        .select("*")
        .in("driver_id", driverIds)
        .eq("status", "CHECK_IN")
        .order("check_in", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const woMap = new Map((woRes.data || []).map((w: any) => [w.id, w]));
    const fleetMap = new Map((fleetsRes.data || []).map((f: any) => [f.id, f]));
    const tenantMap = new Map((tenantsRes.data || []).map((t: any) => [t.id, t]));

    const routesMap = new Map<string, any[]>();
    (routesRes.data || []).forEach((r: any) => {
      if (!routesMap.has(r.job_order_id)) routesMap.set(r.job_order_id, []);
      routesMap.get(r.job_order_id)!.push(r);
    });

    const paymentsMap = new Map<string, any[]>();
    (paymentsRes.data || []).forEach((p: any) => {
      if (!paymentsMap.has(p.job_order_id)) paymentsMap.set(p.job_order_id, []);
      paymentsMap.get(p.job_order_id)!.push(p);
    });

    const trackingMap = new Map<string, any[]>();
    (trackingRes.data || []).forEach((tr: any) => {
      if (!trackingMap.has(tr.job_order_id)) trackingMap.set(tr.job_order_id, []);
      trackingMap.get(tr.job_order_id)!.push(tr);
    });

    // 5. Enrich All Jobs
    const COMPLETED_STATUSES = [
      "COMPLETED",
      "PEKERJAAN SELESAI",
      "SELESAI",
      "DONE",
      "INVOICED",
      "PAID",
      "AWAITING_AUDIT",
      "READY_FOR_BILLING",
      "VERIFIED",
    ];

    let totalKMCalculated = 0;
    let totalHakCalculated = 0;
    let totalAdvanceCalculated = 0;
    let totalPelunasanCalculated = 0;

    const enrichedJobs = allJobs.map((j: any) => {
      const pList = paymentsMap.get(j.id) || [];
      const advancePayments = pList
        .filter((p: any) => p.payment_type === "advance_driver")
        .reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
      const pelunasanPayments = pList
        .filter((p: any) => p.payment_type === "pelunasan_driver")
        .reduce((s: number, p: any) => s + Number(p.amount || 0), 0);

      const legacyAdv =
        j.advance_status === "paid" || j.advance_status === "completed"
          ? Number(j.advance_amount || 0)
          : 0;
      const legacyPel =
        j.driver_payment_status === "paid" || j.driver_payment_status === "completed"
          ? Math.max(
              Number(j.driver_payment_amount || 0),
              advancePayments > 0 ? advancePayments : legacyAdv
            )
          : 0;

      const advPaid = advancePayments > 0 ? advancePayments : legacyAdv;
      const pelPaid =
        pelunasanPayments > 0
          ? pelunasanPayments
          : legacyPel > advPaid
            ? legacyPel - advPaid
            : 0;

      const sp = Number(j.driver_share_percentage || 0);
      const bp = Number(j.base_price || 0);
      const ch = sp > 0 && bp > 0 ? bp * (sp / 100) : 0;
      const hd =
        Number(j.driver_revenue_share) ||
        ch ||
        Number(j.driver_payment_amount) ||
        Number(j.advance_amount) ||
        0;

      const routes = routesMap.get(j.id) || [];
      const jobDist = routes.reduce((sum: number, r: any) => sum + (Number(r.distance_km) || 0), 0);

      const isCompleted = COMPLETED_STATUSES.includes((j.status || "").toUpperCase());
      if (isCompleted) {
        totalKMCalculated += jobDist;
        totalHakCalculated += hd;
      }
      totalAdvanceCalculated += advPaid;
      totalPelunasanCalculated += pelPaid;

      const tenantInfo = tenantMap.get(j.tenant_id) || null;

      return {
        ...j,
        tenant: tenantInfo,
        tenant_name: tenantInfo?.name || "SENTRALOGIS",
        wo_items: woMap.get(j.wo_item_id) || null,
        md_fleets: fleetMap.get(j.fleet_id) || null,
        job_routes: routes,
        tracking_logs: trackingMap.get(j.id) || [],
        job_distance_km: jobDist,
        _finances: {
          hak: hd,
          advancePaid: advPaid,
          pelunasanPaid: pelPaid,
          totalPaid: advPaid + pelPaid,
          sisa: Math.max(0, hd - (advPaid + pelPaid)),
        },
      };
    });

    // 6. Separate Active vs Queued vs Completed Jobs
    // Rejected/cancelled JOs are terminal states handled by ops — they must NOT
    // appear on the driver dashboard (active/queue) nor in history.
    const isRejectedJob = (j: any) =>
      isJoRejected(j.status) ||
      j.driver_response === "rejected" ||
      // [Guard] Item-level handover rejection also kills the JO, even when the
      // job_orders.status was left stale by a partial reject flow.
      j.wo_items?.status === "handover_rejected";

    const completedList = enrichedJobs.filter(
      (j) =>
        COMPLETED_STATUSES.includes((j.status || "").toUpperCase()) &&
        !isRejectedJob(j)
    );

    const ongoingList = enrichedJobs.filter(
      (j) =>
        !COMPLETED_STATUSES.includes((j.status || "").toUpperCase()) &&
        !isRejectedJob(j)
    );

    // Active Job prioritization: in_progress/transit/unloading/arrived > accepted > assigned
    const activeJob =
      ongoingList.find((j) =>
        [
          "in_progress",
          "dalam perjalanan",
          "started",
          "loading",
          "unloading",
          "menunggu selesai",
        ].includes((j.status || "").toLowerCase()) ||
        (j.status || "").toLowerCase().startsWith("menuju") ||
        (j.status || "").toLowerCase().startsWith("tiba")
      ) || ongoingList[0] || null;

    const queuedJobs = ongoingList.filter((j) => j.id !== activeJob?.id);

    // 7. Coin balance calculation
    const coinsData = coinsRes.data || [];
    const totalCoins = coinsData.reduce((s: number, c: any) => s + Number(c.amount || 0), 0);

    // 8. Active shift fleet plate
    let activeShiftData: any = shiftRes.data || null;
    if (activeShiftData && activeShiftData.fleet_id) {
      const fleet = fleetMap.get(activeShiftData.fleet_id);
      if (fleet) {
        activeShiftData = { ...activeShiftData, fleet };
      }
    }

    return NextResponse.json({
      success: true,
      code: "OK",
      driver: {
        id: canonicalDriverInfo?.id || metaDriverId,
        profile_id: canonicalProfile?.id || canonicalDriverInfo?.profile_id || metaProfileId,
        name: canonicalProfile?.full_name || canonicalDriverInfo?.name || "Supir",
        whatsapp: canonicalProfile?.phone || canonicalDriverInfo?.whatsapp || "",
        photo_url: canonicalDriverInfo?.photo_url || null,
        sim_number: canonicalDriverInfo?.sim_number || null,
        sim_class: canonicalDriverInfo?.sim_class || "BII UMUM",
        sim_expiry: canonicalDriverInfo?.sim_expiry || null,
        bank_name: canonicalDriverInfo?.bank_name || null,
        bank_account: canonicalDriverInfo?.bank_account || null,
        bank_account_name: canonicalDriverInfo?.bank_account_name || null,
        trust_score: canonicalProfile?.trust_score || canonicalDriverInfo?.trust_score || 100,
        total_jobs_completed: canonicalProfile?.total_jobs_completed || completedList.length,
        total_km_driven: canonicalProfile?.total_km_driven || totalKMCalculated,
        linked_driver_ids: driverIds,
        linked_tenant_ids: tenantIds,
      },
      active_job: activeJob,
      queued_jobs: queuedJobs,
      completed_jobs: completedList,
      total_completed_month: completedList.filter((j) => {
        if (!j.completed_at) return false;
        const d = new Date(j.completed_at);
        const now = new Date();
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }).length,
      total_km: totalKMCalculated,
      finances: {
        total_hak: totalHakCalculated,
        total_advance: totalAdvanceCalculated,
        total_pelunasan: totalPelunasanCalculated,
        outstanding: Math.max(0, totalHakCalculated - (totalAdvanceCalculated + totalPelunasanCalculated)),
      },
      coins: {
        balance: totalCoins,
        rupiah_value: totalCoins * 5000,
      },
      active_shift: activeShiftData,
    });
  } catch (err: any) {
    console.error("[DRIVER_FEED] Exception:", err);
    return NextResponse.json(
      { success: false, code: "INTERNAL_ERROR", error: err.message || "Gagal memuat data feed portal supir" },
      { status: 500 }
    );
  }
}
