import { NextRequest, NextResponse } from 'next/server';
import { sendWhatsAppMessage } from '@/lib/twilio/clients';

export async function POST(req: NextRequest) {
  try {
    const body: {
      type: string;
      message: string;
      recipient: string;
      receiptId: string;
      receiptNumber: string;
      recipientName?: string;
    } = await req.json();

    if (!body.recipient || !body.message || !body.receiptId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const result = await sendWhatsAppMessage(body.recipient, body.message);

    // Log notification to database
    const { supabase } = await import('@/lib/supabaseClient');
    await supabase.from('wh_wa_notifications').insert({
      receipt_id: body.receiptId,
      receipt_number: body.receiptNumber,
      recipient: body.recipient,
      recipient_name: body.recipientName || '-',
      message_type: body.type,
      message_body: body.message,
      status: result.success ? 'SENT' : 'FAILED',
      error_message: result.success ? null : result.error || null,
    });

    return NextResponse.json({ success: result.success, sid: result.sid });
  } catch (err) {
    console.error('[API wa-notify] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    );
  }
}
