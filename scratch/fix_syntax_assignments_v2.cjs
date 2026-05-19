const fs = require('fs');
const path = 'c:/Users/sonad/projectQ/sentralogis/app/(dashboard)/sbu/trucking/assignments/page.tsx';
let content = fs.readFileSync(path, 'utf8');
// Look for the specific 'on>' that is not part of '</Button>'
content = content.replace('\n536: on>', '\n</div>'); // Wait, no, the file doesn't have 536:
content = content.replace(/\n\s*on>\n\s*<Button/, '\n                      </div>\n                      <div className="relative z-10 space-y-3">\n                         <Button');
fs.writeFileSync(path, content);
console.log('Fixed!');
