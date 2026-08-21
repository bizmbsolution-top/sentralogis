import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DriverPortalQuery } from "@/src/infrastructure/repositories/trucking/DriverPortalQuery";
import { createGpsSessionToken } from "@/lib/auth/gpsSession";
import { verifyDriverJwt } from "@/lib/auth/driverJwt";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    
    // Extract Authorization Bearer token or HttpOnly cookie
    const authHeader = request.headers.get("authorization") || "";
    const cookieToken = request.cookies.get("sb-access-token")?.value;
    const rawToken = authHeader.replace(/^Bearer\s+/i, "").trim() || cookieToken || "";

    const verifiedSession = verifyDriverJwt(rawToken);

    if (!verifiedSession || !verifiedSession.driver_id) {
      console.warn("[GPS_SESSION_FORENSIC] Rejecting unauthorized GPS session request: invalid or missing Driver JWT signature");
      return NextResponse.json(
        { error: "Akses ditolak: Sesi tidak valid atau token kadaluarsa" },
        { status: 401 }
      );
    }

    const supabaseAdmin = createAdminClient();
    const queryService = new DriverPortalQuery(supabaseAdmin);
    const jo = await queryService.getJobOrderData(token);

    if (!jo) {
      return NextResponse.json({ error: "Job Order tidak ditemukan" }, { status: 404 });
    }

    // Strict Driver Ownership Verification
    const isOwner =
      verifiedSession.driver_id === jo.driver_id ||
      (verifiedSession.profile_id && jo.driver?.profile_id === verifiedSession.profile_id);

    if (!isOwner) {
      console.warn(`[GPS_SESSION_FORENSIC] REJECT=403_DRIVER_MISMATCH sessionDriver=${verifiedSession.driver_id} joDriver=${jo.driver_id}`);
      return NextResponse.json({ error: "Akses ditolak: Anda tidak berhak atas JO ini" }, { status: 403 });
    }

    const INACTIVE_STATUSES = [
      "SELESAI",
      "PEKERJAAN SELESAI",
      "COMPLETED",
      "DONE",
      "DIBATALKAN",
      "CANCELLED",
      "REJECTED",
      "READY_FOR_BILLING",
      "VERIFIED",
      "AWAITING_AUDIT",
      "INVOICED",
      "PAID"
    ];
    
    if (INACTIVE_STATUSES.includes((jo.status || "").toUpperCase())) {
      console.log(`[GPS_SESSION_FORENSIC] REJECT=403_INACTIVE_STATUS`);
      console.log(`[GPS_SESSION] rejected inactive JO\njob_order_id=${jo.id}\nstatus=${jo.status}`);
      return NextResponse.json({ error: "Akses ditolak: Job Order sudah selesai atau tidak aktif" }, { status: 403 });
    }

    const gpsToken = createGpsSessionToken({
      driver_id: jo.driver_id,
      tenant_id: jo.tenant_id,
      job_order_id: jo.id,
    });

    console.log(`[GPS_SESSION_FORENSIC] ACCEPTED token_created`);
    return NextResponse.json({
      success: true,
      gps_session_token: gpsToken,
    });
  } catch (error: any) {
    console.error("[API] POST gps-session error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
