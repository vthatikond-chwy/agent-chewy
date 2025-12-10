/**
 * Type definitions for API test generator
 */
export interface SwaggerEndpoint {
    path: string;
    method: string;
    operationId?: string;
    summary?: string;
    description?: string;
    tags?: string[];
    parameters?: SwaggerParameter[];
    requestBody?: RequestBody;
    responses?: Record<string, Response>;
    security?: SecurityRequirement[];
}
export interface SwaggerParameter {
    name: string;
    in: 'path' | 'query' | 'header' | 'cookie';
    required?: boolean;
    schema?: Schema;
    description?: string;
    example?: any;
}
export interface RequestBody {
    required?: boolean;
    content?: Record<string, MediaType>;
}
export interface MediaType {
    schema?: Schema;
    example?: any;
    examples?: Record<string, Example>;
}
export interface Response {
    description: string;
    content?: Record<string, MediaType>;
}
export interface Schema {
    type?: string;
    properties?: Record<string, Schema>;
    required?: string[];
    items?: Schema;
    enum?: any[];
    format?: string;
    example?: any;
    $ref?: string;
}
export interface SecurityRequirement {
    [key: string]: string[];
}
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
export interface NLPTestRequest {
    naturalLanguageInput: string;
    swaggerSpec?: any;
    targetEndpoints?: string[];
    options?: GenerationOptions;
}
export interface GenerationOptions {
    generatePositive?: boolean;
    generateNegative?: boolean;
    generateBoundary?: boolean;
    generateSecurity?: boolean;
    outputFormat?: 'cucumber' | 'playwright' | 'both';
    language?: 'typescript' | 'javascript';
}
export interface Example {
    value?: any;
    summary?: string;
    description?: string;
}
export interface CucumberScenario {
    feature: string;
    scenario: string;
    tags: string[];
    steps: CucumberStep[];
}
export interface CucumberStep {
    keyword: 'Given' | 'When' | 'Then' | 'And' | 'But';
    text: string;
    dataTable?: string[][];
    docString?: string;
}
//# sourceMappingURL=types.d.ts.map