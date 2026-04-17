import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();

        const body = formData.get('Body')?.toString();
        const from = formData.get('From')?.toString();

        console.log("=== INCOMING WA ===");
        console.log("From:", from);
        console.log("Message:", body);

        // ==================================
        // CONTOH LOGIC
        // ==================================
        if (body?.toLowerCase() === 'ok') {
            console.log("Driver ACCEPT job");

            // TODO: update Supabase di sini
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("Webhook error:", error);
        return NextResponse.json({ success: false });
    }
}