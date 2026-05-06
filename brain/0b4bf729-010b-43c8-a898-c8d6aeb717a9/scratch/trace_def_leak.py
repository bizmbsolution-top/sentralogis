import os
import re

path = r"c:\Users\sonad\projectQ\sentralogis\app\(dashboard)\admin\page.tsx"
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

stack = []
in_def = False
for i, line in enumerate(lines):
    ln = i + 1
    if ') : (' in line:
        in_def = True
        continue
    if not in_def: continue
    if 'MOBILE BOTTOM NAV' in line: break
    
    line_clean = re.sub(r'<([a-zA-Z0-9]+)[^>]*/>', '', line)
    # Also handle fragment
    tags = re.findall(r'<div|</div>|<main|</main>|<>|</>', line_clean)
    for tag in tags:
        if tag in ['<div', '<main', '<>']:
            stack.append((tag, ln))
        else:
            if stack:
                stack.pop()
            else:
                print(f"EXTRA {tag} at {ln}")

print("\nUnclosed tags in Default:")
print(stack)
