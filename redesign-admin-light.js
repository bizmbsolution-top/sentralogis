const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'app', '(dashboard)', 'admin', 'page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Theming mappings for Light theme adaptation
const mappings = [
    { from: /text-blue-400/g, to: 'text-blue-600' },
    { from: /text-amber-400/g, to: 'text-amber-600' },
    { from: /text-emerald-400/g, to: 'text-emerald-600' },
    { from: /text-rose-400/g, to: 'text-rose-600' },
    { from: /text-purple-400/g, to: 'text-purple-600' },
    
    { from: /bg-blue-500\/10/g, to: 'bg-blue-50' },
    { from: /bg-emerald-500\/10/g, to: 'bg-emerald-50' },
    { from: /bg-amber-500\/10/g, to: 'bg-amber-50' },
    { from: /bg-purple-500\/10/g, to: 'bg-purple-50' },
    { from: /bg-rose-500\/10/g, to: 'bg-rose-50' },
    
    // borders
    { from: /border-white\/10/g, to: 'border-slate-200' },
    { from: /border-slate-100\/80/g, to: 'border-slate-200' },
    
    { from: /backdrop-blur-2xl/g, to: '' },
    { from: /shadow-2xl/g, to: 'shadow-xl shadow-slate-200/50' },
    
    { from: /bg-\[#0f172a\]/g, to: 'bg-white' }, // modals
    { from: /text-slate-200/g, to: 'text-slate-800' },
    { from: /text-slate-300/g, to: 'text-slate-600' },
    { from: /text-slate-400/g, to: 'text-slate-500' },
    
    // specifically adjust the container of cards
    { from: /bg-slate-100/g, to: 'bg-slate-100' },
    
    // adjust tracking widget which uses bg-black
    { from: /bg-black\/50/g, to: 'bg-slate-900/50' }
];

mappings.forEach(m => {
    content = content.replace(m.from, m.to);
});

fs.writeFileSync(filePath, content, 'utf8');
console.log("SUCCESS");
