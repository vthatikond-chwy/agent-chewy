import { Given, When, Then, And } from '@cucumber/cucumber';
// import { expect } from '@playwright/test'; // Not needed for step definitions
import { getPage } from '../support/pageHelper.js';
import { LocatorHelper } from '../healing/locatorHelper.js';

Given('I navigate to {string}', async (url: string) => {
  const page = await getPage();
  await page.goto(url);
});

When('I click on {string}', async (selector: string) => {
  const page = await getPage();
  const helper = new LocatorHelper(page);
  await helper.clickElement(selector);
});

When('I type {string} into {string}', async (text: string, selector: string) => {
  const page = await getPage();
  const helper = new LocatorHelper(page);
  await helper.typeIntoElement(selector, text);
});

When('I type into {string}', async (selector: string) => {
  const page = await getPage();
  const element = await page.locator(selector).first();
  await element.focus();
});

When('I select {string} from {string}', async (value: string, selector: string) => {
  const page = await getPage();
  const helper = new LocatorHelper(page);
  await helper.selectFromElement(selector, value);
});

When('I select from {string}', async (selector: string) => {
  const page = await getPage();
  const element = await page.locator(selector).first();
  await element.click();
});

And('I wait for {string}', async (selector: string) => {
  const page = await getPage();
  const helper = new LocatorHelper(page);
  await helper.waitForElement(selector);
});
