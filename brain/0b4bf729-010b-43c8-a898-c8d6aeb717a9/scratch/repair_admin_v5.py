import os

path = r"c:\Users\sonad\projectQ\sentralogis\app\(dashboard)\admin\page.tsx"
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_block = [
    '                      })\n',
    '                  )}\n',
    '             </div>\n',
    '          </div>\n',
    '        </>\n',
    '       )}\n',
    '      </div>\n'
]

lines[1599:1606] = new_block

with open(path, 'w', encoding='utf-8') as f:
    f.writelines(lines)
print("Final surgical replacement complete.")
