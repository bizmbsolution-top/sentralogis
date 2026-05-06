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
for i, char in enumerate(content):
    ln = line_map[i]
    if char == '{':
        braces += 1
        if ln == 1418: print(f"Opened {{ at 1418. Balance: {braces}")
        if ln == 1440: print(f"Opened {{ at 1440. Balance: {braces}")
    elif char == '}':
        if ln == 1600: print(f"Closing }} at 1600. Balance: {braces-1}")
        if ln == 1601: print(f"Closing }} at 1601. Balance: {braces-1}")
        braces -= 1
