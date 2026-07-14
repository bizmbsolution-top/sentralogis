const fs = require('fs');

const path = 'c:\\Users\\sonad\\projectQ\\sentralogis\\app\\(dashboard)\\hq\\business\\contracts\\new\\ContractWizard.tsx';
let content = fs.readFileSync(path, 'utf-8');

// 1. Replace states
content = content.replace(
`  // Warehouse Specific State
  const [warehouseId, setWarehouseId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [committedSpace, setCommittedSpace] = useState('');
  const [uomSpace, setUomSpace] = useState('PALLET');
  const [billingMethod, setBillingMethod] = useState('MONTHLY_FIXED');

  // Dynamic Rates State
  const [rates, setRates] = useState<{ charge_code: string; label: string; rate_value: string; uom: string; category: string }[]>([]);`,
`  // Date & Config State
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [billingMethod, setBillingMethod] = useState('MONTHLY_FIXED');

  // Multi-Warehouse State
  const [selectedWarehouses, setSelectedWarehouses] = useState<{
    id: string;
    warehouse_id: string;
    committed_space: string;
    uom_space: string;
  }[]>([]);

  // Dynamic Rates State
  const [rates, setRates] = useState<{ id: string; charge_code: string; label: string; rate_value: string; uom: string; category: string; warehouse_id: string | null }[]>([]);`
);

// 2. Replace rate defaults to include id and warehouse_id
content = content.replace(
`        setRates(defaults.map(d => ({
          charge_code: d.charge_code,
          label: d.service_name,
          rate_value: '',
          uom: d.default_uom || 'PCS',
          category: d.category
        })));`,
`        setRates(defaults.map(d => ({
          id: Math.random().toString(),
          charge_code: d.charge_code,
          label: d.service_name,
          rate_value: '',
          uom: d.default_uom || 'PCS',
          category: d.category,
          warehouse_id: null
        })));`
);

content = content.replace(
`      setRates(prev => [...prev, {
        charge_code: data.charge_code,
        label: data.service_name,
        rate_value: '',
        uom: data.default_uom || 'PCS',
        category: data.category
      }]);`,
`      setRates(prev => [...prev, {
        id: Math.random().toString(),
        charge_code: data.charge_code,
        label: data.service_name,
        rate_value: '',
        uom: data.default_uom || 'PCS',
        category: data.category,
        warehouse_id: null
      }]);`
);

content = content.replace(
`      setRates([...rates, {
        charge_code: srv.charge_code,
        label: srv.service_name,
        rate_value: '',
        uom: srv.default_uom || 'PCS',
        category: srv.category
      }]);`,
`      setRates([...rates, {
        id: Math.random().toString(),
        charge_code: srv.charge_code,
        label: srv.service_name,
        rate_value: '',
        uom: srv.default_uom || 'PCS',
        category: srv.category,
        warehouse_id: null
      }]);`
);

// 3. Replace handleSave
const oldSaveStart = `  const handleSave = async (redirect: boolean = true) => {
    if (!customerId || !warehouseId || !startDate || !endDate) {`;
const oldSaveEnd = `        return { success: true, error: null };
      })();`;

const newSave = `  const handleSave = async (redirect: boolean = true) => {
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
            })
            .eq('id', savedContractId);

          if (contractError) return { success: false, error: contractError.message };

          // DELETE OLD WAREHOUSES & RATES
          await supabase.from('md_contract_warehouses').delete().eq('contract_id', savedContractId);
          await supabase.from('md_billing_rates').delete().eq('contract_id', savedContractId);
        } else {
          // INSERT NEW CONTRACT
          const { data: contract, error: contractError } = await supabase
            .from('md_storage_contracts')
            .insert({
              tenant_id: tenantId,
              contract_number: generateContractNumber(),
              customer_id: customerId,
              start_date: startDate,
              end_date: endDate,
              billing_method: billingMethod,
              status: 'DRAFT',
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
      })();`;

const handleSaveIndex = content.indexOf(oldSaveStart);
const handleSaveEndIndex = content.indexOf(oldSaveEnd) + oldSaveEnd.length;
content = content.substring(0, handleSaveIndex) + newSave + content.substring(handleSaveEndIndex);

// 4. Update Step 2 UI (replace warehouse dropdown and commitment with dynamic list)
const step2OldUI = `                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2 group">
                      <label className="block text-sm font-semibold text-slate-700 mb-2 group-focus-within:text-indigo-600 transition-colors">
                        Target Warehouse <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                          <Building size={18} />
                        </div>
                        <select 
                          value={warehouseId} 
                          onChange={(e) => setWarehouseId(e.target.value)}
                          className="w-full appearance-none pl-11 pr-10 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:border-indigo-500 transition-all text-slate-900 font-medium"
                        >
                          <option value="">-- Choose operating warehouse --</option>
                          {warehouses.map(w => (
                            <option key={w.id} value={w.id}>{w.name}</option>
                          ))}
                        </select>
                        <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-400">
                          <ChevronRight size={16} className="rotate-90" />
                        </div>
                      </div>
                    </div>

                    <div className="group">
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

                    <div className="group">
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

                    <div className="group">
                      <label className="block text-sm font-semibold text-slate-700 mb-2 group-focus-within:text-indigo-600 transition-colors">
                        Committed Space <span className="text-slate-400 font-normal">(Optional)</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                          <Maximize size={18} />
                        </div>
                        <input 
                          type="number" 
                          placeholder="e.g. 1000"
                          value={committedSpace}
                          onChange={(e) => setCommittedSpace(e.target.value)}
                          className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:border-indigo-500 transition-all text-slate-900 font-medium"
                        />
                      </div>
                    </div>

                    <div className="group">
                      <label className="block text-sm font-semibold text-slate-700 mb-2 group-focus-within:text-indigo-600 transition-colors">
                        Unit of Measure
                      </label>
                      <div className="relative">
                        <select 
                          value={uomSpace} 
                          onChange={(e) => {
                            if (e.target.value === '__ADD_NEW__') {
                              setPendingUomTarget('SPACE');
                              setNewUomName('');
                              setNewUomDesc('');
                              setIsUomModalOpen(true);
                            } else {
                              setUomSpace(e.target.value);
                            }
                          }}
                          className="w-full appearance-none pl-4 pr-10 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:border-indigo-500 transition-all text-slate-900 font-medium"
                        >
                          <option value="PALLET">PALLET</option>
                          <option value="CBM">CBM (Cubic Meter)</option>
                          <option value="SQM">SQM (Square Meter)</option>
                          {localUoms.filter(u => !['PALLET', 'CBM', 'SQM'].includes(u.name)).map(u => (
                            <option key={u.id} value={u.name}>{u.name}</option>
                          ))}
                          <option value="__ADD_NEW__" className="text-indigo-600 font-bold">+ New UOM</option>
                        </select>
                        <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-400">
                          <ChevronRight size={16} className="rotate-90" />
                        </div>
                      </div>
                    </div>
                  </div>`;

const step2NewUI = `                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div className="group">
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

                    <div className="group">
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
                  </div>`;

content = content.replace(step2OldUI, step2NewUI);

// 5. Replace disabled check in step 2 next button
content = content.replace(
  `disabled={!warehouseId || !startDate || !endDate}`,
  `disabled={selectedWarehouses.length === 0 || selectedWarehouses.some(w => !w.warehouse_id) || !startDate || !endDate}`
);

// 6. Update Step 3 UI (rates rendering with warehouse dropdown)
const step3RateRowOld = `                          <span className="text-slate-400 font-medium">Rp</span>
                          <input 
                            type="number"
                            placeholder="0"
                            value={rate.rate_value}
                            onChange={(e) => handleRateChange(index, e.target.value)}
                            className="w-36 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:border-indigo-500 text-right font-medium transition-all"
                          />
                          <span className="text-slate-400 font-medium text-sm">/</span>
                          <select 
                            value={rate.uom}
                            onChange={(e) => handleRateUomChange(index, e.target.value)}
                            className="w-24 px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:border-indigo-500 text-sm font-medium transition-all appearance-none"
                          >
                            <option value={rate.uom}>{rate.uom}</option>
                            {localUoms.filter(u => u.name !== rate.uom).map(u => (
                              <option key={u.id} value={u.name}>{u.name}</option>
                            ))}
                            <option value="__ADD_NEW__" className="text-indigo-600 font-bold">+ New UOM</option>
                          </select>`;

const step3RateRowNew = `                          <select
                            value={rate.warehouse_id || ''}
                            onChange={(e) => {
                              const newRates = [...rates];
                              newRates[index].warehouse_id = e.target.value || null;
                              setRates(newRates);
                            }}
                            className="w-36 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-medium text-slate-600 appearance-none"
                          >
                            <option value="">All Locations</option>
                            {selectedWarehouses.filter(w => w.warehouse_id).map(w => {
                              const whInfo = warehouses.find(wh => wh.id === w.warehouse_id);
                              return <option key={w.warehouse_id} value={w.warehouse_id}>{whInfo?.name}</option>;
                            })}
                          </select>
                          <span className="text-slate-400 font-medium ml-2">Rp</span>
                          <input 
                            type="number"
                            placeholder="0"
                            value={rate.rate_value}
                            onChange={(e) => handleRateChange(index, e.target.value)}
                            className="w-32 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:border-indigo-500 text-right font-medium transition-all"
                          />
                          <span className="text-slate-400 font-medium text-sm">/</span>
                          <select 
                            value={rate.uom}
                            onChange={(e) => handleRateUomChange(index, e.target.value)}
                            className="w-24 px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:border-indigo-500 text-sm font-medium transition-all appearance-none"
                          >
                            <option value={rate.uom}>{rate.uom}</option>
                            {localUoms.filter(u => u.name !== rate.uom).map(u => (
                              <option key={u.id} value={u.name}>{u.name}</option>
                            ))}
                            <option value="__ADD_NEW__" className="text-indigo-600 font-bold">+ New UOM</option>
                          </select>`;

content = content.replace(step3RateRowOld, step3RateRowNew);

// 7. Fix pendingUomTarget condition
content = content.replace(
`      if (pendingUomTarget === 'SPACE') {
        setUomSpace(data.name);
      } else if (pendingUomTarget !== null) {`,
`      if (pendingUomTarget !== null && pendingUomTarget !== 'SPACE') {`
);

fs.writeFileSync('c:\\Users\\sonad\\projectQ\\sentralogis\\app\\(dashboard)\\hq\\business\\contracts\\new\\ContractWizard.tsx', content);
console.log('Wizard rewritten');
