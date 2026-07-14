'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, ChevronRight, Search, Plus, Save, Clock, AlertTriangle, Building, CreditCard, ChevronLeft, FileText, Loader2, Calendar, Truck, Ship, ArrowRight } from 'lucide-react';
import { revalidateContracts } from '@/lib/actions/contractActions';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';

interface Props {
  tenantId: string;
  customers: { id: string; name: string; code: string; legal_name?: string }[];
  warehouses: { id: string; name: string; code: string }[];
  services?: any[];
  uoms?: { id: string; name: string }[];
  initialData?: any;
}

const steps = [
  { id: 1, title: 'General Info', description: 'Dates & Customer' },
  { id: 2, title: 'Locations', description: 'Warehouses & Space' },
  { id: 3, title: 'Pricing', description: 'Billing Rates' }
];

export default function ContractWizard({ tenantId, customers, warehouses, services = [], uoms = [], initialData }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form State
  const [sbu, setSbu] = useState('WAREHOUSE');
  const [customerId, setCustomerId] = useState(initialData?.customer_id || '');
  
  // Date & Config State
  const [startDate, setStartDate] = useState(initialData?.start_date || '');
  const [endDate, setEndDate] = useState(initialData?.end_date || '');
  const [contractNumber, setContractNumber] = useState(initialData?.contract_number || '');
  const [billingMethod, setBillingMethod] = useState(initialData?.billing_method || 'MONTHLY_FIXED');

  // Multi-Warehouse State
  const [selectedWarehouses, setSelectedWarehouses] = useState<{
    id: string;
    warehouse_id: string;
    committed_space: string;
    uom_space: string;
  }[]>(() => {
    if (initialData?.md_contract_warehouses && initialData.md_contract_warehouses.length > 0) {
      return initialData.md_contract_warehouses.map((w: any) => ({
        id: w.id,
        warehouse_id: w.warehouse_id,
        committed_space: w.committed_space?.toString() || '',
        uom_space: w.uom_space || 'PALLET'
      }));
    }
    if (initialData && warehouses && warehouses.length > 0) {
      const defaultWh = initialData.warehouse_id || warehouses[0].id;
      return [{ id: 'auto-wh', warehouse_id: defaultWh, committed_space: '0', uom_space: 'PALLET' }];
    }
    return [];
  });

  // Dynamic Rates State
  const [rates, setRates] = useState<{ id: string; charge_code: string; label: string; rate_value: string; uom: string; category: string; warehouse_id: string | null }[]>(() => {
    const defaultWh = initialData?.md_contract_warehouses?.[0]?.warehouse_id || initialData?.warehouse_id || warehouses?.[0]?.id || null;
    return (initialData?.md_billing_rates?.map((r: any) => ({
      id: r.id,
      charge_code: r.charge_code,
      label: services?.find(s => s.charge_code === r.charge_code)?.service_name || r.charge_code,
      category: services?.find(s => s.charge_code === r.charge_code)?.category || 'GENERAL',
      rate_value: r.rate_value?.toString() || '',
      uom: r.uom,
      warehouse_id: r.warehouse_id || defaultWh
    })) || []);
  });

  // Local UOMs state for inline adding
  const [localUoms, setLocalUoms] = useState<{ id: string; name: string }[]>([]);
  React.useEffect(() => {
    if (uoms && uoms.length > 0) setLocalUoms(uoms);
  }, [uoms]);

  // Local Services state for inline adding
  const [localServices, setLocalServices] = useState<any[]>([]);
  React.useEffect(() => {
    if (services && services.length > 0) setLocalServices(services);
  }, [services]);

  // UOM Modal State
  const [isUomModalOpen, setIsUomModalOpen] = useState(false);
  const [newUomName, setNewUomName] = useState('');
  const [newUomDesc, setNewUomDesc] = useState('');
  const [pendingUomTarget, setPendingUomTarget] = useState<number | 'SPACE' | null>(null);

  // Service Modal State
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [newServiceForm, setNewServiceForm] = useState({
    charge_code: '',
    service_name: '',
    category: 'VAS',
    default_uom: 'PCS'
  });

  // When SBU changes or services load, we can auto-populate some defaults if rates is empty
  React.useEffect(() => {
    if (rates.length === 0 && services.length > 0) {
      // Find basic ones to start with
      const defaults = services.filter(s => (s.sbu_type === sbu || s.sbu_type === 'ALL' || s.sbu_type === 'GENERAL') && ['STR-FIX', 'HD-IN', 'HD-OUT'].includes(s.charge_code));
      if (defaults.length > 0) {
        setRates(defaults.map(d => ({
          id: Math.random().toString(),
          charge_code: d.charge_code,
          label: d.service_name,
          rate_value: '',
          uom: d.default_uom || 'PCS',
          category: d.category,
          warehouse_id: null
        })));
      }
    }
  }, [services, sbu]);

  React.useEffect(() => {
    if (initialData && warehouses && warehouses.length > 0 && selectedWarehouses.length === 0) {
      const defaultWh = initialData?.md_contract_warehouses?.[0]?.warehouse_id || initialData?.warehouse_id || warehouses[0].id;
      if (defaultWh) {
        setSelectedWarehouses([{ id: 'auto-wh', warehouse_id: defaultWh, committed_space: '0', uom_space: 'PALLET' }]);
      }
    }
  }, [initialData, warehouses]);

  React.useEffect(() => {
    if (initialData?.md_billing_rates && services && services.length > 0) {
      const defaultWh = selectedWarehouses?.[0]?.warehouse_id || initialData?.md_contract_warehouses?.[0]?.warehouse_id || warehouses?.[0]?.id || null;
      setRates(initialData.md_billing_rates.map((r: any) => {
        const foundSrv = services.find(s => s.charge_code === r.charge_code);
        return {
          id: r.id,
          charge_code: r.charge_code,
          label: foundSrv?.service_name || r.charge_code,
          category: foundSrv?.category || 'GENERAL',
          rate_value: r.rate_value?.toString() || '',
          uom: r.uom,
          warehouse_id: r.warehouse_id || defaultWh
        };
      }));
    }
  }, [initialData, services]);

  const handleRateChange = (index: number, value: string) => {
    const newRates = [...rates];
    newRates[index].rate_value = value;
    setRates(newRates);
  };

  const handleRateUomChange = (index: number, value: string) => {
    if (value === '__ADD_NEW__') {
      setPendingUomTarget(index);
      setNewUomName('');
      setNewUomDesc('');
      setIsUomModalOpen(true);
      return;
    }
    const newRates = [...rates];
    newRates[index].uom = value;
    setRates(newRates);
  };

  const handleSaveNewUom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUomName) return;

    try {
      const uomName = newUomName.toUpperCase().trim();
      const payload = {
        tenant_id: tenantId,
        name: uomName,
        description: newUomDesc
      };

      const { data, error } = await supabase.from('md_uoms').insert([payload]).select('id, name').single();
      
      if (error) throw error;
      
      // Update local UOMs
      setLocalUoms(prev => [...prev, data]);
      
      // Apply to target
      if (pendingUomTarget !== null && pendingUomTarget !== 'SPACE') {
        setRates(prev => {
          const newRates = [...prev];
          newRates[pendingUomTarget].uom = data.name;
          return newRates;
        });
      }
      
      toast.success(`UOM ${data.name} added successfully!`);
      setIsUomModalOpen(false);
      setPendingUomTarget(null);
    } catch (err: any) {
      toast.error('Failed to create UOM: ' + err.message);
    }
  };

  const handleSaveNewService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newServiceForm.charge_code || !newServiceForm.service_name) return;

    try {
      const payload = {
        tenant_id: tenantId,
        sbu_type: sbu, // Use current SBU
        charge_code: newServiceForm.charge_code.toUpperCase().trim(),
        service_name: newServiceForm.service_name,
        category: newServiceForm.category,
        default_uom: newServiceForm.default_uom,
        description: '',
        income_account_id: null // Force Auto-COA Generation!
      };

      const { data, error } = await supabase.from('md_services').insert([payload]).select('*').single();
      
      if (error) throw error;
      
      setLocalServices(prev => [...prev, data]);
      
      // Auto-add the new service to the rates list
      setRates(prev => [...prev, {
        id: Math.random().toString(),
        charge_code: data.charge_code,
        label: data.service_name,
        rate_value: '',
        uom: data.default_uom || 'PCS',
        category: data.category,
        warehouse_id: null
      }]);
      
      toast.success(`Service ${data.service_name} added successfully & Auto-COA Generated!`);
      setIsServiceModalOpen(false);
      setNewServiceForm({
        charge_code: '',
        service_name: '',
        category: 'VAS',
        default_uom: 'PCS'
      });
    } catch (err: any) {
      toast.error('Failed to create Service: ' + err.message);
    }
  };

  const removeRate = (index: number) => {
    setRates(rates.filter((_, i) => i !== index));
  };

  const addRate = (charge_code: string) => {
    if (!charge_code) return;
    const srv = services.find(s => s.charge_code === charge_code);
    if (srv) {
      setRates([...rates, {
        id: Math.random().toString(),
        charge_code: srv.charge_code,
        label: srv.service_name,
        rate_value: '',
        uom: srv.default_uom || 'PCS',
        category: srv.category,
        warehouse_id: null
      }]);
    }
  };

  const [contractId, setContractId] = useState<string | null>(initialData?.id || null);

  const generateContractNumber = () => {
    return `CTR-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
  };

  const handleSave = async (redirect: boolean = true) => {
    if (!customerId || selectedWarehouses.length === 0 || !startDate || !endDate) {
      toast.error('Please fill in all required fields and select at least one warehouse.');
      return;
    }

    setLoading(true);

    const billingRates = rates
      .filter(r => r.rate_value !== '')
      .map(r => ({
        charge_code: r.charge_code,
        rate_value: parseFloat(r.rate_value),
        uom: r.uom,
        warehouse_id: r.warehouse_id || null
      }));

    try {
      const res = await (async () => {
        const { data: user } = await supabase.auth.getUser();
        const userId = user?.user?.id;
        
        if (!userId) return { success: false, error: 'Unauthorized. Please login again.' };

        let savedContractId = contractId;

        if (savedContractId) {
          // UPDATE EXISTING CONTRACT
          const { error: contractError } = await supabase
            .from('md_storage_contracts')
            .update({
              customer_id: customerId,
              start_date: startDate,
              end_date: endDate,
              billing_method: billingMethod,
              status: 'ACTIVE',
            })
            .eq('id', savedContractId);

          if (contractError) return { success: false, error: contractError.message };

          // DELETE OLD WAREHOUSES & RATES
          if (selectedWarehouses.length > 0) {
            await supabase.from('md_contract_warehouses').delete().eq('contract_id', savedContractId);
          }
          if (billingRates.length > 0) {
            await supabase.from('md_billing_rates').delete().eq('contract_id', savedContractId);
          }
        } else {
          // INSERT NEW CONTRACT
          const { data: contract, error: contractError } = await supabase
            .from('md_storage_contracts')
            .insert({
              tenant_id: tenantId,
              contract_number: contractNumber || generateContractNumber(),
              customer_id: customerId,
              start_date: startDate,
              end_date: endDate,
              billing_method: billingMethod,
              status: 'ACTIVE',
              notes: '',
              created_by: userId
            })
            .select()
            .single();

          if (contractError) return { success: false, error: contractError.message };
          savedContractId = contract.id;
          setContractId(contract.id);
        }

        // INSERT NEW WAREHOUSES
        if (selectedWarehouses.length > 0 && savedContractId) {
          const whToInsert = selectedWarehouses.map(w => ({
            tenant_id: tenantId,
            contract_id: savedContractId,
            warehouse_id: w.warehouse_id,
            committed_space: parseFloat(w.committed_space || '0'),
            uom_space: w.uom_space
          }));
          const { error: whError } = await supabase.from('md_contract_warehouses').insert(whToInsert);
          if (whError) return { success: false, error: 'Failed to save warehouses: ' + whError.message };
        }

        // INSERT NEW RATES
        if (billingRates.length > 0 && savedContractId) {
          const ratesToInsert = billingRates.map((rate) => ({
            tenant_id: tenantId,
            contract_id: savedContractId,
            warehouse_id: rate.warehouse_id,
            charge_code: rate.charge_code,
            rate_value: rate.rate_value,
            uom: rate.uom,
            valid_from: startDate,
            valid_to: endDate,
            created_by: userId
          }));

          const { error: ratesError } = await supabase
            .from('md_billing_rates')
            .insert(ratesToInsert);

          if (ratesError) return { success: false, error: 'Contract created, but failed to save rates: ' + ratesError.message };
        }

        return { success: true, error: null };
      })();
      if (res.success) {
        toast.success(contractId ? 'Contract updated successfully' : 'Contract saved successfully');
        await revalidateContracts();
        if (redirect) {
          router.replace(`/hq/warehouse/billing?ts=${Date.now()}`);
          router.refresh();
        } else {
          router.refresh();
        }
      } else {
        toast.error('Failed to save contract: ' + res.error);
      }
    } catch (error: any) {
      toast.error('An error occurred: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Animation variants
  const stepVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
    exit: { opacity: 0, y: -10, transition: { duration: 0.2 } }
  };

  return (
    <div className="w-full">
      {/* Sleek Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <button 
            onClick={() => router.push('/hq/warehouse/billing')}
            className="text-slate-500 hover:text-indigo-600 transition-colors flex items-center gap-1.5 text-sm font-semibold mb-2 group"
          >
            <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> 
            Back to Warehouse Billing
          </button>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl">
              <FileText size={24} />
            </div>
            New Commercial Contract
          </h1>
        </div>
      </div>

      <div className="mb-8 bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-200/60">
        <div className="flex flex-col sm:flex-row justify-between relative">
          {/* Horizontal Line Background */}
          <div className="hidden sm:block absolute top-5 left-8 right-8 h-0.5 bg-slate-100" />
          
          {steps.map((s, i) => {
            const isActive = step === s.id;
            const isCompleted = step > s.id;
            
            return (
              <div key={s.id} className="relative z-10 flex sm:flex-col items-center gap-4 sm:gap-3 mb-4 sm:mb-0 flex-1">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-500 shadow-sm mx-auto ${
                  isActive ? 'bg-indigo-600 text-white shadow-indigo-200 ring-4 ring-indigo-50' 
                  : isCompleted ? 'bg-emerald-500 text-white ring-4 ring-emerald-50' 
                  : 'bg-white border-2 border-slate-200 text-slate-400'
                }`}>
                  {isCompleted ? <CheckCircle2 size={20} /> : s.id}
                </div>
                <div className="text-left sm:text-center">
                  <p className={`text-sm font-bold transition-colors ${isActive ? 'text-indigo-900' : isCompleted ? 'text-slate-700' : 'text-slate-400'}`}>
                    {s.title}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5 hidden sm:block">{s.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="w-full">
        <div className="w-full">
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg shadow-slate-200/40 border border-white overflow-hidden ring-1 ring-slate-200/50">
            
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div 
                  key="step1"
                  variants={stepVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="p-8"
                >
                  <div className="mb-8">
                    <h2 className="text-2xl font-bold text-slate-900">General Information</h2>
                    <p className="text-slate-500 mt-1">Define the contract period, customer, and business unit.</p>
                  </div>

                  <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Contract Number */}
                      <div className="group md:col-span-1">
                        <label className="block text-sm font-semibold text-slate-700 mb-2 group-focus-within:text-indigo-600 transition-colors">
                          Contract Number
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                            <FileText size={18} />
                          </div>
                          <input 
                            type="text" 
                            placeholder="Auto-generated if empty"
                            value={contractNumber}
                            onChange={(e) => setContractNumber(e.target.value)}
                            className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:border-indigo-500 transition-all text-slate-900 font-medium"
                          />
                        </div>
                      </div>

                      {/* Start Date */}
                      <div className="group md:col-span-1">
                        <label className="block text-sm font-semibold text-slate-700 mb-2 group-focus-within:text-indigo-600 transition-colors">
                          Start Date <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                            <Calendar size={18} />
                          </div>
                          <input 
                            type="date" 
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:border-indigo-500 transition-all text-slate-900 font-medium"
                          />
                        </div>
                      </div>

                      {/* End Date */}
                      <div className="group md:col-span-1">
                        <label className="block text-sm font-semibold text-slate-700 mb-2 group-focus-within:text-indigo-600 transition-colors">
                          End Date <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                            <Calendar size={18} />
                          </div>
                          <input 
                            type="date" 
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:border-indigo-500 transition-all text-slate-900 font-medium"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Customer Selection */}
                    <div className="group">
                      <label className="block text-sm font-semibold text-slate-700 mb-2 group-focus-within:text-indigo-600 transition-colors">
                        Select Customer <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <select 
                          value={customerId} 
                          onChange={(e) => setCustomerId(e.target.value)}
                          className="w-full appearance-none pl-4 pr-10 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:border-indigo-500 transition-all text-slate-900 font-medium"
                        >
                          <option value="">-- Choose an existing customer --</option>
                          {customers.map(c => (
                            <option key={c.id} value={c.id}>{c.name} ({c.legal_name || c.code})</option>
                          ))}
                        </select>
                        <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-400">
                          <ChevronRight size={16} className="rotate-90" />
                        </div>
                      </div>
                    </div>

                    {/* SBU Selection */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-3">
                        Strategic Business Unit <span className="text-rose-500">*</span>
                      </label>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <button 
                          onClick={() => setSbu('WAREHOUSE')}
                          className={`relative p-6 rounded-2xl text-left transition-all duration-300 ${
                            sbu === 'WAREHOUSE' 
                              ? 'bg-gradient-to-br from-indigo-50 to-blue-50/50 ring-2 ring-indigo-500 shadow-md shadow-indigo-100' 
                              : 'bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-sm'
                          }`}
                        >
                          {sbu === 'WAREHOUSE' && (
                            <div className="absolute top-4 right-4 text-indigo-600">
                              <CheckCircle2 size={20} className="animate-in zoom-in duration-300" />
                            </div>
                          )}
                          <div className={`w-12 h-12 rounded-xl mb-4 flex items-center justify-center transition-colors ${
                            sbu === 'WAREHOUSE' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'
                          }`}>
                            <Building size={24} />
                          </div>
                          <h4 className={`font-bold ${sbu === 'WAREHOUSE' ? 'text-indigo-900' : 'text-slate-900'}`}>Warehouse</h4>
                          <p className="text-xs text-slate-500 mt-1">Storage & Handling operations</p>
                        </button>
                        
                        <button disabled className="relative p-6 rounded-2xl text-left bg-slate-50 border border-slate-100 opacity-60 cursor-not-allowed">
                          <div className="w-12 h-12 rounded-xl mb-4 flex items-center justify-center bg-slate-200/50 text-slate-400">
                            <Truck size={24} />
                          </div>
                          <h4 className="font-bold text-slate-500">Trucking</h4>
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-200 text-slate-600 mt-1">COMING SOON</span>
                        </button>

                        <button disabled className="relative p-6 rounded-2xl text-left bg-slate-50 border border-slate-100 opacity-60 cursor-not-allowed">
                          <div className="w-12 h-12 rounded-xl mb-4 flex items-center justify-center bg-slate-200/50 text-slate-400">
                            <Ship size={24} />
                          </div>
                          <h4 className="font-bold text-slate-500">Forwarding</h4>
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-200 text-slate-600 mt-1">COMING SOON</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="mt-10 pt-6 border-t border-slate-100 flex justify-end">
                    <button 
                      onClick={() => setStep(2)}
                      disabled={!customerId || !sbu || !startDate || !endDate}
                      className="group flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white px-8 py-3 rounded-xl font-bold transition-all shadow-md shadow-indigo-200 hover:shadow-lg hover:shadow-indigo-300 disabled:shadow-none"
                    >
                      Next Step <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </motion.div>
              )}

              {step === 2 && sbu === 'WAREHOUSE' && (
                <motion.div 
                  key="step2"
                  variants={stepVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="p-8"
                >
                  <div className="mb-8">
                    <h2 className="text-2xl font-bold text-slate-900">Warehouse Locations</h2>
                    <p className="text-slate-500 mt-1">Add operating locations and space commitments.</p>
                  </div>



                  <div className="space-y-4">
                    <div className="flex justify-between items-end mb-4">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700">
                          Target Warehouses <span className="text-rose-500">*</span>
                        </label>
                        <p className="text-xs text-slate-500">Add one or more warehouses to this contract.</p>
                      </div>
                      <button 
                        onClick={() => setSelectedWarehouses([...selectedWarehouses, { id: Math.random().toString(), warehouse_id: '', committed_space: '', uom_space: 'PALLET' }])}
                        className="text-indigo-600 bg-indigo-50 hover:bg-indigo-100 font-semibold px-3 py-1.5 rounded-lg text-sm transition-colors"
                      >
                        + Add Warehouse
                      </button>
                    </div>

                    {selectedWarehouses.map((wh, idx) => (
                      <div key={wh.id} className="flex gap-3 items-end p-4 bg-slate-50 border border-slate-200 rounded-xl">
                        <div className="flex-1">
                          <label className="block text-xs font-semibold text-slate-500 mb-1">Warehouse</label>
                          <select 
                            value={wh.warehouse_id} 
                            onChange={(e) => {
                              const newWhs = [...selectedWarehouses];
                              newWhs[idx].warehouse_id = e.target.value;
                              setSelectedWarehouses(newWhs);
                            }}
                            className="w-full appearance-none px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium bg-white"
                          >
                            <option value="">-- Choose --</option>
                            {warehouses.map(w => (
                              <option key={w.id} value={w.id}>{w.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="w-32">
                          <label className="block text-xs font-semibold text-slate-500 mb-1">Commitment</label>
                          <input 
                            type="number" 
                            placeholder="0"
                            value={wh.committed_space}
                            onChange={(e) => {
                              const newWhs = [...selectedWarehouses];
                              newWhs[idx].committed_space = e.target.value;
                              setSelectedWarehouses(newWhs);
                            }}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium bg-white"
                          />
                        </div>
                        <div className="w-24">
                          <label className="block text-xs font-semibold text-slate-500 mb-1">UOM</label>
                          <select 
                            value={wh.uom_space} 
                            onChange={(e) => {
                              const newWhs = [...selectedWarehouses];
                              newWhs[idx].uom_space = e.target.value;
                              setSelectedWarehouses(newWhs);
                            }}
                            className="w-full appearance-none px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium bg-white"
                          >
                            <option value="PALLET">PALLET</option>
                            <option value="CBM">CBM</option>
                            <option value="SQM">SQM</option>
                          </select>
                        </div>
                        <button 
                          onClick={() => {
                            const newWhs = [...selectedWarehouses];
                            newWhs.splice(idx, 1);
                            setSelectedWarehouses(newWhs);
                          }}
                          className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    {selectedWarehouses.length === 0 && (
                      <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-xl text-slate-500">
                        No warehouses added yet. Click "+ Add Warehouse" to begin.
                      </div>
                    )}
                  </div>

                  <div className="mt-10 pt-6 border-t border-slate-100 flex justify-between">
                    <button 
                      onClick={() => setStep(1)}
                      className="text-slate-500 hover:text-slate-900 font-semibold px-6 py-3 transition-colors"
                    >
                      Back
                    </button>
                    <button 
                      onClick={() => setStep(3)}
                      disabled={selectedWarehouses.length === 0 || selectedWarehouses.some(w => !w.warehouse_id)}
                      className="group flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white px-8 py-3 rounded-xl font-bold transition-all shadow-md shadow-indigo-200 hover:shadow-lg hover:shadow-indigo-300 disabled:shadow-none"
                    >
                      Next Step <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </motion.div>
              )}

              {step === 3 && sbu === 'WAREHOUSE' && (
                <motion.div 
                  key="step3"
                  variants={stepVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="p-8"
                >
                  <div className="mb-8">
                    <h2 className="text-2xl font-bold text-slate-900">Billing Rates</h2>
                    <p className="text-slate-500 mt-1">Set special rates for this customer in IDR. Leave blank for standard pricing.</p>
                  </div>

                  <div className="space-y-3">
                    {rates.map((rate, index) => (
                      <div key={rate.id} className="group flex flex-col md:flex-row md:items-center gap-4 bg-white hover:bg-slate-50/80 p-5 rounded-2xl border border-slate-200 hover:border-indigo-200 transition-all shadow-sm hover:shadow-md">
                        <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 hidden md:flex">
                          <CreditCard size={24} />
                        </div>
                        
                        <div className="flex-1 min-w-[200px]">
                          <div className="font-bold text-slate-900 text-base">{rate.label}</div>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">{rate.charge_code}</span>
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">• {rate.category}</span>
                          </div>
                        </div>

                        <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 w-full md:w-auto bg-slate-50/50 p-2 rounded-xl border border-slate-100">
                          {/* Warehouse Selector */}
                          <div className="relative w-full sm:w-auto">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                              <Building size={16} />
                            </div>
                            <select
                              value={rate.warehouse_id || ''}
                              onChange={(e) => {
                                const newRates = [...rates];
                                newRates[index].warehouse_id = e.target.value || null;
                                setRates(newRates);
                              }}
                              className="w-full sm:w-44 pl-10 pr-10 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-semibold text-slate-700 appearance-none shadow-sm transition-all hover:border-indigo-300"
                            >
                              <option value="">All Locations</option>
                              {selectedWarehouses.filter(w => w.warehouse_id).map(w => {
                                const whInfo = warehouses.find(wh => wh.id === w.warehouse_id);
                                return <option key={w.warehouse_id} value={w.warehouse_id}>{whInfo?.name}</option>;
                              })}
                            </select>
                            <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-400">
                              <ChevronRight size={16} className="rotate-90" />
                            </div>
                          </div>

                          {/* Price Input Group */}
                          <div className="flex items-center flex-1 sm:flex-none">
                            <div className="flex items-center bg-white border border-slate-200 rounded-xl shadow-sm focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 transition-all overflow-hidden w-full sm:w-auto hover:border-indigo-300">
                              <span className="text-slate-500 font-bold pl-4 pr-3 bg-slate-50 border-r border-slate-200 py-3 text-sm">Rp</span>
                              <input 
                                type="number"
                                placeholder="0"
                                value={rate.rate_value}
                                onChange={(e) => handleRateChange(index, e.target.value)}
                                className="w-full sm:w-32 px-4 py-3 outline-none text-right font-bold text-slate-900 text-base"
                              />
                              <span className="text-slate-300 font-light text-2xl px-1">/</span>
                              <div className="relative">
                                <select 
                                  value={rate.uom}
                                  onChange={(e) => handleRateUomChange(index, e.target.value)}
                                  className="w-28 pl-3 pr-8 py-3 outline-none text-sm font-bold text-slate-700 appearance-none bg-transparent hover:bg-slate-50 cursor-pointer transition-colors"
                                >
                                  <option value={rate.uom}>{rate.uom}</option>
                                  {localUoms.filter(u => u.name !== rate.uom).map(u => (
                                    <option key={u.id} value={u.name}>{u.name}</option>
                                  ))}
                                  <option value="__ADD_NEW__" className="text-indigo-600 font-bold">+ New UOM</option>
                                </select>
                                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-400">
                                  <ChevronRight size={14} className="rotate-90" />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <button 
                          onClick={() => removeRate(index)}
                          className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors shrink-0 md:ml-2"
                          title="Remove item"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      + Add More Billing Items
                    </label>
                    <div className="flex gap-2">
                      <select 
                        onChange={(e) => {
                          if (e.target.value === '__ADD_NEW_SERVICE__') {
                            setIsServiceModalOpen(true);
                          } else {
                            addRate(e.target.value);
                          }
                          e.target.value = ''; // reset after picking
                        }}
                        className="flex-1 appearance-none px-4 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-slate-600 text-sm font-medium"
                      >
                        <option value="">-- Select Master Service to add --</option>
                        {localServices?.filter(s => s.sbu_type === sbu || s.sbu_type === 'ALL' || s.sbu_type === 'GENERAL').map(s => (
                          <option key={s.id} value={s.charge_code}>{s.service_name} ({s.charge_code}) - {s.category}</option>
                        ))}
                        <option value="__ADD_NEW_SERVICE__" className="text-indigo-600 font-bold">+ Create New Master Service</option>
                      </select>
                    </div>
                  </div>

                  <div className="mt-8 bg-amber-50 border border-amber-200/60 p-5 rounded-xl flex gap-4">
                    <div className="text-amber-500 shrink-0">
                      <AlertTriangle size={24} />
                    </div>
                    <div>
                      <h4 className="font-bold text-amber-900">Draft Status</h4>
                      <p className="text-sm text-amber-700/90 mt-1">
                        Contract will be saved as <strong>DRAFT</strong> and requires Manager approval before becoming active.
                      </p>
                    </div>
                  </div>

                  <div className="mt-10 pt-6 border-t border-slate-100 flex justify-between items-center">
                    <button 
                      onClick={() => setStep(2)}
                      className="text-slate-500 hover:text-slate-900 font-semibold px-6 py-3 transition-colors"
                    >
                      Back
                    </button>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => handleSave(false)}
                        disabled={loading}
                        className="group flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:bg-slate-50 disabled:text-slate-400 px-6 py-3 rounded-xl font-bold transition-all"
                      >
                        {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} className="group-hover:scale-110 transition-transform" />}
                        Save & Continue Editing
                      </button>
                      <button 
                        onClick={() => handleSave(true)}
                        disabled={loading}
                        className="group flex items-center gap-2 bg-slate-900 hover:bg-black disabled:bg-slate-300 disabled:text-slate-500 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-md hover:shadow-xl hover:shadow-slate-900/20 disabled:shadow-none"
                      >
                        {loading ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} className="group-hover:scale-110 transition-transform" />}
                        {loading ? 'Saving...' : 'Save & Close'}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        </div>
      </div>

      {/* Floating UOM Modal */}
      {isUomModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-lg font-bold text-slate-900">
                Add New Master UOM
              </h2>
              <button 
                onClick={() => {
                  setIsUomModalOpen(false);
                  setPendingUomTarget(null);
                }} 
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveNewUom} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">UOM Name <span className="text-red-500">*</span></label>
                <input 
                  required
                  value={newUomName}
                  onChange={e => setNewUomName(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold uppercase focus:ring-2 focus:ring-indigo-600 outline-none"
                  placeholder="e.g. CARTON, CBM, LITER"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Description</label>
                <input 
                  value={newUomDesc}
                  onChange={e => setNewUomDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-600 outline-none"
                  placeholder="e.g. Carton Box"
                />
              </div>
              <div className="pt-2 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => {
                    setIsUomModalOpen(false);
                    setPendingUomTarget(null);
                  }} 
                  className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-50 rounded-lg text-sm"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg text-sm shadow-sm">
                  Save UOM
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Service Modal */}
      {isServiceModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-lg font-bold text-slate-900">
                Create New Master Service
              </h2>
              <button 
                onClick={() => setIsServiceModalOpen(false)} 
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveNewService} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Charge Code <span className="text-red-500">*</span></label>
                  <input 
                    required
                    value={newServiceForm.charge_code}
                    onChange={e => setNewServiceForm({...newServiceForm, charge_code: e.target.value.toUpperCase()})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold uppercase focus:ring-2 focus:ring-indigo-600 outline-none font-mono"
                    placeholder="e.g. VAS-01"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Category <span className="text-red-500">*</span></label>
                  <select 
                    required
                    value={newServiceForm.category}
                    onChange={e => setNewServiceForm({...newServiceForm, category: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-600 outline-none"
                  >
                    <option value="STORAGE">Storage</option>
                    <option value="HANDLING">Handling</option>
                    <option value="VAS">VAS</option>
                    <option value="ADMIN">Admin</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Service Name <span className="text-red-500">*</span></label>
                <input 
                  required
                  value={newServiceForm.service_name}
                  onChange={e => setNewServiceForm({...newServiceForm, service_name: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-600 outline-none"
                  placeholder="e.g. Biaya Administrasi Bulanan"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Default UOM <span className="text-red-500">*</span></label>
                <select 
                  required
                  value={newServiceForm.default_uom}
                  onChange={e => setNewServiceForm({...newServiceForm, default_uom: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-600 outline-none"
                >
                  {localUoms.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                </select>
              </div>

              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 flex items-start gap-3">
                <div className="text-indigo-500 shrink-0 mt-0.5">ℹ️</div>
                <p className="text-xs text-indigo-700 leading-relaxed">
                  <strong>Otomatisasi COA:</strong> Menyimpan ini akan secara otomatis membuatkan akun pendapatan baru di Chart of Accounts Keuangan untuk SBU {sbu}.
                </p>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsServiceModalOpen(false)} 
                  className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-50 rounded-lg text-sm"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg text-sm shadow-sm">
                  Save Service
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
