import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://nsvkewvmzivudkcczhnk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zdmtld3Zteml2dWRrY2N6aG5rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc3Mjc2MywiZXhwIjoyMDkwMzQ4NzYzfQ.7ZDrwe28fRKFsbxZMzvpAqwDE39Iwk5ZZXWX_pLp8T8'
);

const joId = '2819e21d-e0d6-4e6f-882c-24b320bf2438';
const woItemId = '9038176c-2168-4884-b55a-71f857e8a295';

const routesData = [
  {
    "job_order_id": joId,
    "sequence": 1,
    "stop_type": "PICKUP",
    "location_name": "TAM - GUDANG TAM 1",
    "address": "TAM - GUDANG TAM 1",
    "status": "completed",
    "actual_arrival": "2026-05-11 04:04:11.284",
    "actual_departure": "2026-05-11 05:05:48.314",
    "pod_photo_url": "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800",
    "source_type": "WO_ITEM",
    "source_id": woItemId
  },
  {
    "job_order_id": joId,
    "sequence": 2,
    "stop_type": "DROPOFF",
    "location_name": "NPCT1 Port",
    "address": "NPCT1 Port",
    "status": "arrived",
    "actual_arrival": "2026-05-11 08:27:03.932",
    "actual_departure": null,
    "pod_photo_url": "https://images.unsplash.com/photo-1580674285054-bed31e145f59?w=800",
    "source_type": "WO_ITEM",
    "source_id": woItemId
  }
];

async function fixRoutes() {
  console.log('Inserting routes for JO:', joId);
  
  await supabase.from('job_routes').delete().eq('job_order_id', joId);

  const { data, error } = await supabase
    .from('job_routes')
    .insert(routesData)
    .select();

  if (error) {
    console.error('Error inserting routes:', error);
  } else {
    console.log('Successfully inserted', data.length, 'routes');
  }
}

fixRoutes();
