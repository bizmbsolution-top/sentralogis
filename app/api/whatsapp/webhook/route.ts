import { NextRequest, NextResponse } from "next/server";
import { WhatsAppCopilotGateway } from "@/src/application/whatsapp/WhatsAppCopilotGateway";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const body = formData.get("Body")?.toString();
    const from = formData.get("From")?.toString();

    console.log("=== INCOMING WA ===");
    console.log("From:", from);
    console.log("Message:", body);

    if (!body || !from) {
      return NextResponse.json({
        success: false,
        error: "Missing body or from",
      });
    }

    // Normalize incoming WhatsApp number: "whatsapp:+628123456789" -> "628123456789"
    const normalizedFrom = from.replace(/\D/g, "");
    const waNumber = normalizedFrom.startsWith("0")
      ? `62${normalizedFrom.substring(1)}`
      : normalizedFrom.startsWith("62")
        ? normalizedFrom
        : `62${normalizedFrom}`;

    const message = body.trim();

    // Delegate entirely to Copilot Gateway for processing intent
    await WhatsAppCopilotGateway.handleIncomingMessage(waNumber, message);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Webhook error:", error);
    return NextResponse.json({ success: false });
  }
}
