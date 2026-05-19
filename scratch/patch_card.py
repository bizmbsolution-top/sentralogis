import os

file_path = r'c:\Users\sonad\projectQ\sentralogis\app\(dashboard)\sbu\trucking\components\WorkOrderCard.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add ExternalLink to icons
content = content.replace(
    'PlusCircle, Send, MoreVertical, Map, FolderOpen, AlertTriangle',
    'PlusCircle, Send, MoreVertical, Map, FolderOpen, AlertTriangle, ExternalLink'
)

# Add useRouter
content = content.replace(
    'import { WorkOrderItem } from "../page";',
    'import { useRouter } from "next/navigation";\nimport { WorkOrderItem } from "../page";'
)

# Instantiate router
content = content.replace(
    '    const statusKey = getOperationalStatus(item);',
    '    const router = useRouter();\n    const statusKey = getOperationalStatus(item);'
)

# Update approved button
old_approved_btn = '''                            <button 
                                onClick={() => onManageAssignments(item)}
                                className="bg-[#1E293B] hover:bg-emerald-600 text-white py-3.5 rounded-[1.2rem] font-black text-[10px] uppercase tracking-widest transition-all shadow-md active:scale-95"
                            >
                                Manage Units
                            </button>'''

new_approved_btn = '''                            <button 
                                onClick={() => router.push(`/sbu/trucking/work-orders?status=assigned&itemId=${item.id}`)}
                                className="bg-[#1E293B] hover:bg-emerald-600 text-white py-3.5 rounded-[1.2rem] font-black text-[10px] uppercase tracking-widest transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
                            >
                                <ExternalLink className="w-3 h-3" /> View
                            </button>'''

# Since multiline strings might have indentation issues, I'll use a more robust replacement for the buttons
# I'll just search for the specific strings

content = content.replace('Manage Units', 'View')
content = content.replace('Assign & Manage', 'View')

# This is a bit aggressive but given the user's specific request for "Active" and "In Progress"
# and the fact that "Manage Units" and "Assign & Manage" both point to the same "incorrect" action for active WOs.

# Now fix the onClick for these buttons
content = content.replace(
    'onClick={() => onManageAssignments(item)}',
    'onClick={() => router.push(`/sbu/trucking/work-orders?status=assigned&itemId=${item.id}`)}'
)

content = content.replace(
    'onClick={() => woStatus !== \'handover_pending\' && onManageAssignments(item)}',
    'onClick={() => { if (woStatus !== "handover_pending") router.push(`/sbu/trucking/work-orders?status=assigned&itemId=${item.id}`); }}'
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Replacement done successfully")
