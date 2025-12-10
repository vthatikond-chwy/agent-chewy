/**
 * Examples of using the API Test Generator
 */
import { ApiTestOrchestrator, generateApiTests } from '../src/api-generator/index.js';
// Example 1: Simple test generation
export async function example1_SimpleGeneration() {
    console.log('Example 1: Simple Test Generation\n');
    const result = await generateApiTests({
        naturalLanguageInput: 'Test that users can create a new account with valid email and password',
        swaggerSpecPath: './examples/petstore-swagger.json'
    });
    console.log(`Generated ${result.scenarios.length} test scenarios`);
    console.log(`Created ${result.generatedFiles.features.length} feature files`);
}
// Example 2: Generate tests for specific endpoint
export async function example2_SpecificEndpoint() {
    console.log('\nExample 2: Generate Tests for Specific Endpoint\n');
    const orchestrator = new ApiTestOrchestrator();
    const result = await orchestrator.generateForEndpoint('./examples/petstore-swagger.json', '/pet/{petId}', 'GET');
    console.log('Generated tests for GET /pet/{petId}');
}
// Example 3: Generate tests by tag
export async function example3_ByTag() {
    console.log('\nExample 3: Generate Tests by Tag\n');
    const orchestrator = new ApiTestOrchestrator();
    const result = await orchestrator.generateForTag('./examples/petstore-swagger.json', 'store');
    console.log(`Generated ${result.scenarios.length} tests for 'store' tag`);
}
// Example 4: Custom options
export async function example4_CustomOptions() {
    console.log('\nExample 4: Custom Generation Options\n');
    const orchestrator = new ApiTestOrchestrator();
    const result = await orchestrator.generateFromNaturalLanguage({
        naturalLanguageInput: 'Test user authentication and authorization',
        swaggerSpecPath: './examples/api-swagger.yaml',
        options: {
            generatePositive: true,
            generateNegative: true,
            generateBoundary: false, // Skip boundary tests
            generateSecurity: true // Focus on security
        }
    });
    console.log('Generated focused security tests');
}
// Example 5: Multiple endpoints
export async function example5_MultipleEndpoints() {
    console.log('\nExample 5: Generate Tests for Multiple Endpoints\n');
    const orchestrator = new ApiTestOrchestrator();
    const result = await orchestrator.generateFromNaturalLanguage({
        naturalLanguageInput: 'Test complete user registration and login flow',
        swaggerSpecPath: './examples/api-swagger.yaml',
        targetEndpoints: ['/auth/register', '/auth/login', '/auth/verify']
    });
    console.log('Generated end-to-end authentication flow tests');
}
// Run examples
export async function runExamples() {
    try {
        await example1_SimpleGeneration();
        await example2_SpecificEndpoint();
        await example3_ByTag();
        await example4_CustomOptions();
        await example5_MultipleEndpoints();
    }
    catch (error) {
        console.error('Error running examples:', error);
    }
}
// Uncomment to run
// runExamples();
//# sourceMappingURL=api-generation-examples.js.map