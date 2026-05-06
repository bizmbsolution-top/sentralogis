import os
import re

path = r"c:\Users\sonad\projectQ\sentralogis\app\(dashboard)\admin\page.tsx"
with open(path, 'r', encoding='utf-8') as f:
    text = f.read()

# Segment 1: SuperAdmin Branch
sa_start = text.find('{userProfile?.role === \'superadmin\' ? (')
sa_end = text.find(') : (')
sa_text = text[sa_start:sa_end]
sa_text = re.sub(r'<[a-zA-Z0-9]+[^>]*/>', '', sa_text)
sa_opens = len(re.findall(r'<div', sa_text))
sa_closes = len(re.findall(r'</div>', sa_text))
print(f"SuperAdmin: {sa_opens} opens, {sa_closes} closes. Delta: {sa_opens - sa_closes}")

# Segment 2: Default Branch
def_start = text.find(') : (')
def_end = text.find('MOBILE BOTTOM NAV')
def_text = text[def_start:def_end]
def_text = re.sub(r'<[a-zA-Z0-9]+[^>]*/>', '', def_text)
def_opens = len(re.findall(r'<div', def_text))
def_closes = len(re.findall(r'</div>', def_text))
print(f"Default: {def_opens} opens, {def_closes} closes. Delta: {def_opens - def_closes}")
