import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { job_order_id } = await request.json();

    if (!job_order_id) {
      return NextResponse.json({ error: "Missing job_order_id" }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data: jo, error: joErr } = await supabase
      .from("job_orders")
      .select("id, jo_number, tenant_id, fleet_id, driver_id, dispatch_ready")
      .eq("id", job_order_id)
      .single();

    if (joErr || !jo) {
      return NextResponse.json({ error: "JO not found" }, { status: 404 });
    }

    const now = new Date().toISOString();

    await supabase
      .from("job_orders")
      .update({
        dispatch_ready: true,
        dispatch_ready_at: now,
        updated_at: now,
      })
      .eq("id", job_order_id);

    // Push notification to Ground Staff
    const { data: groundStaff } = await supabase
      .from("ground_staff_profiles")
      .select("user_id")
      .eq("tenant_id", jo.tenant_id)
      .eq("is_active", true);

    if (groundStaff && groundStaff.length > 0) {
      const { data: subscriptions } = await supabase
        .from("push_subscriptions")
        .select("subscription")
        .in("user_id", groundStaff.map((gs: any) => gs.user_id));

      const notificationPayload = {
        title: `🚛 JO Baru: ${jo.jo_number}`,
        body: "JO baru sudah masuk ke antrian operasional. Segera proses.",
        icon: "/sentralogis_logo.svg",
        data: { jo_id: job_order_id, type: "ground_staff_dispatch" },
      };

      for (const sub of subscriptions || []) {
        try {
          await fetch(
            `${process.env.NEXT_PUBLIC_BASE_URL || request.nextUrl.origin}/api/push/send`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                subscription: sub.subscription,
                ...notificationPayload,
              }),
            }
          ).catch(() => {});
        } catch {}
      }

      await supabase.from("notifications").insert({
        tenant_id: jo.tenant_id,
        role: "ground_staff",
        type: "dispatch_ready",
        title: notificationPayload.title,
        message: notificationPayload.body,
        link: `/ground/dashboard`,
      });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[Ground Dispatch] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
