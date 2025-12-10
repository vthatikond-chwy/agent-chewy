/**
 * Self-healing mechanism for API tests
 * Learns from successful requests and updates test patterns
 */
export interface SuccessfulRequestPattern {
    endpoint: string;
    method: string;
    requestBody: any;
    responseBody: any;
    statusCode: number;
    timestamp: number;
}
/**
 * Load successful request patterns
 */
export declare function loadSuccessfulPatterns(): SuccessfulRequestPattern[];
/**
 * Save a successful request pattern
 */
export declare function saveSuccessfulPattern(pattern: SuccessfulRequestPattern): void;
/**
 * Find a successful pattern for an endpoint
 */
export declare function findPatternForEndpoint(endpoint: string, method: string): SuccessfulRequestPattern | null;
/**
 * Extract minimal request body from successful pattern
 */
export declare function getMinimalRequestBodyFromPattern(endpoint: string, method: string): any | null;
/**
 * Get response type from successful pattern
 */
export declare function getResponseTypeFromPattern(endpoint: string, method: string): 'object' | 'integer' | 'string' | 'array' | 'unknown';
/**
 * Get detailed response structure from successful pattern
 * Returns structure information for array responses
 */
export declare function getResponseStructureFromPattern(endpoint: string, method: string): {
    itemStructure?: any;
    assertionNote?: string;
} | null;
//# sourceMappingURL=self-healing.d.ts.map