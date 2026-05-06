import os
import re

path = r"c:\Users\sonad\projectQ\sentralogis\app\(dashboard)\admin\page.tsx"
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

stack = []
for i, line in enumerate(lines):
    ln = i + 1
    line_clean = re.sub(r'<div[^>]*/>', '', line)
    tags = re.findall(r'<div|</div>|<main|</main>', line_clean)
    for tag in tags:
        if tag in ['<div', '<main']:
            stack.append((tag, ln))
        else:
            if stack:
                tag_type, start_ln = stack.pop()
                if ln >= 1340 and ln <= 1360:
                     print(f"Line {ln} closed {tag_type} from {start_ln}")

print("\nStack at 1355:")
for t, l in stack:
    if l > 900: print(f"{t} from {l}")
