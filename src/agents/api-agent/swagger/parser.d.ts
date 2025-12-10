/**
 * Swagger/OpenAPI specification parser
 */
export interface SwaggerEndpoint {
    path: string;
    method: string;
    operationId?: string;
    summary?: string;
    description?: string;
    tags?: string[];
    parameters?: any[];
    requestBody?: any;
    responses?: any;
    security?: any[];
}
export interface SwaggerParameter {
    name: string;
    in: 'path' | 'query' | 'header' | 'cookie';
    required?: boolean;
    schema?: any;
    description?: string;
    example?: any;
}
export interface Schema {
    type?: string;
    properties?: any;
    required?: string[];
    items?: Schema;
    enum?: any[];
    format?: string;
    example?: any;
    $ref?: string;
}
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