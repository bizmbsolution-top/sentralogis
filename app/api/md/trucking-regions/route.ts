import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenant_id");

    if (!tenantId) {
      return NextResponse.json({ error: "Missing tenant_id" }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("md_trucking_regions")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("GET trucking-regions error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tenant_id, name, level } = body;

    if (!tenant_id) {
      return NextResponse.json({ error: "Missing tenant_id" }, { status: 400 });
    }
    if (!name) {
      return NextResponse.json({ error: "Missing name" }, { status: 400 });
    }
    if (!level || !["PROVINCE", "CITY"].includes(level)) {
      return NextResponse.json({ error: "level must be PROVINCE or CITY" }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("md_trucking_regions")
      .insert({ tenant_id, name, level, is_active: true })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error: any) {
    console.error("POST trucking-regions error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
