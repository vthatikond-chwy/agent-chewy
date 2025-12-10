import type { Page } from 'playwright';
export interface VisionHealerResult {
    selector: string;
    confidence: number;
    coordinates?: {
        x: number;
        y: number;
    };
}
export declare class VisionHealer {
    private openai;
    private screenshotDir;
    constructor(apiKey: string, screenshotDir?: string);
    /**
     * Uses GPT-4 Vision to find an element on the page
     */
    findElementWithVision(page: Page, description: string, context?: string): Promise<VisionHealerResult>;
    /**
     * Simplifies HTML for context (removes scripts, styles, etc.)
     */
    private simplifyHTML;
}
//# sourceMappingURL=visionHealer.d.ts.map