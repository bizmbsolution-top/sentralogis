'use client';

import React, { useEffect, useState } from 'react';
import ContractWizard from './ContractWizard';
import { useAuth } from '@/lib/hooks/useAuth';
import { supabase } from '@/lib/supabaseClient';

export default function NewContractPage() {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;
  
  const [customers, setCustomers] = useState<{ id: string; name: string; code: string }[]>([]);
  const [warehouses, setWarehouses] = useState<{ id: string; name: string; code: string }[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [uoms, setUoms] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const [debugMsg, setDebugMsg] = useState('');

  useEffect(() => {
    async function fetchData() {
      if (!tenantId) {
        setLoading(false);
        return;
      }

      try {
        const customersPromise = supabase
          .from('md_entities')
          .select('id, name, code:entity_code')
          .eq('tenant_id', tenantId)
          .eq('is_customer', true)
          .eq('is_active', true)
          .order('name');
          
        const warehousesPromise = supabase
          .from('md_warehouses')
          .select('id, name')
          .eq('tenant_id', tenantId)
          .eq('is_active', true)
          .order('name');

        const servicesPromise = supabase
          .from('md_services')
          .select('*')
          .eq('tenant_id', tenantId)
          .eq('is_active', true)
          .order('sbu_type')
          .order('charge_code');

        const uomsPromise = supabase
          .from('md_uoms')
          .select('id, name')
          .eq('is_active', true)
          .order('name');

        const [customersResponse, warehousesResponse, servicesResponse, uomsResponse] = await Promise.all([customersPromise, warehousesPromise, servicesPromise, uomsPromise]);

        setDebugMsg(JSON.stringify({ 
          tenantId, 
          customersCount: customersResponse.data?.length, 
          customerErr: customersResponse.error,
          warehousesCount: warehousesResponse.data?.length,
          warehouseErr: warehousesResponse.error,
          servicesCount: servicesResponse.data?.length,
          servicesErr: servicesResponse.error,
          uomsCount: uomsResponse.data?.length,
          uomsErr: uomsResponse.error
        }, null, 2));

        if (customersResponse.error) {
          console.error("Customers fetch error:", customersResponse.error);
        }
        if (warehousesResponse.error) {
          console.error("Warehouses fetch error:", warehousesResponse.error);
        }
        if (servicesResponse.error) {
          console.error("Services fetch error:", servicesResponse.error);
        }
        if (uomsResponse.error) {
          console.error("UOMs fetch error:", uomsResponse.error);
        }

        if (customersResponse.data) setCustomers(customersResponse.data);
        if (warehousesResponse.data) setWarehouses(warehousesResponse.data as any);
        if (servicesResponse.data) setServices(servicesResponse.data);
        if (uomsResponse.data) setUoms(uomsResponse.data);
      } catch (error) {
        console.error('Failed to fetch master data', error);
        setDebugMsg(String(error));
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [tenantId]);

  if (!tenantId) {
    return (
      <div className="p-6 max-w-4xl mx-auto mt-10">
        <div className="bg-red-50 border border-red-200 text-red-800 p-6 rounded-xl">
          <h2 className="text-xl font-bold mb-2">Access Error</h2>
          <p>We could not find a valid Tenant ID in your client session.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto mt-10 flex justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-8 w-8 bg-indigo-200 rounded-full mb-4"></div>
          <div className="text-indigo-600 font-semibold">Loading data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {debugMsg && (
        <pre className="mb-4 bg-slate-900 text-slate-300 p-4 rounded-xl text-xs overflow-auto">
          DEBUG INFO: {debugMsg}
        </pre>
      )}
      <ContractWizard 
        tenantId={tenantId}
        customers={customers}
        warehouses={warehouses}
        services={services}
        uoms={uoms}
      />
    </div>
  );
}
