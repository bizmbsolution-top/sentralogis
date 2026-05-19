import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://nsvkewvmzivudkcczhnk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zdmtld3Zteml2dWRrY2N6aG5rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc3Mjc2MywiZXhwIjoyMDkwMzQ4NzYzfQ.7ZDrwe28fRKFsbxZMzvpAqwDE39Iwk5ZZXWX_pLp8T8'
);

const joId = '2819e21d-e0d6-4e6f-882c-24b320bf2438';

const trackingData = [
  {
    "job_order_id": joId,
    "status_update": "assigned",
    "notes": "Mission assigned to driver",
    "created_at": "2026-05-11 02:03:51.758"
  },
  {
    "job_order_id": joId,
    "status_update": "pickup_arrived",
    "notes": "Arrived at pickup location: TAM - GUDANG TAM 1",
    "created_at": "2026-05-11 04:04:11.284"
  },
  {
    "job_order_id": joId,
    "status_update": "pickup_completed",
    "notes": "Pickup completed at TAM - GUDANG TAM 1",
    "created_at": "2026-05-11 05:05:48.314"
  },
  {
    "job_order_id": joId,
    "status_update": "delivery_arrived",
    "notes": "Arrived at delivery location: NPCT1 Port",
    "created_at": "2026-05-11 08:27:03.932"
  }
];

async function fixTracking() {
  console.log('Inserting tracking logs for JO:', joId);
  
  await supabase.from('job_tracking').delete().eq('job_order_id', joId);

  const { data, error } = await supabase
    .from('job_tracking')
    .insert(trackingData)
    .select();

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Successfully inserted', data.length, 'logs');
  }
}

fixTracking();
