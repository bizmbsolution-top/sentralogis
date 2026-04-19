const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'app', '(dashboard)', 'admin', 'page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Theming mappings: replacing Tailwind / notation in dynamic strings which might confuse some parsers
const mappings = [
    { from: /blue-500\/20/g, to: 'blue-50' },
    { from: /emerald-500\/20/g, to: 'emerald-50' },
    { from: /amber-500\/20/g, to: 'amber-50' },
    { from: /purple-500\/20/g, to: 'purple-50' },
    { from: /red-500\/20/g, to: 'red-50' },
    { from: /slate-500\/20/g, to: 'slate-50' },
    { from: /blue-500\/10/g, to: 'blue-50' },
    { from: /emerald-500\/10/g, to: 'emerald-50' },
    { from: /red-500\/10/g, to: 'red-50' },
    { from: /blue-500\/50/g, to: 'blue-100' },
    { from: /blue-500\/40/g, to: 'blue-100' },
    { from: /emerald-600\/10/g, to: 'emerald-50' }
];

mappings.forEach(m => {
    content = content.replace(m.from, m.to);
});

fs.writeFileSync(filePath, content, 'utf8');
console.log("SUCCESS");
