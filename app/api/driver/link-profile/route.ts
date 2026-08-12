// [Phase 2 Cross-Tenant] Link a driver to a canonical driver_profile.
// Ensures a driver_profiles row exists for the driver's phone and creates a
// driver_tenant_links row tying (profile_id, tenant_id, driver_id).
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function normalizePhone(phone: string | null | undefined): string {
  if (!phone) return "";
  let p = String(phone).replace(/[^0-9]/g, "");
  if (p.startsWith("0")) p = "62" + p.substring(1);
  else if (p.startsWith("8")) p = "62" + p;
  return p;
}

// POST /api/driver/link-profile
// Body: { driver_id, pin? }
//   - Looks up the md_drivers row (phone, name, tenant_id)
//   - Finds or creates the canonical driver_profiles row
//   - Creates/upserts the driver_tenant_links row
export async function POST(req: NextRequest) {
  try {
    const { driver_id } = await req.json();

    if (!driver_id) {
      return NextResponse.json({ error: "driver_id required" }, { status: 400 });
    }

    const { data: driver, error: driverErr } = await supabase
      .from("md_drivers")
      .select("id, name, whatsapp, pin, tenant_id")
      .eq("id", driver_id)
      .maybeSingle();

    if (driverErr) throw driverErr;
    if (!driver) {
      return NextResponse.json({ error: "Driver not found" }, { status: 404 });
    }

    const phone = normalizePhone(driver.whatsapp);
    if (!phone) {
      return NextResponse.json(
        { error: "Driver has no WhatsApp number to link" },
        { status: 400 }
      );
    }

    // 1. Find or create profile by canonical phone
    let profileId: string;
    const { data: existingProfile, error: profFindErr } = await supabase
      .from("driver_profiles")
      .select("id, full_name")
      .eq("phone", phone)
      .maybeSingle();

    if (profFindErr) throw profFindErr;

    if (existingProfile) {
      profileId = existingProfile.id;
    } else {
      const { data: newProfile, error: profCreateErr } = await supabase
        .from("driver_profiles")
        .insert({
          phone,
          full_name: driver.name || null,
          pin_hash: driver.pin || null,
        })
        .select("id")
        .single();

      if (profCreateErr) throw profCreateErr;
      profileId = newProfile.id;
    }

    // 2. Upsert tenant link
    const { error: linkErr } = await supabase.from("driver_tenant_links").upsert(
      {
        profile_id: profileId,
        tenant_id: driver.tenant_id,
        driver_id: driver.id,
        is_active: true,
      },
      { onConflict: "profile_id,tenant_id" }
    );

    if (linkErr) throw linkErr;

    return NextResponse.json({
      success: true,
      profile_id: profileId,
      driver_id: driver.id,
      phone,
    });
  } catch (err: any) {
    console.error("[Link Profile] Error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// GET /api/driver/link-profile?phone=628xx...
// Returns driver_profiles matches so ops can pick which profile to link to.
export async function GET(req: NextRequest) {
  try {
    const phone = normalizePhone(req.nextUrl.searchParams.get("phone"));

    if (!phone) {
      return NextResponse.json({ error: "phone required" }, { status: 400 });
    }

    const { data: profiles, error } = await supabase
      .from("driver_profiles")
      .select(
        `
        id, phone, full_name,
        driver_tenant_links ( tenant_id, driver_id, is_active )
      `
      )
      .eq("phone", phone);

    if (error) throw error;

    return NextResponse.json({ success: true, profiles: profiles || [] });
  } catch (err: any) {
    console.error("[Link Profile GET] Error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
