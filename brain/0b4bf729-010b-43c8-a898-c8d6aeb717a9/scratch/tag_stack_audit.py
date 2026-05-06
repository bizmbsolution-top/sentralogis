import os
import re

path = r"c:\Users\sonad\projectQ\sentralogis\app\(dashboard)\admin\page.tsx"
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Filter self-closing and comments
content = re.sub(r'\{/\*.*?\*/\}', '', content)
content = re.sub(r'<div[^>]*/>|<script[^>]*/>|<img[^>]*/>|<input[^>]*/>|<hr[^>]*/>|<br[^>]*/>|<Activity[^>]*/>|<Building2[^>]*/>| <ChevronRight[^>]*/>|<Banknote[^>]*/>|<Globe[^>]*/>|<Wallet[^>]*/>|<RefreshCw[^>]*/>|<Trash2[^>]*/>', '<!-- SC -->', content)

lines = content.splitlines()
stack = []
for i, line in enumerate(lines):
    ln = i + 1
    # Very simple tag finder
    tags = re.findall(r'<([a-zA-Z0-9]+)|</([a-zA-Z0-9]+)>', line)
    for tag in tags:
        # tag is a tuple (opener, closer)
        opener, closer = tag
        if opener:
            if opener not in ['img', 'input', 'br', 'hr']:
                stack.append((opener, ln, line.strip()))
        elif closer:
            if stack:
                top_tag, top_ln, top_line = stack.pop()
                if closer != top_tag:
                    if ln > 1600 and ln < 1620:
                        print(f"MISMATCH at {ln}: closed </{closer}> but expected </{top_tag}> from {top_ln}")
            else:
                if ln > 1600 and ln < 1620:
                    print(f"STRAY </{closer}> at {ln}")

print("\nFinal stack at 1610:")
target_ln = 1610
curr_stack = []
for i, line in enumerate(lines):
    ln = i + 1
    tags = re.findall(r'<([a-zA-Z0-9]+)|</([a-zA-Z0-9]+)>', line)
    for tag in tags:
        opener, closer = tag
        if opener:
            if opener not in ['img', 'input', 'br', 'hr']: curr_stack.append((opener, ln))
        elif closer:
            if curr_stack: curr_stack.pop()
    if ln == target_ln:
        print(curr_stack)
        break
