const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'app', '(dashboard)', 'admin', 'page.tsx');
const f = fs.readFileSync(filePath, 'utf8');

let inString = false;
let quoteChar = '';
let inComment = false;
let commentType = ''; // 'single' or 'multi'

for (let i = 0; i < f.length; i++) {
    const c = f[i];
    const prev = f[i - 1];
    const next = f[i + 1];

    if (!inString && !inComment) {
        if (c === '/' && next === '/') {
            inComment = true;
            commentType = 'single';
            i++;
            continue;
        }
        if (c === '/' && next === '*') {
            inComment = true;
            commentType = 'multi';
            i++;
            continue;
        }
    }

    if (inComment) {
        if (commentType === 'single' && c === '\n') {
            inComment = false;
        } else if (commentType === 'multi' && c === '*' && next === '/') {
            inComment = false;
            i++;
        }
        continue;
    }

    if (!inComment) {
        if ((c === '"' || c === "'" || c === '`') && prev !== '\\') {
            if (!inString) {
                inString = true;
                quoteChar = c;
            } else if (c === quoteChar) {
                inString = false;
                quoteChar = '';
            }
        }
    }

    if (!inString && !inComment) {
        // Tag check logic
        const isTagStart = (c === '<');
        const isTagEnd = (c === '>');
        const isClosingTagSlash = (c === '/' && prev === '<');
        const isSelfClosingTagSlash = (c === '/' && next === '>');

        if (c === '/' && !isClosingTagSlash && !isSelfClosingTagSlash) {
            // Check if it's a known regex
            const startOfLine = f.lastIndexOf('\n', i) + 1;
            const lineNum = f.substring(0, i).split('\n').length;
            const fragment = f.substring(i - 20, i + 20).replace(/\n/g, ' ');
            console.log(`Potential bare slash at line ${lineNum}: ...${fragment}...`);
        }
    }
}
