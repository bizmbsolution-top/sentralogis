const fs = require('fs');
const path = 'app/(dashboard)/hq/work-orders/components/CreateWOForm.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(/className="([^"]*bg-slate-50[^"]*)"/g, (match, p1) => {
  if (!p1.includes('text-slate-900') && !p1.includes('text-black') && !p1.includes('text-slate-700') && !p1.includes('text-white')) {
    return 'className="' + p1 + ' text-slate-900"';
  }
  return match;
});

content = content.replace(/className=\{([^]*)bg-slate-50([^]*)\}/g, (match, p1, p2) => {
  if (!p1.includes('text-slate-900') && !p1.includes('text-black') && !p1.includes('text-slate-700') && !p2.includes('text-slate-900') && !p2.includes('text-black')) {
    return 'className={' + p1 + 'bg-slate-50' + p2 + ' text-slate-900}';
  }
  return match;
});

fs.writeFileSync(path, content, 'utf8');
console.log('Patched CreateWOForm.tsx');
