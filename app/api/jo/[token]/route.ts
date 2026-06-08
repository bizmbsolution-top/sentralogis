import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createJournalEntry } from '@/lib/finance/journaling'

// [AI] Safe utility to find Job Order by any of the token columns or ID
// Bypasses PostgREST type casting issues with mixed UUID and string columns
async function findJobOrder(supabase: any, token: string) {
  if (!token) return null;

  const isUuid = token.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  const selectColumns = `
    id, jo_number, status, tenant_id, wo_item_id, tracking_token, 
    driver_link_token, driver_phone, completed_at, pod_photo_url, driver_response, 
    advance_amount, advance_status, advance_receipt_url, 
    driver_id, fleet_id, base_price, driver_share_percentage, driver_payment_amount,
    purchase_price, transporter_id, vendor_id,
    accepted_at, started_at, rejection_note
  `;

  if (isUuid) {
    // [AI] For valid UUID format: query ID and UUID/VARCHAR token columns safely using .or()
    const { data, error } = await supabase
      .from('job_orders')
      .select(selectColumns)
      .or(`id.eq.${token},wa_token.eq.${token},tracking_token.eq.${token},driver_link_token.eq.${token}`)
      .maybeSingle();

    if (error) {
      console.error('[AI] findJobOrder UUID query failed:', error);
    }
    if (data) return data;
  }

  // [AI] For non-UUID format or if UUID match failed: query only VARCHAR columns to prevent invalid UUID syntax error
  const { data, error } = await supabase
    .from('job_orders')
    .select(selectColumns)
    .or(`tracking_token.eq.${token},driver_link_token.eq.${token}`)
    .maybeSingle();

  if (error) {
    console.error('[AI] findJobOrder VARCHAR query failed:', error);
  }
  return data;
}

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

    // [AI] Find Job Order securely using our unified look-up helper
    const jobOrder = await findJobOrder(supabase, token);
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
    const { status, route_id, route_status, pod_photo_url, pod_photo_base64, pod_photo_name, lat, lng, rejection_note, route_notes } = body
    const supabase = createAdminClient()

    // [AI] Find Job Order securely using our unified look-up helper
    const jo = await findJobOrder(supabase, token);
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
      if (route_notes !== undefined) routeUpdate.notes = route_notes
      
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

      // [AI] Re-fetch allRoutes to get the latest updated status and prevent stale granularStatus calculations
      const { data: updatedRoutes } = await supabase
        .from('job_routes')
        .select('id, sequence, status, stop_type, location_name')
        .eq('job_order_id', jo.id)
        .order('sequence', { ascending: true });
      if (updatedRoutes) allRoutes = updatedRoutes;

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
          await supabase.from('job_orders').update({ updated_at: new Date().toISOString() }).eq('id', jo.id)
        } else if (routeInfo?.stop_type === 'DROPOFF') {
          await supabase.from('job_orders').update({ updated_at: new Date().toISOString() }).eq('id', jo.id)
        }
      }

      // Log ke job_tracking
      try {
        await supabase.from('job_tracking').insert({
          job_order_id: jo.id,
          status_update: granularStatus,
          latitude: lat,
          longitude: lng,
          notes: `Route ID: ${route_id}${pod_photo_url ? ' (Photo Attached)' : ''}${route_notes ? ' | Catatan: ' + route_notes : ''}`
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
        updateData.driver_response = 'accepted'
        updateData.accepted_at = new Date().toISOString()
        
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
      if (newStatus === 'in_progress') {
        updateData.started_at = new Date().toISOString()
      }
      if (newStatus === 'rejected') {
        updateData.driver_response = 'rejected'
        updateData.rejection_note = rejection_note || null
      }
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
          console.error('[API] Auto-journaling revenue failed:', e);
        }
      }

      // AUTO-JOURNALING VENDOR COST ON COMPLETION
      if (newStatus === 'completed' && Number(jo.purchase_price) > 0) {
        try {
          await createJournalEntry({
            jobOrderId: jo.id,
            amount: Number(jo.purchase_price),
            description: `Vendor Cost for JO ${jo.jo_number}`,
            sourceType: 'vendor_cost'
          });
        } catch (e) {
          console.error('[API] Auto-journaling vendor cost failed:', e);
        }
      }

      // [AI] Fleet & Driver stats update on completion (admin client, not browser)
      if (newStatus === 'completed') {
        // Mark fleet as available
        if (jo.fleet_id) {
          try {
            await supabase.from('md_fleets').update({ status: 'available' }).eq('id', jo.fleet_id);
          } catch (e) {
            console.error('[API] Fleet status update failed:', e);
          }
        }
        // Increment driver stats
        if (jo.driver_id) {
          try {
            const { data: driverData } = await supabase
              .from('md_drivers')
              .select('total_jobs_completed, total_km_driven')
              .eq('id', jo.driver_id)
              .single();
            const estimatedKM = 50;
            await supabase
              .from('md_drivers')
              .update({
                total_jobs_completed: (driverData?.total_jobs_completed || 0) + 1,
                total_km_driven: (driverData?.total_km_driven || 0) + estimatedKM
              })
              .eq('id', jo.driver_id);
            await supabase.from('driver_performance_logs').insert({
              driver_id: jo.driver_id,
              job_order_id: jo.id,
              type: 'KM_LOG',
              total_km: estimatedKM,
              review_notes: 'Tugas diselesaikan melalui Driver Portal',
              tenant_id: jo.tenant_id
            });
          } catch (e) {
            console.error('[API] Driver stats update failed:', e);
          }
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