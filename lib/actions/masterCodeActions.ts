'use server';

import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Generates a global unique driver code across all tenants bypassing RLS.
 */
export async function generateDriverCodeAction(): Promise<string> {
  try {
    const supabaseAdmin = createAdminClient();
    const { data, error } = await supabaseAdmin
      .from('md_drivers')
      .select('driver_code')
      .like('driver_code', 'DRI/%');

    if (error) {
      console.error('Error fetching driver codes with admin client:', error);
      return `DRI/${Math.floor(100 + Math.random() * 900)}`;
    }

    const numbers = (data || [])
      .map((r) => {
        const parts = r.driver_code.split('/');
        return parts.length > 1 ? parseInt(parts[parts.length - 1], 10) : NaN;
      })
      .filter((n) => !isNaN(n));

    const maxNum = numbers.length > 0 ? Math.max(...numbers) : 0;
    const newNumber = (maxNum + 1).toString().padStart(3, '0');
    return `DRI/${newNumber}`;
  } catch (err) {
    console.error('Crash in generateDriverCodeAction:', err);
    return `DRI/${Date.now().toString().slice(-4)}`;
  }
}

/**
 * Generates a global unique fleet code across all tenants bypassing RLS.
 */
export async function generateFleetCodeAction(): Promise<string> {
  try {
    const supabaseAdmin = createAdminClient();
    const { data, error } = await supabaseAdmin
      .from('md_fleets')
      .select('fleet_code')
      .like('fleet_code', 'FLT/%');

    if (error) {
      console.error('Error fetching fleet codes with admin client:', error);
      return `FLT/${Math.floor(100 + Math.random() * 900)}`;
    }

    const numbers = (data || [])
      .map((r) => {
        const parts = r.fleet_code.split('/');
        return parts.length > 1 ? parseInt(parts[parts.length - 1], 10) : NaN;
      })
      .filter((n) => !isNaN(n));

    const maxNum = numbers.length > 0 ? Math.max(...numbers) : 0;
    const newNumber = (maxNum + 1).toString().padStart(3, '0');
    return `FLT/${newNumber}`;
  } catch (err) {
    console.error('Crash in generateFleetCodeAction:', err);
    return `FLT/${Date.now().toString().slice(-4)}`;
  }
}
