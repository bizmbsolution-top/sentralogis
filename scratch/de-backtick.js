const fs = require('fs');
const path = 'app/(dashboard)/admin/page.tsx';
let f = fs.readFileSync(path, 'utf8');

// Regex to find template literals and convert them to string concatenation
f = f.replace(/`([\s\S]*?)`/g, (match, content) => {
    // Split by ${...}
    const parts = content.split(/\${([\s\S]*?)}/g);
    return parts.map((part, i) => {
        if (i % 2 === 0) {
            // Static part
            return JSON.stringify(part);
        } else {
            // Expression part
            return '(' + part + ')';
        }
    }).join(' + ');
});

fs.writeFileSync(path, f, 'utf8');
console.log('Conversion complete. No more backticks!');
