import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const body = await request.json()
    const { latitude, longitude } = body
    const supabaseAdmin = createAdminClient()

    if (!token) {
      return NextResponse.json({ error: 'Token missing' }, { status: 400 })
    }

    if (!latitude || !longitude) {
      return NextResponse.json({ error: 'Coordinates missing' }, { status: 400 })
    }

    // 1. Ambil JO id berdasarkan token
    const { data: joData, error: fetchError } = await supabaseAdmin
      .from('job_orders')
      .select('id, status')
      .eq('driver_link_token', token)
      .single()

    if (fetchError || !joData) {
      return NextResponse.json({ error: 'Job Order not found' }, { status: 404 })
    }

    // 2. Simpan ke tracking_updates
    const { error: trackingError } = await supabaseAdmin
      .from('tracking_updates')
      .insert({
        job_order_id: joData.id,
        latitude,
        longitude,
        status_update: 'Live GPS Update',
        whatsapp_sent: false
      })

    if (trackingError) {
      console.error('Error saving live tracking:', trackingError)
      return NextResponse.json({ error: trackingError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('Tracking API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
