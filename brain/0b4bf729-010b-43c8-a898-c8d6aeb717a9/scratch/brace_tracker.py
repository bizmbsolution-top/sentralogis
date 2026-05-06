import os
import re

path = r"c:\Users\sonad\projectQ\sentralogis\app\(dashboard)\admin\page.tsx"
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

content = "".join(lines)
# Strip comments and strings
content = re.sub(r'"([^"\\]|\\.)*"|\'([^\'\\]|\\.)*\'|`([^`\\]|\\.)*`|\{/\*.*?\*/\}', '', content, flags=re.DOTALL)

stack = []
for i, char in enumerate(content):
    if char == '{':
        # Find line number
        ln = content[:i+1].count('\n') + 1
        stack.append(ln)
    elif char == '}':
        if stack:
            opened_at = stack.pop()
            if opened_at > 1080 and opened_at < 1100:
                # This might be our SA brace
                current_ln = content[:i+1].count('\n') + 1
                print(f"Brace opened at {opened_at} closed at {current_ln}")
        else:
            current_ln = content[:i+1].count('\n') + 1
            print(f"STRAY }} at {current_ln}")

print("Remaining in stack:", stack[-5:] if stack else "None")
