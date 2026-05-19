import os

file_path = r'c:\Users\sonad\projectQ\sentralogis\app\api\jo\[token]\route.ts'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

backticks = content.count('`')
print(f"Backticks: {backticks}")
