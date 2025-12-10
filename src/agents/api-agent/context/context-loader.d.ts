/**
 * Context Loader - Loads and manages API context for test generation
 */
import type { ApiContext, ContextLoadResult, EndpointContext, TestDataPattern } from './types.js';
export declare class ContextLoader {
    private contextCache;
    /**
     * Load context for a specific team from the swagger/teams directory
     */
    loadTeamContext(teamName: string): Promise<ContextLoadResult>;
    /**
     * Build context from existing rules.json, config.json, and swagger files
     */
    private buildContextFromExistingFiles;
    /**
     * Convert existing rules and config to API context
     */
    private buildContextFromRulesAndConfig;
    /**
     * Generate test scenario names for a response code
     */
    private generateTestScenariosForCode;
    /**
     * Build test patterns for an endpoint
     */
    private buildTestPatternsForEndpoint;
    /**
     * Build assertion templates from response code behaviors
     */
    private buildAssertionTemplates;
    /**
     * Extract business rules from rules config
     */
    private extractBusinessRules;
    /**
     * Extract edge cases from rules
     */
    private extractEdgeCases;
    /**
     * Build generation hints for LLM
     */
    private buildGenerationHints;
    /**
     * Get context for a specific endpoint
     */
    getEndpointContext(context: ApiContext, endpointPath: string): EndpointContext | undefined;
    /**
     * Get test patterns for a specific response code
     */
    getTestPatternsForResponseCode(context: ApiContext, responseCode: string): TestDataPattern[];
    /**
     * Format context for LLM consumption
     */
    formatContextForLLM(context: ApiContext): string;
    /**
     * Clear context cache
     */
    clearCache(): void;
    /**
     * Save context to file
     */
    saveContext(teamName: string, context: ApiContext): Promise<void>;
}
export declare const contextLoader: ContextLoader;
//# sourceMappingURL=context-loader.d.ts.map