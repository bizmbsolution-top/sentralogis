
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkStatuses() {
    const { data, error } = await supabase
        .from('job_orders')
        .select('status');
    
    if (error) {
        console.error('Error:', error);
        return;
    }

    const statuses = [...new Set(data.map(d => d.status))];
    console.log('--- UNIQUE STATUSES IN SUPABASE ---');
    console.log(statuses);
    
    // Count per status
    const counts = data.reduce((acc, curr) => {
        acc[curr.status] = (acc[curr.status] || 0) + 1;
        return acc;
    }, {});
    console.log('\n--- COUNTS ---');
    console.table(counts);
}

checkStatuses();
