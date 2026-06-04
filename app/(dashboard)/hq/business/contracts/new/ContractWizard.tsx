'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ArrowRight, Save, Building, Loader2, CheckCircle2 } from 'lucide-react';
import { createWarehouseContract } from '@/lib/actions/contractActions';
import toast from 'react-hot-toast';

interface Props {
  tenantId: string;
  customers: { id: string; name: string; code: string }[];
  warehouses: { id: string; name: string; code: string }[];
}

export default function ContractWizard({ tenantId, customers, warehouses }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form State
  const [sbu, setSbu] = useState('WAREHOUSE');
  const [customerId, setCustomerId] = useState('');
  
  // Warehouse Specific State
  const [warehouseId, setWarehouseId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [committedSpace, setCommittedSpace] = useState('');
  const [uomSpace, setUomSpace] = useState('PALLET');
  const [billingMethod, setBillingMethod] = useState('MONTHLY_FIXED');

  // Rates State (Warehouse)
  const [rates, setRates] = useState([
    { charge_code: 'STR-FIX', label: 'Fixed Storage (per month)', rate_value: '', uom: 'PALLET' },
    { charge_code: 'HD-IN', label: 'Handling In', rate_value: '', uom: 'PALLET' },
    { charge_code: 'HD-OUT', label: 'Handling Out', rate_value: '', uom: 'PALLET' },
  ]);

  const handleRateChange = (index: number, value: string) => {
    const newRates = [...rates];
    newRates[index].rate_value = value;
    setRates(newRates);
  };

  const generateContractNumber = () => {
    return `CTR-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
  };

  const handleSave = async () => {
    if (!customerId || !warehouseId || !startDate || !endDate) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);

    // Format rates: only send ones that have values
    const billingRates = rates
      .filter(r => r.rate_value !== '')
      .map(r => ({
        charge_code: r.charge_code,
        rate_value: parseFloat(r.rate_value),
        uom: r.uom
      }));

    try {
      const res = await createWarehouseContract(
        tenantId,
        {
          contract_number: generateContractNumber(),
          customer_id: customerId,
          warehouse_id: warehouseId,
          start_date: startDate,
          end_date: endDate,
          committed_space: parseFloat(committedSpace || '0'),
          uom_space: uomSpace,
          max_overflow: 0,
          billing_method: billingMethod,
          status: 'DRAFT',
          notes: ''
        },
        billingRates
      );

      if (res.success) {
        toast.success('Contract saved successfully');
        router.push('/hq/business/contracts');
      } else {
        toast.error('Failed to save contract: ' + res.error);
      }
    } catch (error: any) {
      toast.error('An error occurred: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <button 
          onClick={() => router.back()}
          className="text-slate-500 hover:text-slate-900 transition-colors flex items-center gap-2 text-sm font-medium"
        >
          <ChevronLeft size={16} /> Back
        </button>
        <div className="flex items-center gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                step >= i ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'
              }`}>
                {step > i ? <CheckCircle2 size={14} /> : i}
              </div>
              {i < 3 && (
                <div className={`w-8 h-1 mx-1 rounded-full transition-colors ${
                  step > i ? 'bg-blue-600' : 'bg-slate-200'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="p-6">
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div>
              <h2 className="text-xl font-bold text-slate-900">1. Customer & SBU Selection</h2>
              <p className="text-sm text-slate-500 mt-1">Select the customer and the target business unit for this contract.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Customer <span className="text-red-500">*</span></label>
                <select 
                  value={customerId} 
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Select Customer --</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Strategic Business Unit (SBU) <span className="text-red-500">*</span></label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button 
                    onClick={() => setSbu('WAREHOUSE')}
                    className={`p-4 border rounded-xl flex flex-col items-center gap-2 transition-all ${
                      sbu === 'WAREHOUSE' ? 'border-blue-600 bg-blue-50 text-blue-700 ring-1 ring-blue-600' : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <Building size={24} />
                    <span className="font-semibold text-sm">Warehouse</span>
                  </button>
                  <button 
                    disabled
                    className="p-4 border border-slate-200 bg-slate-50 rounded-xl flex flex-col items-center gap-2 opacity-50 cursor-not-allowed"
                  >
                    <span className="font-semibold text-sm text-slate-500">Trucking (Soon)</span>
                  </button>
                  <button 
                    disabled
                    className="p-4 border border-slate-200 bg-slate-50 rounded-xl flex flex-col items-center gap-2 opacity-50 cursor-not-allowed"
                  >
                    <span className="font-semibold text-sm text-slate-500">Forwarding (Soon)</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-end border-t border-slate-100">
              <button 
                onClick={() => setStep(2)}
                disabled={!customerId || !sbu}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
              >
                Next Step <ArrowRight size={18} />
              </button>
            </div>
          </div>
        )}

        {step === 2 && sbu === 'WAREHOUSE' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div>
              <h2 className="text-xl font-bold text-slate-900">2. Storage Parameters</h2>
              <p className="text-sm text-slate-500 mt-1">Define space commitments and duration.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Target Warehouse <span className="text-red-500">*</span></label>
                <select 
                  value={warehouseId} 
                  onChange={(e) => setWarehouseId(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Select Warehouse --</option>
                  {warehouses.map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Start Date <span className="text-red-500">*</span></label>
                <input 
                  type="date" 
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">End Date <span className="text-red-500">*</span></label>
                <input 
                  type="date" 
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Committed Space (Optional)</label>
                <input 
                  type="number" 
                  placeholder="e.g. 1000"
                  value={committedSpace}
                  onChange={(e) => setCommittedSpace(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Unit of Measure</label>
                <select 
                  value={uomSpace} 
                  onChange={(e) => setUomSpace(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="PALLET">PALLET</option>
                  <option value="CBM">CBM (Cubic Meter)</option>
                  <option value="SQM">SQM (Square Meter)</option>
                </select>
              </div>
            </div>

            <div className="pt-4 flex justify-between border-t border-slate-100">
              <button 
                onClick={() => setStep(1)}
                className="text-slate-600 hover:text-slate-900 font-medium px-4 py-2"
              >
                Back
              </button>
              <button 
                onClick={() => setStep(3)}
                disabled={!warehouseId || !startDate || !endDate}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
              >
                Next Step <ArrowRight size={18} />
              </button>
            </div>
          </div>
        )}

        {step === 3 && sbu === 'WAREHOUSE' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div>
              <h2 className="text-xl font-bold text-slate-900">3. Billing Rates (IDR)</h2>
              <p className="text-sm text-slate-500 mt-1">Set special rates for this customer. Leave blank to use standard pricing.</p>
            </div>

            <div className="space-y-4">
              {rates.map((rate, index) => (
                <div key={rate.charge_code} className="flex items-center gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <div className="flex-1">
                    <div className="font-semibold text-slate-900">{rate.label}</div>
                    <div className="text-xs text-slate-500 font-mono">{rate.charge_code}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 font-medium">Rp</span>
                    <input 
                      type="number"
                      placeholder="0"
                      value={rate.rate_value}
                      onChange={(e) => handleRateChange(index, e.target.value)}
                      className="w-32 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
                    />
                    <span className="text-slate-500 text-sm w-16">/ {rate.uom}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg flex gap-3 text-yellow-800 text-sm">
              <AlertTriangle className="flex-shrink-0" size={18} />
              <p>Contract will be saved as <strong>DRAFT</strong>. It requires Manager approval before becoming active.</p>
            </div>

            <div className="pt-4 flex justify-between border-t border-slate-100">
              <button 
                onClick={() => setStep(2)}
                className="text-slate-600 hover:text-slate-900 font-medium px-4 py-2"
              >
                Back
              </button>
              <button 
                onClick={handleSave}
                disabled={loading}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                {loading ? 'Saving...' : 'Save Draft Contract'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
