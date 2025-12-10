/**
 * OpenAI client for NLP processing and test generation
 */
import { TestScenario, SwaggerEndpoint } from '../types.js';
export declare class OpenAIClient {
    private client;
    private config;
    constructor(apiKey?: string);
    /**
     * Extract test scenarios from natural language input
     */
    extractTestScenarios(naturalLanguageInput: string, swaggerContext: any): Promise<TestScenario[]>;
    /**
     * Generate Cucumber/Gherkin scenario from test scenario definition
     */
    generateCucumberScenario(scenario: TestScenario, endpointDetails: SwaggerEndpoint): Promise<string>;
    /**
     * Generate step definitions in TypeScript
     */
    generateStepDefinitions(cucumberScenario: string, endpointDetails: SwaggerEndpoint): Promise<string>;
}
//# sourceMappingURL=openaiClient.d.ts.map