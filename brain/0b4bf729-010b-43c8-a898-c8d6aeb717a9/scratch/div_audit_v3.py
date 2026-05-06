import os
import re

path = r"c:\Users\sonad\projectQ\sentralogis\app\(dashboard)\admin\page.tsx"
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Filter out self-closing divs
content = re.sub(r'<div[^>]*/>', '<!-- SC -->', content)

lines = content.splitlines()
stack = []
for i, line in enumerate(lines):
    # Find all <div or </div>
    tags = re.findall(r'<div|</div>', line)
    for tag in tags:
        if tag == '<div':
            stack.append(i + 1)
        else:
            if stack:
                stack.pop()
            else:
                print(f"STRAY </div> at line {i + 1}")

print("\nCURRENT STACK AT END:")
for line_num in stack:
    print(line_num)

# Let's see the stack specifically around the area I changed
# 1086 to 1606
print("\nSTACK AT LINE 1606:")
current_stack = []
for i, line in enumerate(lines):
    tags = re.findall(r'<div|</div>', line)
    for tag in tags:
        if tag == '<div': current_stack.append(i + 1)
        else: 
            if current_stack: current_stack.pop()
    if i + 1 == 1606:
        print(current_stack)
        break
