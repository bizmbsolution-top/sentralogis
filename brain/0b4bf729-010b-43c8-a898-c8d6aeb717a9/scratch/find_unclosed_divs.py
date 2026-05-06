import os

path = r"c:\Users\sonad\projectQ\sentralogis\app\(dashboard)\admin\page.tsx"
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

stack = []
for i, line in enumerate(lines):
    # Find all <div or <div>
    import re
    # Simplified regex for demo
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
    # Only report if it's after our last known good point
    if line_num > 400:
        print(line_num)
