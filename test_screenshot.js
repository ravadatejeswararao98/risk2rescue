
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext()).newPage();
  await page.goto('http://localhost:3001/authority.html');
  await page.waitForTimeout(5000);
  await page.screenshot({ path: 'audit_evidence/full_page.png' });
  await browser.close();
})();

