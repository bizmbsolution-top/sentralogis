import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = parseFloat(searchParams.get("lat") || "0");
    const lng = parseFloat(searchParams.get("lng") || "0");

    if (!lat || !lng) {
      return NextResponse.json({ error: "Missing lat/lng" }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data: { user } } = await supabase.auth.getUser();
    let tenantId: string | null = null;

    if (user) {
      const { data: profile } = await supabase
        .from("ground_staff_profiles")
        .select("tenant_id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (profile) tenantId = profile.tenant_id;
    }

    let query = supabase
      .from("ground_sites")
      .select("*")
      .eq("is_active", true);

    if (tenantId) {
      query = query.eq("tenant_id", tenantId);
    }

    const { data: sites, error } = await query;

    if (error) throw error;

    let nearestSite = null;
    let minDistance = Infinity;

    const sitesWithDistance = (sites || []).map((site: any) => {
      if (site.latitude && site.longitude) {
        const dist = calculateDistance(lat, lng, Number(site.latitude), Number(site.longitude));
        if (dist <= (site.geofence_radius_m || 150)) {
          if (dist < minDistance) {
            minDistance = dist;
            nearestSite = { ...site, distance_m: Math.round(dist) };
          }
        }
        return { ...site, distance_m: Math.round(dist) };
      }
      return site;
    });

    return NextResponse.json({
      success: true,
      site: nearestSite,
      allSites: sitesWithDistance,
    });
  } catch (err: any) {
    console.error("[Ground Site] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
