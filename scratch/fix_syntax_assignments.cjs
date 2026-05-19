const fs = require('fs');
const path = 'c:/Users/sonad/projectQ/sentralogis/app/(dashboard)/sbu/trucking/assignments/page.tsx';
let content = fs.readFileSync(path, 'utf8');
content = content.replace('on>\n', '                      </div>\n');
fs.writeFileSync(path, content);
console.log('Fixed!');
