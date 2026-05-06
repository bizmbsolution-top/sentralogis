import os

path = r"c:\Users\sonad\projectQ\sentralogis\app\(dashboard)\admin\page.tsx"
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# STEP 1: Fix 1351 specific leak
for i, line in enumerate(lines):
    if i > 1340 and i < 1360:
         if '</div>' in line and (i+1 < len(lines) and ') : (' in lines[i+1]):
             print(f"Found insertion point at line {i+1}")
             # Add the missing two closures
             lines.insert(i+1, '            </div>\n')
             lines.insert(i+1, '         </div>\n')
             break

with open(path, 'w', encoding='utf-8') as f:
    f.writelines(lines)
print("Insertion fix complete.")
