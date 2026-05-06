const fs = require('fs');
const path = 'c:\\Users\\sonad\\projectQ\\sentralogis\\app\\(dashboard)\\admin\\page.tsx';
let content = fs.readFileSync(path, 'utf8').trim();

if (!content.endsWith('}')) {
    if (content.endsWith(');')) {
        content += '\n}';
        fs.writeFileSync(path, content);
        console.log("Added missing } and fixed file ending.");
    } else {
        console.log("Content doesn't end as expected. Current end:", content.slice(-10));
    }
} else {
    console.log("Already ends with }");
}
