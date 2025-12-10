/**
 * Schema analyzer to extract minimal required fields and simplify complex schemas
 */
export interface SimplifiedSchema {
    requiredFields: string[];
    optionalFields: string[];
    flatStructure: boolean;
    responseType: 'object' | 'integer' | 'string' | 'array' | 'unknown';
    example: any;
    fullSchema?: any;
}
/**
 * Resolve $ref references in schema recursively
 */
export declare function resolveSchemaRefs(schema: any, spec: any, visited?: Set<string>): any;
/**
 * Analyze and simplify a Swagger schema
 * Extracts only essential fields and determines if structure should be flat
 */
export declare function analyzeSchema(schema: any, spec: any): SimplifiedSchema;
/**
 * Extract minimal request body structure from schema
 */
export declare function getMinimalRequestBody(schema: any, spec: any): any;
/**
 * Get response type description for assertions
 */
export declare function getResponseTypeDescription(schema: any, spec: any): string;
//# sourceMappingURL=schema-analyzer.d.ts.map