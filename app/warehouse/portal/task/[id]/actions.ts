'use server'

import { supabaseAdmin } from '@/lib/supabase/admin'

export async function fetchReceiptAdmin(receiptId: string) {
  const { data, error } = await supabaseAdmin
    .from('wh_inbound_receipts')
    .select('*, transporter:transporter_id(name), fleet:fleet_id(plate_number), driver:driver_id(name, phone)')
    .eq('id', receiptId)
    .maybeSingle();
    
  if (error) throw error;
  return data;
}

export async function updateReceiptAdmin(receiptId: string, updates: any) {
  const { data, error } = await supabaseAdmin
    .from('wh_inbound_receipts')
    .update(updates)
    .eq('id', receiptId)
    .select()
    .maybeSingle();
    
  if (error) throw error;
  return data;
}
