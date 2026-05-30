// [AI] View file length in d05679a
const { execSync } = require('child_process');

try {
  const content = execSync('git show d05679a:"app/(dashboard)/hq/invoice-customer/page.tsx"', { encoding: 'utf8' });
  const lines = content.split('\n');
  console.log("Total lines in d05679a page.tsx:", lines.length);
  // Let's also check if there is an id subdirectory in the commit
  try {
    const list = execSync('git ls-tree -r d05679a', { encoding: 'utf8' });
    console.log("Does it contain customer/[id]? ", list.includes('invoice-customer/[id]/page.tsx'));
  } catch (e) {
    console.log("Failed to list tree");
  }
} catch (e) {
  console.error("Failed to show file:", e.message);
}
