import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const { to, templateSid, variables } = await request.json();

        console.log("=== REQUEST MASUK ===");
        console.log({ to, templateSid, variables });

        // ===============================
        // VALIDASI JELAS (ANTI BINGUNG)
        // ===============================
        if (!to) {
            return NextResponse.json(
                { success: false, error: 'Nomor tujuan kosong' },
                { status: 400 }
            );
        }

        if (!templateSid) {
            return NextResponse.json(
                { success: false, error: 'Template SID kosong' },
                { status: 400 }
            );
        }

        if (!Array.isArray(variables) || variables.length === 0) {
            return NextResponse.json(
                { success: false, error: 'Variables kosong' },
                { status: 400 }
            );
        }

        // ===============================
        // ENV
        // ===============================
        const accountSid = process.env.TWILIO_ACCOUNT_SID!;
        const authToken = process.env.TWILIO_AUTH_TOKEN!;
        const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER!;

        // ===============================
        // FORMAT NOMOR
        // ===============================
        let formatted = to.replace(/\D/g, '');

        if (formatted.startsWith('0')) {
            formatted = '62' + formatted.slice(1);
        }

        if (!formatted.startsWith('62')) {
            formatted = '62' + formatted;
        }

        const toWA = `whatsapp:+${formatted}`;

        // ===============================
        // VARIABLES FORMAT
        // ===============================
        const contentVars: Record<string, string> = {};

        variables.forEach((v: string, i: number) => {
            contentVars[(i + 1).toString()] = v || '-';
        });

        // ===============================
        // CALL TWILIO
        // ===============================
        const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

        const params = new URLSearchParams({
            From: fromNumber,
            To: toWA,
            ContentSid: templateSid,
            ContentVariables: JSON.stringify(contentVars),
        });

        const response = await fetch(
            `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
            {
                method: 'POST',
                headers: {
                    Authorization: `Basic ${auth}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: params.toString(),
            }
        );

        const result = await response.json();

        console.log("TWILIO RESULT:", result);

        if (!response.ok) {
            return NextResponse.json(
                {
                    success: false,
                    error: result.message,
                    code: result.code
                },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            sid: result.sid
        });

    } catch (err: any) {
        console.error("ERROR:", err);

        return NextResponse.json(
            { success: false, error: err.message },
            { status: 500 }
        );
    }
}