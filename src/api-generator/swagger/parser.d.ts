/**
 * Swagger/OpenAPI specification parser
 */
import { SwaggerEndpoint, Schema } from '../types';
export declare class SwaggerSpecParser {
    private spec;
    private api;
    /**
     * Load and parse Swagger/OpenAPI specification
     */
    loadSpec(specPath: string): Promise<void>;
    /**
     * Load spec from URL
     */
    loadSpecFromUrl(url: string): Promise<void>;
    /**
     * Get API information
     */
    getApiInfo(): {
        title: string;
        version: string;
        description?: string;
    };
    /**
     * Get base URL from spec
     */
    getBaseUrl(): string;
    /**
     * Get all endpoints from the specification
     */
    getAllEndpoints(): SwaggerEndpoint[];
    /**
     * Get endpoints by tag
     */
    getEndpointsByTag(tag: string): SwaggerEndpoint[];
    /**
     * Get specific endpoint
     */
    getEndpoint(path: string, method: string): SwaggerEndpoint | undefined;
    /**
     * Get all tags
     */
    getAllTags(): string[];
    /**
     * Get security schemes
     */
    getSecuritySchemes(): Record<string, any>;
    /**
     * Extract request body schema
     */
    getRequestBodySchema(endpoint: SwaggerEndpoint): Schema | null;
    /**
     * Extract response schema
     */
    getResponseSchema(endpoint: SwaggerEndpoint, statusCode?: string): Schema | null;
    /**
     * Get required parameters
     */
    getRequiredParameters(endpoint: SwaggerEndpoint): {
        path: string[];
        query: string[];
        header: string[];
    };
    /**
     * Parse parameters into standardized format
     */
    private parseParameters;
    /**
     * Get the raw spec object
     */
    getRawSpec(): any;
}
//# sourceMappingURL=parser.d.ts.map