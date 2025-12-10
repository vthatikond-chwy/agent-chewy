import type { TestPlan } from './nlParser.js';
export declare class GherkinGenerator {
    /**
     * Converts a TestPlan to Gherkin .feature file content
     */
    generate(plan: TestPlan): string;
    /**
     * Converts a TestStep to Gherkin syntax
     */
    private stepToGherkin;
    /**
     * Saves the generated Gherkin content to a file
     */
    saveToFile(plan: TestPlan, filePath: string): Promise<void>;
}
//# sourceMappingURL=gherkinGenerator.d.ts.map