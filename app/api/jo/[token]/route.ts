import { createAdminClient } from '@/lib/supabase/admin'
import { createJournalEntry } from '@/lib/finance/journaling'

// GET: Ambil data JO berdasarkan tracking_token
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const supabase = createAdminClient()

    if (!token) {
      return NextResponse.json({ error: 'Token tidak ditemukan' }, { status: 400 })
    }

    // 1. Ambil data Job Order
    const { data: jobOrder, error: joError } = await supabase
      .from('job_orders')
      .select(`
        id,
        jo_number,
        status,
        tenant_id,
        wo_item_id,
        tracking_token,
        driver_phone,
        accepted_at,
        started_at,
        loaded_at,
        unloaded_at,
        completed_at,
        pod_photo_url,
        wo_item:wo_item_id (
          id,
          item_code,
          sbu_type,
          item_data,
          wo:wo_id (
            id,
            wo_number,
            customer_id,
            execution_date,
            notes
          )
        )
      `)
      .eq('tracking_token', token)
      .maybeSingle()

    if (joError) throw joError
    if (!jobOrder) return NextResponse.json({ error: 'Job Order tidak ditemukan' }, { status: 404 })

    const woItem: any = jobOrder.wo_item
    const workOrder: any = woItem?.wo

    // 2. Ambil rute terpisah
    const { data: routes } = await supabase
      .from('job_routes')
      .select('*')
      .eq('job_order_id', jobOrder.id)
      .order('sequence', { ascending: true })

    // 3. Ambil customer info
    let customer = null
    if (workOrder?.customer_id) {
      const { data: customerData } = await supabase
        .from('md_entities')
        .select('name, billing_address, phone')
        .eq('id', workOrder.customer_id)
        .single()
      
      if (customerData) {
        customer = {
          name: customerData.name,
          address: customerData.billing_address,
          phone: customerData.phone
        }
      }
    }

    // 4. Ambil Tenant Info (gunakan tenants, bukan md_tenants)
    let tenantName = 'SENTRALOGIS'
    if (jobOrder.tenant_id) {
      const { data: tenantData } = await supabase
        .from('tenants')
        .select('name')
        .eq('id', jobOrder.tenant_id)
        .maybeSingle()
      if (tenantData?.name) tenantName = tenantData.name
    }

    return NextResponse.json({ 
      success: true, 
      data: {
        ...jobOrder,
        routes: routes || [],
        customer,
        tenant_name: tenantName,
        wo_details: {
          wo_number: workOrder?.wo_number || 'N/A',
          execution_date: workOrder?.execution_date || woItem?.item_data?.execution_date || null,
          execution_time: woItem?.item_data?.execution_time || null
        }
      }
    })
  } catch (err: any) {
    console.error('[API] GET error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// PATCH: Update status & tracking
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const { status, route_id, route_status, pod_photo_url, lat, lng } = await request.json()
    const supabase = createAdminClient()

    // 1. Cari JO
    const { data: jo } = await supabase
      .from('job_orders')
      .select('id, jo_number, wo_item_id, base_price, driver_share_percentage')
      .eq('tracking_token', token)
      .maybeSingle()

    if (!jo) return NextResponse.json({ error: 'JO not found' }, { status: 404 })

    // 2. UPDATE RUTE PER STOP
    if (route_id && (route_status || pod_photo_url)) {
      const routeUpdate: any = {}
      if (route_status) routeUpdate.status = route_status
      if (pod_photo_url) routeUpdate.pod_photo_url = pod_photo_url
      
      if (lat && lng) {
        routeUpdate.latitude = lat
        routeUpdate.longitude = lng
      }
      
      if (route_status === 'arrived') routeUpdate.actual_arrival = new Date().toISOString()
      if (route_status === 'completed') routeUpdate.actual_departure = new Date().toISOString()

      const { error: routeError } = await supabase
        .from('job_routes')
        .update(routeUpdate)
        .eq('id', route_id)
      
      if (routeError) throw routeError

      // AUTO-UPDATE loaded_at / unloaded_at on JO
      if (route_status === 'completed') {
        const { data: routeInfo } = await supabase
          .from('job_routes')
          .select('stop_type')
          .eq('id', route_id)
          .maybeSingle()
          
        if (routeInfo?.stop_type === 'PICKUP') {
          await supabase
            .from('job_orders')
            .update({ loaded_at: new Date().toISOString() })
            .eq('id', jo.id)
        } else if (routeInfo?.stop_type === 'DROPOFF') {
          await supabase
            .from('job_orders')
            .update({ unloaded_at: new Date().toISOString() })
            .eq('id', jo.id)
        }
      }

      // Log ke job_tracking (optional, skip jika tabel tidak ada)
      try {
        await supabase.from('job_tracking').insert({
          job_order_id: jo.id,
          status_update: pod_photo_url ? 'PHOTO_UPLOADED' : `STOP_${route_status?.toUpperCase() || 'UPDATED'}`,
          latitude: lat,
          longitude: lng,
          notes: `Route ID: ${route_id}${pod_photo_url ? ' (Photo Attached)' : ''}`
        })
      } catch (e) {
        console.warn('[API] Tracking log failed (table mungkin tidak ada):', e)
      }

      return NextResponse.json({ success: true })
    }

    // 3. UPDATE STATUS GLOBAL JO
    if (status) {
      const newStatus = status
      const updateData: any = { 
        status: newStatus, 
        updated_at: new Date().toISOString() 
      }
      
      if (newStatus === 'accepted') updateData.accepted_at = new Date().toISOString()
      if (newStatus === 'in_progress') updateData.started_at = new Date().toISOString()
      if (newStatus === 'completed') updateData.completed_at = new Date().toISOString()

      if (joUpdateError) throw joUpdateError
      
      // AUTO-JOURNALING ON COMPLETION
      if (newStatus === 'completed' && jo.base_price > 0) {
        try {
          await createJournalEntry({
            jobOrderId: jo.id,
            amount: jo.base_price,
            description: \`Main Revenue for JO \${jo.jo_number}\`,
            sourceType: 'job_order_revenue',
            metadata: {
              driver_share_percentage: jo.driver_share_percentage
            }
          });
        } catch (e) {
          console.error('[API] Auto-journaling failed:', e);
        }
      }

      // SINKRONISASI STATUS BERTAHAP
      if (jo.wo_item_id) {
        try {
          // Cek apakah SEMUA JO untuk WO_ITEM ini sudah selesai?
          const { data: siblingJos } = await supabase
            .from('job_orders')
            .select('id, status')
            .eq('wo_item_id', jo.wo_item_id)
          
          const allJosDone = siblingJos?.every(j => j.status === 'completed')
          
          if (allJosDone) {
            // Jika semua truk di item ini selesai, update status WO_ITEM
            await supabase
              .from('wo_items')
              .update({ status: 'completed' })
              .eq('id', jo.wo_item_id)
            
            // Cek apakah SEMUA ITEM di WO ini sudah selesai?
            const { data: currentItem } = await supabase
              .from('wo_items')
              .select('wo_id')
              .eq('id', jo.wo_item_id)
              .maybeSingle()
              
            if (currentItem?.wo_id) {
              const { data: allWoItems } = await supabase
                .from('wo_items')
                .select('id, status')
                .eq('wo_id', currentItem.wo_id)
              
              const allItemsDone = allWoItems?.every(i => i.status === 'completed')
              
              if (allItemsDone) {
                await supabase
                  .from('work_orders')
                  .update({ status: 'completed', completed_at: new Date().toISOString() })
                  .eq('id', currentItem.wo_id)
              }
            }
          } else {
            // Jika belum semua selesai, WO_ITEM tetap 'in_progress'
            await supabase
              .from('wo_items')
              .update({ status: 'in_progress' })
              .eq('id', jo.wo_item_id)
              .neq('status', 'completed')
          }
        } catch (e) {
          console.warn('Sync Hierarchy failed:', e)
        }
      }

      // Log ke job_tracking (optional)
      try {
        await supabase.from('job_tracking').insert({
          job_order_id: jo.id,
          status_update: newStatus.toUpperCase(),
          latitude: lat,
          longitude: lng
        })
      } catch (e) {
        console.warn('[API] Tracking log failed:', e)
      }
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[API] PATCH error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}