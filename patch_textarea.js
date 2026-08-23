const fs = require('fs');
const path = 'app/(dashboard)/hq/work-orders/components/CreateWOForm.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(/<textarea([^>]*)className="([^"]*bg-slate-50[^"]*)"/g, (match, p1, p2) => {
  if (!p2.includes('text-slate-900') && !p2.includes('text-black') && !p2.includes('text-slate-700') && !p2.includes('text-white')) {
    return '<textarea' + p1 + 'className="' + p2 + ' text-slate-900"';
  }
  return match;
});

content = content.replace(/<select([^>]*)className="([^"]*bg-slate-50[^"]*)"/g, (match, p1, p2) => {
  if (!p2.includes('text-slate-900') && !p2.includes('text-black') && !p2.includes('text-slate-700') && !p2.includes('text-white')) {
    return '<select' + p1 + 'className="' + p2 + ' text-slate-900"';
  }
  return match;
});

fs.writeFileSync(path, content, 'utf8');
console.log('Patched CreateWOForm.tsx textarea and select');
