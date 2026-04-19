const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'app', '(dashboard)', 'admin', 'page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Aggressive Sanitization
// 1. Replace all Tailwind opacity slashes in strings with opacity classes
// Example: bg-blue-500/20 -> bg-blue-500 bg-opacity-20
content = content.replace(/([a-z]+-[a-z]+-[0-9]+)\/([0-9]+)/g, '$1 bg-opacity-$2');
content = content.replace(/([a-z]+-[0-9]+)\/([0-9]+)/g, '$1 bg-opacity-$2');
content = content.replace(/bg-slate-950\/40/g, 'bg-slate-950 bg-opacity-40');
content = content.replace(/bg-slate-950\/90/g, 'bg-slate-950 bg-opacity-90');
content = content.replace(/bg-slate-950\/95/g, 'bg-slate-950 bg-opacity-95');
content = content.replace(/bg-black\/50/g, 'bg-black bg-opacity-50');

// 2. Replace regexes with new RegExp()
content = content.replace(/\/_ \/g/g, "new RegExp('_', 'g')"); // note the spaces from my script previous output
content = content.replace(/\/\. \/g/g, "new RegExp('\\\\.', 'g')");

// 3. Fix divisions if necessary (though they should be fine)
// We won't touch divisions yet as they are too many.

fs.writeFileSync(filePath, content, 'utf8');
console.log("SUCCESS");
