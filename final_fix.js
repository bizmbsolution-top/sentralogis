
const fs = require('fs');
const path = 'c:/Users/sonad/projectQ/sentralogis/app/(dashboard)/admin/page.tsx';

try {
    let content = fs.readFileSync(path, 'utf8');

    // Marker searching for the end of filtered map and start of mobile nav
    const searchString = '/* MOBILE BOTTOM NAV */';
    
    if (content.includes(searchString)) {
        const parts = content.split(searchString);
        // Clean up the end of the first part
        // We want to replace the trailing })} </div> </div> with })()} </div> </div>
        let firstPart = parts[0].trimEnd();
        
        // Remove the existing (possibly broken) trailers
        // It ends with:
        //                  })}
        //              </div>
        //           </div>
        
        // Let's use a very safe replacement at the very end of the first part
        // We'll replace the last occurrence of '})' followed by some divs
        const lastIndex = firstPart.lastIndexOf('})}');
        if (lastIndex !== -1) {
            firstPart = firstPart.substring(0, lastIndex) + '})()}';
            // Now ensure the divs are there
            if (!firstPart.includes('</div>')) {
                 firstPart += '\n             </div>\n          </div>\n\n        ';
            }
        }
        
        content = firstPart + ' { ' + searchString + ' } ' + parts[1];
        fs.writeFileSync(path, content);
        console.log("SBU Fix: IIFE restored successfully via split-patch");
    } else {
        console.error("Critical: Could not find MOBILE BOTTOM NAV marker");
        process.exit(1);
    }
} catch (err) {
    console.error("Error:", err);
    process.exit(1);
}
