const fs = require('fs');

async function run() {
  const url = 'https://sentralogis.com/quote/deal/dc85558d-cb3c-4651-b099-0d459722fc42';
  try {
    const res = await fetch(url);
    const html = await res.text();
    fs.writeFileSync('scratch/deploy_page.html', html);
    console.log('Saved deploy page HTML to scratch/deploy_page.html');
  } catch (err) {
    console.error(err);
  }
}

run();
