const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'app', '(dashboard)', 'admin', 'page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Theming mappings
const mappings = [
    { from: /bg-\[#0a0f1e\]/g, to: 'bg-slate-50' },
    { from: /bg-\[#151f32\]\/60/g, to: 'bg-white' },
    { from: /bg-\[#151f32\]/g, to: 'bg-white' },
    { from: /bg-\[#0f172a\]/g, to: 'bg-white' },
    { from: /bg-slate-900\/50/g, to: 'bg-white' },
    { from: /bg-black\/40/g, to: 'bg-slate-50' },
    { from: /bg-black\/20/g, to: 'bg-slate-50' },
    { from: /bg-white\/5/g, to: 'bg-slate-100' },
    { from: /bg-white\/10/g, to: 'bg-slate-100/80' },
    
    { from: /text-slate-200/g, to: 'text-slate-800' },
    { from: /text-white/g, to: 'text-[#1E293B]' },
    { from: /text-slate-300/g, to: 'text-slate-500' },
    { from: /text-slate-400/g, to: 'text-slate-500' },
    
    { from: /border-white\/5/g, to: 'border-slate-200' },
    { from: /border-white\/10/g, to: 'border-slate-300' },
    
    { from: /shadow-black\/50/g, to: 'shadow-slate-200/50' },
    { from: /bg-emerald-500\/5/g, to: 'bg-emerald-50' },
    { from: /bg-blue-500\/5/g, to: 'bg-blue-50' }
];

mappings.forEach(m => {
    content = content.replace(m.from, m.to);
});

// Since changing text-white to text-[#1E293B] globally will ruin blue/emerald primary buttons
// I'll revert it for elements that have `bg-blue-600`, `bg-emerald-600` etc.
// But using regex to catch "bg-blue-600 ... text-[#1E293B]" is tricky.
// Let's do a fast regex:
content = content.replace(/(bg-(?:blue|emerald|orange|purple|rose|red)-[56]00[^"']*?)text-\[#1E293B\]/g, "$1text-white");
// Same if text-[#1E293B] comes before bg-blue
content = content.replace(/text-\[#1E293B\]([^"']*?bg-(?:blue|emerald|orange|purple|rose|red)-[56]00)/g, "text-white$1");

fs.writeFileSync(filePath, content, 'utf8');
console.log("SUCCESS");
