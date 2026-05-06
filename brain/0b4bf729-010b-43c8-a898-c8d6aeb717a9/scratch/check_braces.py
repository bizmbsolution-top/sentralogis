import os
import re

path = r"c:\Users\sonad\projectQ\sentralogis\app\(dashboard)\admin\page.tsx"
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Extract the return block
start_line = -1
end_line = -1
for i, line in enumerate(lines):
    if 'return (' in line and i > 900:
        start_line = i
    if '  );' in line and i > 2400:
        end_line = i
        break

if start_line != -1 and end_line != -1:
    content = "".join(lines[start_line:end_line+1])
    # Remove strings and comments
    content = re.sub(r'"([^"\\]|\\.)*"|\'([^\'\\]|\\.)*\'|`([^`\\]|\\.)*`|\{/\*.*?\*/\}', '', content, flags=re.DOTALL)
    
    braces = 0
    for i, char in enumerate(content):
        if char == '{': braces += 1
        elif char == '}': braces -= 1
        
        if braces < 0:
            # Find the line number
            processed = content[:i+1]
            ln = start_line + processed.count('\n') + 1
            print(f"Error: Stray }} found at line {ln}")
            braces = 0

    print(f"Final brace balance: {braces}")
else:
    print(f"Blocks not found. Start: {start_line}, End: {end_line}")
