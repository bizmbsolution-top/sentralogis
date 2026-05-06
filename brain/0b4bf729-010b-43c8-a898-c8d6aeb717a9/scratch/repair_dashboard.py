import os

path = r'app/(dashboard)/admin/page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    lines = f.read().splitlines()

# Reconstruct the section that was deleted/muddled
# Every line from 1704 (index 1703) to 1711 (index 1710) in the CURRENT broken file
# will be replaced by the correct sequence.

new_block = [
    '                                                                  })}',
    '                                                               </div>',
    '                                                            )}',
    '                                                         </div>',
    '                                                       ))} ',
    '                                                   </div>',
    '                                                </div>',
    '',
    '                                                {wo.work_order_items?.some(i => i.job_orders?.some(jo => jo.extra_costs?.length > 0)) && (',
    '                                                   <div className="pt-6 border-t border-slate-200">',
    '                                                      <p className="text-[13px] font-black text-rose-500 uppercase tracking-[0.3em] mb-4 flex items-center gap-3 italic">',
    '                                                         <AlertTriangle className="w-4 h-4 animate-pulse" /> Incidental Cost Leakage',
    '                                                      </p>',
    '                                                      <div className="space-y-2">',
    '                                                         {wo.work_order_items?.flatMap(item => ',
    '                                                            item.job_orders?.flatMap(jo => ',
    '                                                               jo.extra_costs?.map((ec: any, ecIdx: number) => (',
    '                                                                  <div key={`${jo.id}-${ecIdx}`} className="flex items-center justify-between px-5 py-4 bg-rose-50 border border-rose-100 rounded-2xl">',
    '                                                                     <div className="min-w-0">',
    '                                                                        <p className="text-[13px] font-black text-slate-900 uppercase truncate text-slate-900">{ec.cost_type}</p>',
    '                                                                        <p className="text-[10px] font-bold text-slate-400 italic truncate">Fleet #{jo.jo_number?.split("-").pop()}  •  {ec.description}</p>',
    '                                                                     </div>',
    '                                                                     <span className="text-[12px] font-black text-rose-600 flex-shrink-0 tabular-nums">Rp {ec.amount?.toLocaleString("id-ID")}</span>',
    '                                                                  </div>',
    '                                                               ))',
    '                                                            )',
    '                                                         )}',
    '                                                      </div>',
    '                                                   </div>',
    '                                                )}',
    '                                             </div>',
    '',
    '                                             <div className="space-y-8 flex flex-col justify-between">',
    '                                                <div className="bg-white rounded-[3rem] p-10 border border-slate-200 shadow-2xl relative overflow-hidden group/finance">',
    '                                                    <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rotate-45 -mr-16 -mt-16 border-b border-l border-slate-200 opacity-50" />',
    '                                                    <div className="relative z-10">',
    '                                                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-4 flex items-center gap-2">',
    '                                                           <Banknote className="w-4 h-4 text-slate-900" />',
    '                                                           Projected Revenue Value',
    '                                                       </p>',
    '                                                       <div className="flex items-baseline gap-2">',
    '                                                           <span className="text-slate-400 text-xl font-black italic opacity-30 tracking-tighter">IDR</span>',
    '                                                           <p className="text-6xl font-black tracking-tighter text-slate-900 tabular-nums italic">',
    '                                                               { (wo.work_order_items?.reduce((sum, i) => sum + (i.quantity*i.deal_price), 0) || 0).toLocaleString("id-ID") }',
    '                                                            </p>',
    '                                                       </div>',
    '                                                    </div>',
    '                                                    <Target className="absolute -bottom-8 -right-8 w-40 h-40 text-slate-50 -rotate-12 transition-transform duration-1000 group-hover/finance:rotate-0" />',
    '                                                </div>',
    '                                                <div className="flex gap-4">',
    '                                                   {ds.key === "draft" && (',
    '                                                      <button onClick={() => createWorkOrder("pending_sbu")} className="flex-1 bg-slate-900 text-white py-6 rounded-2xl font-black uppercase text-[13px] tracking-widest shadow-2xl shadow-slate-900/20 active:scale-95 transition-all hover:bg-blue-600">',
    '                                                         Submit Dispatch Protocol',
    '                                                      </button>',
    '                                                   )}',
    '                                                   {ds.key === "need_approval" && (',
    '                                                      <>',
    '                                                         <button onClick={() => handleStatusUpdate(wo.id, "approved")} className="flex-1 bg-slate-900 text-white py-6 rounded-2xl font-black uppercase text-[13px] tracking-widest shadow-2xl shadow-slate-900/20 active:scale-95 transition-all flex items-center justify-center gap-3 hover:bg-emerald-600">',
    '                                                            <ShieldCheck className="w-5 h-5" /> Authorized Deploy',
    '                                                         </button>',
    '                                                         <button onClick={() => { setRejectTargetWOId(wo.id); setShowRejectModal(true); }} className="flex-1 bg-slate-100 text-slate-400 py-6 rounded-2xl font-black uppercase text-[13px] tracking-widest border border-slate-200 hover:bg-rose-600 hover:text-white transition-all flex items-center justify-center gap-3">',
    '                                                            <Ban className="w-5 h-5" /> Terminate WO',
    '                                                         </button>',
    '                                                      </>',
    '                                                   )}',
    '                                                   {(ds.key === "on_journey" || ds.key === "awaiting_sbu") && (',
    '                                                      <button className="flex-1 bg-slate-900 text-white py-6 rounded-2xl font-black uppercase text-[13px] tracking-widest active:scale-95 transition-all flex items-center justify-center gap-3 hover:bg-blue-600 shadow-2xl shadow-slate-900/20">',
    '                                                         <Activity className="w-5 h-5" /> Tactical Insights',
    '                                                      </button>',
    '                                                   )}',
    '                                                </div>',
    '                                             </div>',
    '                                          </div>',
    '                                       </div>',
    '                                    )}',
    '                                 </div>',
    '                              );',
    '                           })}',
    '                        </div>',
    '                     </div>',
    '                  )}',
    '               </div>',
    '            </div>',
    '         </div>',
    '      </>',
    '   )}'
]

# Find where MOBILE BOTTOM NAV is to identify the range
idx_nav = [i for i, l in enumerate(lines) if 'MOBILE BOTTOM NAV' in l][0]

# Replacing the broken sequence from line 1704 (idx 1703) to MOBILE BOTTOM NAV
lines[1703:idx_nav] = new_block

with open(path, 'w', encoding='utf-8') as f:
    f.write('\n'.join(lines) + '\n')

print("Repair completed.")
