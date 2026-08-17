import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import crypto from "crypto";

/**
 * Canonical phone normalization — deterministic.
 *
 * 08xxxxxxxxxx   -> 628xxxxxxxxxx
 * 628xxxxxxxxxx  -> 628xxxxxxxxxx
 * +62 8xxxxxxxxx -> 628xxxxxxxxxx
 * +62-812-xxx    -> 628xxxxxxxxxx
 *
 * Strips all non-digit characters, then maps a leading 0 or 8 to the 62
 * country code. Applied to BOTH the user input AND the stored DB value so
 * the comparison is canonical on both sides regardless of how the number
 * was originally saved.
 */
function normalizePhone(phone: string | null | undefined): string {
  if (!phone) return "";
  let p = String(phone).replace(/[^0-9]/g, "");
  if (p.startsWith("0")) p = "62" + p.substring(1);
  else if (p.startsWith("8")) p = "62" + p;
  return p;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { whatsapp, pin, joToken } = body;

    if (!whatsapp || !pin) {
      console.log(`[DRIVER_LOGIN] phone_normalized=none driver_found=false driver_id=none tenant_id=none pin_valid=false supabase_user_found=false supabase_signin=false session_created=false cookie_set=false error="Missing fields" code=MISSING_FIELDS`);
      return NextResponse.json(
        { success: false, code: "MISSING_FIELDS", error: "Nomor WhatsApp dan PIN wajib diisi" },
        { status: 400 }
      );
    }

    const normalizedInput = normalizePhone(whatsapp);
    const supabaseAdmin = createAdminClient();
    const inputPin = (pin || "").toString().trim();

    // 1. Cross-Tenant Disambiguation (same logic as useDriverAuth).
    //    Resolve tenant from the JO token FIRST so candidates are scoped.
    let targetTenantId: string | null = null;
    if (joToken) {
      const { data: joData, error: joError } = await supabaseAdmin
        .from("job_orders")
        .select("tenant_id, driver_id")
        .eq("id", joToken)
        .maybeSingle();

      if (joError) {
        console.warn("[DRIVER_LOGIN] Error checking joToken:", joError);
      } else if (joData) {
        targetTenantId = joData.tenant_id;
      }
    }

    // 2. Resolve Driver — canonical identity via driver_profiles + driver_tenant_links
    //    (Phase 2 cross-tenant model). Falls back to direct md_drivers scan when the
    //    profile tables are not yet backfilled.
    let candidates: any[] = [];
    let usedProfilePath = false;

    const { data: profileRows, error: profileErr } = await supabaseAdmin
      .from("driver_profiles")
      .select("id, phone, pin_hash, full_name")
      .or(`phone.eq.${normalizedInput}`)
      .limit(5);

    if (profileErr) {
      console.warn("[DRIVER_LOGIN] driver_profiles query failed, falling back:", profileErr.message);
    } else if (profileRows && profileRows.length > 0) {
      usedProfilePath = true;
      const profileId = profileRows[0].id;

      const { data: linkRows, error: linkErr } = await supabaseAdmin
        .from("driver_tenant_links")
        .select("tenant_id, driver_id, is_active")
        .eq("profile_id", profileId)
        .eq("is_active", true)
        .limit(50);

      if (linkErr) {
        console.warn("[DRIVER_LOGIN] driver_tenant_links query failed, falling back:", linkErr.message);
        usedProfilePath = false;
      } else {
        const driverIds = (linkRows || []).map((l) => l.driver_id);
        const { data: linkedDrivers, error: driversErr } = await supabaseAdmin
          .from("md_drivers")
          .select("id, name, whatsapp, pin, entity_id, is_active, tenant_id")
          .in("id", driverIds.length > 0 ? driverIds : [profileId])
          .eq("is_active", true);

        if (driversErr) {
          console.warn("[DRIVER_LOGIN] linked md_drivers query failed, falling back:", driversErr.message);
          usedProfilePath = false;
        } else {
          candidates = (linkedDrivers || []).filter((d) => {
            const link = (linkRows || []).find(
              (l) => l.driver_id === d.id && l.tenant_id === d.tenant_id
            );
            return !!link;
          }).map((d) => ({ ...d, profile_id: profileId }));
        }
      }
    }

    // 2b. Fallback path — direct md_drivers scan (pre-migration / no profiles).
    if (!usedProfilePath) {
      const { data: activeDrivers, error: fetchErr } = await supabaseAdmin
        .from("md_drivers")
        .select("id, name, whatsapp, pin, entity_id, is_active, tenant_id")
        .eq("is_active", true)
        .limit(1000);

      if (fetchErr) {
        console.error("[DRIVER_LOGIN] Failed to fetch drivers:", fetchErr);
        return NextResponse.json(
          { success: false, code: "INTERNAL_ERROR", error: "Terjadi kesalahan server" },
          { status: 500 }
        );
      }

      candidates = (activeDrivers || []).filter(
        (d) => !!d.whatsapp && normalizePhone(d.whatsapp) === normalizedInput
      );
    }

    // Scope to the JO's tenant when a token was provided.
    if (targetTenantId) {
      const scoped = candidates.filter((d) => d.tenant_id === targetTenantId);
      if (candidates.length > 0 && scoped.length === 0) {
        console.log(`[DRIVER_LOGIN] phone_normalized=${normalizedInput} driver_found=true multiple_drivers=true driver_id=none tenant_id=${targetTenantId} pin_valid=pending supabase_user_found=false supabase_signin=false session_created=false cookie_set=false error="Driver not linked to JO tenant" code=FORBIDDEN_JO_TENANT`);
        return NextResponse.json(
          {
            success: false,
            code: "FORBIDDEN_JO_TENANT",
            error:
              "Akun Anda tidak terdaftar pada perusahaan Job Order ini.",
          },
          { status: 403 }
        );
      }
      candidates = scoped;
    }

    if (candidates.length === 0) {
      console.log(`[DRIVER_LOGIN] phone_normalized=${normalizedInput} driver_found=false driver_id=none tenant_id=none pin_valid=false supabase_user_found=false supabase_signin=false session_created=false cookie_set=false error="Driver not found or inactive" code=INVALID_CREDENTIALS`);
      return NextResponse.json(
        { success: false, code: "INVALID_CREDENTIALS", error: "Nomor WhatsApp atau PIN tidak valid." },
        { status: 401 }
      );
    }

    // 3. Ambiguity handling — NEVER guess.
    if (candidates.length > 1) {
      const uniqueTenants = new Set(candidates.map((d) => d.tenant_id));

      // Cross-tenant ambiguity (no token): the same person may legitimately
      // have an account on several companies -> require the JO link.
      if (!targetTenantId && uniqueTenants.size > 1) {
        console.log(`[DRIVER_LOGIN] phone_normalized=${normalizedInput} driver_found=true multiple_drivers=true driver_id=ambiguous tenant_id=multiple pin_valid=pending supabase_user_found=false supabase_signin=false session_created=false cookie_set=false error="Cross-tenant token required" code=AMBIGUOUS_DRIVER`);
        return NextResponse.json(
          {
            success: false,
            code: "AMBIGUOUS_DRIVER",
            error:
              "Akun Anda terdaftar di beberapa perusahaan. Silakan login melalui link Job Order dari WhatsApp.",
            requiresToken: true,
          },
          { status: 403 }
        );
      }

      // Same-tenant duplicate (with or without token): multiple active
      // drivers share one number inside one company. Do not pick one.
      console.log(`[DRIVER_LOGIN] phone_normalized=${normalizedInput} driver_found=true multiple_drivers=true driver_id=ambiguous tenant_id=${targetTenantId || "single"} pin_valid=pending supabase_user_found=false supabase_signin=false session_created=false cookie_set=false error="Same-tenant duplicate" code=DUPLICATE_DRIVER`);
      return NextResponse.json(
        {
          success: false,
          code: "DUPLICATE_DRIVER",
          error:
            "Nomor WhatsApp memiliki lebih dari satu akun driver dalam perusahaan ini. Hubungi operator.",
        },
        { status: 403 }
      );
    }

    const driver = candidates[0];

    // 4. Verify PIN safely — check driver_profiles.pin_hash first (Phase 2), then
    //    fall back to md_drivers.pin for pre-migration accounts.
    const storedPin = (driver.pin || "").toString().trim();
    let pinValid = storedPin !== "" && storedPin === inputPin;

    if (!pinValid && usedProfilePath && profileRows && profileRows[0]?.pin_hash) {
      pinValid = profileRows[0].pin_hash === inputPin;
    }

    if (!pinValid) {
      console.log(`[DRIVER_LOGIN] phone_normalized=${normalizedInput} driver_found=true driver_id=${driver.id} tenant_id=${driver.tenant_id} pin_valid=false supabase_user_found=false supabase_signin=false session_created=false cookie_set=false error="Invalid PIN" code=INVALID_CREDENTIALS`);
      return NextResponse.json(
        { success: false, code: "INVALID_CREDENTIALS", error: "Nomor WhatsApp atau PIN tidak valid." },
        { status: 401 }
      );
    }

    // 5. Generate Virtual Identity
    const virtualEmail = `driver_${driver.id}@driver.sentralogis.internal`.toLowerCase();

    // Create a 100% deterministic secure password for Supabase Auth based on driver.id
    // This guarantees that whether the account is created now or existed previously, the password matches!
    const authSalt = process.env.SUPABASE_JWT_SECRET || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sentralogis_driver_auth_v2_salt";
    const securePassword = crypto.createHmac("sha256", authSalt).update(`driver_${driver.id}`).digest("hex").substring(0, 32);

    const metadata = {
      role: 'driver',
      driver_id: driver.id,
      tenant_id: driver.tenant_id,
      profile_id: driver.profile_id || null
    };

    // 6. Ensure auth.users account exists & metadata is updated
    let supabaseUserFound = false;
    const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: virtualEmail,
      password: securePassword,
      email_confirm: true,
      user_metadata: metadata
    });

    if (newUser?.user) {
      supabaseUserFound = true;
    } else if (
      createErr &&
      (
        createErr.message.includes("already exists") ||
        createErr.message.toLowerCase().includes("already") ||
        (createErr as any).status === 422 ||
        (createErr as any).code === "user_already_exists"
      )
    ) {
      supabaseUserFound = true;
      // Fetch user ID to ensure password & metadata are in sync
      try {
        const { data: userList } = await supabaseAdmin.auth.admin.listUsers();
        const existing = userList?.users?.find(u => u.email === virtualEmail);
        if (existing) {
          await supabaseAdmin.auth.admin.updateUserById(existing.id, {
            password: securePassword,
            user_metadata: metadata
          });
        }
      } catch (e) {
        console.warn("[DRIVER_LOGIN] Error updating existing user metadata:", e);
      }
    } else if (createErr) {
      console.error("[DRIVER_LOGIN] Failed to create auth.users:", createErr);
      return NextResponse.json(
        { success: false, code: "INTERNAL_ERROR", error: "Gagal membuat sesi keamanan (Internal Error)" },
        { status: 500 }
      );
    }

    // 7. Establish Secure Authenticated Session via Cookies using @supabase/ssr server client
    const supabaseServer = await createClient();

    const { data: sessionData, error: signInErr } = await supabaseServer.auth.signInWithPassword({
      email: virtualEmail,
      password: securePassword
    });

    if (signInErr || !sessionData.session) {
      console.error("[DRIVER_LOGIN] signInWithPassword failed:", signInErr);
      console.log(`[DRIVER_LOGIN] phone_normalized=${normalizedInput} driver_found=true driver_id=${driver.id} tenant_id=${driver.tenant_id} pin_valid=true supabase_user_found=${supabaseUserFound} supabase_signin=false session_created=false cookie_set=false error="Auth sign-in failed" code=AUTH_SIGNIN_FAILED`);
      return NextResponse.json(
        { success: false, code: "AUTH_SIGNIN_FAILED", error: "Gagal menginisiasi sesi (Internal Auth Error)" },
        { status: 500 }
      );
    }

    console.log(`[DRIVER_LOGIN] phone_normalized=${normalizedInput} driver_found=true driver_id=${driver.id} tenant_id=${driver.tenant_id} pin_valid=true supabase_user_found=true supabase_signin=true session_created=true cookie_set=true code=OK`);

    // 8. Return safe driver info
    const safeDriver = {
      id: driver.id,
      name: driver.name,
      whatsapp: driver.whatsapp,
      entity_id: driver.entity_id,
      driver_type: driver.entity_id ? "VENDOR" : "OWN",
      tenant_id: driver.tenant_id,
      profile_id: driver.profile_id || null,
    };

    return NextResponse.json({
      success: true,
      code: "OK",
      driver: safeDriver,
    });
  } catch (err: any) {
    console.error("[DRIVER_LOGIN] Exception:", err);
    return NextResponse.json(
      { success: false, code: "INTERNAL_ERROR", error: err.message || "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
