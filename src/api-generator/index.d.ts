/**
 * Public API for API Test Generator
 */
export { ApiTestOrchestrator } from './orchestrator.js';
export { SwaggerSpecParser } from './swagger/parser.js';
export { OpenAIClient } from './nlp/openaiClient.js';
export { loadConfig } from './config.js';
export type { SwaggerEndpoint, SwaggerParameter, RequestBody, Response, Schema, TestScenario, NLPTestRequest, GenerationOptions, CucumberScenario, CucumberStep } from './types.js';
export type { GenerationRequest, GenerationResult } from './orchestrator.js';
export declare function generateApiTests(request: {
    naturalLanguageInput: string;
    swaggerSpecPath: string;
    openaiApiKey?: string | undefined;
}): Promise<import("./orchestrator.js").GenerationResult>;
//# sourceMappingURL=index.d.ts.map