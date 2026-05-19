const fs = require('fs');

let code = fs.readFileSync('app/(dashboard)/sbu/trucking/work-orders/page.tsx', 'utf8');

// Replace SIAP INVOICE
code = code.replace(/className="bg-emerald-600 text-white/g, 'className="!bg-emerald-600 !text-white');

// Replace MENUNGGU AUDIT
code = code.replace(/className="bg-amber-600 text-white/g, 'className="!bg-amber-600 !text-white');

// Replace PROSES DOC & COST
code = code.replace(/className="bg-blue-500 text-white/g, 'className="!bg-blue-500 !text-white');

// Replace PEKERJAAN SELESAI
code = code.replace(/className="bg-slate-900 text-white/g, 'className="!bg-slate-900 !text-white');

// Replace StatusBadge returns with raw Badges
code = code.replace(/return <StatusBadge status=\{'in_progress'\} \/>;/g, 'return <Badge className="!bg-amber-500 !text-white border-none font-black text-[9px] px-3 py-1 uppercase tracking-widest italic animate-pulse">ON ROAD</Badge>;');

code = code.replace(/return <StatusBadge status=\{'accepted'\} \/>;/g, 'return <Badge className="!bg-emerald-500 !text-white border-none font-black text-[9px] px-3 py-1 uppercase tracking-widest italic">ACCEPTED</Badge>;');

code = code.replace(/if \(anyDispatched\) return <StatusBadge status=\{'pending'\} \/>;/g, 'if (anyDispatched) return <Badge className="!bg-blue-500 !text-white border-none font-black text-[9px] px-3 py-1 uppercase tracking-widest italic">DISPATCHED</Badge>;');

code = code.replace(/return <StatusBadge status=\{'assigned'\} \/>;/g, 'return <Badge className="!bg-indigo-500 !text-white border-none font-black text-[9px] px-3 py-1 uppercase tracking-widest italic">ASSIGNED</Badge>;');

code = code.replace(/return <StatusBadge status=\{'need_assignment'\} \/>;/g, 'return <Badge className="!bg-rose-500 !text-white border-none font-black text-[9px] px-3 py-1 uppercase tracking-widest italic">NEED ASSIGNMENT</Badge>;');

fs.writeFileSync('app/(dashboard)/sbu/trucking/work-orders/page.tsx', code);
console.log('Badges replaced!');
