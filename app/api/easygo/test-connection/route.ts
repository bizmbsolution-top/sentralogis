// POST /api/easygo/test-connection
// Test EasyGo API connection

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { EasyGoClient } from '@/src/infrastructure/external/EasyGoClient';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tenant_id, api_token, api_url } = body;

    const url = api_url || 'https://vtsapi.easygo-gps.co.id';
    const token = api_token;

    if (!token) {
      return NextResponse.json({ error: 'api_token required' }, { status: 400 });
    }

    const client = new EasyGoClient(url, token);
    const result = await client.testConnection();

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[EasyGo Test Connection] Error:', error);
    return NextResponse.json(
      { success: false, vehicleCount: 0, message: error.message },
      { status: 500 }
    );
  }
}
