import os

path = r"c:\Users\sonad\projectQ\sentralogis\app\(dashboard)\admin\page.tsx"
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Correct content for lines 1580-1606 (index 1579 to 1605)
# Note: we need to be very careful with the exact content.

new_block = [
    '                                                  <button \n',
    '                                                    onClick={() => { setRejectTargetWOId(wo.id); setShowRejectModal(true); }}\n',
    '                                                    className="flex-1 bg-red-50 text-red-600 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest border border-red-100 hover:bg-red-600 hover:text-white transition-all flex items-center justify-center gap-2"\n',
    '                                                  >\n',
    '                                                     <Ban className="w-4 h-4" /> Reject\n',
    '                                                  </button>\n',
    '                                               </>\n',
    '                                            )}\n',
    '                                            {ds.key === \'on_journey\' && (\n',
    '                                               <button className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest active:scale-95 transition-all flex items-center justify-center gap-2">\n',
    '                                                  <Target className="w-4 h-4" /> Live Tracking\n',
    '                                               </button>\n',
    '                                            )}\n',
    '                                         </div>\n',
    '                                      </div>\n',
    '                                   </div>\n',
    '                                </div>\n',
    '                             )}\n',
    '                          </div>\n',
    '                        );\n',
    '                     })\n',
    '                 )}\n',
    '            </div>\n',
    '         </div>\n',
    '       </>\n',
    '      )}\n',
    '     </div>\n'
]

# Replacement
lines[1579:1606] = new_block

with open(path, 'w', encoding='utf-8') as f:
    f.writelines(lines)
print("Surgical replacement by line index complete.")
