import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { job_order_id, pic1_staff_id, pic2_staff_id } = await request.json();

    if (!job_order_id) {
      return NextResponse.json({ error: "Missing job_order_id" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { data: existing } = await supabase
      .from("ground_assignment_pics")
      .select("id")
      .eq("job_order_id", job_order_id)
      .maybeSingle();

    let result;
    if (existing) {
      result = await supabase
        .from("ground_assignment_pics")
        .update({
          pic1_staff_id: pic1_staff_id || null,
          pic2_staff_id: pic2_staff_id || null,
          assigned_by: user?.id || null,
          updated_at: new Date().toISOString(),
        })
        .eq("job_order_id", job_order_id)
        .select()
        .single();
    } else {
      result = await supabase
        .from("ground_assignment_pics")
        .insert({
          job_order_id,
          pic1_staff_id: pic1_staff_id || null,
          pic2_staff_id: pic2_staff_id || null,
          assigned_by: user?.id || null,
        })
        .select()
        .single();
    }

    if (result.error) throw result.error;

    return NextResponse.json({ success: true, data: result.data });
  } catch (err: any) {
    console.error("[Ground Assign PIC] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobOrderId = searchParams.get("job_order_id");

    if (!jobOrderId) {
      return NextResponse.json({ error: "Missing job_order_id" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("ground_assignment_pics")
      .select(`
        id, job_order_id, pic1_staff_id, pic2_staff_id, assigned_by, created_at, updated_at,
        pic1:ground_staff_profiles!pic1_staff_id(id, name, phone),
        pic2:ground_staff_profiles!pic2_staff_id(id, name, phone)
      `)
      .eq("job_order_id", jobOrderId)
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error("[Ground Get Assign PIC] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
