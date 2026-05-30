// [AI] View file length in d05679a for customer/id/page.tsx
const { execSync } = require('child_process');

try {
  const content = execSync('git show d05679a:"app/(dashboard)/hq/invoice-customer/[id]/page.tsx"', { encoding: 'utf8' });
  const lines = content.split('\n');
  console.log("Total lines in [id]/page.tsx:", lines.length);
  console.log("Snippet:");
  console.log(lines.slice(0, 10).join('\n'));
} catch (e) {
  console.error("Failed to show file:", e.message);
}
