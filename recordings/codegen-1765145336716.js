const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: false
  });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto('https://www-stg.chewy.net/');
  await page.getByTestId('account-link').click();
  await page.getByRole('textbox', { name: 'Email Address' }).click();
  await page.getByRole('textbox', { name: 'Email Address' }).fill('vthatikond@chewy.com');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('textbox', { name: 'Password' }).click();
  await page.getByRole('textbox', { name: 'Password' }).fill('Rainbow!234');
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.getByTestId('desktop-header').getByTestId('search').click();
  await page.getByTestId('desktop-header').getByTestId('search').fill('dog toy');
  await page.getByTestId('desktop-header').getByTestId('search-button').click();
  await page.getByRole('link', { name: 'Frisco Bungee Plush Squeaking' }).click();
  await page.getByTestId('add-to-cart').click();
  await page.getByTestId('smartshelf-actions').getByRole('button', { name: 'Proceed to Checkout' }).click();
  await page.getByText('Credit or Debit Card').click();
  await page.getByTestId('place-order-card').getByTestId('place-order-button').click();
  await page.goto('https://www-stg.chewy.net/app/checkout/thankyou?orderId=5013883280&orderType=O');
  await page.close();

  // ---------------------
  await context.close();
  await browser.close();
})();