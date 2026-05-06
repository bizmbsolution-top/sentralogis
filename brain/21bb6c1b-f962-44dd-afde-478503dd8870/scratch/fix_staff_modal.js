const fs = require('fs');
const path = 'c:\\Users\\sonad\\projectQ\\sentralogis\\app\\(dashboard)\\admin\\page.tsx';
let content = fs.readFileSync(path, 'utf8');

const broken = 'To              <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50">';
const fixed = `To Launchpad
                        </Link>
                   </div>
               )}

               <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50">`;

if (content.includes(broken)) {
    content = content.replace(broken, fixed);
    fs.writeFileSync(path, content);
    console.log("Fixed!");
} else {
    console.log("Broken line not found exactly. Trying regex...");
    const regex = /To\s+<div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50">/;
    if (regex.test(content)) {
        content = content.replace(regex, fixed);
        fs.writeFileSync(path, content);
        console.log("Fixed via regex!");
    } else {
        console.log("Still not found.");
    }
}
