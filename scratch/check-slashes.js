const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'app', '(dashboard)', 'admin', 'page.tsx');
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

lines.forEach((line, index) => {
    // Look for slashes not part of comments, tags, or quoted strings
    if (line.includes('/') && !line.includes('//') && !line.includes('/*') && !line.includes('</') && !line.includes('/>')) {
        let insideQuotes = false;
        let quoteChar = '';
        let foundBareSlash = false;
        for (let i = 0; i < line.length; i++) {
            if ((line[i] === '"' || line[i] === "'" || line[i] === '`') && (!insideQuotes || line[i] === quoteChar)) {
                if (insideQuotes) {
                    insideQuotes = false;
                    quoteChar = '';
                } else {
                    insideQuotes = true;
                    quoteChar = line[i];
                }
            }
            if (line[i] === '/' && !insideQuotes && line[i+1] !== '>' && line[i-1] !== '<' && line[i+1] !== '/' && line[i-1] !== '/') {
                foundBareSlash = true;
                break;
            }
        }
        if (foundBareSlash) {
            console.log(`Potential bare slash at line ${index + 1}: ${line.trim()}`);
        }
    }
});
