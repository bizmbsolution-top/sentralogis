import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Simple .env.local parser
const env = fs.readFileSync('.env.local', 'utf8')
  .split('\n')
  .reduce((acc, line) => {
    const [key, ...val] = line.split('=');
    if (key && val) acc[key.trim()] = val.join('=').trim();
    return acc;
  }, {});

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function auditStatuses() {
  console.log('--- AUDIT WO_ITEMS STATUSES ---');
  const { data: woStatuses } = await supabase
    .from('wo_items')
    .select('status')
    .order('status');
  
  const woCounts = {};
  woStatuses?.forEach(s => {
    const status = s.status || 'NULL';
    woCounts[status] = (woCounts[status] || 0) + 1;
  });
  console.table(woCounts);

  console.log('\n--- AUDIT JOB_ORDERS STATUSES ---');
  const { data: joStatuses } = await supabase
    .from('job_orders')
    .select('status')
    .order('status');
  
  const joCounts = {};
  joStatuses?.forEach(s => {
    const status = s.status || 'NULL';
    joCounts[status] = (joCounts[status] || 0) + 1;
  });
  console.table(joCounts);

  console.log('\n--- MISMATCH CHECK (WO_ITEM COMPLETED BUT JO NOT) ---');
  const { data: mismatches } = await supabase
    .from('wo_items')
    .select('id, status, job_orders(id, status)')
    .in('status', ['completed', 'done', 'PEKERJAAN SELESAI', 'READY_FOR_BILLING', 'VERIFIED']);
  
  mismatches?.forEach(wo => {
    const activeJobs = wo.job_orders?.filter(j => !['completed', 'done', 'PEKERJAAN SELESAI', 'READY_FOR_BILLING', 'VERIFIED', 'cancelled'].includes(j.status?.toLowerCase()));
    if (activeJobs?.length > 0) {
      console.log(`WO ${wo.id} status is ${wo.status} but has active jobs:`, activeJobs.map(j => j.status));
    }
  });

  console.log('\n--- FINANCE PROGRESS CHECK ---');
  const { data: financeCheck } = await supabase
    .from('job_orders')
    .select('id, status, is_doc_finished, is_cost_finished')
    .in('status', ['completed', 'done', 'PEKERJAAN SELESAI', 'READY_FOR_BILLING', 'VERIFIED']);
  
  const progress = {
    total: financeCheck?.length || 0,
    ready: financeCheck?.filter(j => j.status === 'ready_for_billing').length || 0,
    both_done: financeCheck?.filter(j => j.is_doc_finished && j.is_cost_finished).length || 0,
    doc_only: financeCheck?.filter(j => j.is_doc_finished && !j.is_cost_finished).length || 0,
    cost_only: financeCheck?.filter(j => !j.is_doc_finished && j.is_cost_finished).length || 0,
    none: financeCheck?.filter(j => !j.is_doc_finished && !j.is_cost_finished).length || 0
  };
  console.table(progress);
}

auditStatuses();
