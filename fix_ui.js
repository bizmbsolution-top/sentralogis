
const fs = require('fs');
const path = 'c:/Users/sonad/projectQ/sentralogis/app/(dashboard)/admin/page.tsx';

try {
    let content = fs.readFileSync(path, 'utf8');

    // 1. Fix the mismatched closing tag for the SBU button
    // This looks for a button tag that is followed by a closing div tag within the same mapped iteration
    const buttonDivPattern = /(<button\s+key=\{sId\}[^>]*>[\s\S]*?)<\/div>/g;
    content = content.replace(buttonDivPattern, (match, p1) => {
        return p1 + '</button>';
    });

    fs.writeFileSync(path, content);
    console.log("Success: Fixed SBU button tags");
} catch (err) {
    console.error("Error patching file:", err);
    process.exit(1);
}
