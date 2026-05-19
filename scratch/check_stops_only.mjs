import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://nsvkewvmzivudkcczhnk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zdmtld3Zteml2dWRrY2N6aG5rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc3Mjc2MywiZXhwIjoyMDkwMzQ4NzYzfQ.7ZDrwe28fRKFsbxZMzvpAqwDE39Iwk5ZZXWX_pLp8T8'
)

async function checkWOItem() {
  const { data: jo } = await supabase
    .from('job_orders')
    .select('wo_item_id')
    .eq('jo_number', 'SL-TAM-0526-002/TR01/OWN-001')
    .single()
    
  if (jo) {
    const { data: item } = await supabase
      .from('wo_items')
      .select('item_data')
      .eq('id', jo.wo_item_id)
      .single()
      
    if (item?.item_data?.stops) {
      item.item_data.stops.forEach(s => {
        console.log(`Stop ${s.sequence}: ${s.location_name} (${s.latitude}, ${s.longitude})`)
      })
    }
  }
}

checkWOItem()
