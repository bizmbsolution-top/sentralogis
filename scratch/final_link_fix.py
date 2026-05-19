import os

file_path = r'c:\Users\sonad\projectQ\sentralogis\app\(dashboard)\sbu\trucking\components\WorkOrderCard.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace work-orders link with assignments link
content = content.replace(
    'router.push(`/sbu/trucking/work-orders?status=assigned&itemId=${item.id}`);',
    'router.push(`/sbu/trucking/assignments?q=${item.work_orders?.wo_number}`);'
)

# And for the other one if it exists
content = content.replace(
    'router.push(`/sbu/trucking/work-orders?status=assigned&itemId=${item.id}`)',
    'router.push(`/sbu/trucking/assignments?q=${item.work_orders?.wo_number}`)'
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Final link adjustment done")
