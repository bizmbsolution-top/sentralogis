import re

target_file = r'app/(dashboard)/admin/page.tsx'
with open(target_file, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Clean up the cabinet section (index 1149 is line 1150)
new_cabinet_block = [
    '                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">\n',
    '                       <div>\n',
    '                          <h2 className="text-4xl font-semibold tracking-tight text-white/90">Executive Cabinet</h2>\n',
    '                          <div className="flex items-center gap-3 mt-3">\n',
    '                             <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />\n',
    '                             <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20 italic">Sentralogis Global Operating Protocol</p>\n',
    '                          </div>\n',
    '                       </div>\n',
    '                       <div className="flex gap-3">\n',
    '                          <Link href="/admin/bi" className="px-8 py-3 bg-white/10 hover:bg-white/20 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white transition-all flex items-center gap-2">\n',
    '                            <BarChart3 className="w-4 h-4 text-orange-500" /> Full BI Matrix\n',
    '                          </Link>\n',
    '                          <div className="flex p-1.5 bg-[#1d1e22] rounded-2xl border border-white/5 shadow-inner">\n'
]

# Replacement range from line 1150 (lines[1149]) to some point where it meets the .map(tab =>)
# Based on view_file:
# 1166:                        <div className="flex gap-3">
# 1168:                           <Link href="/admin/bi" ...
# 1170:                             <BarChart3 ...
# 1171+ ???

# I'll just use the indices
updated_lines = lines[:1149] + new_cabinet_block + lines[1178:]

with open(target_file, 'w', encoding='utf-8') as f:
    f.writelines(updated_lines)

print("SUCCESS")
