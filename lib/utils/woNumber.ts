import { supabase } from '@/lib/supabaseClient';

// Generate WO Number: HALU-TPS-0526-001
// HALU = Tenant name, TPS = Customer name (from md_entities.name), 0526 = MMYY, 001 = Order sequence per customer per month
export async function generateWONumber(tenantId: string, tenantInitial: string, customerInitial: string): Promise<string> {
  const now = new Date();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const yearShort = now.getFullYear().toString().slice(-2);
  const mmyy = `${month}${yearShort}`;
  
  const prefix = `${tenantInitial || 'HQ'}-${customerInitial || 'CUS'}-${mmyy}-`;
  
  try {
    const { data, error } = await supabase
      .from('work_orders')
      .select('wo_number')
      .eq('tenant_id', tenantId)
      .like('wo_number', `${prefix}%`)
      .order('wo_number', { ascending: false })
      .limit(1);
    
    if (error) throw error;
    
    let nextNumber = 1;
    if (data && data.length > 0) {
      const parts = data[0].wo_number.split('-');
      const lastSeq = parseInt(parts[parts.length - 1]);
      if (!isNaN(lastSeq)) nextNumber = lastSeq + 1;
    }
    
    return `${prefix}${nextNumber.toString().padStart(3, '0')}`;
  } catch (err) {
    console.error('Error generating WO number:', err);
    return `${prefix}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
  }
}

// Generate JO Number: HALU-TAM-0526-001-01 (WO Number + truck sequence)
export function generateJONumber(woNumber: string, sequence: number): string {
  return `${woNumber}-${sequence.toString().padStart(2, '0')}`;
}
