import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import ContractWizard from './ContractWizard';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Create Commercial Contract | Sentralogis',
};

export default async function NewContractPage() {
  const supabase = createClient(cookies());
  const { data: user } = await supabase.auth.getUser();
  const tenantId = user?.user?.user_metadata?.tenant_id;

  if (!tenantId) {
    redirect('/login');
  }

  // Fetch Master Data for dropdowns
  const [customersResponse, warehousesResponse] = await Promise.all([
    supabase
      .from('md_entities')
      .select('id, name, code')
      .eq('tenant_id', tenantId)
      .eq('entity_type', 'CUSTOMER')
      .eq('is_active', true)
      .order('name'),
    supabase
      .from('md_warehouses')
      .select('id, name, code')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('name')
  ]);

  const customers = customersResponse.data || [];
  const warehouses = warehousesResponse.data || [];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <ContractWizard 
        tenantId={tenantId}
        customers={customers}
        warehouses={warehouses}
      />
    </div>
  );
}
