'use server';

import { createClient } from '@/lib/supabase/server';
import { unstable_noStore as noStore } from 'next/cache';

export interface StorageContract {
  id: string;
  tenant_id: string;
  contract_number: string;
  customer_id: string;
  warehouse_id: string;
  area_id?: string;
  start_date: string;
  end_date: string;
  committed_space: number;
  uom_space: string;
  max_overflow: number;
  billing_method: string;
  status: string;
  notes?: string;
  created_at: string;
  md_entities?: {
    name: string;
    code: string;
  };
  md_warehouses?: {
    name: string;
  };
}

export interface BillingRateInput {
  charge_code: string;
  rate_value: number;
  uom: string;
}

export async function getWarehouseContracts(tenantId: string) {
  noStore();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('md_storage_contracts')
    .select(`
      *,
      md_entities!md_storage_contracts_customer_id_fkey (name, legal_name, entity_code),
      md_contract_warehouses (
        id,
        warehouse_id,
        committed_space,
        uom_space,
        md_warehouses (name, code)
      )
    `)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching contracts:', error);
    return [];
  }

  console.log('Fetched contracts count:', data?.length);
  return data as any[];
}

export async function revalidateContracts() {
  const { revalidatePath } = await import('next/cache');
  revalidatePath('/hq/business/contracts');
}

export async function createWarehouseContract(
  tenantId: string,
  contractData: Omit<StorageContract, 'id' | 'tenant_id' | 'created_at' | 'md_entities' | 'md_warehouses' | 'status' | 'created_by'> & { status: string, notes?: string },
  billingRates: BillingRateInput[]
) {
  const supabase = await createClient();
  const { data: user } = await supabase.auth.getUser();
  const userId = user?.user?.id;

  if (!userId) {
    return { success: false, error: 'Unauthorized' };
  }

  // 1. Insert contract
  const { data: contract, error: contractError } = await supabase
    .from('md_storage_contracts')
    .insert({
      tenant_id: tenantId,
      contract_number: contractData.contract_number,
      customer_id: contractData.customer_id,
      warehouse_id: contractData.warehouse_id,
      area_id: contractData.area_id || null,
      start_date: contractData.start_date,
      end_date: contractData.end_date,
      committed_space: contractData.committed_space,
      uom_space: contractData.uom_space,
      max_overflow: contractData.max_overflow,
      billing_method: contractData.billing_method,
      status: contractData.status,
      notes: contractData.notes,
      created_by: userId
    })
    .select()
    .single();

  if (contractError) {
    console.error('Error creating contract:', contractError);
    return { success: false, error: contractError.message };
  }

  // 2. Insert billing rates
  if (billingRates.length > 0) {
    const ratesToInsert = billingRates.map((rate) => ({
      tenant_id: tenantId,
      contract_id: contract.id,
      charge_code: rate.charge_code,
      rate_value: rate.rate_value,
      uom: rate.uom,
      valid_from: contractData.start_date,
      valid_to: contractData.end_date,
      created_by: userId
    }));

    const { error: ratesError } = await supabase
      .from('md_billing_rates')
      .insert(ratesToInsert);

    if (ratesError) {
      console.error('Error inserting rates:', ratesError);
      // We don't rollback manually here as it's just a demo/basic flow, 
      // but ideally this should be a transaction via an RPC.
      return { success: false, error: 'Contract created, but failed to save rates: ' + ratesError.message };
    }
  }

  return { success: true, contract };
}
