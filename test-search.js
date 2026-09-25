const { chromium } = require('playwright');

(async () => {
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    console.log('Navigating to authority panel...');
    await page.goto('http://localhost:3001/citizen.html', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
        sessionStorage.setItem('rzi_authority_officer', JSON.stringify({ role: 'authority', name: 'Test' }));
        document.cookie = 'rzi_auth_token=testtoken; path=/'; 
    });
    await page.goto('http://localhost:3001/authority.html', { waitUntil: 'domcontentloaded' });

    console.log('Typing in search box...');
    const searchInput = page.locator('#authority-search');
    try {
      await searchInput.waitFor({ state: 'visible', timeout: 5000 });
    } catch (e) {
      console.log("Failed to find search input. Page URL:", page.url());
      const html = await page.content();
      console.log("HTML Start:", html.substring(0, 500));
      return;
    }
    await searchInput.fill('Kakinada');

    console.log('Waiting for dropdown...');
    const dropdown = page.locator('#authority-search-dropdown');
    await dropdown.waitFor({ state: 'visible', timeout: 5000 });

    const resultsText = await dropdown.innerText();
    console.log('Dropdown contents:\n' + resultsText);

    if (resultsText.includes('Kakinada')) {
      console.log('Search populated successfully!');
    } else {
      console.log('Warning: Search results may not have populated properly.');
    }

    console.log('Clicking clear button...');
    const clearBtn = page.locator('#authority-search-clear');
    await clearBtn.click();

    const inputValue = await searchInput.inputValue();
    if (inputValue === '') {
      console.log('Clear button worked!');
    } else {
      console.log('Warning: Clear button did not clear input.');
    }

    console.log('Test completed successfully.');
  } catch (err) {
    console.error('Test failed:', err);
  } finally {
    if (browser) await browser.close();
  }
})();
