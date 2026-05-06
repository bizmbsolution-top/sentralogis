import os

path = r"c:\Users\sonad\projectQ\sentralogis\app\(dashboard)\admin\page.tsx"
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# PHASE 1: Fix the missing closure for KPI card grid (around 1117-1137)
for i in range(len(lines)):
    if '4 KPI CARDS' in lines[i]:
        # Search for the end of the KPI map
        for j in range(i, i+50):
            if '}))' in lines[j]:
                # We need a </div> to close the grid at 1117
                if '</div>' not in lines[j+1]:
                    print(f"Adding missing grid closure at line {j+2}")
                    lines.insert(j+1, '                     </div>\n')
                break
        break

# PHASE 2: Fix the transition closures (around 1350)
# We want exactly 7 </div> closures before ) : (
target_transition = -1
for i in range(len(lines)):
    if ') : (' in lines[i] and i > 1300 and i < 1500:
        target_transition = i
        break

if target_transition != -1:
    print(f"Found transition at {target_transition+1}")
    # We delete any div closures immediately before it and replace with a clean block of 7
    # First, find where the closures start (going backwards)
    start_del = target_transition
    while '</div>' in lines[start_del-1]:
        start_del -= 1
    
    print(f"Replacing closures from {start_del+1} to {target_transition}")
    new_closures = [
        '                           </div>\n', # closes 1307
        '                        </div>\n', # closes 1264
        '                     </div>\n',    # closes 1138
        '                  </div>\n',       # closes 1093
        '               </div>\n',          # closes 1088
        '            </div>\n'             # closes 1087
    ]
    # Wait, let's count again. 
    # 1. 1315 (Ranking List) is closed at 1345.
    # 2. 1307 (Performance List Title/Container) needs closure.
    # 3. 1264 (Right Column) is closed at 1304? Let's check 1304.
    # 1304 has </div>. So 1264 is closed.
    # 4. 1138 (Main Grid) needs closure.
    # 5. 1093 (Relative z-10) needs closure.
    # 6. 1088 (Background) needs closure.
    # 7. 1087 (Animate-in) needs closure.
    
    # Let's check 1304 again.
    # 1303: </button>. 1304: </div>.
    # 1304 closed 1266 (Profile Card).
    # SO 1264 (Right Column) is STILL OPEN!
    
    # Clean list of closures needed at 1350:
    # 1. 1307 (Subsidiary Section)
    # 2. 1264 (Right Column)
    # 3. 1138 (Main Grid)
    # 4. 1093 (Space-y-12 Content)
    # 5. 1088 (Dark Background)
    # 6. 1087 (Animate-in Container)
    
    lines[start_del:target_transition] = [
        '                           </div>\n',
        '                        </div>\n',
        '                     </div>\n',
        '                  </div>\n',
        '               </div>\n',
        '            </div>\n'
    ]

# PHASE 3: Fix the terminal closures (around 1605)
for i in range(len(lines)):
    if 'MOBILE BOTTOM NAV' in lines[i]:
        # Clean up the 1600-1607 block
        lines[i-7:i] = [
            '                      })\n',
            '                  )}\n',
            '             </div>\n',
            '          </div>\n',
            '        </>\n',
            '       )}\n',
            '      </div>\n',
            '\n'
        ]
        break

with open(path, 'w', encoding='utf-8') as f:
    f.writelines(lines)
print("Surgical structural rebalancing complete.")
