import os

path = r"c:\Users\sonad\projectQ\sentralogis\app\(dashboard)\admin\page.tsx"
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# STEP 1: Close 1117 (KPI Grid) correctly
# Search for the end of the KPI map
for i in range(len(lines)):
    if '4 KPI CARDS' in lines[i]:
        for j in range(i, i+50):
            if '}))' in lines[j]:
                if '</div>' not in lines[j+1]:
                    print(f"Closing 1117 at line {j+2}")
                    lines.insert(j+1, '                     </div>\n')
                break
        break

# STEP 2: Restore the transition closures with EXACTLY 7 tags
# We find the ) : ( line first
target_ternary = -1
for i in range(len(lines)):
    if ') : (' in lines[i] and i > 1300 and i < 1400:
        target_ternary = i
        break

if target_ternary != -1:
    print(f"Found ternary at {target_ternary + 1}")
    # Back up to find where the div closures start
    start_c = target_ternary
    while '</div>' in lines[start_c-1]:
        start_c -= 1
    
    print(f"Replacing closures from {start_c+1} to {target_ternary}")
    lines[start_c:target_ternary] = [
        '                           </div>\n', # closes 1315
        '                        </div>\n', # closes 1307
        '                     </div>\n',    # closes 1264
        '                  </div>\n',       # closes 1138
        '               </div>\n',          # closes 1093
        '            </div>\n',             # closes 1088
        '         </div>\n'                # closes 1087
    ]

with open(path, 'w', encoding='utf-8') as f:
    f.writelines(lines)
print("Structural re-balancing successful.")
