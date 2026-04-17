
const fs = require('fs');
const path = 'c:/Users/sonad/projectQ/sentralogis/app/(dashboard)/admin/page.tsx';

try {
    let content = fs.readFileSync(path, 'utf8');

    // Fix the double span and corrupted div
    // We search for the specific corrupted pattern
    const pattern = /Rp \{item\.deal_price\?\.toLocaleString\('id-ID'\)\}<\/span><\/span>\s+<\/div>/;
    
    if (pattern.test(content)) {
        content = content.replace(pattern, "Rp {item.deal_price?.toLocaleString('id-ID')}</span>\n                                           </div>");
    } else {
        // Fallback: search for just the double span with any surrounding text
        content = content.replace(/<\/span><\/span>\s+<\/div>/g, "</span>\n                                           </div>");
    }

    fs.writeFileSync(path, content);
    console.log("Success: Cleaned up corrupted JSX tags");
} catch (err) {
    console.error("Error:", err);
    process.exit(1);
}
