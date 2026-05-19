import os

file_path = r'c:\Users\sonad\projectQ\sentralogis\app\(dashboard)\sbu\trucking\components\WorkOrderCard.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the button content to include ExternalLink icon
content = content.replace(
    'statusKey === \'on_journey\' ? \'View\' : \'Assign & Manage\'}',
    'statusKey === \'on_journey\' ? <><ExternalLink size={14} className="mr-1" /> View</> : \'Assign & Manage\'}'
)

# And for the other View button
content = content.replace(
    'View\n                            </button>',
    '<ExternalLink size={14} className="mr-1" /> View\n                            </button>'
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Icon adjustment done")
