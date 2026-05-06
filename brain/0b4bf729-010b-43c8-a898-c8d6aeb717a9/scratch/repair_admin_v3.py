import os

path = r"c:\Users\sonad\projectQ\sentralogis\app\(dashboard)\admin\page.tsx"
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# STEP 1: Fix the corruption at line 1586
for i, line in enumerate(lines):
    if i > 1570 and i < 1600:
        if '</button>' in line and i+1 < len(lines) and '        </>' in lines[i+1]:
            print(f"Found corruption at line {i+1}")
            lines[i+1] = '                                               </>\n'
            lines[i+2] = '                                            )}\n'
            lines[i+3] = '                                            {ds.key === \'on_journey\' && (\n'
            break

# STEP 2: Fix the indentation at line 1605 (approx)
# We look for the SECOND occurrence of </> and )} near the end.
count = 0
for i, line in enumerate(lines):
    if i > 1580 and i < 1650:
        if '        </>' in line:
            count += 1
            if count == 1: # This should be the one at 1604
                 if i+1 < len(lines) and '       )}' in lines[i+1]:
                     print(f"Found target block at line {i+1}")
                     lines[i+1] = '      )}\n'
                     if i+2 < len(lines) and '      </div>' or '       </div>' in lines[i+2]:
                         lines[i+2] = '      </div>\n'

with open(path, 'w', encoding='utf-8') as f:
    f.writelines(lines)
print("Complete.")
