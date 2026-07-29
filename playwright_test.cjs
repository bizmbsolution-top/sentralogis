const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
  });
  const page = await context.newPage();

  const allLogs = { log: [], error: [], warn: [], pageError: [] };
  page.on("pageerror", err => {
    allLogs.pageError.push({ msg: err.message, stack: (err.stack || "").substring(0, 2000) });
  });
  page.on("console", msg => {
    const type = msg.type();
    if (allLogs[type]) allLogs[type].push(msg.text().substring(0, 300));
    else allLogs.log.push(msg.text().substring(0, 300));
  });

  try {
    await page.addInitScript(() => { window.__FORCE_NATIVE = true; });

    const response = await page.goto("https://sentralogis.com/jo/12659dcd-f5ab-433e-b57f-5f97644e75dd", {
      waitUntil: "networkidle", timeout: 30000
    });
    await page.waitForTimeout(10000);
    
    console.log("=== ALL LOGS ===");
    for (const [type, msgs] of Object.entries(allLogs)) {
      if (msgs.length > 0) {
        console.log(`\n--- ${type} (${msgs.length}) ---`);
        msgs.forEach(m => console.log(typeof m === "string" ? m : m.msg + "\n  " + (m.stack || "").substring(0, 300)));
      }
    }

    if (allLogs.pageError.length === 0) {
      console.log("\n=== NO CRASH ===");
    }
  } catch (err) {
    console.log("=== LOAD ERROR ===", err.message);
  } finally {
    await browser.close();
  }
})();
