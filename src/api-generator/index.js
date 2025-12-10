/**
 * Public API for API Test Generator
 */
export { ApiTestOrchestrator } from './orchestrator.js';
export { SwaggerSpecParser } from './swagger/parser.js';
export { OpenAIClient } from './nlp/openaiClient.js';
export { loadConfig } from './config.js';
// Convenience function for quick test generation
export async function generateApiTests(request) {
    const { ApiTestOrchestrator } = await import('./orchestrator.js');
    const orchestrator = new ApiTestOrchestrator(request.openaiApiKey);
    return orchestrator.generateFromNaturalLanguage({
        naturalLanguageInput: request.naturalLanguageInput,
        swaggerSpecPath: request.swaggerSpecPath
    });
}
//# sourceMappingURL=index.js.map