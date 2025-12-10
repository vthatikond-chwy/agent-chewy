/**
 * Script to build and save context for API teams
 * Usage: npx ts-node scripts/build-context.ts <team-name>
 * Example: npx ts-node scripts/build-context.ts avs
 */

import { createAVSContextBuilder, ContextBuilder } from '../src/agents/api-agent/context/context-builder.js';

const teamBuilders: Record<string, () => ContextBuilder> = {
  'avs': createAVSContextBuilder
};

async function main() {
  const teamName = process.argv[2];

  if (!teamName) {
    console.log('Usage: npx ts-node scripts/build-context.ts <team-name>');
    console.log('Available teams:', Object.keys(teamBuilders).join(', '));
    process.exit(1);
  }

  const builderFactory = teamBuilders[teamName.toLowerCase()];

  if (!builderFactory) {
    console.error(`Unknown team: ${teamName}`);
    console.log('Available teams:', Object.keys(teamBuilders).join(', '));
    process.exit(1);
  }

  console.log(`🔨 Building context for ${teamName}...`);

  const builder = builderFactory();
  const contextPath = await builder.save();

  console.log(`✅ Context saved to: ${contextPath}`);
  
  const context = builder.build();
  console.log('\n📊 Context Summary:');
  console.log(`   Service: ${context.domain.serviceName}`);
  console.log(`   Business Rules: ${context.domain.businessRules.length}`);
  console.log(`   Endpoints: ${context.endpoints.length}`);
  console.log(`   Edge Cases: ${context.domain.edgeCases.length}`);
  console.log(`   Generation Hints: ${context.generationHints.length}`);
  console.log(`   Valid Test Data: ${context.globalTestData.validAddresses.length}`);
  console.log(`   Invalid Test Data: ${context.globalTestData.invalidAddresses.length}`);
}

main().catch(console.error);

