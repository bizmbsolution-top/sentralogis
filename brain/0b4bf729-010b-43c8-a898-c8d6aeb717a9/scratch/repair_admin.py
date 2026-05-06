import os

path = r"c:\Users\sonad\projectQ\sentralogis\app\(dashboard)\admin\page.tsx"
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Look for the corrupted block
# Corrupted pattern: line 1540 has JO#..., line 1541 has )) 
# Note: lines is 0-indexed, so 1540 is index 1539

target_line = -1
for i, line in enumerate(lines):
    if 'JO#{jo.jo_number?.split(\'-\').pop()} - {ec.description}' in line:
        if i + 1 < len(lines) and '))' in lines[i+1] and 'item' not in lines[i+1]: # heuristics
            target_line = i
            break

if target_line != -1:
    print(f"Found target at line {target_line + 1}")
    # Restore the missing part
    missing_part = [
        '                                                              </div>\n',
        '                                                              <span className="text-[11px] font-black text-amber-600 flex-shrink-0">Rp {ec.amount?.toLocaleString(\'id-ID\')}</span>\n',
        '                                                           </div>\n'
    ]
    # Insert before the )) line (target_line + 1)
    lines[target_line+1:target_line+1] = missing_part
    
    with open(path, 'w', encoding='utf-8') as f:
        f.writelines(lines)
    print("Repair complete.")
else:
    print("Target block not found.")
