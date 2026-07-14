import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { channelId, message } = body || {};
    if (!channelId || !message) {
      return NextResponse.json(
        { error: "channelId and message are required" },
        { status: 400 },
      );
    }

    const botUserId =
      process.env.SUPABASE_BOT_USER_ID || process.env.SYSTEM_BOT_USER_ID;
    if (!botUserId) {
      return NextResponse.json(
        { error: "Server not configured: SUPABASE_BOT_USER_ID missing" },
        { status: 500 },
      );
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("chat_messages")
      .insert({
        channel_id: channelId,
        sender_id: botUserId,
        message: message,
        parent_id: null,
        context_type: "system",
        context_id: null,
      })
      .select()
      .single();

    if (error) {
      console.error("[persist-bot] insert error", error);
      return NextResponse.json({ error: "db insert failed" }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (e) {
    console.error("[persist-bot] unexpected", e);
    return NextResponse.json({ error: "unexpected error" }, { status: 500 });
  }
}
