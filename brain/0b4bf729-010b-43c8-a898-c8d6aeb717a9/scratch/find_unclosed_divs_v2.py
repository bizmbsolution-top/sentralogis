import os
import re

path = r"c:\Users\sonad\projectQ\sentralogis\app\(dashboard)\admin\page.tsx"
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Handle self-closing divs by replacing them with a dummy
# This avoids the simple stack counter from getting confused
clean_content = re.sub(r'<div[^>]*/>', '<!-- self-closed -->', content)

lines = clean_content.splitlines()
stack = []
for i, line in enumerate(lines):
    # Find all <div (not followed by /) or </div>
    tags = re.findall(r'<div|</div>', line)
    for tag in tags:
        if tag == '<div':
            stack.append(i + 1)
        else:
            if stack:
                stack.pop()
            else:
                print(f"Error: Stray </div> at line {i + 1}")

print("Unclosed <div> starts at lines:")
for line_num in stack:
    # Find original line number by counting in the original content if needed, 
    # but since splitlines is 1:1, it's fine.
    if line_num > 900:
        print(line_num)
