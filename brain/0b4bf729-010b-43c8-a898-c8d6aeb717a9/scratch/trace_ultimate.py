import os
import re

path = r"c:\Users\sonad\projectQ\sentralogis\app\(dashboard)\admin\page.tsx"
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

stack = []
for i, line in enumerate(lines):
    ln = i + 1
    # Handle self-closing
    line_clean = re.sub(r'<div[^>]*/>', '', line)
    
    tags = re.findall(r'<div|</div>|<main|</main>', line_clean)
    for tag in tags:
        if tag in ['<div', '<main']:
            stack.append((tag, ln, line.strip()))
        else:
            if stack:
                opened_tag, opened_ln, opened_content = stack.pop()
                if ln >= 1600 and ln <= 1610:
                    print(f"Line {ln} closed {opened_tag} from {opened_ln} ({opened_content})")
            else:
                if ln >= 1600 and ln <= 1610:
                    print(f"STRAY </div> at {ln}")

print("\nFinal stack at 1610:")
for t, l, c in stack:
    if l > 900: print(f"{t} from {l}")
