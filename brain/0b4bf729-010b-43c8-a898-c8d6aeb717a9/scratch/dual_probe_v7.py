import os

path = r"c:\Users\sonad\projectQ\sentralogis\app\(dashboard)\admin\page.tsx"
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

line_map = []
curr_ln = 1
for char in content:
    line_map.append(curr_ln)
    if char == '\n': curr_ln += 1

braces = 0
parens = 0
for i, char in enumerate(content):
    ln = line_map[i]
    if char == '{': braces += 1
    elif char == '}': braces -= 1
    elif char == '(': parens += 1
    elif char == ')': parens -= 1
    
    if ln >= 1415 and ln <= 1445:
         if char in '{}()': print(f"L{ln} char '{char}': B{braces}, P{parens}")
    if ln >= 1600 and ln <= 1610:
         if char in '{}()': print(f"L{ln} char '{char}': B{braces}, P{parens}")
