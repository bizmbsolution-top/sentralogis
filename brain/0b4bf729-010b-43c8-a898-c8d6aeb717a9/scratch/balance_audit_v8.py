import os
import re

path = r"c:\Users\sonad\projectQ\sentralogis\app\(dashboard)\admin\page.tsx"
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

sa_lines = []
in_sa = False
for line in lines:
    if 'max-w-7xl mx-auto px-6 py-12' in line and not in_sa:
        in_sa = True
    if in_sa:
        sa_lines.append(line)
        if ') : (' in line:
            break

sa_content = "".join(sa_lines)
# Remove self-closing
sa_content = re.sub(r'<([a-zA-Z0-9]+)[^>]*/>', '', sa_content)

opens = len(re.findall(r'<div', sa_content))
closes = len(re.findall(r'</div>', sa_content))
print(f"SuperAdmin Block (1085 - 1351): Opens {opens}, Closes {closes}")

# Check the default block too
def_lines = []
in_def = False
for line in lines:
    if ') : (' in line:
        in_def = True
    if in_def:
        def_lines.append(line)
        if 'MOBILE BOTTOM NAV' in line:
            break

def_content = "".join(def_lines)
def_content = re.sub(r'<([a-zA-Z0-9]+)[^>]*/>', '', def_content)
opens_d = len(re.findall(r'<div', def_content))
closes_d = len(re.findall(r'</div>', def_content))
print(f"Default Block (1351 - 1607): Opens {opens_d}, Closes {closes_d}")
print(f"Fragments: {def_content.count('<>')} opens, {def_content.count('</>')} closes")
