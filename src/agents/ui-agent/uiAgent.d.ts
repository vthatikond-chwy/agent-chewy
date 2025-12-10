export interface UIAgentOptions {
    headless?: boolean;
    recordVideo?: boolean;
    recordScreenshots?: boolean;
    useVision?: boolean;
    visionMode?: 'none' | 'fallback' | 'all';
    outputDir?: string;
}
export interface ExecutionResult {
    success: boolean;
    stepsExecuted: number;
    totalSteps: number;
    errors: Array<{
        step: number;
        description: string;
        error: string;
    }>;
    screenshots?: string[];
    video?: string;
}
export declare class UIAgent {
    private browser;
    private context;
    private page;
    private parser;
    private locatorHelper;
    private healingEngine;
    private visionHealer;
    private popupHandler;
    private options;
    private screenshots;
    constructor(apiKey: string, options?: UIAgentOptions);
    /**
     * Initializes the browser and page
     */
    initialize(): Promise<void>;
    /**
     * Executes a natural language instruction
     */
    run(instruction: string): Promise<ExecutionResult>;
    /**
     * Executes a single test step
     */
    private executeStep;
    /**
     * Attempts to heal a failed step using GPT-4 Vision
     */
    private healWithVision;
    /**
     * Takes a screenshot
     */
    private takeScreenshot;
    /**
     * Cleans up browser resources
     */
    private cleanup;
}
//# sourceMappingURL=uiAgent.d.ts.map