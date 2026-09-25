
const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  console.log('Setting auth...');
  await page.goto('http://localhost:3001/');
  await page.evaluate(() => {
    localStorage.setItem('auth_token', 'test-token');
    localStorage.setItem('auth_user', JSON.stringify({ name: 'Commander', role: 'admin', clearance: 'TOP_SECRET', officerId: 'ADM-901' }));
  });

  console.log('Navigating to authority portal...');
  await page.goto('http://localhost:3001/authority.html');

  console.log('Waiting for priority queue to load...');
  await page.waitForSelector('.priority-incident-card');

  const cards = await page.('.priority-incident-card');
  console.log('Found ' + cards.length + ' cards.');

  const count = Math.min(cards.length, 8);
  
  for (let i = 0; i < count; i++) {
    console.log('Processing card ' + (i+1) + '...');
    const card = cards[i];

    const inspectBtn = await card.button[aria-label^=\"Inspect\"];
    if (inspectBtn) {
      await inspectBtn.click();
      await page.waitForSelector('#modal-inspect-entity', { state: 'visible' });
      await page.waitForTimeout(1000);
      await page.locator('#modal-inspect-entity > div').first().screenshot({ path: 'audit_evidence/report_' + (i+1) + '_inspect.png' });
      
      const closeBtn = await page.#modal-inspect-entity button.iem-close;
      if (closeBtn) {
        await closeBtn.click();
      } else {
        await page.mouse.click(10, 10);
      }
      await page.waitForTimeout(500);
    } else {
      console.log('No Inspect button found for card ' + (i+1));
    }

    const whyBtn = await card.button[aria-label^=\"View decision explanation\"];
    if (whyBtn) {
      await whyBtn.click();
      await page.waitForSelector('.why-banner', { state: 'visible' });
      await page.waitForTimeout(1000);
      
      await page.locator('#priority-explanation-modal > div').first().screenshot({ path: 'audit_evidence/report_' + (i+1) + '_why.png' });

      const closeWhyBtn = await page.button[onclick=\"closePriorityExplanation()\"];
      if (closeWhyBtn) {
        await closeWhyBtn.click();
      } else {
        await page.mouse.click(10, 10);
      }
      await page.waitForTimeout(500);
    } else {
      console.log('No Why button found for card ' + (i+1));
    }
  }

  await browser.close();
  console.log('Done.');
})();

