module.exports = {
  testDir: './tests/e2e',
  baseUrl: 'http://localhost:3000',
  browser: 'chromium',
  headless: true, // run in headless mode for CI/CD speed
  video: 'on-fail',
  retries: 1,
  timeout: 30000
};
