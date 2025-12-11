import { Given, When, Then, Before, After, setDefaultTimeout } from '@cucumber/cucumber';
import type { Browser, Page } from 'playwright';
import { chromium } from 'playwright';

setDefaultTimeout(30000);
let browser: Browser;
let page: Page;

Before(async function() {
  browser = await chromium.launch({ headless: false });
  page = await browser.newContext().then(c => c.newPage());
});

After(async function() {
  await browser.close();
});

Given('I navigate to {string}', async function(url: string) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
});
