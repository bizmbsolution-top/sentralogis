import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET: Ambil data JO berdasarkan token
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const supabaseAdmin = createAdminClient()

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Token tidak ditemukan' },
        { status: 400 }
      )
    }

    console.log("Fetching JO with token:", token)

    // Ambil data Job Order (tanpa relasi yang kompleks)
    const { data: joData, error: joError } = await supabaseAdmin
      .from('job_orders')
      .select('*')
      .eq('driver_link_token', token)
      .single()

    if (joError) {
      console.error('Error fetching JO:', joError)
      if (joError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Job Order tidak ditemukan' },
          { status: 404 }
        )
      }
      return NextResponse.json(
        { error: joError.message },
        { status: 500 }
      )
    }

    if (!joData) {
      return NextResponse.json(
        { error: 'Job Order tidak ditemukan' },
        { status: 404 }
      )
    }

    // Ambil data Work Order
    const { data: woData, error: woError } = await supabaseAdmin
      .from('work_orders')
      .select('*')
      .eq('id', joData.work_order_id)
      .single()

    if (woError) {
      console.error('Error fetching WO:', woError)
    }

    // Ambil data Customer
    let customerData = null
    if (woData && woData.customer_id) {
      const { data: customer } = await supabaseAdmin
        .from('customers')
        .select('name, company_name, address, city, province, billing_method')
        .eq('id', woData.customer_id)
        .single()
      customerData = customer
    }

    // Ambil data Work Order Item
    const { data: itemData, error: itemError } = await supabaseAdmin
      .from('work_order_items')
      .select('*')
      .eq('id', joData.work_order_item_id)
      .single()

    if (itemError) {
      console.error('Error fetching item:', itemError)
    }

    // Ambil data Fleet
    const { data: fleetData, error: fleetError } = await supabaseAdmin
      .from('fleets')
      .select('*')
      .eq('id', joData.fleet_id)
      .single()

    if (fleetError) {
      console.error('Error fetching fleet:', fleetError)
    }

    // Ambil data Locations untuk origin dan destination
    let originLocation = null
    let destinationLocation = null

    if (itemData) {
      if (itemData.origin_location_id) {
        const { data: origin } = await supabaseAdmin
          .from('locations')
          .select('*')
          .eq('id', itemData.origin_location_id)
          .single()
        originLocation = origin
      }

      if (itemData.destination_location_id) {
        const { data: dest } = await supabaseAdmin
          .from('locations')
          .select('*')
          .eq('id', itemData.destination_location_id)
          .single()
        destinationLocation = dest
      }
    }

    // Ambil tracking updates
    const { data: trackingData, error: trackingError } = await supabaseAdmin
      .from('tracking_updates')
      .select('*')
      .eq('job_order_id', joData.id)
      .order('created_at', { ascending: false })

    if (trackingError) {
      console.error('Error fetching tracking:', trackingError)
    }

    // Ambil documents
    const { data: documentsData, error: docsError } = await supabaseAdmin
      .from('documents')
      .select('*')
      .eq('job_order_id', joData.id)

    if (docsError) {
      console.error('Error fetching documents:', docsError)
    }

    // Format response
    const formattedData = {
      id: joData.id,
      jo_number: joData.jo_number,
      status: joData.status,
      driver_link_token: joData.driver_link_token,
      created_at: joData.created_at,
      updated_at: joData.updated_at,
      actual_delivery_time: joData.actual_delivery_time,
      work_order: woData ? {
        wo_number: woData.wo_number,
        order_date: woData.order_date,
        execution_date: woData.execution_date,
        notes: woData.notes,
        billing_method: customerData ? customerData.billing_method : 'hardcopy',
        customer_name: customerData ? (customerData.company_name || customerData.name) : '-',
        customer_address: customerData ? `${customerData.address || ''}, ${customerData.city || ''}, ${customerData.province || ''}`.replace(/^, |, $/, '') : '-'
      } : null,
      work_order_item: itemData ? {
        id: itemData.id,
        truck_type: itemData.truck_type,
        quantity: itemData.quantity,
        deal_price: itemData.deal_price,
        origin_location: originLocation,
        destination_location: destinationLocation
      } : null,
      fleet: fleetData ? {
        plate_number: fleetData.plate_number,
        driver_name: fleetData.driver_name,
        driver_phone: fleetData.driver_phone
      } : null,
      tracking_updates: trackingData || [],
      documents: documentsData || []
    }

    console.log("JO data found:", joData.jo_number)
    return NextResponse.json(formattedData)

  } catch (error: any) {
    console.error('GET /api/jo/[token] error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH: Update status JO
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const body = await request.json()
    const { status, location } = body
    const supabaseAdmin = createAdminClient()

    if (!token) {
      return NextResponse.json(
        { error: 'Token tidak ditemukan' },
        { status: 400 }
      )
    }

    if (!status) {
      return NextResponse.json(
        { error: 'Status wajib diisi' },
        { status: 400 }
      )
    }

    // Validasi status
    const validStatuses = ['assigned', 'accepted', 'picking_up', 'delivering', 'delivered', 'cancelled', 'incident']
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Status tidak valid' },
        { status: 400 }
      )
    }

    // Ambil JO data
    const { data: joData, error: fetchError } = await supabaseAdmin
      .from('job_orders')
      .select('id')
      .eq('driver_link_token', token)
      .single()

    if (fetchError) {
      return NextResponse.json(
        { error: 'Job Order tidak ditemukan' },
        { status: 404 }
      )
    }

    if (status !== 'incident') {
      const updateData: any = { status }

      if (status === 'delivered') {
        updateData.actual_delivery_time = new Date().toISOString()
      }

      if (status === 'picking_up') {
        updateData.actual_pickup_time = new Date().toISOString()
      }

      const { error: updateError } = await supabaseAdmin
        .from('job_orders')
        .update(updateData)
        .eq('driver_link_token', token)

      if (updateError) {
        console.error('Error updating JO:', updateError)
        return NextResponse.json(
          { error: updateError.message },
          { status: 500 }
        )
      }
    }

    // Simpan tracking update
    const statusMessages: Record<string, string> = {
      assigned: 'Job Order telah diassign ke armada',
      accepted: 'Driver telah Menerima Job Order',
      picking_up: 'Driver menuju lokasi pickup',
      delivering: 'Barang sedang dimuat/dikirim',
      delivered: 'Barang telah sampai di tujuan',
      cancelled: 'Job Order dibatalkan',
      incident: '🚨 PANIC BUTTON: Laporan Insiden Darurat dari Driver!',
    }

    const { error: trackingError } = await supabaseAdmin
      .from('tracking_updates')
      .insert({
        job_order_id: joData.id,
        location: location || null,
        status_update: statusMessages[status] || status,
        whatsapp_sent: false,
      })

    if (trackingError) {
      console.error('Error saving tracking:', trackingError)
    }

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('PATCH error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST: Upload dokumen
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const formData = await request.formData()
    const file = formData.get('file') as File
    const docType = formData.get('doc_type') as string || 'surat_jalan'
    const supabaseAdmin = createAdminClient()

    if (!token) {
      return NextResponse.json(
        { error: 'Token tidak ditemukan' },
        { status: 400 }
      )
    }

    if (!file) {
      return NextResponse.json(
        { error: 'File wajib diupload' },
        { status: 400 }
      )
    }

    // Ambil JO data
    const { data: joData, error: fetchError } = await supabaseAdmin
      .from('job_orders')
      .select('id')
      .eq('driver_link_token', token)
      .single()

    if (fetchError) {
      return NextResponse.json(
        { error: 'Job Order tidak ditemukan' },
        { status: 404 }
      )
    }

    // Simpan ke Supabase Storage
    const fileExtension = file.name.split('.').pop()
    const fileName = `${joData.id}/${Date.now()}.${fileExtension}`

    const { data: uploadData, error: uploadError } = await supabaseAdmin
      .storage
      .from('documents')
      .upload(fileName, file, {
        contentType: file.type,
        upsert: true
      })

    if (uploadError) {
      console.error('Error uploading to storage:', uploadError)
      return NextResponse.json(
        { error: 'Gagal upload file ke storage: ' + uploadError.message },
        { status: 500 }
      )
    }

    // Ambil Public URL
    const { data: { publicUrl } } = supabaseAdmin
      .storage
      .from('documents')
      .getPublicUrl(fileName)

    // Simpan ke tabel documents
    const { error: docError } = await supabaseAdmin
      .from('documents')
      .insert({
        job_order_id: joData.id,
        doc_type: docType,
        file_url: publicUrl,
        uploaded_by: 'driver',
      })

    if (docError) {
      console.error('Error saving document to DB:', docError)
      return NextResponse.json(
        { error: docError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Dokumen berhasil diupload',
      file_url: publicUrl
    })

  } catch (error: any) {
    console.error('POST error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}