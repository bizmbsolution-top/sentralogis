const fs = require('fs');

let code = fs.readFileSync('components/layout/TopNavbar.tsx', 'utf8');

const injection = `<div className="hidden sm:flex flex-col">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="bg-emerald-100 text-emerald-700 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest">
                System Online
              </span>
            </div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Powered by Sentralogis</span>
          </div>`;

code = code.replace(/<div className="hidden sm:flex items-center gap-2">\s*<span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" \/>\s*<span className="bg-emerald-100 text-emerald-700 px-2\.5 py-0\.5 rounded-full text-xs font-medium">\s*System Online\s*<\/span>\s*<\/div>/m, injection);

fs.writeFileSync('components/layout/TopNavbar.tsx', code);
console.log('TopNavbar Done!');
