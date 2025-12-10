export class PopupHandler {
    page;
    constructor(page) {
        this.page = page;
        this.setupPopupHandlers();
    }
    /**
     * Sets up automatic popup/dialog handlers
     */
    setupPopupHandlers() {
        // Handle alert dialogs
        this.page.on('dialog', async (dialog) => {
            console.log(`Popup detected: ${dialog.type()} - ${dialog.message()}`);
            // Auto-dismiss common popups
            if (dialog.type() === 'alert' || dialog.type() === 'confirm') {
                await dialog.accept();
            }
            else if (dialog.type() === 'prompt') {
                await dialog.dismiss();
            }
        });
        // Handle new pages/windows (e.g., popup windows)
        this.page.context().on('page', async (newPage) => {
            console.log('New page/popup window detected');
            // Close popup windows automatically
            setTimeout(async () => {
                try {
                    if (newPage.url().includes('popup') || newPage.url().includes('ad')) {
                        await newPage.close();
                    }
                }
                catch (error) {
                    // Ignore errors if page is already closed
                }
            }, 1000);
        });
    }
    /**
     * Waits for and handles any popups that appear
     */
    async handlePopups(timeout = 2000) {
        try {
            // Wait a bit for any popups to appear
            await this.page.waitForTimeout(timeout);
            // Check for common popup selectors and close them
            const popupSelectors = [
                '[data-testid*="popup"]',
                '[class*="popup"]',
                '[class*="modal"]',
                '[id*="popup"]',
                '[id*="modal"]',
                '.close-button',
                '[aria-label*="close" i]',
                '[aria-label*="dismiss" i]',
            ];
            for (const selector of popupSelectors) {
                try {
                    const popup = this.page.locator(selector).first();
                    if (await popup.isVisible({ timeout: 500 })) {
                        console.log(`Closing popup with selector: ${selector}`);
                        await popup.click();
                        await this.page.waitForTimeout(500);
                    }
                }
                catch (error) {
                    // Popup not found with this selector, continue
                }
            }
        }
        catch (error) {
            // No popups found, continue
        }
    }
    /**
     * Dismisses cookie banners and consent popups
     */
    async dismissCookieBanners() {
        const cookieSelectors = [
            'button:has-text("Accept")',
            'button:has-text("Accept All")',
            'button:has-text("I Accept")',
            'button:has-text("Agree")',
            '[id*="cookie"] button',
            '[class*="cookie"] button',
            '[data-testid*="cookie"]',
        ];
        for (const selector of cookieSelectors) {
            try {
                const button = this.page.locator(selector).first();
                if (await button.isVisible({ timeout: 1000 })) {
                    console.log(`Dismissing cookie banner with selector: ${selector}`);
                    await button.click();
                    await this.page.waitForTimeout(500);
                    break;
                }
            }
            catch (error) {
                // Cookie banner not found, continue
            }
        }
    }
}
//# sourceMappingURL=popupHandler.js.map