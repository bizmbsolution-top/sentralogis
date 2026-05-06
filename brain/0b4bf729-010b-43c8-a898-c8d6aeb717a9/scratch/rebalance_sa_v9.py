import os

path = r"c:\Users\sonad\projectQ\sentralogis\app\(dashboard)\admin\page.tsx"
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# SA section from 1345 to 1351 currently has 7 closures.
# We need 8 to close every container:
# 1. RankingList (1315)
# 2. Performance (1307)
# 3. RightCol (1264)
# 4. LeftCol (1140)
# 5. MainGrid (1138)
# 6. GlobalZ10 (1093)
# 7. DarkBG (1088)
# 8. AnimateIn (1087)

for i in range(len(lines)):
    if ') : (' in lines[i] and i > 1300 and i < 1400:
        # Check current closures
        start_del = i
        while '</div>' in lines[start_del-1]:
            start_del -= 1
        
        print(f"Replacing closures from {start_del+1} to {i}")
        lines[start_del:i] = [
            '                           </div>\n',
            '                        </div>\n',
            '                     </div>\n',
            '                  </div>\n',
            '               </div>\n',
            '            </div>\n',
            '         </div>\n',
            '      </div>\n'
        ]
        break

with open(path, 'w', encoding='utf-8') as f:
    f.writelines(lines)
print("Structural re-balancing applied.")
