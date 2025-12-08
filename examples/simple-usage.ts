/**
 * Simplest possible usage example
 */

import { generateApiTests } from '../src/api-generator/index.js';

async function main() {
  // Just provide natural language and Swagger spec!
  const result = await generateApiTests({
    naturalLanguageInput: `
      Test that:
      1. Users can register with valid email and password
      2. Users cannot register with invalid email format
      3. Users cannot register with weak passwords
      4. Users get proper error messages for validation failures
    `,
    swaggerSpecPath: './swagger.json'
  });

  if (result.success) {
    console.log('✅ Tests generated successfully!');
    console.log(`   Features: ${result.generatedFiles.features.length}`);
    console.log(`   Step Definitions: ${result.generatedFiles.stepDefinitions.length}`);
  } else {
    console.log('❌ Generation failed');
    if (result.errors) {
      console.log(result.errors);
    }
  }
}

main();

