
const fs = require('fs');
const path = 'c:/Users/sonad/projectQ/sentralogis/app/(dashboard)/admin/page.tsx';

try {
    let content = fs.readFileSync(path, 'utf8');

    // Marker: end of the map/IIFE section before MOBILE BOTTOM NAV
    // We search for the pattern of closing braces and ensure it's converted to an IIFE execution
    
    // Pattern: closing the map then two divs then the comment
    const pattern = /\}\)\s+<\/div>\s+<\/div>\s+\{\/\* MOBILE BOTTOM NAV \*\/\}/;
    
    if (pattern.test(content)) {
        content = content.replace(pattern, '})()}\n             </div>\n          </div>\n\n        {/* MOBILE BOTTOM NAV */');
        fs.writeFileSync(path, content);
        console.log("Success: Fixed IIFE execution");
    } else {
        // Try another variation without the outer {} for the comment if it was changed
        const pattern2 = /\}\)\s+<\/div>\s+<\/div>\s+\/\* MOBILE BOTTOM NAV \*\//;
        if (pattern2.test(content)) {
            content = content.replace(pattern2, '})()}\n             </div>\n          </div>\n\n        {/* MOBILE BOTTOM NAV */');
            fs.writeFileSync(path, content);
            console.log("Success: Fixed IIFE execution (variations)");
        } else {
             console.error("Pattern not found! Check file structure.");
             process.exit(1);
        }
    }
} catch (err) {
    console.error("Error patching file:", err);
    process.exit(1);
}
