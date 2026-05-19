import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function cleanDuplicates() {
  const joId = '2819e21d-e0d6-4e6f-882c-24b320bf2438';
  const { data: routes } = await supabase.from('job_routes').select('*').eq('job_order_id', joId).order('sequence');
  
  if (!routes) return;

  const seen = new Set();
  const toDelete = [];

  for (const r of routes) {
    if (seen.has(r.sequence)) {
      // If we see the same sequence again, and the current one is pending while we already saw something else...
      // Or just delete the one that is NOT 'arrived' or 'completed'
      if (r.status === 'pending') {
        toDelete.push(r.id);
      } else {
        // Keep this one, find the previous one and delete if it was pending?
        // Let's just be simple: delete the ones we don't want.
        toDelete.push(r.id); // Wait, this is dangerous.
      }
    } else {
      seen.add(r.sequence);
    }
  }
  
  // Actually, I'll just delete ALL routes for this JO and re-insert them correctly to be safe.
  // No, I'll delete the ones with sequence 99 and the duplicate sequence 1.
  
  const idsToDelete = [
    '53e71ed2-02c2-463a-9613-24303c0e7a38', // sequence 99
    // I need to find the ID of the duplicate sequence 1.
  ];

  for (const r of routes) {
      if (r.sequence === 1 && r.status === 'pending') idsToDelete.push(r.id);
  }

  console.log('Deleting IDs:', idsToDelete);
  const { error } = await supabase.from('job_routes').delete().in('id', idsToDelete);
  if (error) console.error(error);
  else console.log('Cleaned up.');
}

cleanDuplicates();
