import os

path = r"c:\Users\sonad\projectQ\sentralogis\app\(dashboard)\admin\page.tsx"
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i in range(len(lines)):
    if 'MOBILE BOTTOM NAV' in lines[i]:
        # We replace the previous 10 lines
        lines[i-11:i] = [
            '                            </div>\n', # closes 1521? No, let's see.
            '                         );\n',
            '                      })\n',    # closes 1440 map
            '                   )\n',         # closes 1418 ternary paren
            '                }\n',            # closes 1418 ternary brace
            '             </div>\n',          # closes 1417 Content
            '          </div>\n',             # closes 1386 Terminal
            '        </>\n',                  # closes 1353 Fragment
            '       )}\n',                   # closes 1086 SA ternary
            '      </div>\n',                # closes 1085 Main Container
            '\n'
        ]
        break

with open(path, 'w', encoding='utf-8') as f:
    f.writelines(lines)
print("Definitive terminal alignment successful.")
