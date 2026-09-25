const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  const logs = [];
  page.on('console', msg => logs.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', error => logs.push(`[ERROR] ${error.message}`));

  console.log('Navigating to authority dashboard...');
  await page.goto('http://localhost:3001/authority.html', { waitUntil: 'networkidle' });

  // Wait a moment for data to load via websocket
  await page.waitForTimeout(5000);

  // Take full dashboard screenshot
  await page.screenshot({ path: 'audit_1440.png' });

  // A.1 No hospital icons
  // A.2 Clicking a zone
  console.log('Clicking a hazard zone row...');
  await page.click('#zone-manager-tbody tr'); // Click first hazard zone row
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'audit_zone_info.png' });

  // A.3 Live conditions tab
  console.log('Clicking live conditions tab...');
  const tabs = await page.$$('.zip-tab');
  if (tabs.length > 1) {
    await tabs[1].click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'audit_live_conditions.png' });
  }

  // B. Hazard Zones panel accordion
  console.log('Clicking hazard zones header...');
  await page.click('.zm-header'); // Assume this is the header to expand/collapse
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'audit_hazard_zones_accordion.png' });

  // C. Topbar Search and AI Confidence
  console.log('Checking topbar...');
  await page.screenshot({ path: 'audit_topbar.png' });

  // C. Side menu toggle
  console.log('Toggling side menu...');
  await page.click('#sidebar-toggle');
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'audit_sidebar.png' });

  // D. Habitations window
  console.log('Opening Habitations window...');
  await page.evaluate(() => {
    if (typeof openHabitationsWindow === 'function') openHabitationsWindow();
  });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'audit_habitations.png' });

  // D. Capacity window
  console.log('Opening Capacity window...');
  await page.evaluate(() => {
    if (typeof openCapacityWindow === 'function') openCapacityWindow();
  });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'audit_capacity.png' });

  // E. Verify & Allocate
  console.log('Clicking verify & allocate...');
  await page.evaluate(() => {
    // Hide habitations/capacity
    const w1 = document.getElementById('habitations-window');
    if (w1) w1.style.display = 'none';
    const w2 = document.getElementById('capacity-window');
    if (w2) w2.style.display = 'none';
  });
  
  const allocateBtns = await page.$$('.btn-verify-allocate');
  if (allocateBtns.length > 0) {
    await allocateBtns[0].click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'audit_allocate_popover.png' });
  }

  // E. Inspect modal
  console.log('Clicking Inspect modal...');
  await page.click('body'); // dismiss popover
  await page.waitForTimeout(500);
  const inspectBtns = await page.$$('.btn-why');
  if (inspectBtns.length > 0) {
    await inspectBtns[0].click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'audit_inspect_modal.png' });
  }

  // Viewports
  console.log('Responsive testing...');
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'audit_1024.png' });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'audit_390.png' });

  fs.writeFileSync('audit_console.log', logs.join('\n'));

  console.log('Done!');
  await browser.close();
})();
