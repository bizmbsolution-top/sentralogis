import os

path = r"c:\Users\sonad\projectQ\sentralogis\app\(dashboard)\admin\page.tsx"
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# We need to insert 3 missing closures for:
# 1. 1093 (Space-y-12)
# 2. 1088 (Dark Background)
# 3. 1087 (Animate-In)
# RIGHT BEFORE line 1351 (which is ') : (')

target_idx = -1
for i, line in enumerate(lines):
    if ') : (' in line and i > 1300 and i < 1400:
        target_idx = i
        break

if target_idx != -1:
    print(f"Adding 3 mission closures at line {target_idx}")
    lines.insert(target_idx, '                  </div>\n') # closes 1093
    lines.insert(target_idx, '               </div>\n')    # closes 1088
    lines.insert(target_idx, '            </div>\n')       # closes 1087

with open(path, 'w', encoding='utf-8') as f:
    f.writelines(lines)
print("Structural integrity restored.")
