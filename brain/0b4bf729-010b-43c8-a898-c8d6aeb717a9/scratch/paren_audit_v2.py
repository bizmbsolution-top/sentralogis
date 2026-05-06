import os

path = r"c:\Users\sonad\projectQ\sentralogis\app\(dashboard)\admin\page.tsx"
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

line_map = []
curr_ln = 1
for char in content:
    line_map.append(curr_ln)
    if char == '\n': curr_ln += 1

stack = []
for i, char in enumerate(content):
    if char == '(': stack.append(line_map[i])
    elif char == ')':
        if stack: stack.pop()

print("Unclosed Parens started at lines:")
for l in stack:
    if l > 900:
        print(l)
