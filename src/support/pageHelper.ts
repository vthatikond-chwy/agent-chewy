import type { Browser, BrowserContext, Page } from 'playwright';
import { chromium } from 'playwright';

let browser: Browser | null = null;
let context: BrowserContext | null = null;
let page: Page | null = null;

export async function getPage(): Promise<Page> {
  if (!browser) {
    browser = await chromium.launch({ headless: false });
  }
  if (!context) {
    context = await browser.newContext();
  }
  if (!page) {
    page = await context.newPage();
  }
  return page;
}

export async function closeBrowser(): Promise<void> {
  if (page) {
    await page.close();
    page = null;
  }
  if (context) {
    await context.close();
    context = null;
  }
  if (browser) {
    await browser.close();
    browser = null;
  }
}

