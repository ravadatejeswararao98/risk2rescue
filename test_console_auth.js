
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext()).newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  await page.goto('http://localhost:3001/');
  await page.evaluate(() => { localStorage.setItem('auth_token', 'test-token'); sessionStorage.setItem('rzi_authority_officer', JSON.stringify({ name: 'Commander', role: 'admin', clearance: 'TOP_SECRET', officerId: 'ADM-901' })); });
  await page.goto('http://localhost:3001/authority.html');
  
  // click command center
  await page.waitForTimeout(2000);
  const cmdBtn = await page..dock-item[data-view=\"command\"];
  if (cmdBtn) {
    console.log('Clicking command center...');
    await cmdBtn.click();
  }
  await page.waitForTimeout(5000);
  await browser.close();
})();

