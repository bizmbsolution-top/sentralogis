import sys
import os

path = r'c:\Users\sonad\projectQ\sentralogis\app\(dashboard)\admin\page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Search for the corrupted line using a more flexible approach
found_idx = -1
for i, line in enumerate(lines):
    if '<' in line and 'flex items-center gap-3 border-l border-slate-100 pl-8 ml-2' in line:
        # Check if it has the double-bracket thing
        if line.count('<') >= 2:
            found_idx = i
            break

if found_idx != -1:
    print(f"Found at index {found_idx}: {repr(lines[found_idx])}")
    lines[found_idx] = '                                          </span>\n                                       </div>\n\n                                       <div className=\"flex items-center gap-3 border-l border-slate-100 pl-8 ml-2\">\n'
    with open(path, 'w', encoding='utf-8') as f:
        f.writelines(lines)
    print("Fixed.")
else:
    print("Not found. Printing lines around 1517:")
    for i in range(max(0, 1510), min(len(lines), 1530)):
        print(f"{i}: {repr(lines[i])}")
