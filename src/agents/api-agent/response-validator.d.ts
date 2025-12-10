/**
 * Validates responses against Swagger schema using Ajv
 */
export interface ValidationResult {
    valid: boolean;
    errors?: any[];
}
export declare class ResponseValidator {
    private ajv;
    constructor();
    /**
     * Generate validation code for response schema
     * This generates TypeScript code that can be included in step definitions
     */
    generateValidation(responseSchema: any, statusCode: number, scenarioName: string): string;
    /**
     * Validate response data against schema at runtime
     */
    validate(data: any, schema: any): ValidationResult;
    /**
     * Resolve $ref references in schema
     */
    resolveSchema(schema: any, spec: any): any;
    /**
     * Extract response schema from endpoint
     */
    extractResponseSchema(endpoint: any, statusCode: string, spec: any): any;
}
//# sourceMappingURL=response-validator.d.ts.map