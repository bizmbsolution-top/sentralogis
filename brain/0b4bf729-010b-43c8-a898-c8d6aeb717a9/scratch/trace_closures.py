import os
import re

path = r"c:\Users\sonad\projectQ\sentralogis\app\(dashboard)\admin\page.tsx"
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

stack = []
for i, line in enumerate(lines):
    ln = i + 1
    # Handle self-closing manually for regex
    line_clean = re.sub(r'<div[^>]*/>', '', line)
    
    tags = re.findall(r'<div|</div>|<main', line_clean)
    for tag in tags:
        if tag in ['<div', '<main']:
            stack.append((tag, ln))
        elif tag == '</div>':
            if stack:
                opened_tag, opened_ln = stack.pop()
                if ln > 1345 and ln < 1355:
                    print(f"Closed {opened_tag} from {opened_ln} at {ln}")
            else:
                print(f"STRAY </div> at {ln}")

print("\nFinal stack at 1355:")
for tag, ln in stack:
    if ln > 900: print(f"{tag} from {ln}")
