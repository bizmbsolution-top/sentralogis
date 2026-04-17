
const fs = require('fs');
const path = 'c:/Users/sonad/projectQ/sentralogis/app/(dashboard)/admin/page.tsx';

try {
    let content = fs.readFileSync(path, 'utf8');

    // We will replace the entire logic from the start of the IIFE to the end of the list section
    // Start marker: <div className="p-6 space-y-3">
    // End marker: {/* MOBILE BOTTOM NAV */}
    
    const startMarker = '<div className="p-6 space-y-3">';
    const endMarker = '{/* MOBILE BOTTOM NAV */}';
    
    if (content.includes(startMarker) && content.includes(endMarker)) {
        const parts = content.split(startMarker);
        const secondHalf = parts[1].split(endMarker);
        
        const cleanListContent = `
            {workOrders
              .filter(wo => {
                const displayStatus = getWODisplayStatus(wo);
                if (statusFilter !== 'all' && displayStatus.key !== statusFilter) return false;
                const searchStr = \`\${wo.wo_number} \${wo.customers?.name} \${wo.customers?.company_name}\`.toLowerCase();
                return searchStr.includes(searchTerm.toLowerCase());
              })
              .length === 0 ? (
                <div className="py-20 text-center">
                    <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                        <FileText className="w-10 h-10 text-slate-800" />
                    </div>
                    <p className="text-slate-600 font-black uppercase text-xs tracking-widest leading-loose">
                        {searchTerm ? "Tidak ada hasil pencarian" : "Belum ada data Work Order tersedia"}
                    </p>
                    {statusFilter !== 'all' && (
                        <button onClick={() => setStatusFilter('all')} className="mt-4 text-emerald-500 font-black uppercase text-[10px] tracking-widest hover:text-emerald-400">Lihat Semua</button>
                    )}
                </div>
              ) : (
                workOrders
                  .filter(wo => {
                    const displayStatus = getWODisplayStatus(wo);
                    if (statusFilter !== 'all' && displayStatus.key !== statusFilter) return false;
                    const searchStr = \`\${wo.wo_number} \${wo.customers?.name} \${wo.customers?.company_name}\`.toLowerCase();
                    return searchStr.includes(searchTerm.toLowerCase());
                  })
                  .map((wo) => {
                    const isExpanded = expandedWOId === wo.id;
                    const items = wo.work_order_items || [];
                    const sbus = Array.from(new Set(items.map((i: any) => i.sbu_type)));
                    const displayStatus = getWODisplayStatus(wo);

                    return (
                      <div key={wo.id} className="group mb-3">
                         <div 
                           onClick={() => setExpandedWOId(isExpanded ? null : wo.id)}
                           className={\`bg-[#151f32]/60 border border-white/5 hover:border-blue-500/40 rounded-[2.5rem] p-8 transition-all cursor-pointer flex items-center gap-10 \${isExpanded ? 'border-blue-500/50 bg-[#0d1628] shadow-2xl' : ''}\`}
                         >
                            {/* WO # & DATE */}
                            <div className="w-56 flex-shrink-0">
                               <div className="flex items-center gap-3 mb-2">
                                  <div className={\`w-3 h-3 rounded-full \${displayStatus.color.replace('text-', 'bg-')} animate-pulse\`} />
                                  <span className="text-[16px] font-bold text-white italic tracking-tighter uppercase">{wo.wo_number}</span>
                                </div>
                                <span className="text-[13px] font-bold text-slate-500 uppercase tracking-widest">
                                   {new Date(wo.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'long' })}
                                </span>
                            </div>

                            <div className="flex-1 min-w-0">
                               <p className="text-[15px] font-black text-white uppercase truncate mb-1">
                                  {wo.customers?.company_name || wo.customers?.name || "No Customer Name"}
                               </p>
                               <p className="text-[12px] font-bold text-slate-500 uppercase tracking-tighter truncate max-w-md">
                                  {wo.notes || "No Operational Notes"}
                               </p>
                            </div>

                            <div className="flex gap-3 items-center flex-shrink-0 bg-white/5 px-5 py-3 rounded-2xl border border-white/5">
                               {['trucking', 'clearances', 'forwarding', 'warehouse', 'project'].map(sId => {
                                  const isActive = sbus.includes(sId);
                                  const IconComp = sId === 'trucking' ? Truck : sId === 'clearances' ? FileText : sId === 'forwarding' ? Ship : sId === 'warehouse' ? Warehouse : HardHat;
                                  if (!isActive) return null;
                                  return (
                                     <button 
                                         key={sId}
                                         onClick={(e) => { 
                                            e.stopPropagation(); 
                                            openEditModal(wo);
                                            setTimeout(() => {
                                               setWizardStep(2);
                                               setActiveWizardTab(sId);
                                            }, 100);
                                         }}
                                         className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 hover:bg-blue-600 hover:text-white transition-all shadow-lg focus:outline-none" 
                                         title={\`Edit \${sId}\`}
                                      >
                                        <IconComp className="w-5 h-5" />
                                     </button>
                                  );
                               })}
                            </div>

                            <div className="w-44 flex-shrink-0 text-right">
                               <span className={\`px-6 py-3 rounded-xl text-[12px] font-black uppercase tracking-widest border \${displayStatus.color} bg-white/5 border-white/10 shadow-lg\`}>
                                  {displayStatus.label}
                               </span>
                            </div>

                             <div className="flex items-center gap-3 flex-shrink-0">
                                <button 
                                   onClick={(e) => { e.stopPropagation(); openEditModal(wo); }} 
                                   className="p-4 bg-white/5 hover:bg-emerald-500/10 text-slate-400 hover:text-emerald-500 rounded-2xl transition-all border border-white/5 active:scale-95 shadow-lg"
                                >
                                   <Edit2 className="w-6 h-6" />
                                </button>
                                <button 
                                   onClick={(e) => { e.stopPropagation(); if(confirm('Hapus Work Order?')) deleteWorkOrder(wo.id); }} 
                                   className="p-4 bg-white/5 hover:bg-red-500/10 text-slate-400 hover:text-red-500 rounded-2xl transition-all border border-white/5 active:scale-95 shadow-lg"
                                >
                                   <Trash2 className="w-6 h-6" />
                                </button>
                                <div className={\`p-4 rounded-2xl border transition-all shadow-lg \${isExpanded ? 'bg-blue-600 border-blue-400 text-white' : 'bg-white/5 border-white/5 text-slate-500'}\`}>
                                   <ChevronDown className={\`w-6 h-6 transition-transform \${isExpanded ? 'rotate-180' : ''}\`} />
                                </div>
                             </div>
                         </div>

                         {isExpanded && (
                             <div className="mt-4 bg-[#0d1628]/60 border border-white/5 rounded-[2.5rem] p-10 animate-in fade-in slide-in-from-top-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                   {items.map((item: any) => {
                                       const isClearance = item.sbu_type === 'clearances';
                                       return (
                                         <div key={item.id} className="bg-slate-950/40 border border-white/5 p-6 rounded-3xl group/item hover:border-blue-500/30 transition-all">
                                            <div className="flex justify-between items-start mb-5">
                                               <div className="flex items-center gap-4">
                                                  <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center">
                                                     {item.sbu_type === 'trucking' ? <Truck className="w-6 h-6 text-blue-500" /> : <ShieldCheck className="w-6 h-6 text-emerald-400" />}
                                                  </div>
                                                  <div>
                                                     <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">{item.sbu_type}</p>
                                                     <p className="text-[15px] font-black text-white uppercase tracking-tight">
                                                        {isClearance ? (item.sbu_metadata?.doc_code || "Clearance Task") : (item.truck_type || "N/A")}
                                                     </p>
                                                  </div>
                                               </div>
                                               <span className="text-[14px] font-black text-emerald-500 italic">Rp {item.deal_price?.toLocaleString('id-ID')}</span>
                                            </div>
                                            
                                            {item.sbu_type === 'clearances' ? (
                                               <div className="space-y-4 px-1">
                                                  <div className="flex items-center gap-3 text-[12px] font-bold text-slate-400">
                                                     <Target className="w-4 h-4 text-emerald-500/50" /> 
                                                     Jalur: <span className={'px-2 py-0.5 rounded text-[10px] uppercase font-black ' + (item.sbu_metadata?.lane === 'Merah' ? 'bg-red-500/20 text-red-500' : 'bg-emerald-500/20 text-emerald-500')}>{item.sbu_metadata?.lane || 'Hijau'}</span>
                                                  </div>
                                                  <div className="flex items-center gap-3 text-[11px] font-bold text-slate-500 tracking-wider">
                                                     <FileText className="w-4 h-4 text-slate-600" /> No. Aju: {item.sbu_metadata?.aju_number || "-"}
                                                  </div>
                                               </div>
                                            ) : (
                                               <div className="space-y-3 px-1">
                                                  <div className="flex items-center gap-3 text-[13px] font-bold text-slate-400">
                                                     <MapPin className="w-4 h-4 text-slate-600" /> {item.origin_location?.name || 'TBA'}
                                                  </div>
                                                  <div className="flex items-center gap-3 text-[13px] font-bold text-slate-400">
                                                     <Navigation className="w-4 h-4 text-slate-600" /> {item.destination_location?.name || 'TBA'}
                                                  </div>
                                               </div>
                                            )}
                                         </div>
                                       );
                                   })}
                                </div>
                             </div>
                         )}
                      </div>
                    );
                  })
              )}
        `;
        
        content = parts[0] + startMarker + cleanListContent + endMarker + secondHalf[1];
        fs.writeFileSync(path, content);
        console.log("Success: Refactored Work Order list to a clean JSX pattern.");
    } else {
        console.error("Markers not found!");
        process.exit(1);
    }
} catch (err) {
    console.error("Error:", err);
    process.exit(1);
}
