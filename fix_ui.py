
import re

file_path = r'c:\Users\sonad\projectQ\sentralogis\app\(dashboard)\admin\page.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Fix the mismatched closing tag for the SBU button
content = re.sub(
    r'(<button\s+key=\{sId\}[^>]*>\s+<IconComp\s+className="w-5\s+h-5"\s+/>\s+)</div>',
    r'\1</button>',
    content,
    flags=re.DOTALL
)

# 2. Add Ship icons to imports if missing (already there, but double check)
if 'Ship,' not in content:
    content = content.replace('Warehouse,', 'Ship, Warehouse,')

# 3. Enhance drilldown for clearances
drilldown_target = r'(<p className="text-\[11px\] font-black text-slate-500 uppercase tracking-widest">\{item\.sbu_type\}</p>\s+<p className="text-\[15px\] font-black text-white uppercase tracking-tight">\{item\.truck_type\}</p>\s+</div>\s+</div>\s+<span className="text-\[14px\] font-black text-emerald-500 italic">Rp \{item\.deal_price\?\.toLocaleString\(\'id-ID\'\)\}</span>\s+</div>\s+<div className="space-y-3 px-1">\s+<div className="flex items-center gap-3 text-\[13px\] font-bold text-slate-400">\s+<MapPin className="w-4 h-4 text-slate-600" /> \{item\.origin_location\?\.name \|\| \'TBA\'\}\s+</div>\s+<div className="flex items-center gap-3 text-\[13px\] font-bold text-slate-400">\s+<Navigation className="w-4 h-4 text-slate-600" /> \{item\.destination_location\?\.name \|\| \'TBA\'\}\s+</div>\s+</div>)'

drilldown_replacement = r'''<p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">{item.sbu_type}</p>
                                                   <p className="text-[15px] font-black text-white uppercase tracking-tight">
                                                      {item.sbu_type === 'clearances' ? (item.sbu_metadata?.doc_code || "Clearance Task") : (item.truck_type || "N/A")}
                                                   </p>
                                                </div>
                                             </div>
                                             <span className="text-[14px] font-black text-emerald-500 italic">Rp {item.deal_price?.toLocaleString('id-ID')}</span>
                                          </div>
                                          
                                          {item.sbu_type === 'clearances' ? (
                                             <div className="space-y-4 px-1">
                                                <div className="flex items-center gap-3 text-[12px] font-bold text-slate-400">
                                                   <Target className="w-4 h-4 text-emerald-500/50" /> 
                                                   Jalur: <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-black ${item.sbu_metadata?.lane === 'Merah' ? 'bg-red-500/20 text-red-500' : 'bg-emerald-500/20 text-emerald-500'}`}>{item.sbu_metadata?.lane || 'Hijau'}</span>
                                                </div>
                                                <div className="flex items-center gap-3 text-[11px] font-bold text-slate-500 tracking-wider">
                                                   <FileText className="w-4 h-4 text-slate-600" /> PJ: {item.sbu_metadata?.aju_number || "-"}
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
                                          )}'''

# Use a simpler regex-free replacement for drilldown if possible, but let's try regex first
# Actually, the drilldown regex is very prone to failure. Let's use a simpler marker.

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Patch applied successfully")
