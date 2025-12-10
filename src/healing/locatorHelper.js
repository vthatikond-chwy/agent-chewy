export class LocatorHelper {
    page;
    constructor(page) {
        this.page = page;
    }
    /**
     * Finds an element using multiple fallback strategies
     */
    async findElement(primarySelector, options = {}) {
        // Use shorter timeout if vision is enabled (will use vision faster)
        const timeout = options.useVision ? 2000 : (options.timeout || 5000);
        // Strategy 1: Try primary CSS selector (quick check)
        try {
            const locator = this.page.locator(primarySelector).first();
            await locator.waitFor({ state: 'visible', timeout: 1000 }); // Quick 1s check
            return locator;
        }
        catch (error) {
            // If vision is enabled, skip all other fallbacks and go straight to vision
            if (options.useVision) {
                throw new Error('Standard selectors failed, will use vision');
            }
            console.warn(`Primary selector failed: ${primarySelector}`);
        }
        // Strategy 2: Try text-based search
        try {
            const textLocator = this.page.getByText(primarySelector, { exact: false }).first();
            await textLocator.waitFor({ state: 'visible', timeout });
            return textLocator;
        }
        catch (error) {
            console.warn(`Text-based search failed: ${primarySelector}`);
        }
        // Strategy 3: Try role-based and aria-label search
        try {
            // Try as button
            const buttonLocator = this.page.getByRole('button', { name: primarySelector }).first();
            await buttonLocator.waitFor({ state: 'visible', timeout });
            return buttonLocator;
        }
        catch (error) {
            // Try as link
            try {
                const linkLocator = this.page.getByRole('link', { name: primarySelector }).first();
                await linkLocator.waitFor({ state: 'visible', timeout });
                return linkLocator;
            }
            catch (error2) {
                // Try by aria-label
                try {
                    const ariaLocator = this.page.getByLabel(primarySelector).first();
                    await ariaLocator.waitFor({ state: 'visible', timeout });
                    return ariaLocator;
                }
                catch (error3) {
                    console.warn(`Role/aria-based search failed: ${primarySelector}`);
                }
            }
        }
        // Strategy 4: Try partial text match in various elements
        try {
            const partialMatch = this.page.locator(`text=${primarySelector}`).first();
            await partialMatch.waitFor({ state: 'visible', timeout });
            return partialMatch;
        }
        catch (error) {
            console.warn(`Partial text match failed: ${primarySelector}`);
        }
        // Strategy 5: If vision is enabled, use GPT-4 Vision
        // Note: Vision healing is handled at a higher level in UIAgent
        // This is a fallback that will be caught and handled by the agent
        // If all strategies fail, throw error
        throw new Error(`Could not locate element with selector: ${primarySelector}. All fallback strategies failed.`);
    }
    /**
     * Clicks an element using fallback strategies with retry logic
     */
    async clickElement(selector, options = {}) {
        const { timeout = 10000, retries = 3 } = options;
        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                const element = await this.findElement(selector, { ...options, timeout });
                await element.waitFor({ state: 'visible', timeout });
                await element.click({ timeout });
                return;
            }
            catch (error) {
                if (attempt === retries) {
                    throw new Error(`Failed to click ${selector} after ${retries} attempts: ${error.message}`);
                }
                console.log(`  ⚠️  Click attempt ${attempt} failed, retrying...`);
                await this.page.waitForTimeout(1000 * attempt);
            }
        }
    }
    /**
     * Types into an element using fallback strategies with retry logic
     */
    async typeIntoElement(selector, text, options = {}) {
        const { timeout = 10000, retries = 3 } = options;
        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                const element = await this.findElement(selector, { ...options, timeout });
                await element.waitFor({ state: 'visible', timeout });
                await element.click(); // Focus first
                await element.fill(text, { timeout });
                return;
            }
            catch (error) {
                if (attempt === retries) {
                    throw new Error(`Failed to type into ${selector} after ${retries} attempts: ${error.message}`);
                }
                console.log(`  ⚠️  Fill attempt ${attempt} failed, retrying...`);
                await this.page.waitForTimeout(1000 * attempt);
            }
        }
    }
    /**
     * Selects an option from a dropdown using fallback strategies
     */
    async selectFromElement(selector, value, options = {}) {
        const { timeout = 10000 } = options;
        const element = await this.findElement(selector, options);
        await element.waitFor({ state: 'visible', timeout });
        await element.selectOption(value, { timeout });
    }
    /**
     * Waits for an element using fallback strategies
     */
    async waitForElement(selector, options = {}) {
        await this.findElement(selector, options);
    }
}
//# sourceMappingURL=locatorHelper.js.map