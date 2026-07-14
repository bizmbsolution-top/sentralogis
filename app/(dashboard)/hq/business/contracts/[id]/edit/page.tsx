"use client";

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import ContractWizard from '../../new/ContractWizard';
import { useAuth } from '@/lib/hooks/useAuth';
import { Loader2 } from 'lucide-react';

export default function EditContractPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { profile, user, isAuthenticated, loading: authLoading } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [contractId, setContractId] = useState<string | null>(null);
  const [initialData, setInitialData] = useState<any>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [uoms, setUoms] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    params.then((p) => {
      setContractId(p.id);
    });
  }, [params]);

  useEffect(() => {
    if (authLoading || !contractId || !profile) return;

    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    const tenantId = profile.tenant_id;
    if (!tenantId) {
      setError("Tenant ID not found");
      setLoading(false);
      return;
    }

    async function fetchData() {
      try {
        const [custRes, whRes, srvRes, uomRes, contractRes] = await Promise.all([
          supabase.from('md_entities').select('id, name, entity_code, legal_name').eq('tenant_id', tenantId).eq('is_customer', true),
          supabase.from('md_warehouses').select('id, name, code').eq('tenant_id', tenantId),
          supabase.from('md_services').select('*').eq('tenant_id', tenantId),
          supabase.from('md_uoms').select('id, name').eq('tenant_id', tenantId),
          supabase.from('md_storage_contracts').select(`
            *,
            md_contract_warehouses (*),
            md_billing_rates (*)
          `).eq('id', contractId).single()
        ]);

        if (contractRes.error) {
          setError(contractRes.error.message);
        } else {
          setCustomers(custRes.data || []);
          setWarehouses(whRes.data || []);
          setServices(srvRes.data || []);
          setUoms(uomRes.data || []);
          setInitialData(contractRes.data);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [authLoading, contractId, profile, isAuthenticated, router, supabase]);

  if (authLoading || loading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
        <p className="text-xs text-slate-400">Loading contract data...</p>
      </div>
    );
  }

  if (error) {
    return <div className="p-6 text-red-500">Error fetching contract: {error}</div>;
  }

  if (!profile?.tenant_id || !initialData) {
    return <div className="p-6">Error: Contract not found or unauthorized.</div>;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Edit Storage Contract</h1>
        <p className="text-slate-500 mt-1">Update terms, locations, and billing rates</p>
      </div>

      <ContractWizard 
        tenantId={profile.tenant_id} 
        customers={customers}
        warehouses={warehouses}
        services={services}
        uoms={uoms}
        initialData={initialData}
      />
    </div>
  );
}
