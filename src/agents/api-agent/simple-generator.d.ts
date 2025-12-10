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
    private config;
    constructor(apiKey?: string);
    /**
     * Generate realistic test data using Faker for common field types
     * This is used when the user doesn't specify exact values in their NLP command
     */
    private generateRealisticTestData;
    /**
     * Parse expected response code from natural language
     * Looks for patterns like: "Expect NOT_VERIFIED", "MUST return CORRECTED", "should be VERIFIED"
     */
    private parseExpectedResponseCode;
    /**
     * Parse exact input data from natural language command
     * Extracts key-value pairs like: streets=['600 HARLAN CT'], city='Bonaire', postalCode='31005-5427'
     * Returns parsed data object or null if no explicit data found
     */
    private parseInputDataFromNLP;
    /**
     * Extract project name from swagger spec path
     * Example: swagger/teams/kyrios/kyrios-api.json -> kyrios
     */
    extractProjectName(swaggerSpecPath: string): string | null;
    /**
     * Check if OAuth token should be used for this project
     */
    private shouldUseOAuthToken;
    /**
     * Get OAuth token from team config or global config
     */
    private getOAuthToken;
    /**
     * Generate test scenarios from natural language
     */
    generateTestScenarios(naturalLanguageInput: string, swaggerSpec: any, targetEndpoints?: string[], swaggerSpecPath?: string): Promise<TestScenario[]>;
    /**
     * Generate Cucumber feature file from scenario
     */
    generateCucumberFeature(scenario: TestScenario, swaggerSpec: any, swaggerSpecPath?: string): Promise<string>;
    /**
     * Generate TypeScript step definitions
     */
    generateStepDefinitions(cucumberFeature: string, scenario: TestScenario, swaggerSpec: any, swaggerSpecPath?: string): Promise<string>;
    /**
     * Apply ALL fixes comprehensively in the correct order
     *
     * IMPORTANT: Fix order matters! Each fix operates on different parts of the code:
     * 1. Headers - fixes header object structure (must be first, before other fixes touch headers)
     * 2. DataTable - adds dataTable parameters (doesn't conflict with others)
     * 3. Quoted Strings - converts literal quotes to placeholders (operates on step definitions, not code body)
     * 4. Request Body - fixes requestBody assignments (operates on code body, not step definitions)
     * 5. Else Statements - removes duplicate else blocks (operates on code structure)
     * 6. Final Headers - final validation pass (catches anything missed, doesn't override previous fixes)
     *
     * These fixes are designed to be NON-OVERLAPPING - each operates on a different scope:
     * - Step definitions (signatures) vs code body (implementation)
     * - Headers object vs request body vs else statements
     */
    private applyAllFixes;
    /**
     * Fix request body issues - duplicate assignments, overwrites, malformed structures
     */
    private fixRequestBodyIssues;
    /**
     * Comprehensive fix for headers object - rebuilds it completely if malformed
     */
    private fixHeadersObject;
    /**
     * Ensure dataTable parameter is included when feature file has data tables
     */
    private fixDataTableParameters;
    /**
     * Fix quoted strings in step definitions - convert literal quoted strings to placeholders
     * Cucumber treats quoted strings in feature files as parameters, so step definitions must use {string} placeholders
     */
    private fixQuotedStringPlaceholders;
    /**
     * Remove duplicate else statements that may have been created by multiple regex replacements
     */
    private removeDuplicateElseStatements;
    /**
     * Final pass to fix any remaining header issues - always rebuilds if malformed patterns found
     */
    private finalHeadersFix;
    /**
     * Validate and fix data table consistency in feature files (for feature file generation)
     * Ensures all data table rows have the same number of columns as the header
     */
    private validateAndFixDataTablesInFeature;
    /**
     * Fix endpoint selection based on Swagger spec and scenario context
     * If scenario is about "validate" but uses suggestAddresses, switch to verifyAddress
     */
    private fixEndpointSelection;
    /**
     * Enforce working test data from rules - replace any addresses with working addresses
     * For negative/boundary scenarios, use invalid test data if available
     */
    private enforceWorkingTestData;
    /**
     * Adjust expected response codes when using working test data
     * Makes the generator more lenient - if we're using working test data but expecting
     * a negative response code, adjust it to match what the working data actually returns.
     * Also validates against Swagger spec enum values.
     */
    private adjustExpectedResponseCodes;
    /**
     * Fix response structure handling based on team rules (array vs object responses)
     */
    private fixResponseStructureHandling;
    /**
     * Fix incorrect property paths - some properties are at top level, not nested
     */
    private fixIncorrectPropertyPaths;
    /**
     * Ensure all steps from feature file have corresponding step definitions
     */
    private ensureAllStepsGenerated;
    /**
     * Clean up old generated files for a specific service
     */
    cleanupOldFiles(service?: string): void;
    /**
     * Write feature file to disk
     */
    writeFeatureFile(scenario: TestScenario, content: string, service?: string, category?: string): string;
    /**
     * Write step definition file to disk
     */
    writeStepDefinitionFile(scenario: TestScenario, content: string, service?: string): string;
    /**
     * Get base URL from spec
     * Defaults to staging environment for AVS API
     * @deprecated Use getTeamBaseUrl from team-config.ts instead
     */
    getBaseUrl(spec: any): string;
    /**
     * Sanitize filename
     */
    private sanitizeFilename;
}
//# sourceMappingURL=simple-generator.d.ts.map