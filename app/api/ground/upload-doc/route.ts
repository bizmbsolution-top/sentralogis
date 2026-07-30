import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { job_order_id, document_type, file_base64, file_name } = await request.json();

    if (!file_base64 || !document_type) {
      return NextResponse.json({ error: "Missing file_base64 or document_type" }, { status: 400 });
    }

    const supabase = createAdminClient();

    const buffer = Buffer.from(file_base64, "base64");
    const fileName = file_name || `ground-docs/${job_order_id || 'unknown'}/${document_type}_${Date.now()}.jpg`;

    let fileUrl: string | null = null;

    const { error: uploadErr } = await supabase.storage
      .from("pod_documents")
      .upload(fileName, buffer, {
        contentType: "image/jpeg",
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadErr) {
      const { data: fbData, error: fbErr } = await supabase.storage
        .from("driver-portal")
        .upload(fileName, buffer, {
          contentType: "image/jpeg",
          cacheControl: "3600",
          upsert: false,
        });
      if (fbErr) throw fbErr;
      const { data: { publicUrl } } = supabase.storage.from("driver-portal").getPublicUrl(fileName);
      fileUrl = publicUrl;
    } else {
      const { data: { publicUrl } } = supabase.storage.from("pod_documents").getPublicUrl(fileName);
      fileUrl = publicUrl;
    }

    return NextResponse.json({ success: true, file_url: fileUrl });
  } catch (err: any) {
    console.error("[Ground Upload Doc] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
