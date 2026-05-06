import { supabase } from '@/lib/supabaseClient';

// Generate WO Number: WO/MM/YYYY/001 (Reset per bulan)
export async function generateWONumber(tenantId: string): Promise<string> {
  const now = new Date();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const year = now.getFullYear();
  const prefix = `WO/${month}/${year}/`;
  
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
      const parts = data[0].wo_number.split('/');
      const lastSeq = parseInt(parts[parts.length - 1]);
      if (!isNaN(lastSeq)) nextNumber = lastSeq + 1;
    }
    
    return `${prefix}${nextNumber.toString().padStart(3, '0')}`;
  } catch (err) {
    console.error('Error generating WO number:', err);
    return `${prefix}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
  }
}

// Generate JO Number: WO-Number-TR-001
export function generateJONumber(woNumber: string, itemCode: string, sequence: number): string {
  return `${woNumber}-${itemCode.split('-').pop()}-${sequence.toString().padStart(3, '0')}`;
}
