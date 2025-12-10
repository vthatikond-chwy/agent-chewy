/**
 * Self-healing functionality for API test generator
 * Automatically detects and fixes missing step definitions
 */
interface UndefinedStep {
    stepText: string;
    stepType: 'Given' | 'When' | 'Then' | 'And' | 'But';
    filePath: string;
    lineNumber: number;
}
export declare class SelfHealing {
    private openai;
    private stepsDir;
    constructor();
    /**
     * Run tests and detect undefined steps
     */
    detectUndefinedSteps(): Promise<UndefinedStep[]>;
    /**
     * Parse undefined steps from error output
     */
    private parseUndefinedStepsFromError;
    /**
     * Generate step definition for an undefined step
     */
    generateStepDefinition(step: UndefinedStep, featureContent?: string): Promise<string>;
    /**
     * Determine which step definition file to update based on feature file
     */
    private getStepDefinitionFile;
    /**
     * Add step definition to the appropriate file
     */
    addStepDefinition(step: UndefinedStep, stepDefinitionCode: string): Promise<void>;
    /**
     * Self-heal: detect and fix all undefined steps
     */
    heal(): Promise<void>;
}
export {};
//# sourceMappingURL=self-healing.d.ts.map