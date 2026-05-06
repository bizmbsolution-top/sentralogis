import os
import re

path = r"c:\Users\sonad\projectQ\sentralogis\app\(dashboard)\admin\page.tsx"
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

content = "".join(lines)
# Strip comments and strings safely
content = re.sub(r'"([^"\\]|\\.)*"|\'([^\'\\]|\\.)*\'|`([^`\\]|\\.)*`|\{/\*.*?\*/\}', '', content, flags=re.DOTALL)

stack = []
for i, char in enumerate(content):
    ln = content[:i+1].count('\n') + 1
    if char == '{':
        stack.append(ln)
    elif char == '}':
        if stack:
            opened_at = stack.pop()
            if (opened_at >= 1086 and opened_at <= 1086) or (ln >= 1600 and ln <= 1610):
                print(f"Brace opened at {opened_at} closed at {ln}")
        else:
            print(f"STRAY }} at {ln}")

print("Remaining in stack count:", len(stack))
if stack:
    print("Top of stack starts at lines:", stack[-10:])
