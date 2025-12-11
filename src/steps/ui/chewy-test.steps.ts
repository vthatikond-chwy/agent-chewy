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

When('I click on account link', async function() {
  const element = page.getByTestId('account-link');
  await element.waitFor({ state: 'visible', timeout: 10000 });
  await element.click();
  await page.waitForTimeout(500);
});

When('I click on email field', async function() {
  const element = page.getByRole('textbox', { name: 'Email Address' });
  await element.waitFor({ state: 'visible', timeout: 10000 });
  await element.click();
  await page.waitForTimeout(500);
});

When('I enter {string} into email field', async function(value: string) {
  const element = page.getByRole('textbox', { name: 'Email Address' });
  await element.waitFor({ state: 'visible', timeout: 10000 });
  await element.click();
  await element.fill(value);
  await page.waitForTimeout(300);
});

When('I click on continue button', async function() {
  const element = page.getByRole('button', { name: 'Continue' });
  await element.waitFor({ state: 'visible', timeout: 10000 });
  await element.click();
  await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
});

When('I click on password field', async function() {
  const element = page.getByRole('textbox', { name: 'Password' });
  await element.waitFor({ state: 'visible', timeout: 10000 });
  await element.click();
  await page.waitForTimeout(500);
});

When('I enter {string} into password field', async function(value: string) {
  const element = page.getByRole('textbox', { name: 'Password' });
  await element.waitFor({ state: 'visible', timeout: 20000 });
  await element.click();
  await element.fill(value);
  await page.waitForTimeout(300);
});

When('I click on sign in button', async function() {
  const element = page.getByRole('button', { name: 'Sign In' });
  await element.waitFor({ state: 'visible', timeout: 10000 });
  await element.click();
  await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
});
