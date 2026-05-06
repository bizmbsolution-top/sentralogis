import os

path = r"c:\Users\sonad\projectQ\sentralogis\app\(dashboard)\admin\page.tsx"
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# STEP 1: Remove the corrupted additions at the end (roughly line 2406)
# We look for the duplicated closure block I just created.
for i in range(len(lines)-1, 0, -1):
    if '      </div>' in lines[i] and '         </div>' in lines[i+1] and '       )}' in lines[i+2]:
        print(f"Found corruption at line {i+1}")
        del lines[i:i+2] # Remove the two extra lines
        break

# STEP 2: Add the two missing </div> after 1351
# 1351 should have '            </div>'
# 1352 should have '         ) : ('
for i, line in enumerate(lines):
    if i > 1340 and i < 1360:
         if '            </div>' in line and (i+1 < len(lines) and '         ) : (' in lines[i+1]):
             print(f"Found insertion point at line {i+1}")
             # Add two </div> BEFORE line i+1? 
             # No, line 1351 (index i) closed 1093.
             # We need to close 1088 and 1087.
             lines.insert(i+1, '            </div>\n')
             lines.insert(i+1, '         </div>\n')
             break

# STEP 3: Ensure 1604-1606 are clean
# We search for the terminal closures near 1600
for i, line in enumerate(lines):
     if i > 1580 and i < 1650:
          if '</>' in line and ')}' in lines[i+1] and '</div>' in lines[i+2]:
               print(f"Aligning terminal block at line {i+1}")
               lines[i] = '        </>\n'
               lines[i+1] = '       )}\n'
               lines[i+2] = '      </div>\n'
               break

with open(path, 'w', encoding='utf-8') as f:
    f.writelines(lines)
print("Emergency repair complete.")
