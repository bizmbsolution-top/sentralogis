import os

path = r"c:\Users\sonad\projectQ\sentralogis\app\(dashboard)\admin\page.tsx"
with open(path, 'rb') as f:
    lines = f.readlines()

line_1606 = lines[1605] # 0-indexed
print(f"Line 1606 raw: {line_1606}")
print(f"Hex: {line_1606.hex()}")
