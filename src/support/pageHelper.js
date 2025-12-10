import { chromium } from 'playwright';
let browser = null;
let context = null;
let page = null;
export async function getPage() {
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
export async function closeBrowser() {
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
//# sourceMappingURL=pageHelper.js.map