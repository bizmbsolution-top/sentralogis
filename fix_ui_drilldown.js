
const fs = require('fs');
const path = 'c:/Users/sonad/projectQ/sentralogis/app/(dashboard)/admin/page.tsx';

try {
    let content = fs.readFileSync(path, 'utf8');

    // Replacement for the items map inside the expanded panel
    const drilldownPattern = /\{items\.map\(\(item: any, idx: number\) => \([\s\S]*?className="bg-slate-950\/40 border border-white\/5 p-6 rounded-3xl group\/item hover:border-blue-500\/30 transition-all"[\s\S]*?<MapPin[\s\S]*?<\/div>\s+<\/div>[\s\S]*?\}\)/;
    
    const replacement = `{items.map((item: any) => {
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
                                          
                                          {isClearance ? (
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
                                  })}`;

    content = content.replace(drilldownPattern, replacement);
    fs.writeFileSync(path, content);
    console.log("Success: Enhanced drilldown items");
} catch (err) {
    console.error("Error patching file:", err);
    process.exit(1);
}
