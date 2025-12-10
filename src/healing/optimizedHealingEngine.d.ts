import type { Page, Locator } from 'playwright';
import { VisionHealer } from './visionHealer.js';
export interface HealingConfig {
    enableVision: boolean;
    visionTimeout: number;
    maxRetries: number;
    fastMode: boolean;
}
export declare class OptimizedHealingEngine {
    private page;
    private config;
    private visionHealer?;
    constructor(page: Page, config: HealingConfig, visionHealer?: VisionHealer | undefined);
    /**
     * Finds an element with optimized strategy:
     * 1. Try primary selector (fast - 1 second)
     * 2. If vision enabled and fastMode, skip fallbacks and use vision
     * 3. Otherwise try text/role fallbacks
     * 4. Finally use vision if enabled
     */
    findElement(context: {
        primarySelector: string;
        description: string;
    }): Promise<Locator>;
    /**
     * Uses vision healing to find element
     */
    private useVisionHealing;
    /**
     * Clicks an element using optimized healing
     */
    clickElement(selector: string, description?: string): Promise<void>;
    /**
     * Types into an element using optimized healing
     */
    typeIntoElement(selector: string, text: string, description?: string): Promise<void>;
}
//# sourceMappingURL=optimizedHealingEngine.d.ts.map