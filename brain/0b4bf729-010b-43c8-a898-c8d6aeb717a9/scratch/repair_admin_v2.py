import os

path = r"c:\Users\sonad\projectQ\sentralogis\app\(dashboard)\admin\page.tsx"
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# We want to replace the block from approximately 1600 to 1606
# To be safe, we look for unique markers.
# 1601 has ')}' and it's near the end of a big block.
# 1604 has '</>' and 1605 has ')}'

found_index = -1
for i, line in enumerate(lines):
    if i > 1500 and i < 1700:
        if '</>' in line and i+1 < len(lines) and ')}' in lines[i+1]:
            found_index = i
            break

if found_index != -1:
    print(f"Found markers at index {found_index} (Line {found_index + 1})")
    # Let's fix the block.
    # The markers found were:
    # index:   </>
    # index+1: )}
    # index+2: </div> (closes 1085)
    
    # Let's check line index+2
    if '</div>' in lines[found_index+2]:
        print("Confirmed div closure.")
    
    # Construct the fixed block
    # We will also check the indentation.
    
    fixed_lines = [
        '        </>\n',
        '       )}\n',
        '       </div>\n'
    ]
    
    # Replace from index to index+2
    lines[found_index:found_index+3] = fixed_lines
    
    with open(path, 'w', encoding='utf-8') as f:
        f.writelines(lines)
    print("Fix applied successfully.")
else:
    print("Could not find the target block.")
