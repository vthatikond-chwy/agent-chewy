/**
 * Main orchestrator for API test generation
 * Coordinates Swagger parsing, NLP processing, and test generation
 * Now enhanced with Context Library support for better test generation
 */
import { SwaggerSpecParser } from './swagger/parser.js';
import { OpenAIClient } from './nlp/openaiClient.js';
import { TestScenario, GenerationOptions } from './types.js';
import { ContextLoader, ApiContext } from './context/index.js';
export interface GenerationRequest {
    naturalLanguageInput: string;
    swaggerSpecPath?: string | undefined;
    swaggerSpecUrl?: string | undefined;
    targetEndpoints?: string[] | undefined;
    targetTags?: string[] | undefined;
    options?: GenerationOptions | undefined;
    /** Team name to load context for (e.g., 'avs', 'kyrios') */
    teamName?: string | undefined;
    /** Whether to use domain context for enhanced generation */
    useContext?: boolean | undefined;
}
export interface GenerationResult {
    success: boolean;
    scenarios: TestScenario[];
    generatedFiles: {
        features: string[];
        stepDefinitions: string[];
    };
    errors?: string[] | undefined;
}
export declare class ApiTestOrchestrator {
    private swaggerParser;
    private openaiClient;
    private contextLoader;
    private config;
    private currentContext;
    constructor(openaiApiKey?: string);
    /**
     * Main entry point: Generate tests from natural language
     */
    generateFromNaturalLanguage(request: GenerationRequest): Promise<GenerationResult>;
    /**
     * Generate tests for a specific endpoint
     */
    generateForEndpoint(swaggerSpecPath: string, endpointPath: string, method: string, options?: GenerationOptions | undefined): Promise<GenerationResult>;
    /**
     * Generate tests for all endpoints with a specific tag
     */
    generateForTag(swaggerSpecPath: string, tag: string, options?: GenerationOptions | undefined): Promise<GenerationResult>;
    /**
     * Load team-specific context for enhanced test generation
     */
    private loadTeamContext;
    /**
     * Load Swagger specification from file or URL
     */
    private loadSwaggerSpec;
    /**
     * Get relevant endpoints based on filters
     */
    private getRelevantEndpoints;
    /**
     * Generate test scenarios using OpenAI
     */
    private generateTestScenarios;
    /**
     * Generate Cucumber feature file and step definitions for a scenario
     */
    private generateTestFiles;
    /**
     * Write Cucumber feature file
     */
    private writeFeatureFile;
    /**
     * Write step definition file
     */
    private writeStepDefinitionFile;
    /**
     * Generate natural language description from endpoint
     */
    private generateNLFromEndpoint;
    /**
     * Get action verb from HTTP method
     */
    private getActionFromMethod;
    /**
     * Sanitize filename
     */
    private sanitizeFilename;
    /**
     * Get Swagger parser (for advanced use cases)
     */
    getSwaggerParser(): SwaggerSpecParser;
    /**
     * Get OpenAI client (for advanced use cases)
     */
    getOpenAIClient(): OpenAIClient;
    /**
     * Get context loader (for advanced use cases)
     */
    getContextLoader(): ContextLoader;
    /**
     * Get currently loaded context
     */
    getCurrentContext(): ApiContext | null;
    /**
     * Manually set context (useful for testing or custom context)
     */
    setContext(context: ApiContext): void;
}
//# sourceMappingURL=orchestrator.d.ts.map