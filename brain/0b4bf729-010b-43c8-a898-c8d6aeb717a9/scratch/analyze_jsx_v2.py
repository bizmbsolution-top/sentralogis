import os
import re

path = r"c:\Users\sonad\projectQ\sentralogis\app\(dashboard)\admin\page.tsx"
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Strip comments for analysis
content = re.sub(r'\{/\*.*?\*/\}|//.*?\n|/\*.*?\*/', '', content, flags=re.DOTALL)

div_open = content.count('<div ') + content.count('<div>')
div_close = content.count('</div>')

print(f"Total Divs: {div_open} open, {div_close} close (Net: {div_open - div_close})")

bracket_open = content.count('{')
bracket_close = content.count('}')
print(f"Total Braces: {bracket_open} open, {bracket_close} close (Net: {bracket_open - bracket_close})")

paren_open = content.count('(')
paren_close = content.count(')')
print(f"Total Parens: {paren_open} open, {paren_close} close (Net: {paren_open - paren_close})")
