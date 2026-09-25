const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto('http://localhost:3001/'); await page.evaluate(() => { localStorage.setItem('auth_token', 'test-token'); localStorage.setItem('auth_user', JSON.stringify({ name: 'Commander', role: 'admin', clearance: 'TOP_SECRET', officerId: 'ADM-901' })); });
console.log('Navigating to authority portal...');
  await page.goto('http://localhost:3001/authority.html');

  console.log('Waiting for priority queue to load...');
  await page.waitForSelector('.priority-incident-card').all();

  const cards = await page.locator('.priority-incident-card').all();
  console.log(`Found ${cards.length} cards.`);

  const count = Math.min(cards.length, 8);
  
  for (let i = 0; i < count; i++) {
    console.log(`Processing card ${i+1}...`);
    const card = cards[i];

    // Find Inspect button
    const inspectBtn = await card.locator('button[aria-label^="Inspect"]');
    if (await inspectBtn.count() > 0) {
      await inspectBtn.first().click();
      await page.waitForSelector('#modal-inspect-entity', { state: 'visible' });
      await page.waitForTimeout(500); // Wait for transition
      await page.locator('#modal-inspect-entity > div').first().screenshot({ path: `audit_evidence/report_${i+1}_inspect.png` });
      
      // Close modal
      const closeBtn = await page.locator('#modal-inspect-entity button.iem-close');
      if (await closeBtn.count() > 0) {
        await closeBtn.first().click();
      } else {
        await page.click('body', { position: { x: 10, y: 10 } }); // click outside
      }
      await page.waitForTimeout(500);
    } else {
      console.log(`No Inspect button found for card ${i+1}`);
    }

    // Find Why button
    const whyBtn = await card.locator('button[aria-label^="View decision explanation"]');
    if (await whyBtn.count() > 0) {
      await whyBtn.first().click();
      await page.waitForSelector('.why-banner', { state: 'visible' });
      await page.waitForTimeout(500);
      
      await page.locator('#priority-explanation-modal > div').first().screenshot({ path: `audit_evidence/report_${i+1}_why.png` });

      // Close modal
      const closeWhyBtn = await page.locator('button[onclick="closePriorityExplanation()"]');
      if (await closeWhyBtn.count() > 0) {
        await closeWhyBtn.first().click();
      } else {
        await page.click('body', { position: { x: 10, y: 10 } }); // click outside
      }
      await page.waitForTimeout(500);
    } else {
      console.log(`No Why button found for card ${i+1}`);
    }
  }

  await browser.close();
  console.log('Done.');
})();
