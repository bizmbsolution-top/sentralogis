import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params
    const supabase = createAdminClient()

    if (!token) {
      return NextResponse.json({ error: 'Token tidak ditemukan' }, { status: 400 })
    }

    // Fetch WO with customer info
    const { data: wo, error: woError } = await supabase
      .from('work_orders')
      .select(`
        id, wo_number, status, execution_date, notes,
        customer:md_entities!customer_id (id, name, phone, billing_address)
      `)
      .eq('id', token)
      .maybeSingle()

    if (woError) throw woError
    if (!wo) return NextResponse.json({ error: 'Work Order tidak ditemukan' }, { status: 404 })

    // Fetch all wo_items for this WO
    const { data: woItems, error: wiError } = await supabase
      .from('wo_items')
      .select('id, item_code, sbu_type, item_data')
      .eq('wo_id', wo.id)

    if (wiError) throw wiError

    const woItemIds = (woItems || []).map((wi: any) => wi.id)
    const woItemMap = new Map((woItems || []).map((wi: any) => [wi.id, wi]))

    // Fetch all JOs for these wo_items
    const { data: jobOrders, error: joError } = await supabase
      .from('job_orders')
      .select(`
        id, jo_number, status, driver_link_token, tracking_token,
        driver_phone, accepted_at, started_at, loaded_at, unloaded_at, completed_at,
        pod_photo_url, driver_response,
        driver_id, fleet_id,
        wo_item_id
      `)
      .in('wo_item_id', woItemIds)
      .order('created_at', { ascending: true })

    if (joError) throw joError

    // Enrich each JO with routes, driver, fleet
    const enrichedJOs = await Promise.all((jobOrders || []).map(async (jo: any) => {
      // Fetch routes
      const { data: routes } = await supabase
        .from('job_routes')
        .select('*')
        .eq('job_order_id', jo.id)
        .order('sequence', { ascending: true })

      // Fetch tracking history
      const { data: tracking } = await supabase
        .from('job_tracking')
        .select('*')
        .eq('job_order_id', jo.id)
        .order('created_at', { ascending: false })

      // Fetch driver
      let driverInfo = null
      if (jo.driver_id) {
        const { data: dData } = await supabase
          .from('md_drivers')
          .select('id, name, phone')
          .eq('id', jo.driver_id)
          .maybeSingle()
        driverInfo = dData
      }

      // Fetch fleet
      let fleetInfo = null
      if (jo.fleet_id) {
        const { data: fData } = await supabase
          .from('md_fleets')
          .select('id, plate_number, md_fleet_types!fleet_type_id(type_name)')
          .eq('id', jo.fleet_id)
          .maybeSingle()
        fleetInfo = fData ? {
          plate_number: fData.plate_number,
          type_name: (fData as any).md_fleet_types?.type_name || 'Truck'
        } : null
      }

      return {
        ...jo,
        wo_item: woItemMap.get(jo.wo_item_id) || null,
        routes: routes || [],
        tracking_history: tracking || [],
        driver: driverInfo,
        fleet: fleetInfo
      }
    }))

    // Calculate summary stats
    const totalJOs = enrichedJOs.length
    const completedJOs = enrichedJOs.filter((j: any) => 
      ['COMPLETED', 'PEKERJAAN SELESAI', 'done'].includes(j.status?.toUpperCase())
    ).length
    const inProgressJOs = enrichedJOs.filter((j: any) => 
      !['COMPLETED', 'PEKERJAAN SELESAI', 'done', 'PENDING', 'ASSIGNED'].includes(j.status?.toUpperCase())
    ).length

    return NextResponse.json({
      success: true,
      data: {
        wo,
        jobOrders: enrichedJOs,
        summary: {
          total: totalJOs,
          completed: completedJOs,
          inProgress: inProgressJOs,
          pending: totalJOs - completedJOs - inProgressJOs
        }
      }
    })
  } catch (err: any) {
    console.error('[API] GET /api/track/wo error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
