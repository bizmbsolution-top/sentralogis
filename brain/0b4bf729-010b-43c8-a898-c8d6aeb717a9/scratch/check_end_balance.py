import os

path = r"c:\Users\sonad\projectQ\sentralogis\app\(dashboard)\admin\page.tsx"
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

braces = 0
for i, char in enumerate(content):
    if char == '{': braces += 1
    elif char == '}': braces -= 1

print(f"Brace balance at end of file: {braces}")
