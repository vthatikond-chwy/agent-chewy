import { VisionHealer } from './visionHealer.js';
export class OptimizedHealingEngine {
    page;
    config;
    visionHealer;
    constructor(page, config, visionHealer) {
        this.page = page;
        this.config = config;
        this.visionHealer = visionHealer;
    }
    /**
     * Finds an element with optimized strategy:
     * 1. Try primary selector (fast - 1 second)
     * 2. If vision enabled and fastMode, skip fallbacks and use vision
     * 3. Otherwise try text/role fallbacks
     * 4. Finally use vision if enabled
     */
    async findElement(context) {
        // STEP 1: Try primary selector (FAST - 1 second)
        try {
            const element = this.page.locator(context.primarySelector).first();
            await element.waitFor({ timeout: 1000, state: 'visible' });
            console.log('  ✓ Found with primary selector (1s)');
            return element;
        }
        catch {
            console.log('  ✗ Primary selector failed');
        }
        // STEP 2: If fastMode and vision enabled, skip fallbacks
        if (this.config.fastMode && this.config.enableVision && this.visionHealer) {
            return await this.useVisionHealing(context);
        }
        // STEP 3: Try text-based search (only if not fastMode)
        if (!this.config.fastMode) {
            try {
                const textLocator = this.page.getByText(context.primarySelector, { exact: false }).first();
                await textLocator.waitFor({ timeout: 2000, state: 'visible' });
                console.log('  ✓ Found with text search (2s)');
                return textLocator;
            }
            catch {
                console.log('  ✗ Text search failed');
            }
            // STEP 4: Try role-based search
            try {
                const buttonLocator = this.page.getByRole('button', { name: context.primarySelector }).first();
                await buttonLocator.waitFor({ timeout: 2000, state: 'visible' });
                console.log('  ✓ Found with role search (2s)');
                return buttonLocator;
            }
            catch {
                console.log('  ✗ Role search failed');
            }
        }
        // STEP 5: Use vision healing if enabled
        if (this.config.enableVision && this.visionHealer) {
            return await this.useVisionHealing(context);
        }
        // STEP 6: If all strategies fail, throw error
        throw new Error(`Element not found: ${context.primarySelector}\n` +
            `Description: ${context.description}\n` +
            `Vision healing: ${this.config.enableVision ? 'failed' : 'disabled'}`);
    }
    /**
     * Uses vision healing to find element
     */
    async useVisionHealing(context) {
        if (!this.visionHealer) {
            throw new Error('Vision healer not available');
        }
        console.log('  🔍 Using vision healing (10-15s expected)...');
        const start = Date.now();
        try {
            const visionResult = await this.visionHealer.findElementWithVision(this.page, context.description || context.primarySelector, `Find element: ${context.primarySelector}`);
            const duration = ((Date.now() - start) / 1000).toFixed(1);
            console.log(`  ✓ Vision found selector: ${visionResult.selector} (${duration}s)`);
            // Try to use the selector found by vision
            const element = this.page.locator(visionResult.selector).first();
            await element.waitFor({ timeout: 5000, state: 'visible' });
            return element;
        }
        catch (error) {
            const duration = ((Date.now() - start) / 1000).toFixed(1);
            console.error(`  ✗ Vision healing failed (${duration}s):`, error instanceof Error ? error.message : String(error));
            throw error;
        }
    }
    /**
     * Clicks an element using optimized healing
     */
    async clickElement(selector, description) {
        const element = await this.findElement({
            primarySelector: selector,
            description: description || selector
        });
        await element.click();
    }
    /**
     * Types into an element using optimized healing
     */
    async typeIntoElement(selector, text, description) {
        const element = await this.findElement({
            primarySelector: selector,
            description: description || selector
        });
        await element.fill(text);
    }
}
//# sourceMappingURL=optimizedHealingEngine.js.map