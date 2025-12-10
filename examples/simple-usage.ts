/**
 * Example: Simple API Test Generation
 * 
 * Shows how to generate tests using the context-aware generator
 */

import { E2EApiTestFlow } from '../src/agents/api-agent/e2e-flow.js';

async function main() {
  const flow = new E2EApiTestFlow();

  // Generate and run tests from natural language
  const result = await flow.execute({
    teamName: 'avs',
    nlpInput: 'Verify a valid complete address returns VERIFIED response',
    runTests: true
  });

  if (result.success) {
    console.log('✅ Tests completed successfully!');
    console.log(`   Features: ${result.generatedFiles.features.length}`);
    console.log(`   Step Definitions: ${result.generatedFiles.stepDefinitions.length}`);
    if (result.testResults) {
      console.log(`   Passed: ${result.testResults.passed}`);
      console.log(`   Failed: ${result.testResults.failed}`);
    }
  } else {
    console.log('❌ Tests failed:', result.error);
  }
}

main();
