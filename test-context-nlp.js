/**
 * Quick test of NLP generation with context
 */
import { ApiTestOrchestrator } from './src/agents/api-agent/orchestrator.js';
async function run() {
    const orchestrator = new ApiTestOrchestrator();
    // Test 1: Valid address verification
    console.log('\n' + '='.repeat(60));
    console.log('TEST 1: Valid address expecting VERIFIED');
    console.log('='.repeat(60));
    const result1 = await orchestrator.generateFromNaturalLanguage({
        naturalLanguageInput: 'Test that a valid complete US address like Google headquarters returns VERIFIED response with validatedAddress populated',
        swaggerSpecPath: './swagger/teams/avs/avs-api.json',
        teamName: 'avs',
        useContext: true,
        targetEndpoints: ['/avs/v1.0/verifyAddress']
    });
    console.log('Result 1:', result1.success ? 'SUCCESS' : 'FAILED');
    console.log('Scenarios:', result1.scenarios.length);
    result1.scenarios.forEach(s => console.log('  -', s.name, `[${s.type}]`, `Expected: ${s.expectedStatus}`));
    if (result1.generatedFiles.features.length > 0) {
        console.log('Generated:', result1.generatedFiles.features[0]);
    }
    // Test 2: Empty postal code correction
    console.log('\n' + '='.repeat(60));
    console.log('TEST 2: Empty postal code expecting CORRECTED');
    console.log('='.repeat(60));
    const result2 = await orchestrator.generateFromNaturalLanguage({
        naturalLanguageInput: 'Verify that an address with empty postal code field gets corrected and returns CORRECTED response code',
        swaggerSpecPath: './swagger/teams/avs/avs-api.json',
        teamName: 'avs',
        useContext: true,
        targetEndpoints: ['/avs/v1.0/verifyAddress']
    });
    console.log('Result 2:', result2.success ? 'SUCCESS' : 'FAILED');
    console.log('Scenarios:', result2.scenarios.length);
    result2.scenarios.forEach(s => console.log('  -', s.name, `[${s.type}]`, `Expected: ${s.expectedStatus}`));
    if (result2.generatedFiles.features.length > 0) {
        console.log('Generated:', result2.generatedFiles.features[0]);
    }
    // Test 3: Fake address NOT_VERIFIED
    console.log('\n' + '='.repeat(60));
    console.log('TEST 3: Fake address expecting NOT_VERIFIED');
    console.log('='.repeat(60));
    const result3 = await orchestrator.generateFromNaturalLanguage({
        naturalLanguageInput: 'Test that a completely fake non-existent address returns NOT_VERIFIED with requestAddressSanitized populated',
        swaggerSpecPath: './swagger/teams/avs/avs-api.json',
        teamName: 'avs',
        useContext: true,
        targetEndpoints: ['/avs/v1.0/verifyAddress']
    });
    console.log('Result 3:', result3.success ? 'SUCCESS' : 'FAILED');
    console.log('Scenarios:', result3.scenarios.length);
    result3.scenarios.forEach(s => console.log('  -', s.name, `[${s.type}]`, `Expected: ${s.expectedStatus}`));
    if (result3.generatedFiles.features.length > 0) {
        console.log('Generated:', result3.generatedFiles.features[0]);
    }
    console.log('\n' + '='.repeat(60));
    console.log('SUMMARY');
    console.log('='.repeat(60));
    console.log('Test 1:', result1.success ? '✅' : '❌');
    console.log('Test 2:', result2.success ? '✅' : '❌');
    console.log('Test 3:', result3.success ? '✅' : '❌');
}
run().catch(console.error);
//# sourceMappingURL=test-context-nlp.js.map