import { supabase } from '@/lib/supabaseClient';

function cleanCode(str: string, maxLen = 4): string {
  if (!str) return 'CUS';
  
  const words = str
    .toUpperCase()
    .replace(/\b(PT|CV|TBK|LTD|INC|PERSERO|INDONESIA)\b/g, '')
    .replace(/[^A-Z0-9\s]/g, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
    
  if (words.length === 0) {
    const cleaned = str.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    return (cleaned || 'CUS').substring(0, maxLen);
  }
  
  if (words.length === 1) {
    return words[0].substring(0, maxLen);
  }
  
  return words.map(w => w[0]).join('').substring(0, maxLen);
}

export async function generateWONumber(tenantId: string, tenantInitial: string, customerInitial: string): Promise<string> {
  const now = new Date();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const yearShort = now.getFullYear().toString().slice(-2);
  const mmyy = `${month}${yearShort}`;
  
  const cleanTenant = cleanCode(tenantInitial, 5) || 'HQ';
  const cleanCustomer = cleanCode(customerInitial, 5) || 'CUS';
  const prefix = `${cleanTenant}-${cleanCustomer}-${mmyy}-`;
  
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
