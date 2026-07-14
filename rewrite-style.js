const fs = require('fs');

const path = 'c:\\Users\\sonad\\projectQ\\sentralogis\\app\\(dashboard)\\hq\\business\\contracts\\new\\ContractWizard.tsx';
let content = fs.readFileSync(path, 'utf-8');

const oldRateRowStart = `                      <div key={rate.charge_code} className="group flex items-center gap-4 bg-white hover:bg-slate-50 p-4 rounded-xl border border-slate-200 hover:border-indigo-200 transition-all shadow-sm hover:shadow-md">`;
const oldRateRowEnd = `                          </button>
                        </div>
                      </div>
                    ))}
                  </div>`;

const newRateRow = `                      <div key={rate.id} className="group flex flex-col md:flex-row md:items-center gap-4 bg-white hover:bg-slate-50/80 p-5 rounded-2xl border border-slate-200 hover:border-indigo-200 transition-all shadow-sm hover:shadow-md">
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
                  </div>`;

// Use substring for safe replacement
const startIndex = content.indexOf(oldRateRowStart);
if (startIndex !== -1) {
  // Find the exact end of the map function
  const searchPattern = `                      </div>
                    ))}
                  </div>`;
  const endIndex = content.indexOf(searchPattern, startIndex) + searchPattern.length;
  
  if (endIndex > startIndex) {
    content = content.substring(0, startIndex) + newRateRow + content.substring(endIndex);
    fs.writeFileSync(path, content);
    console.log('Successfully replaced rate row');
  } else {
    console.log('Could not find end index');
  }
} else {
  console.log('Could not find start index');
}
