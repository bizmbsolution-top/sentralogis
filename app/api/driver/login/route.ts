import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import crypto from "crypto";
import { normalizePhone } from "@/lib/utils/phone";
import { signDriverJwt } from "@/lib/auth/driverJwt";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { whatsapp, pin, joToken } = body;

    if (!whatsapp || !pin) {
      console.log(`[DRIVER_LOGIN] phone_normalized=none driver_found=false driver_id=none tenant_id=none pin_valid=false error="Missing fields" code=MISSING_FIELDS`);
      return NextResponse.json(
        { success: false, code: "MISSING_FIELDS", error: "Nomor WhatsApp dan PIN wajib diisi" },
        { status: 400 }
      );
    }

    let normalizedInput: string;
    try {
      normalizedInput = normalizePhone(whatsapp);
    } catch (e) {
      return NextResponse.json(
        { success: false, code: "INVALID_PHONE", error: "Format nomor WhatsApp tidak valid" },
        { status: 400 }
      );
    }
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
    //    (Phase 2 cross-tenant model). Falls back to direct md_drivers scan.
    let candidates: any[] = [];
    let usedProfilePath = false;
    let resolvedProfileId: string | null = null;

    try {
      // [Multi-Tenant] Fetch ALL canonical profiles for this phone (duplicates can
      // exist across tenants). The oldest becomes canonical; links from duplicates
      // are re-pointed to it so every tenant resolves under one identity.
      const { data: profileRows, error: profileErr } = await supabaseAdmin
        .from("driver_profiles")
        .select("id, phone, pin_hash, full_name, created_at")
        .eq("phone", normalizedInput)
        .order("created_at", { ascending: true })
        .limit(10);

      if (!profileErr && profileRows && profileRows.length > 0) {
        resolvedProfileId = profileRows[0].id;

        const dupProfileIds = profileRows.slice(1).map((p) => p.id);
        if (dupProfileIds.length > 0) {
          const { error: healErr } = await supabaseAdmin
            .from("driver_tenant_links")
            .update({ profile_id: resolvedProfileId })
            .in("profile_id", dupProfileIds);
          if (!healErr) {
            console.log(
              `[DRIVER_LOGIN] Merged ${dupProfileIds.length} duplicate profile(s) into ${resolvedProfileId}`
            );
          }
        }

        const { data: linkRows, error: linkErr } = await supabaseAdmin
          .from("driver_tenant_links")
          .select("tenant_id, driver_id, is_active")
          .eq("profile_id", resolvedProfileId)
          .eq("is_active", true)
          .limit(50);

        if (!linkErr && linkRows && linkRows.length > 0) {
          const driverIds = linkRows.map((l) => l.driver_id).filter(Boolean);
          const { data: linkedDrivers, error: driversErr } = await supabaseAdmin
            .from("md_drivers")
            .select("id, name, whatsapp, pin, entity_id, is_active, tenant_id")
            .in("id", driverIds)
            .eq("is_active", true);

          if (!driversErr && linkedDrivers && linkedDrivers.length > 0) {
            usedProfilePath = true;
            candidates = linkedDrivers.map((d) => ({ ...d, profile_id: resolvedProfileId }));
          }
        }
      }
    } catch (e) {
      console.warn("[DRIVER_LOGIN] Profile lookup warning:", e);
    }

    // 2b. Fallback path — direct query on md_drivers
    if (candidates.length === 0) {
      const cleanPhone = normalizedInput.replace(/^62/, "");
      const { data: activeDrivers, error: fetchErr } = await supabaseAdmin
        .from("md_drivers")
        .select("id, name, whatsapp, pin, entity_id, is_active, tenant_id")
        .eq("is_active", true)
        .or(`whatsapp.eq.${normalizedInput},whatsapp.eq.0${cleanPhone},whatsapp.eq.62${cleanPhone}`)
        .limit(20);

      if (fetchErr) {
        console.error("[DRIVER_LOGIN] Failed to fetch drivers:", fetchErr);
        return NextResponse.json(
          { success: false, code: "INTERNAL_ERROR", error: "Terjadi kesalahan server" },
          { status: 500 }
        );
      }

      candidates = (activeDrivers || []).filter((d) => {
        if (!d.whatsapp) return false;
        const norm = normalizePhone(d.whatsapp);
        return (
          norm === normalizedInput ||
          d.whatsapp === normalizedInput ||
          d.whatsapp.replace(/\D/g, "") === normalizedInput.replace(/\D/g, "")
        );
      });

      if (resolvedProfileId) {
        candidates = candidates.map((d) => ({ ...d, profile_id: resolvedProfileId }));
      }
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

    // 3. Pick driver candidate
    let driver = (targetTenantId ? candidates.find((c) => c.tenant_id === targetTenantId) : null) || candidates[0];

    // 4. Verify PIN safely
    let pinValid = false;
    const storedPin = (driver.pin || "").toString().trim();
    if (storedPin !== "" && storedPin === inputPin) {
      pinValid = true;
    }

    if (!pinValid && candidates.length > 0) {
      pinValid = candidates.some((c) => (c.pin || "").toString().trim() === inputPin);
    }

    if (!pinValid) {
      console.log(`[DRIVER_LOGIN] phone_normalized=${normalizedInput} driver_found=true driver_id=${driver.id} tenant_id=${driver.tenant_id} pin_valid=false code=INVALID_CREDENTIALS`);
      return NextResponse.json(
        { success: false, code: "INVALID_CREDENTIALS", error: "Nomor WhatsApp atau PIN tidak valid." },
        { status: 401 }
      );
    }

    // 5. Generate Signed Driver JWT Session (Valid 30 Days)
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + 86400 * 30; // 30 days

    const tokenPayload = {
      sub: driver.id,
      driver_id: driver.id,
      role: "driver",
      tenant_id: driver.tenant_id,
      profile_id: driver.profile_id || null,
      linked_tenant_ids: Array.from(
        new Set(candidates.map((c) => c.tenant_id).filter(Boolean))
      ),
      iat: now,
      exp: expiresAt,
      iss: "sentralogis-driver",
      aud: "authenticated",
    };

    let signedJwt: string;
    try {
      signedJwt = signDriverJwt(tokenPayload);
    } catch (jwtErr: any) {
      console.error("[DRIVER_LOGIN] JWT signing failed:", jwtErr.message);
      return NextResponse.json(
        {
          success: false,
          code: "CONFIG_ERROR",
          error: "Konfigurasi keamanan server belum lengkap (secret missing).",
        },
        { status: 500 }
      );
    }

    // 6. Return safe driver info + signed JWT token
    const safeDriver = {
      id: driver.id,
      name: driver.name,
      whatsapp: driver.whatsapp,
      entity_id: driver.entity_id,
      driver_type: driver.entity_id ? "VENDOR" : "OWN",
      tenant_id: driver.tenant_id,
      profile_id: driver.profile_id || null,
    };

    console.log(`[DRIVER_LOGIN] phone_normalized=${normalizedInput} driver_found=true driver_id=${driver.id} tenant_id=${driver.tenant_id} pin_valid=true session_created=true code=OK`);

    const response = NextResponse.json({
      success: true,
      code: "OK",
      driver: safeDriver,
      session: {
        access_token: signedJwt,
        refresh_token: signedJwt,
        expires_at: expiresAt,
      },
    });

    response.cookies.set("sb-access-token", signedJwt, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 86400 * 30,
    });

    return response;
  } catch (err: any) {
    console.error("[DRIVER_LOGIN] Exception:", err);
    return NextResponse.json(
      { success: false, code: "INTERNAL_ERROR", error: err.message || "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
