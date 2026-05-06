import os
import re

path = r"c:\Users\sonad\projectQ\sentralogis\app\(dashboard)\admin\page.tsx"
with open(path, 'r', encoding='utf-8') as f:
    text = f.read()

# Segment 1: SuperAdmin Branch
block1_start = text.find('animate-in fade-in slide-in-from-bottom-8')
block1_end = text.find(') : (')
text1 = text[block1_start:block1_end]
text1 = re.sub(r'<[a-zA-Z0-9]+[^>]*/>', '', text1)
opens1 = len(re.findall(r'<div', text1))
closes1 = len(re.findall(r'</div>', text1))
print(f"SuperAdmin (from animate-in to transition): Opens {opens1}, Closes {closes1}. Delta: {opens1 - closes1}")

# Segment 2: Default Branch
block2_start = text.find('STRATEGIC PULSE')
block2_end = text.find('MOBILE BOTTOM NAV')
text2 = text[block2_start:block2_end]
text2 = re.sub(r'<[a-zA-Z0-9]+[^>]*/>', '', text2)
opens2 = len(re.findall(r'<div', text2))
closes2 = len(re.findall(r'</div>', text2))
print(f"Default (from strategic pulse to nav): Opens {opens2}, Closes {closes2}. Delta: {opens2 - closes2}")
