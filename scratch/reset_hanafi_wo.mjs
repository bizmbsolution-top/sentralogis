import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://nsvkewvmzivudkcczhnk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zdmtld3Zteml2dWRrY2N6aG5rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc3Mjc2MywiZXhwIjoyMDkwMzQ4NzYzfQ.7ZDrwe28fRKFsbxZMzvpAqwDE39Iwk5ZZXWX_pLp8T8'
);

async function resetHanafi() {
  console.log('=== RESETTING WORK ORDER ITEM TO PENDING ===');
  
  // 1. Reset WO Item status
  const { error: itemErr } = await supabase
    .from('wo_items')
    .update({ 
      status: 'pending',
      item_data: {
        notes: '',
        stops: [
          {
            name: 'HANAFI - Kantor Pusat / Billing',
            address: 'Jl. Pd. Indah No.12 12, RT.12/RW.6, Pesanggrahan, Kec. Pesanggrahan, Kota Jakarta Selatan, Daerah Khusus Ibukota Jakarta 12320, Indonesia',
            latitude: -6.2244,
            longitude: 106.8006,
            stop_type: 'PICKUP',
            source_type: 'MD_LOCATION',
            source_id: 'LEGACY',
            contact_name: '-',
            contact_phone: '-'
          },
          {
            name: 'NPCT1 Port',
            address: 'Jl. Terminal Kalibaru Raya Kav.B No.1, Kali Baru, Kec. Cilincing, Jkt Utara, Daerah Khusus Ibukota Jakarta 14110, Indonesia',
            latitude: -6.1044,
            longitude: 106.9406,
            stop_type: 'DROPOFF',
            source_type: 'MD_LOCATION',
            source_id: 'LEGACY',
            contact_name: '-',
            contact_phone: '-'
          }
        ],
        deal_price: 2785200,
        unit_count: 2,
        est_revenue: 5570400,
        est_duration: '1h 27m',
        shipper_name: 'HANAFI - Kantor Pusat / Billing',
        est_fuel_usage: '14.2',
        execution_date: '2026-05-18',
        execution_time: '17:30',
        recipient_name: 'NPCT1 Port',
        est_distance_km: '42.6',
        shipper_address: 'Jl. Pd. Indah No.12 12, RT.12/RW.6, Pesanggrahan, Kec. Pesanggrahan, Kota Jakarta Selatan, Daerah Khusus Ibukota Jakarta 12320, Indonesia',
        vehicle_type_id: '471d927d-e5f2-4329-8cc5-75f03af35c29',
        recipient_address: 'Jl. Terminal Kalibaru Raya Kav.B No.1, Kali Baru, Kec. Cilincing, Jkt Utara, Daerah Khusus Ibukota Jakarta 14110, Indonesia',
        vehicle_type_name: 'WINGBOXS'
      }
    })
    .eq('item_code', 'SL-HANAFI-0526-001/TR01');

  if (itemErr) {
    console.error('Error resetting item:', itemErr);
    return;
  }

  // 2. Reset WO status
  const { error: woErr } = await supabase
    .from('work_orders')
    .update({ status: 'need_assignment' })
    .eq('wo_number', 'SL-HANAFI-0526-001');

  if (woErr) {
    console.error('Error resetting work order:', woErr);
    return;
  }

  // 3. Reset associated Job Orders back to pending/null
  const { error: joErr } = await supabase
    .from('job_orders')
    .update({
      status: 'pending',
      transporter_id: null,
      fleet_id: null,
      driver_id: null,
      driver_phone: null
    })
    .eq('jo_number', 'SL-HANAFI-0526-001/TR01/ITR-001');

  const { error: joErr2 } = await supabase
    .from('job_orders')
    .update({
      status: 'pending',
      transporter_id: null,
      fleet_id: null,
      driver_id: null,
      driver_phone: null
    })
    .eq('jo_number', 'SL-HANAFI-0526-001/TR01/ITR-002');

  if (joErr || joErr2) {
    console.error('Error resetting job orders:', joErr || joErr2);
    return;
  }

  console.log('Successfully reset Hanafi WO, items, and job orders!');
}

resetHanafi();
