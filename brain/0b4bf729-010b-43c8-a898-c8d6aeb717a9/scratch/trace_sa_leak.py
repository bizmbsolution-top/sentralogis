import os
import re

path = r"c:\Users\sonad\projectQ\sentralogis\app\(dashboard)\admin\page.tsx"
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

stack = []
for i, line in enumerate(lines):
    ln = i + 1
    if ln < 1085: continue
    if ') : (' in line: break
    
    line_clean = re.sub(r'<([a-zA-Z0-9]+)[^>]*/>', '', line)
    tags = re.findall(r'<div|</div>', line_clean)
    for tag in tags:
        if tag == '<div':
            stack.append(ln)
        else:
            if stack:
                stack.pop()
            else:
                print(f"EXTRA </div> at {ln}")

print("\nUnclosed divs in SA:")
print(stack)
