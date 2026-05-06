import os

path = r"c:\Users\sonad\projectQ\sentralogis\app\(dashboard)\admin\page.tsx"
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

import re
content = re.sub(r'\{/\*.*?\*/\}', '', content, flags=re.DOTALL)

stack = []
for i, char in enumerate(content):
    ln = content[:i+1].count('\n') + 1
    if char == '(':
        stack.append(ln)
    elif char == ')':
        if stack: stack.pop()
        else: print(f"Stray ) at {ln}")

print("Unclosed Parens started at lines:")
for l in stack:
    if l > 900:
        print(l)
