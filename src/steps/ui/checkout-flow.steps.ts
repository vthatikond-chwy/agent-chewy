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

Then('I should see the order confirmation page', async function() {
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  const currentUrl = page.url();
  if (!currentUrl.includes('thankyou')) {
    throw new Error(`Expected order confirmation page, but got ${currentUrl}`);
  }
  console.log('✓ Order confirmed! URL:', currentUrl);
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

When('I click on element', async function() {
  const element = page.getByTestId('desktop-header').getByTestId('search');
  await element.waitFor({ state: 'visible', timeout: 10000 });
  await element.click();
  await page.waitForTimeout(500);
});

When('I enter {string} into search field', async function(value: string) {
  const element = page.getByTestId('desktop-header').getByTestId('search');
  await element.waitFor({ state: 'visible', timeout: 10000 });
  await element.click();
  await element.fill(value);
  await page.waitForTimeout(300);
});

When('I click on product link', async function() {
  // Click on the first search result product link
  const element = page.locator('[data-testid="productCard"]').first().getByRole('link').first();
  await element.waitFor({ state: 'visible', timeout: 10000 });
  await element.click();
  await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
});

When('I click on add to cart button', async function() {
  const element = page.getByTestId('add-to-cart');
  await element.waitFor({ state: 'visible', timeout: 10000 });
  await element.click();
  await page.waitForTimeout(500);
});

When('I click on proceed to checkout button', async function() {
  const element = page.getByTestId('smartshelf-actions').getByRole('button', { name: 'Proceed to Checkout' });
  await element.waitFor({ state: 'visible', timeout: 10000 });
  await element.click();
  await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
});

When('I click on payment method', async function() {
  const element = page.getByText('Credit or Debit Card');
  await element.waitFor({ state: 'visible', timeout: 10000 });
  await element.click();
  await page.waitForTimeout(500);
});

When('I click on place order button', async function() {
  const element = page.getByTestId('place-order-card').getByTestId('place-order-button');
  await element.waitFor({ state: 'visible', timeout: 10000 });
  await element.click();
  await page.waitForTimeout(500);
});

When('I enter {string} into field', async function(value: string) {
  const element = page.getByRole('textbox', { name: '-Digit One-Time Code' });
  await element.waitFor({ state: 'visible', timeout: 10000 });
  await element.click();
  await element.fill(value);
  await page.waitForTimeout(300);
});
