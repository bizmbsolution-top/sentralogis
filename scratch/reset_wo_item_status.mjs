import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve('.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) env[key.trim()] = value.trim();
});

// Use service role key to bypass RLS
const supabase = createClient(
  env['NEXT_PUBLIC_SUPABASE_URL'],
  env['SUPABASE_SERVICE_ROLE_KEY'] || env['NEXT_PUBLIC_SUPABASE_ANON_KEY']
);

async function resetWOItemStatus() {
  const searchTerm = 'SL-ATS-0526-001';
  
  console.log(`Searching for items containing: ${searchTerm}...`);

  // Search for items by item_code
  const { data: items, error: itemsError } = await supabase
    .from('wo_items')
    .select(`
      id, 
      item_code, 
      status, 
      item_data,
      work_orders!inner(wo_number, status)
    `)
    .ilike('item_code', `%${searchTerm}%`);

  if (itemsError) {
    console.error("Error finding items:", itemsError);
    return;
  }

  console.log("Found items:", items?.map(i => ({
    item_code: i.item_code,
    current_status: i.status,
    unit_count: i.item_data?.unit_count,
    wo_number: i.work_orders?.wo_number
  })) || []);

  if (!items || items.length === 0) {
    console.log("No items found. Let me check all recent items...");
    
    const { data: allItems } = await supabase
      .from('wo_items')
      .select('id, item_code, status, item_data, work_orders!inner(wo_number)')
      .order('created_at', { ascending: false })
      .limit(10);
    
    console.log("Recent items:", allItems?.map(i => ({
      item_code: i.item_code,
      status: i.status,
      wo_number: i.work_orders?.wo_number
    })) || []);
    return;
  }

  // Find items that have status 'assigned' but not all units assigned
  for (const item of items) {
    const requiredUnits = item.item_data?.unit_count || 1;
    
    // Get job orders for this item
    const { data: jos } = await supabase
      .from('job_orders')
      .select('id, status, driver_id, fleet_id')
      .eq('wo_item_id', item.id);

    const assignedJOs = jos?.filter(j => j.driver_id && j.fleet_id) || [];
    const allAssigned = assignedJOs.length >= requiredUnits;
    
    console.log(`Item ${item.item_code}: required=${requiredUnits}, assigned=${assignedJOs.length}, allAssigned=${allAssigned}`);
    
    // If not all assigned but status is 'assigned', reset to 'pending'
    if (!allAssigned && item.status === 'assigned') {
      console.log(`  -> Resetting status from 'assigned' to 'pending'...`);
      
      await supabase
        .from('wo_items')
        .update({ status: 'pending' })
        .eq('id', item.id);
      
      console.log(`  -> Reset complete!`);
    }
  }

  console.log("\n✅ Reset complete!");

  console.log("Found item:", {
    id: item.id,
    item_code: item.item_code,
    current_status: item.status,
    wo_number: item.work_orders.wo_number
  });

  // Get job orders for this item
  const { data: jos } = await supabase
    .from('job_orders')
    .select('id, status, driver_id, fleet_id')
    .eq('wo_item_id', item.id);

  console.log("Current Job Orders:", jos?.map(j => ({
    id: j.id,
    status: j.status,
    driver_id: j.driver_id,
    fleet_id: j.fleet_id
  })) || []);

  const requiredUnits = item.item_data?.unit_count || 1;
  console.log(`Required units: ${requiredUnits}, Current assigned JOs: ${jos?.filter(j => j.driver_id && j.fleet_id).length || 0}`);

  // Ask for confirmation (for now, we'll just do it)
  console.log("\n--- RESETTING STATUS ---");
  console.log("Setting wo_item status to 'PENDING'...");

  const { error: updateItemError } = await supabase
    .from('wo_items')
    .update({ status: 'PENDING' })
    .eq('id', item.id);

  if (updateItemError) {
    console.error("Error updating item:", updateItemError);
    return;
  }

  console.log("Setting job_orders status to 'PENDING' (if not completed)...");
  
  if (jos && jos.length > 0) {
    const pendingJos = jos.filter(j => !['COMPLETED', 'DONE', 'PEKERJAAN SELESAI'].includes(j.status?.toUpperCase()));
    if (pendingJos.length > 0) {
      const { error: updateJoError } = await supabase
        .from('job_orders')
        .update({ status: 'PENDING' })
        .in('id', pendingJos.map(j => j.id));

      if (updateJoError) {
        console.error("Error updating JOs:", updateJoError);
      } else {
        console.log(`Updated ${pendingJos.length} job orders to PENDING`);
      }
    }
  }

  console.log("\n✅ Status reset complete!");
  console.log("Item should now show as 'Need Assignment' in SBU work orders page.");
  console.log("Handover button should now be available.");

  // Verify
  const { data: updatedItem } = await supabase
    .from('wo_items')
    .select('status')
    .eq('id', item.id)
    .single();

  console.log("New status:", updatedItem.status);
}

resetWOItemStatus();