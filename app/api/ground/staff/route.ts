import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, phone, email, tenant_id } = body;

    console.log('[Ground Staff Create] Body:', JSON.stringify({ name, phone, email, tenant_id: tenant_id ? 'present' : 'missing' }));

    if (!name) {
      return NextResponse.json({ error: "Missing name" }, { status: 400 });
    }
    if (!tenant_id) {
      return NextResponse.json({ error: "Missing tenant_id" }, { status: 400 });
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('[Ground Staff Create] SUPABASE_SERVICE_ROLE_KEY is NOT set!');
    }

    const supabase = createAdminClient();

    const userEmail = email || `${name.toLowerCase().replace(/\s+/g, '.')}.${Date.now()}@ground.sentralogis.local`;
    const password = Math.random().toString(36).slice(2, 10) + "Aa1!";

    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email: userEmail,
      password,
      email_confirm: true,
    });

    if (authErr) {
      console.error('[Ground Staff Create] Auth error:', authErr);
      return NextResponse.json({ error: authErr.message }, { status: 400 });
    }

    const { error: profileErr } = await supabase.from("ground_staff_profiles").insert({
      user_id: authData.user.id,
      tenant_id,
      name,
      phone: phone || null,
    });

    if (profileErr) {
      await supabase.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json({ error: profileErr.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      user: {
        email: userEmail,
        password,
        name,
      },
    });
  } catch (err: any) {
    console.error('[Ground Staff Create] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { id, name, phone, user_id } = await request.json();

    if (!id || !name) {
      return NextResponse.json({ error: "Missing id or name" }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { error: updateErr } = await supabase
      .from("ground_staff_profiles")
      .update({ name, phone: phone || null, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 400 });
    }

    if (user_id) {
      await supabase.auth.admin.updateUserById(user_id, { email_confirm: true });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[Ground Staff Update] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { id, user_id } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { error: profileErr } = await supabase
      .from("ground_staff_profiles")
      .delete()
      .eq("id", id);

    if (profileErr) {
      return NextResponse.json({ error: profileErr.message }, { status: 400 });
    }

    if (user_id) {
      await supabase.auth.admin.deleteUser(user_id);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[Ground Staff Delete] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}