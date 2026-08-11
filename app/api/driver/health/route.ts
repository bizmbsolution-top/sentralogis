import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

// Lightweight server health check for the Driver App "Info Perangkat" center.
// Performs a real query against Supabase and returns the measured latency.
// Does not expose any secrets or session information.
export async function GET() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      return NextResponse.json(
        { ok: false, error: "Server configuration incomplete" },
        { status: 503 },
      );
    }

    const supabase = createClient(url, key);
    const started = Date.now();
    const { error } = await supabase
      .from("job_orders")
      .select("id")
      .limit(1);
    const latency = Date.now() - started;

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 503 },
      );
    }

    return NextResponse.json({
      ok: true,
      ts: new Date().toISOString(),
      latency,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e.message || "Unknown error" },
      { status: 503 },
    );
  }
}
