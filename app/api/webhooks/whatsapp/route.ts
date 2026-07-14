import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase admin client to bypass RLS for webhook
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// GET request for Meta Webhook Verification
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'sentralogis-wa-secret';

  if (mode && token) {
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      return new NextResponse(challenge, { status: 200 });
    }
    return new NextResponse('Forbidden', { status: 403 });
  }
  return new NextResponse('Bad Request', { status: 400 });
}

// POST request for Meta Webhook Payload
export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (body.object) {
      // Check if this is a message payload
      if (
        body.entry &&
        body.entry[0].changes &&
        body.entry[0].changes[0] &&
        body.entry[0].changes[0].value.messages &&
        body.entry[0].changes[0].value.messages[0]
      ) {
        const from = body.entry[0].changes[0].value.messages[0].from; // sender phone
        const msg_body = body.entry[0].changes[0].value.messages[0].text.body; // text
        const sender_name = body.entry[0].changes[0].value.contacts?.[0]?.profile?.name || 'WA Guest';

        // 1. Find the master contact matching this phone number
        const { data: entity, error: entityErr } = await supabaseAdmin
          .from('md_entities')
          .select('id, name')
          .eq('phone', from)
          .single();

        if (entityErr || !entity) {
          console.warn(`Received WA from unknown number ${from}. Ignoring.`);
          return NextResponse.json({ status: 'ignored_unknown_contact' }, { status: 200 });
        }

        // 2. Find or create the chat channel for this lead
        let { data: channel, error: channelErr } = await supabaseAdmin
          .from('chat_channels')
          .select('id')
          .eq('channel_type', 'lead')
          .eq('channel_id', entity.id)
          .single();

        if (channelErr || !channel) {
          const { data: newChannel } = await supabaseAdmin
            .from('chat_channels')
            .insert([{
              channel_type: 'lead',
              channel_id: entity.id,
              title: `WA Chat: ${entity.name}`
            }])
            .select('id')
            .single();
          channel = newChannel;
        }

        if (!channel) throw new Error("Failed to get/create channel");

        // 3. Insert the message into chat_messages
        await supabaseAdmin
          .from('chat_messages')
          .insert([{
            channel_id: channel.id,
            guest_sender_name: sender_name,
            message: msg_body
            // sender_id is NULL for external guests
          }]);

        // 4. Also insert into crm_activities to show in MOM
        await supabaseAdmin
          .from('crm_activities')
          .insert([{
            entity_id: entity.id,
            activity_type: 'WHATSAPP',
            description: `Received WhatsApp message:\n\n"${msg_body}"`,
            performed_by_name: sender_name
          }]);

        return NextResponse.json({ status: 'success' }, { status: 200 });
      }
      // If it's a status update payload (read, delivered, etc)
      return NextResponse.json({ status: 'success' }, { status: 200 });
    }
    return NextResponse.json({ status: 'invalid_format' }, { status: 400 });
  } catch (error: any) {
    console.error("WA Webhook Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
