import os
import re

path = r"c:\Users\sonad\projectQ\sentralogis\app\(dashboard)\admin\page.tsx"
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(r'<div[^>]*/>', '<!-- SC -->', content)

lines = content.splitlines()
stack = []
for i, line in enumerate(lines):
    tags = re.findall(r'<div|</div>|<main>|</main>', line)
    for tag in tags:
        if tag in ['<div', '<main']:
            stack.append((tag, i + 1))
        else:
            if stack:
                stack.pop()
    
    if i + 1 == 1352:
        print("Stack at 1352 (before default part):", stack)
    if i + 1 == 1600:
        print("Stack at 1600:", stack)
        break
