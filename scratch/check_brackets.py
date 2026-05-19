import os

file_path = r'c:\Users\sonad\projectQ\sentralogis\app\api\jo\[token]\route.ts'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

open_braces = content.count('{')
close_braces = content.count('}')
open_parens = content.count('(')
close_parens = content.count(')')

print(f"Braces: {open_braces} vs {close_braces}")
print(f"Parens: {open_parens} vs {close_parens}")
