import { NextRequest, NextResponse } from "next/server";
import { WhatsAppCopilotGateway } from "@/src/application/whatsapp/WhatsAppCopilotGateway";
import { sendWhatsAppMessage } from "@/lib/twilio/clients";
import { createAdminClient } from "@/lib/supabase/admin";
import { createAdminClient } from "@/lib/supabase/admin";

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

    // Handle KOIN inquiry before Copilot Gateway
    if (message.toUpperCase() === "KOIN") {
      const supabaseAdmin = createAdminClient();
      
      // Resolve driver by WhatsApp number
      const { data: driver, error: driverErr } = await supabaseAdmin
        .from("md_drivers")
        .select("id, name, tenant_id")
        .or(`whatsapp.eq.${waNumber},phone.eq.${waNumber}`)
        .maybeSingle();

      if (driverErr || !driver) {
        await sendWhatsAppMessage(
          waNumber,
          "Halo! Nomor ini belum terdaftar sebagai driver di sistem Sentralogis. Silakan hubungi admin untuk pendaftaran."
        );
        return NextResponse.json({ success: true });
      }

      // Get coin balance via canonical RPC
      const { data: balance, error: balanceErr } = await supabaseAdmin
        .rpc("get_driver_coin_balance", {
          p_driver_id: driver.id,
        });

      if (balanceErr || !balance || balance.length === 0) {
        await sendWhatsAppMessage(
          waNumber,
          `Halo ${driver.name}! Saat ini belum ada data koin untuk akun Anda.`
        );
        return NextResponse.json({ success: true });
      }

      const totalCoins = balance[0]?.total_coins || 0;
      const totalValue = balance[0]?.total_coin_value || 0;
      const formattedValue = new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
      }).format(totalValue);

      await sendWhatsAppMessage(
        waNumber,
        `🪙 *Saldo Koin Driver*\n\nHalo ${driver.name}!\n\nTotal Koin: ${totalCoins}\nNilai: ${formattedValue}\n\n1 Koin = Rp 5.000`
      );

      return NextResponse.json({ success: true });
    }

    // Delegate non-KOIN messages to Copilot Gateway for processing intent
    await WhatsAppCopilotGateway.handleIncomingMessage(waNumber, message);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Webhook error:", error);
    return NextResponse.json({ success: false });
  }
}
