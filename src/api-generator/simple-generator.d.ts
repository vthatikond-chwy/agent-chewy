/**
 * Simple API test generator using OpenAI
 */
export interface TestScenario {
    name: string;
    description: string;
    type: 'positive' | 'negative' | 'boundary' | 'security';
    priority: 'high' | 'medium' | 'low';
    endpoint: string;
    method: string;
    testData?: any;
    expectedStatus: number;
    assertions: string[];
    prerequisites?: string[];
    tags?: string[];
}
export declare class SimpleTestGenerator {
    private openai;
    constructor(apiKey?: string);
    /**
     * Generate test scenarios from natural language
     */
    generateTestScenarios(naturalLanguageInput: string, swaggerSpec: any, targetEndpoints?: string[]): Promise<TestScenario[]>;
    /**
     * Generate Cucumber feature file from scenario
     */
    generateCucumberFeature(scenario: TestScenario, swaggerSpec: any): Promise<string>;
    /**
     * Generate TypeScript step definitions
     */
    generateStepDefinitions(cucumberFeature: string, scenario: TestScenario, swaggerSpec: any): Promise<string>;
    /**
     * Write feature file to disk
     */
    writeFeatureFile(scenario: TestScenario, content: string): string;
    /**
     * Write step definition file to disk
     */
    writeStepDefinitionFile(scenario: TestScenario, content: string): string;
    /**
     * Get base URL from spec
     * Defaults to staging environment for AVS API
     */
    private getBaseUrl;
    /**
     * Sanitize filename
     */
    private sanitizeFilename;
}
//# sourceMappingURL=simple-generator.d.ts.map