const fs = require('fs');

const path = 'c:\\Users\\sonad\\projectQ\\sentralogis\\app\\(dashboard)\\hq\\business\\contracts\\new\\ContractWizard.tsx';
let content = fs.readFileSync(path, 'utf-8');

// 1. Add contractNumber state
content = content.replace(
`  const [billingMethod, setBillingMethod] = useState('MONTHLY_FIXED');`,
`  const [contractNumber, setContractNumber] = useState('');
  const [billingMethod, setBillingMethod] = useState('MONTHLY_FIXED');`
);

// 2. Add contractNumber to handleSave
content = content.replace(
`            .insert({
              tenant_id: tenantId,
              contract_number: generateContractNumber(),`,
`            .insert({
              tenant_id: tenantId,
              contract_number: contractNumber || generateContractNumber(),`
);

// 3. Move Start Date and End Date from Step 2 to Step 1
const dateFields = `                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
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
                  </div>`;

// Remove dateFields from Step 2
content = content.replace(dateFields, '');

// Insert Contract Number, Start Date, End Date into Step 1
const step1CustomerSelection = `                    {/* Customer Selection */}
                    <div className="group">
                      <label className="block text-sm font-semibold text-slate-700 mb-2 group-focus-within:text-indigo-600 transition-colors">
                        Select Customer <span className="text-rose-500">*</span>
                      </label>`;

const newStep1Fields = `                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                      </label>`;

content = content.replace(step1CustomerSelection, newStep1Fields);

// 4. Update Step 1 "Next Step" disabled condition
content = content.replace(
`disabled={!customerId || !sbu}`,
`disabled={!customerId || !sbu || !startDate || !endDate}`
);

// 5. Update Step 2 "Next Step" disabled condition
content = content.replace(
`disabled={selectedWarehouses.length === 0 || selectedWarehouses.some(w => !w.warehouse_id) || !startDate || !endDate}`,
`disabled={selectedWarehouses.length === 0 || selectedWarehouses.some(w => !w.warehouse_id)}`
);

// 6. Update step 1 descriptions
content = content.replace(
`{ id: 1, title: 'Target', description: 'Customer & Unit' }`,
`{ id: 1, title: 'General Info', description: 'Dates & Customer' }`
);

content = content.replace(
`{ id: 2, title: 'Parameters', description: 'Space & Duration' }`,
`{ id: 2, title: 'Locations', description: 'Warehouses & Space' }`
);

content = content.replace(
`<h2 className="text-2xl font-bold text-slate-900">Target & Domain</h2>
                    <p className="text-slate-500 mt-1">Select the customer and business unit to start.</p>`,
`<h2 className="text-2xl font-bold text-slate-900">General Information</h2>
                    <p className="text-slate-500 mt-1">Define the contract period, customer, and business unit.</p>`
);

content = content.replace(
`<h2 className="text-2xl font-bold text-slate-900">Space & Duration</h2>
                    <p className="text-slate-500 mt-1">Define the warehouse and commitment period.</p>`,
`<h2 className="text-2xl font-bold text-slate-900">Warehouse Locations</h2>
                    <p className="text-slate-500 mt-1">Add operating locations and space commitments.</p>`
);

fs.writeFileSync('c:\\Users\\sonad\\projectQ\\sentralogis\\app\\(dashboard)\\hq\\business\\contracts\\new\\ContractWizard.tsx', content);
console.log('Wizard updated');
