/**
 * Context Builder - Programmatically build API context from various sources
 * This can analyze code, swagger specs, and existing tests to build context
 */
import { ApiContext, DomainContext, EndpointContext, GenerationHint } from './types.js';
export interface ContextBuilderOptions {
    teamName: string;
    swaggerPath?: string;
    existingRulesPath?: string;
    existingConfigPath?: string;
    includeExamples?: boolean;
}
export declare class ContextBuilder {
    private context;
    private teamName;
    constructor(teamName: string);
    /**
     * Set domain context
     */
    withDomainContext(domain: DomainContext): ContextBuilder;
    /**
     * Add an endpoint context
     */
    addEndpoint(endpoint: EndpointContext): ContextBuilder;
    /**
     * Add a generation hint
     */
    addGenerationHint(hint: GenerationHint): ContextBuilder;
    /**
     * Add valid test data
     */
    addValidTestData(data: Record<string, any>): ContextBuilder;
    /**
     * Add invalid test data
     */
    addInvalidTestData(data: Record<string, any>): ContextBuilder;
    /**
     * Build context from swagger specification
     */
    buildFromSwagger(swaggerPath: string): Promise<ContextBuilder>;
    /**
     * Build endpoint context from swagger path
     */
    private buildEndpointFromSwagger;
    /**
     * Extract schema validations from definitions
     */
    private extractSchemaValidations;
    /**
     * Build the final context
     */
    build(): ApiContext;
    /**
     * Save context to file
     */
    save(): Promise<string>;
}
/**
 * Create a pre-configured AVS context builder
 */
export declare function createAVSContextBuilder(): ContextBuilder;
//# sourceMappingURL=context-builder.d.ts.map