import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createJournalEntry } from '@/lib/finance/journaling'

// GET: Ambil data JO berdasarkan tracking_token ATAU wa_token
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

    // 1. Ambil data Job Order - search by all token types + id fallback
    let jobOrder = null;
    let joError = null;
    
    // Use raw REST API with ::text cast to avoid UUID parsing errors
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nsvkewvmzivudkcczhnk.supabase.co';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    const tokenColumns = ['tracking_token', 'wa_token', 'driver_link_token'];
    
    for (const col of tokenColumns) {
      const url = `${supabaseUrl}/rest/v1/job_orders?${col}::text=eq.${encodeURIComponent(token)}&select=id,jo_number,status,tenant_id,wo_item_id,tracking_token,driver_link_token,driver_phone,accepted_at,started_at,loaded_at,unloaded_at,completed_at,pod_photo_url,driver_response,driver_response_at,advance_amount,advance_status,advance_receipt_url,driver_id,fleet_id`;
      
      const res = await fetch(url, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        cache: 'no-store'
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          jobOrder = data[0];
          break;
        }
      }
    }

    // Fallback: try matching by id (UUID format)
    if (!jobOrder && !joError && token.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      const { data: idMatch, error: idError } = await supabase
        .from('job_orders')
        .select(`
          id,
          jo_number,
          status,
          tenant_id,
          wo_item_id,
          tracking_token,
          driver_link_token,
          driver_phone,
          accepted_at,
          started_at,
          loaded_at,
          unloaded_at,
          completed_at,
          pod_photo_url,
          driver_response,
          driver_response_at,
          advance_amount,
          advance_status,
          advance_receipt_url,
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
          ),
          driver_id,
          fleet_id
        `)
        .eq('id', token)
        .maybeSingle();

      if (idMatch) {
        jobOrder = idMatch;
      } else if (idError) {
        joError = idError;
      }
    }

    if (joError) throw joError
    if (!jobOrder) return NextResponse.json({ error: 'Job Order tidak ditemukan' }, { status: 404 })

    // Fetch wo_item separately
    let woItem: any = null;
    if (jobOrder.wo_item_id) {
      const { data: woItemData } = await supabase
        .from('wo_items')
        .select('id, item_code, sbu_type, item_data, wo_id')
        .eq('id', jobOrder.wo_item_id)
        .maybeSingle();
      woItem = woItemData;
    }
    
    // Fetch work_order separately
    let workOrder: any = null;
    if (woItem?.wo_id) {
      const { data: woData } = await supabase
        .from('work_orders')
        .select('id, wo_number, customer_id, execution_date, notes')
        .eq('id', woItem.wo_id)
        .maybeSingle();
      workOrder = woData;
    }

    // 2. Ambil rute terpisah + Self-healing jika rute kosong
    let { data: routes } = await supabase
      .from('job_routes')
      .select('*')
      .eq('job_order_id', jobOrder.id)
      .order('sequence', { ascending: true })

    if ((!routes || routes.length === 0) && woItem?.item_data?.stops) {
      const stops = woItem.item_data.stops
      const routePayloads = stops.map((stop: any, idx: number) => ({
        job_order_id: jobOrder.id,
        sequence: idx + 1,
        stop_type: stop.stop_type || (idx === 0 ? 'PICKUP' : 'DROPOFF'),
        source_type: 'MD_LOCATION',
        source_id: 'LEGACY',
        location_name: stop.location_name || '-',
        address: stop.address || '-',
        contact_name: stop.contact_name || '-',
        contact_phone: stop.contact_phone || '-',
        status: 'pending'
      }))
      
      const { data: newRoutes } = await supabase.from('job_routes').insert(routePayloads).select('*').order('sequence', { ascending: true })
      if (newRoutes) routes = newRoutes
    }

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

    // 4. Ambil Driver & Fleet details (Rule #1 compliance)
    let driverInfo = null
    let fleetInfo = null
    
    if (jobOrder.driver_id) {
      const { data: dData } = await supabase.from('md_drivers').select('id, name, phone').eq('id', jobOrder.driver_id).maybeSingle()
      if (dData) driverInfo = dData
    }
    
    if (jobOrder.fleet_id) {
      const { data: fData } = await supabase.from('md_fleets').select('id, plate_number, md_fleet_types!fleet_type_id(type_name)').eq('id', jobOrder.fleet_id).maybeSingle()
      if (fData) fleetInfo = {
        plate_number: fData.plate_number,
        type_name: (fData as any).md_fleet_types?.type_name || 'Truck'
      }
    }

    // 5. Ambil Tenant Info
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
        driver: driverInfo,
        fleet: fleetInfo,
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
    const body = await request.json()
    const { status, route_id, route_status, pod_photo_url, pod_photo_base64, pod_photo_name, lat, lng, rejection_note } = body
    const supabase = createAdminClient()

    // 1. Cari JO - search by all token types using raw REST
    let jo = null;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    const tokenColumns = ['tracking_token', 'wa_token', 'driver_link_token'];
    
    for (const col of tokenColumns) {
      const url = `${supabaseUrl}/rest/v1/job_orders?${col}=eq.${encodeURIComponent(token)}&select=id,jo_number,wo_item_id,base_price,driver_share_percentage,tenant_id,driver_payment_amount`;
      
      const res = await fetch(url, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          jo = data[0];
          break;
        }
      }
    }

    if (!jo) return NextResponse.json({ error: 'JO not found' }, { status: 404 })

    // Handle photo upload via base64
    if (pod_photo_base64 && route_id) {
      try {
        const base64Data = pod_photo_base64.split(',')[1]
        const buffer = Buffer.from(base64Data, 'base64')
        const fileExt = pod_photo_name?.split('.').pop() || 'jpg'
        const fileName = `${jo.id}/${route_id}-${Date.now()}.${fileExt}`
        const filePath = `tracking/${fileName}`

        const { error: uploadError, data: uploadData } = await supabase.storage
          .from('pod_documents')
          .upload(filePath, buffer, {
            contentType: `image/${fileExt === 'png' ? 'png' : 'jpeg'}`,
            cacheControl: '3600',
            upsert: false
          })

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from('pod_documents')
          .getPublicUrl(filePath)

        // Update route with photo URL
        const { error: routeError } = await supabase
          .from('job_routes')
          .update({ pod_photo_url: publicUrl })
          .eq('id', route_id)

        if (routeError) throw routeError

        // Insert into documents table for audit
        await supabase.from('documents').insert({
          job_order_id: jo.id,
          doc_type: 'MILESTONE_PHOTO',
          file_url: publicUrl,
          document_name: `Photo for Route segment ${route_id}`,
          uploaded_by: (jo as any).driver_id || null
        })

        return NextResponse.json({ success: true, publicUrl })
      } catch (uploadErr: any) {
        console.error('[API] Photo upload failed:', uploadErr)
        return NextResponse.json({ error: 'Gagal upload foto: ' + uploadErr.message }, { status: 500 })
      }
    }

    // 2. UPDATE RUTE PER STOP
    if (route_id && (route_status || pod_photo_url)) {
      // VALIDASI: Cek urutan stop
      let { data: allRoutes } = await supabase
        .from('job_routes')
        .select('id, sequence, status, stop_type, location_name')
        .eq('job_order_id', jo.id)
        .order('sequence', { ascending: true });
      
      const currentRoute = allRoutes?.find((r: any) => r.id === route_id);
      const currentIndex = allRoutes?.findIndex((r: any) => r.id === route_id) ?? -1;
      
      // Validasi: Tidak boleh skip stop
      if (currentIndex > 0) {
        const prevRoute = allRoutes?.[currentIndex - 1];
        if (prevRoute?.status !== 'completed') {
          return NextResponse.json({ 
            error: `Anda harus menyelesaikan stop sebelumnya (${prevRoute?.stop_type === 'PICKUP' ? 'Muat' : 'Bongkar'} di ${prevRoute?.location_name}) terlebih dahulu sebelum melanjutkan.` 
          }, { status: 400 });
        }
      }
      
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

      // AUTO-UPDATE loaded_at / unloaded_at on JO and granular status
      let granularStatus = 'IN PROGRESS'
      // allRoutes already fetched above for validation
      
      // Self-healing in PATCH if routes are missing (prevents premature completion)
      if ((!allRoutes || allRoutes.length === 0) && (jo as any).wo_item?.item_data?.stops) {
        const stops = (jo as any).wo_item.item_data.stops
        const routePayloads = stops.map((stop: any, idx: number) => ({
          job_order_id: jo.id,
          sequence: idx + 1,
          stop_type: stop.stop_type || (idx === 0 ? 'PICKUP' : 'DROPOFF'),
          source_type: 'MD_LOCATION',
          source_id: 'LEGACY',
          location_name: stop.location_name || '-',
          address: stop.address || '-',
          contact_name: stop.contact_name || '-',
          contact_phone: stop.contact_phone || '-',
          status: 'pending'
        }))
        
        const { data: newRoutes } = await supabase.from('job_routes').insert(routePayloads).select('*').order('sequence', { ascending: true })
        if (newRoutes) allRoutes = newRoutes
      }

      const activeStop = allRoutes?.find((r: any) => r.status === 'arrived')
      const nextStop = allRoutes?.find((r: any) => r.status === 'pending')
      
      if (activeStop) {
        granularStatus = `TIBA DI ${activeStop.location_name?.toUpperCase()}`.substring(0, 30)
      } else if (nextStop) {
        granularStatus = `MENUJU ${nextStop.location_name?.toUpperCase()}`.substring(0, 30)
      } else {
        granularStatus = 'MENUNGGU SELESAI'
      }

      await supabase.from('job_orders').update({ status: granularStatus }).eq('id', jo.id)
      if (jo.wo_item_id) {
        await supabase.from('wo_items').update({ status: granularStatus }).eq('id', jo.wo_item_id)
      }

      if (route_status === 'completed') {
        const routeInfo = allRoutes?.find((r: any) => r.id === route_id)
        if (routeInfo?.stop_type === 'PICKUP') {
          await supabase.from('job_orders').update({ loaded_at: new Date().toISOString() }).eq('id', jo.id)
        } else if (routeInfo?.stop_type === 'DROPOFF') {
          await supabase.from('job_orders').update({ unloaded_at: new Date().toISOString() }).eq('id', jo.id)
        }
      }

      // Log ke job_tracking
      try {
        await supabase.from('job_tracking').insert({
          job_order_id: jo.id,
          status_update: granularStatus,
          latitude: lat,
          longitude: lng,
          notes: `Route ID: ${route_id}${pod_photo_url ? ' (Photo Attached)' : ''}`
        })
      } catch (e) {
        console.warn('[API] Tracking log failed:', e)
      }

      return NextResponse.json({ success: true })
    }

    // 3. UPDATE STATUS GLOBAL JO
    if (status) {
      const newStatus = status
      let dbStatus = newStatus
      if (newStatus === 'accepted') dbStatus = 'ORDER DITERIMA'
      if (newStatus === 'in_progress') dbStatus = 'DALAM PERJALANAN'
      if (newStatus === 'completed') dbStatus = 'PEKERJAAN SELESAI'

      const updateData: any = { 
        status: dbStatus, 
        updated_at: new Date().toISOString() 
      }
      
      if (newStatus === 'accepted') {
        updateData.accepted_at = new Date().toISOString()
        updateData.driver_response = 'accepted'
        updateData.driver_response_at = new Date().toISOString()
        
        // Notify Finance
        try {
          await supabase.from('notifications').insert({
            tenant_id: jo.tenant_id,
            user_id: null, // Global to role
            role: 'sbu_fin_tr',
            title: 'Request Driver Payout',
            message: `Driver accepted JO ${jo.jo_number}. Please process payout for IDR ${jo.driver_payment_amount || 0}`,
            metadata: { jo_id: jo.id, wo_item_id: jo.wo_item_id },
            is_read: false
          })
        } catch (e) {
          console.warn('[API] Finance notification failed:', e)
        }
      }
      if (newStatus === 'rejected') {
        updateData.driver_response = 'rejected'
        updateData.driver_response_at = new Date().toISOString()
        updateData.rejection_note = rejection_note || null
      }
      if (newStatus === 'in_progress') updateData.started_at = new Date().toISOString()
      if (newStatus === 'completed') updateData.completed_at = new Date().toISOString()

      const { error: joUpdateError } = await supabase
        .from('job_orders')
        .update(updateData)
        .eq('id', jo.id)

      if (joUpdateError) throw joUpdateError
      
      // Update WO_ITEM status too
      if (jo.wo_item_id) {
        const itemStatus = newStatus === 'accepted' ? 'ORDER DITERIMA' : 
                          newStatus === 'rejected' ? 'ORDER DITOLAK' :
                          newStatus === 'in_progress' ? 'DALAM PERJALANAN' : 
                          newStatus === 'completed' ? 'PEKERJAAN SELESAI' : newStatus.toUpperCase()
        
        await supabase.from('wo_items').update({ status: itemStatus }).eq('id', jo.wo_item_id)
        
        // Update JO status with more detail for 'accepted'
        if (newStatus === 'accepted') {
          await supabase.from('job_orders').update({ status: 'ORDER DITERIMA' }).eq('id', jo.id)
        }
      }
      
      // AUTO-JOURNALING ON COMPLETION
      if (newStatus === 'completed' && jo.base_price > 0) {
        try {
          await createJournalEntry({
            jobOrderId: jo.id,
            amount: jo.base_price,
            description: `Main Revenue for JO ${jo.jo_number}`,
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
          
          const isFinished = (s: string) => ['completed', 'PEKERJAAN SELESAI', 'done', 'ready_for_billing'].includes(s);
          
          const allJosDone = siblingJos?.every(j => isFinished(j.status));
          
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
              
              const allItemsDone = allWoItems?.every(i => isFinished(i.status));
              
              if (allItemsDone) {
                await supabase
                  .from('work_orders')
                  .update({ 
                    status: 'completed', 
                    completed_at: new Date().toISOString() 
                  })
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