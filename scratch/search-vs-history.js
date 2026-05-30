// [AI] Search Cursor and VS Code history for page.tsx backup
const fs = require('fs');
const path = require('path');

const userProfile = process.env.USERPROFILE || 'C:\\Users\\sonad';
const paths = [
  path.join(userProfile, 'AppData', 'Roaming', 'Cursor', 'User', 'History'),
  path.join(userProfile, 'AppData', 'Roaming', 'Code', 'User', 'History')
];

let found = [];

paths.forEach(vscodeHistoryPath => {
  console.log("Searching history at:", vscodeHistoryPath);
  if (!fs.existsSync(vscodeHistoryPath)) {
    console.log("Directory does not exist:", vscodeHistoryPath);
    return;
  }

  const subdirs = fs.readdirSync(vscodeHistoryPath);
  subdirs.forEach(subdir => {
    const subpath = path.join(vscodeHistoryPath, subdir);
    if (fs.statSync(subpath).isDirectory()) {
      const files = fs.readdirSync(subpath);
      files.forEach(file => {
        const filepath = path.join(subpath, file);
        if (file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.ts')) {
          try {
            const content = fs.readFileSync(filepath, 'utf8');
            if (content.includes('HQInvoiceCustomerPage')) {
              found.push({
                path: filepath,
                size: content.length,
                mtime: fs.statSync(filepath).mtime
              });
            }
          } catch (e) {
            // Ignored
          }
        }
      });
    }
  });
});

found.sort((a, b) => b.mtime - a.mtime);
console.log(`Found ${found.length} candidate backup files:`);
found.forEach(f => {
  console.log(`File: ${f.path}, Size: ${f.size} bytes, Modified: ${f.mtime}`);
});

if (found.length > 0) {
  // Let's print the top 5 candidates
  for (let i = 0; i < Math.min(5, found.length); i++) {
    console.log(`Candidate ${i}: ${found[i].path}, Size: ${found[i].size}, Modified: ${found[i].mtime}`);
  }
  const bestFile = found[0].path;
  console.log(`Restoring best candidate to page.tsx: ${bestFile}`);
  const content = fs.readFileSync(bestFile, 'utf8');
  const targetPath = 'C:\\Users\\sonad\\projectQ\\sentralogis\\app\\(dashboard)\\hq\\invoice-customer\\page.tsx';
  fs.writeFileSync(targetPath, content);
  console.log("File page.tsx successfully restored to working directory!");
} else {
  console.log("No backup files found in any history path.");
}
