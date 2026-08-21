import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      job_order_id, event_type, site_id, latitude, longitude,
      photo_base64, ocr_json, container_number, notes,
      verification_type, verified_against, verified_match,
      documents,
    } = body;

    if (!job_order_id || !event_type) {
      return NextResponse.json({ error: "Missing job_order_id or event_type" }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data: { user } } = await supabase.auth.getUser();
    const userName = user?.email || "Ground Staff";

    let photoUrl: string | null = null;

    if (photo_base64) {
      try {
        const base64Data = photo_base64.split(",")[1] || photo_base64;
        const buffer = Buffer.from(base64Data, "base64");
        const fileName = `ground-events/${job_order_id}/${event_type}_${Date.now()}.jpg`;

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
          photoUrl = publicUrl;
        } else {
          const { data: { publicUrl } } = supabase.storage.from("pod_documents").getPublicUrl(fileName);
          photoUrl = publicUrl;
        }
      } catch (uploadErr: any) {
        console.warn("[Ground Event] Photo upload failed:", uploadErr);
      }
    }

    const { data: eventData, error: eventErr } = await supabase
      .from("ground_events")
      .insert({
        job_order_id,
        event_type,
        captured_by: user?.id || null,
        captured_by_name: userName,
        site_id: site_id || null,
        latitude: latitude || null,
        longitude: longitude || null,
        photo_url: photoUrl,
        ocr_json: ocr_json || {},
        notes: notes || null,
        source: "ground_staff",
        verification_type: verification_type || null,
        verified_against: verified_against || null,
        verified_match: verified_match ?? null,
      })
      .select()
      .single();

    if (eventErr) throw eventErr;

    const statusUpdate: Record<string, string | null> = {
      GATE_IN_DEPOT: "TIBA DI LOKASI MUAT",
      GATE_OUT_DEPOT: "BERANGKAT DARI LOKASI MUAT",
      GATE_IN_FACTORY: "TIBA DI LOKASI TRANSIT",
      GATE_OUT_FACTORY: "MELANJUTKAN PERJALANAN",
      GATE_IN_PORT: "TIBA DI LOKASI BONGKAR",
      GATE_OUT_PORT: "PEKERJAAN SELESAI",
      LOADING_START: "LOADING",
      LOADING_FINISH: "LOADING_SELESAI",
      POD: "MENUNGGU SELESAI",
      PIC1_GATE_IN: "TIBA DI LOKASI MUAT",
      PIC2_GATE_OUT: "BERANGKAT DARI LOKASI MUAT",
      PIC1_DROPOFF_ARRIVE: "TIBA DI LOKASI BONGKAR",
      PIC_DROPOFF_DOCUMENT: null,
    };

    const newStatus = statusUpdate[event_type];
    if (newStatus) {
      const updatePayload: any = { updated_at: new Date().toISOString() };
      if (newStatus === "PEKERJAAN SELESAI") {
        updatePayload.status = "PEKERJAAN SELESAI";
        updatePayload.completed_at = new Date().toISOString();
      } else if (newStatus === "MENUNGGU SELESAI") {
        updatePayload.status = "MENUNGGU SELESAI";
      } else {
        updatePayload.status = newStatus;
      }

      await supabase.from("job_orders").update(updatePayload).eq("id", job_order_id);
    }

    if (container_number) {
      await supabase
        .from("job_orders")
        .update({ container_number, updated_at: new Date().toISOString() })
        .eq("id", job_order_id);
    }

    const eventLabels: Record<string, string> = {
      GATE_IN_DEPOT: "Gate In Depot",
      GATE_OUT_DEPOT: "Gate Out Depot",
      GATE_IN_FACTORY: "Gate In Factory",
      GATE_OUT_FACTORY: "Gate Out Factory",
      GATE_IN_PORT: "Gate In Port",
      GATE_OUT_PORT: "Gate Out Port",
      LOADING_START: "Loading Start",
      LOADING_FINISH: "Loading Finish",
      DOCUMENT_HANDOVER: "Dokumen Diserahkan",
      CONTAINER_INSPECTION: "Inspeksi Kontainer",
      DAMAGE_REPORT: "Laporan Kerusakan",
      SEAL_INSPECTION: "Inspeksi Seal",
      POD: "Proof of Delivery",
      PIC1_GATE_IN: "PIC1 Gate In (Plat + SIM)",
      PIC2_GATE_OUT: "PIC2 Gate Out (Dokumen + Plat)",
      PIC1_DROPOFF_ARRIVE: "PIC Dropoff Truck Tiba",
      PIC_DROPOFF_DOCUMENT: "PIC Dropoff Dokumen",
    };

    await supabase.from("job_tracking").insert({
      job_order_id,
      status_update: `${eventLabels[event_type] || event_type} — ${userName}`,
      latitude: latitude || null,
      longitude: longitude || null,
      notes: notes || null,
      photo_url: photoUrl,
    });

    if (documents && Array.isArray(documents) && documents.length > 0) {
      const docInserts = documents.map((doc: any) => ({
        ground_event_id: eventData.id,
        job_order_id,
        document_type: doc.document_type || "other",
        file_url: doc.file_url,
        notes: doc.notes || null,
      }));
      await supabase.from("ground_documents").insert(docInserts);
    }

    return NextResponse.json({ success: true, event: eventData });
  } catch (err: any) {
    console.error("[Ground Event] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
