const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'app', '(dashboard)', 'admin', 'page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Replace standard regex literals with new RegExp to satisfy picky parsers
content = content.replace(/\/_ \/g/g, "new RegExp('_', 'g')"); // fixing my previous mistake
content = content.replace(/\/\. \/g/g, "new RegExp('\\\\.', 'g')");

// Also replace common patterns without spaces
content = content.replace(/\/_ \/g/g, "new RegExp('_', 'g')"); // wait, my check script showed spaces?
// Let's just do it manually for the known ones.

content = content.replace(/replace\(\/_\/g, ' '\)/g, "replace(new RegExp('_', 'g'), ' ')");
content = content.replace(/replace\(\/\\\.\/g, ''\)/g, "replace(new RegExp('\\\\.', 'g'), '')");

fs.writeFileSync(filePath, content, 'utf8');
console.log("SUCCESS");
