
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext()).newPage();
  await page.goto('http://localhost:3001/authority.html');
  await page.waitForTimeout(5000);
  const html = await page.evaluate(() => document.body.innerHTML);
  fs.writeFileSync('page_content.html', html);
  await browser.close();
})();

