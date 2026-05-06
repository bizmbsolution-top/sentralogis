import os

path = r"c:\Users\sonad\projectQ\sentralogis\app\(dashboard)\admin\page.tsx"
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Range 1085 (index 1084) to 1606 (index 1605)
block = lines[1084:1606]
content = "".join(block)

# Remove comments to avoid false positives
import re
content = re.sub(r'\{/\*.*?\*/\}', '', content, flags=re.DOTALL)

div_open = content.count('<div ') + content.count('<div>')
div_close = content.count('</div>')

bracket_open = content.count('{')
bracket_close = content.count('}')

paren_open = content.count('(')
paren_close = content.count(')')

frag_open = content.count('<>')
frag_close = content.count('</>')

print(f"Divs: {div_open} open, {div_close} close (Net: {div_open - div_close})")
print(f"Braces: {bracket_open} open, {bracket_close} close (Net: {bracket_open - bracket_close})")
print(f"Parens: {paren_open} open, {paren_close} close (Net: {paren_open - paren_close})")
print(f"Fragments: {frag_open} open, {frag_close} close (Net: {frag_open - frag_close})")
