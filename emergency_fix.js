
const fs = require('fs');
const path = 'c:/Users/sonad/projectQ/sentralogis/app/(dashboard)/admin/page.tsx';

try {
    let content = fs.readFileSync(path, 'utf8');

    // Restoration and fix:
    // We need to find the place where the map ends and ensures the div structure is correct before the MOBILE BOTTOM NAV
    
    // Pattern to find the broken section
    // It seems the previous tool call deleted everything from the map end to the middle of the nav
    
    // Instead of complex regex, let's just find a marker before the damage and a marker after
    const startMarker = 'Rp {item.deal_price?.toLocaleString(\'id-ID\')}</span>';
    const endMarker = '<span className="text-[8px] font-black uppercase tracking-widest">Cockpit</span>';
    
    if (content.includes(startMarker) && content.includes(endMarker)) {
        const parts = content.split(startMarker);
        const secondHalf = parts[1].split(endMarker);
        
        const fixedSection = `</span>
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
                 })}
             </div>
          </div>

        {/* MOBILE BOTTOM NAV */}
        <nav className="fixed bottom-0 inset-x-0 bg-[#0a0f1e]/80 backdrop-blur-2xl border-t border-white/5 p-4 pb-8 flex justify-around items-center z-50 md:hidden">
            <button onClick={() => { setStatusFilter('all'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className={\`flex flex-col items-center gap-1.5 \${statusFilter === 'all' ? 'text-emerald-500' : 'text-slate-600'}\`}>
                <LayoutGrid className="w-5 h-5" />
                `;
                
        content = parts[0] + startMarker + fixedSection + endMarker + secondHalf[1];
        fs.writeFileSync(path, content);
        console.log("Restored and fixed UI structure");
    } else {
        console.error("Markers not found! Start:", content.includes(startMarker), "End:", content.includes(endMarker));
        process.exit(1);
    }
} catch (err) {
    console.error("Error patching file:", err);
    process.exit(1);
}
