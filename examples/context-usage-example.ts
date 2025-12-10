/**
 * Example: Using the Context Library for Enhanced Test Generation
 * 
 * This example shows how the context library improves test generation
 * by providing domain-specific knowledge to the LLM.
 */

import { ApiTestOrchestrator } from '../src/agents/api-agent/orchestrator.js';
import { ContextLoader, createAVSContextBuilder } from '../src/agents/api-agent/context/index.js';

async function exampleWithContext() {
  console.log('='.repeat(60));
  console.log('Example: Using Context Library for AVS Test Generation');
  console.log('='.repeat(60));
  console.log();

  const orchestrator = new ApiTestOrchestrator();

  // Generate tests with context - the orchestrator will automatically
  // load the AVS context and provide it to the LLM for better generation
  const result = await orchestrator.generateFromNaturalLanguage({
    naturalLanguageInput: 'Test address verification with empty postal code expecting CORRECTED response',
    swaggerSpecPath: './swagger/teams/avs/avs-api.json',
    teamName: 'avs', // This triggers context loading
    useContext: true,
    targetEndpoints: ['/avs/v1.0/verifyAddress']
  });

  console.log('\nGeneration Result:');
  console.log(`  Success: ${result.success}`);
  console.log(`  Scenarios: ${result.scenarios.length}`);
  console.log(`  Feature Files: ${result.generatedFiles.features.length}`);
}

async function exampleLoadContextDirectly() {
  console.log('\n' + '='.repeat(60));
  console.log('Example: Loading and Inspecting Context Directly');
  console.log('='.repeat(60));
  console.log();

  const contextLoader = new ContextLoader();
  const result = await contextLoader.loadTeamContext('avs');

  if (result.success && result.context) {
    const ctx = result.context;
    
    console.log(`Service: ${ctx.domain.serviceName}`);
    console.log(`Description: ${ctx.domain.serviceDescription}`);
    console.log();
    
    console.log('Business Rules:');
    ctx.domain.businessRules.forEach(rule => {
      console.log(`  - ${rule.name}: ${rule.description}`);
    });
    console.log();

    console.log('Response Code Behaviors (verifyAddress):');
    const verifyEndpoint = ctx.endpoints.find(ep => ep.path === '/avs/v1.0/verifyAddress');
    verifyEndpoint?.responseCodeBehaviors.forEach(b => {
      console.log(`  - ${b.code}: ${b.description}`);
      console.log(`    validatedAddress: ${b.validatedAddressState}`);
      console.log(`    requestAddressSanitized: ${b.sanitizedAddressState}`);
    });
    console.log();

    console.log('Test Patterns:');
    verifyEndpoint?.testPatterns.forEach(p => {
      console.log(`  - ${p.name}: ${p.expectedResponseCode}`);
    });
    console.log();

    console.log('Generation Hints:');
    ctx.generationHints.slice(0, 3).forEach(h => {
      console.log(`  [${h.category}] ${h.hint}`);
    });
  }
}

async function exampleBuildCustomContext() {
  console.log('\n' + '='.repeat(60));
  console.log('Example: Building Custom Context Programmatically');
  console.log('='.repeat(60));
  console.log();

  // Use the AVS context builder
  const builder = createAVSContextBuilder();
  
  // Add more hints or patterns if needed
  builder.addGenerationHint({
    category: 'custom',
    hint: 'For Chewy-specific addresses, use known warehouse addresses',
    example: '7700 W Boston Dr, Dania Beach, FL 33004'
  });

  // Build and display context summary
  const context = builder.build();
  
  console.log('Custom Context Summary:');
  console.log(`  Service: ${context.domain.serviceName}`);
  console.log(`  Endpoints: ${context.endpoints.length}`);
  console.log(`  Business Rules: ${context.domain.businessRules.length}`);
  console.log(`  Edge Cases: ${context.domain.edgeCases.length}`);
  console.log(`  Valid Test Data: ${context.globalTestData.validAddresses.length}`);
  console.log(`  Generation Hints: ${context.generationHints.length}`);

  // Save the context for later use
  // const savedPath = await builder.save();
  // console.log(`\nContext saved to: ${savedPath}`);
}

async function exampleFormatContextForLLM() {
  console.log('\n' + '='.repeat(60));
  console.log('Example: Format Context for LLM Consumption');
  console.log('='.repeat(60));
  console.log();

  const contextLoader = new ContextLoader();
  const result = await contextLoader.loadTeamContext('avs');

  if (result.success && result.context) {
    const formattedContext = contextLoader.formatContextForLLM(result.context);
    
    console.log('Formatted Context (first 1500 chars):');
    console.log('-'.repeat(40));
    console.log(formattedContext.substring(0, 1500));
    console.log('...');
  }
}

// Main execution
async function main() {
  try {
    // Run examples (comment out ones you don't need)
    await exampleLoadContextDirectly();
    await exampleBuildCustomContext();
    await exampleFormatContextForLLM();
    
    // Uncomment to run with actual OpenAI (requires API key)
    // await exampleWithContext();
    
  } catch (error) {
    console.error('Error:', error);
  }
}

main();

