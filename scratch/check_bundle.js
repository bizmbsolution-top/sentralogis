const fs = require('fs');

async function run() {
  const html = fs.readFileSync('scratch/deploy_page.html', 'utf8');
  
  // Find script tags referencing /quote/deal
  const matches = html.match(/\/_next\/static\/chunks\/app\/quote\/deal\/%5Bid%5D\/page-[a-f0-9]+\.js/);
  console.log('Matches:', matches);
  
  if (matches && matches.length > 0) {
    const jsUrl = 'https://sentralogis.com' + matches[0];
    console.log('Fetching JS bundle:', jsUrl);
    const res = await fetch(jsUrl);
    const jsText = await res.text();
    
    console.log('JS contains Perusahaan Logistics:', jsText.includes('Perusahaan Logistics'));
    console.log('JS contains Company Name:', jsText.includes('Company Name'));
    console.log('JS contains tenant_id:', jsText.includes('tenant_id'));
    
    // Write JS to file for inspection
    fs.writeFileSync('scratch/deploy_bundle.js', jsText);
  }
}

run();
