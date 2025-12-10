import type { Page, Locator } from 'playwright';
export interface LocatorOptions {
    timeout?: number;
    useVision?: boolean;
    retries?: number;
}
export declare class LocatorHelper {
    private page;
    constructor(page: Page);
    /**
     * Finds an element using multiple fallback strategies
     */
    findElement(primarySelector: string, options?: LocatorOptions): Promise<Locator>;
    /**
     * Clicks an element using fallback strategies with retry logic
     */
    clickElement(selector: string, options?: LocatorOptions): Promise<void>;
    /**
     * Types into an element using fallback strategies with retry logic
     */
    typeIntoElement(selector: string, text: string, options?: LocatorOptions): Promise<void>;
    /**
     * Selects an option from a dropdown using fallback strategies
     */
    selectFromElement(selector: string, value: string, options?: LocatorOptions): Promise<void>;
    /**
     * Waits for an element using fallback strategies
     */
    waitForElement(selector: string, options?: LocatorOptions): Promise<void>;
}
//# sourceMappingURL=locatorHelper.d.ts.map