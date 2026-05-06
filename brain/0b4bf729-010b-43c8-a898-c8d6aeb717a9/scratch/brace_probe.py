import os
import re

path = r"c:\Users\sonad\projectQ\sentralogis\app\(dashboard)\admin\page.tsx"
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Strip comments for clarity
content = re.sub(r'\{/\*.*?\*/\}', '', content, flags=re.DOTALL)

for i, char in enumerate(content):
    ln = content[:i+1].count('\n') + 1
    if ln == 1086 and char == '{':
        print(f"Found {{ at line 1086 at index {i}")

# Simple counter
braces = 0
for i, char in enumerate(content):
    ln = content[:i+1].count('\n') + 1
    if char == '{':
        braces += 1
    elif char == '}':
        braces -= 1
    
    if ln == 1605:
         print(f"Brace balance at line 1605: {braces}")
    if ln == 1606:
         print(f"Brace balance at line 1606: {braces}")
