// GET/POST /api/easygo/config
// Manage EasyGo provider configuration

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Fetch EasyGo config for a tenant
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get('tenant_id');

    if (!tenantId) {
      return NextResponse.json({ error: 'tenant_id required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('gps_provider_configs')
      .select('id, provider_name, api_url, is_active, created_at, updated_at')
      .eq('tenant_id', tenantId)
      .eq('provider_name', 'easygo')
      .single();

    if (error || !data) {
      return NextResponse.json({ configured: false });
    }

    // Mask token for security
    return NextResponse.json({
      configured: true,
      ...data,
      api_token: '****' + '****', // Masked
    });
  } catch (error: any) {
    console.error('[EasyGo Config] GET Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST - Create or update EasyGo config
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tenant_id, api_token, api_url, is_active } = body;

    if (!tenant_id || !api_token) {
      return NextResponse.json(
        { error: 'tenant_id and api_token required' },
        { status: 400 }
      );
    }

    // Upsert config
    const { data, error } = await supabase
      .from('gps_provider_configs')
      .upsert(
        {
          tenant_id,
          provider_name: 'easygo',
          api_token,
          api_url: api_url || 'https://vtsapi.easygo-gps.co.id',
          is_active: is_active !== false,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'tenant_id,provider_name' }
      )
      .select('id, provider_name, api_url, is_active')
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, config: data });
  } catch (error: any) {
    console.error('[EasyGo Config] POST Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
