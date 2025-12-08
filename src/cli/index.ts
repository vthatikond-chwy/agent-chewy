#!/usr/bin/env node

import { Command } from 'commander';
import SwaggerParser from '@apidevtools/swagger-parser';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const program = new Command();

program
  .name('agent-chewy')
  .description('AI-powered test automation framework')
  .version('1.0.0');

// API commands
const apiCommand = program
  .command('api')
  .description('API test generation commands');

// List endpoints
apiCommand
  .command('list')
  .description('List all endpoints in Swagger specification')
  .requiredOption('-s, --swagger <path>', 'Path to Swagger/OpenAPI file')
  .option('-t, --tag <tag>', 'Filter by tag')
  .option('-j, --json', 'Output as JSON')
  .action(async (options) => {
    try {
      console.log('📖 Loading Swagger specification...\n');
      
      const spec = await SwaggerParser.dereference(options.swagger) as any;
      
      const apiInfo = {
        title: spec.info?.title || 'Unknown API',
        version: spec.info?.version || '1.0.0',
        description: spec.info?.description
      };
      
      // Get base URL
      let baseUrl = '';
      if (spec.servers && spec.servers.length > 0) {
        baseUrl = spec.servers[0].url;
      } else if (spec.host) {
        const schemes = spec.schemes || ['https'];
        const basePath = spec.basePath || '';
        baseUrl = `${schemes[0]}://${spec.host}${basePath}`;
      }
      
      console.log(`✅ API: ${apiInfo.title} (v${apiInfo.version})`);
      if (spec.info?.description) {
        console.log(`📝 Description: ${spec.info.description}`);
      }
      if (baseUrl) {
        console.log(`🔗 Base URL: ${baseUrl}`);
      }
      console.log();
      
      const paths = spec.paths || {};
      const endpoints = [];
      
      for (const [path, pathItem] of Object.entries(paths)) {
        for (const [method, operation] of Object.entries(pathItem as any)) {
          if (['get', 'post', 'put', 'delete', 'patch', 'options', 'head'].includes(method)) {
            const op = operation as any;
            const endpoint = {
              method: method.toUpperCase(),
              path,
              operationId: op.operationId,
              summary: op.summary,
              description: op.description,
              tags: op.tags || []
            };
            
            // Filter by tag if specified
            if (!options.tag || endpoint.tags.includes(options.tag)) {
              endpoints.push(endpoint);
            }
          }
        }
      }
      
      if (options.json) {
        console.log(JSON.stringify({ apiInfo, baseUrl, endpoints }, null, 2));
      } else {
        console.log(`Found ${endpoints.length} endpoints:\n`);
        
        endpoints.forEach(ep => {
          console.log(`${ep.method.padEnd(7)} ${ep.path}`);
          if (ep.summary) {
            console.log(`        ${ep.summary}`);
          }
          if (ep.description) {
            console.log(`        ${ep.description}`);
          }
          if (ep.tags && ep.tags.length > 0) {
            console.log(`        Tags: ${ep.tags.join(', ')}`);
          }
          console.log();
        });
      }
      
    } catch (error: any) {
      console.error('❌ Error:', error.message);
      console.error(error.stack);
      process.exit(1);
    }
  });

// Generate command
apiCommand
  .command('generate')
  .description('Generate API tests from natural language')
  .requiredOption('-s, --swagger <path>', 'Path to Swagger/OpenAPI file')
  .requiredOption('-i, --input <text>', 'Natural language test description')
  .option('-k, --api-key <key>', 'OpenAI API key (or use OPENAI_API_KEY env var)')
  .option('-e, --endpoints <paths...>', 'Filter by specific endpoint paths')
  .option('-t, --tags <tags...>', 'Filter by Swagger tags')
  .action(async (options: {
    swagger: string;
    input: string;
    apiKey?: string;
    endpoints?: string[];
    tags?: string[];
  }) => {
    try {
      console.log('\n🚀 API Test Generator\n');
      
      // Dynamic import to avoid loading issues
      const { SimpleTestGenerator } = await import('../agents/api-agent/index.js');
      
      const generator = new SimpleTestGenerator(options.apiKey);
      
      console.log('📖 Loading Swagger specification...');
      const spec = await SwaggerParser.dereference(options.swagger) as any;
      console.log(`   API: ${spec.info.title} (v${spec.info.version})\n`);
      
      console.log('🤖 Generating test scenarios with OpenAI...');
      const scenarios = await generator.generateTestScenarios(
        options.input,
        spec,
        options.endpoints
      );
      console.log(`✅ Generated ${scenarios.length} test scenarios\n`);
      
      const generatedFiles = {
        features: [] as string[],
        steps: [] as string[]
      };
      
      console.log('📝 Generating Cucumber features and step definitions...\n');
      
      // Determine service from spec
      const apiTitle = spec.info?.title || '';
      const service = apiTitle.includes('AVS') ? 'avs' : undefined;

      for (const scenario of scenarios) {
        // Determine category from endpoint
        const category = scenario.endpoint.includes('verify') ? 'verification' : 
                        scenario.endpoint.includes('suggest') ? 'suggestions' : 
                        scenario.endpoint.includes('bulk') ? 'bulk' : undefined;
        try {
          console.log(`   🔨 ${scenario.name}`);
          
          // Generate Cucumber feature
          const cucumberFeature = await generator.generateCucumberFeature(scenario, spec);
          const featurePath = generator.writeFeatureFile(scenario, cucumberFeature, service, category);
          generatedFiles.features.push(featurePath);
          
          // Generate step definitions
          const stepDefs = await generator.generateStepDefinitions(cucumberFeature, scenario, spec);
          const stepsPath = generator.writeStepDefinitionFile(scenario, stepDefs, service);
          generatedFiles.steps.push(stepsPath);
          
          console.log(`      ✅ Feature: ${path.basename(featurePath)}`);
          console.log(`      ✅ Steps: ${path.basename(stepsPath)}`);
          
        } catch (error: any) {
          console.error(`      ❌ Error: ${error.message}`);
        }
      }
      
      console.log('\n✨ Test generation complete!\n');
      console.log('📄 Generated Feature Files:');
      generatedFiles.features.forEach(f => console.log(`   ${f}`));
      
      console.log('\n📝 Generated Step Definitions:');
      generatedFiles.steps.forEach(f => console.log(`   ${f}`));
      
      console.log('\n🚀 To run the tests:');
      console.log('   npm run test:api\n');
      
    } catch (error: any) {
      console.error('\n❌ Error:', error.message);
      if (error.message.includes('API key')) {
        console.error('\n💡 Make sure your OPENAI_API_KEY is set in .env file');
      }
      process.exit(1);
    }
  });

// Endpoint command
apiCommand
  .command('endpoint')
  .description('Generate tests for a specific endpoint')
  .requiredOption('-s, --swagger <path>', 'Path to Swagger/OpenAPI file')
  .requiredOption('-p, --path <path>', 'Endpoint path (e.g., /api/users)')
  .requiredOption('-m, --method <method>', 'HTTP method (GET, POST, etc.)')
  .option('-k, --api-key <key>', 'OpenAI API key (or use OPENAI_API_KEY env var)')
  .action(async (options: {
    swagger: string;
    path: string;
    method: string;
    apiKey?: string;
  }) => {
    try {
      console.log('\n🎯 Endpoint Test Generator\n');
      
      const apiKey = options.apiKey || process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error('OpenAI API key is required. Set OPENAI_API_KEY env var or use --api-key option');
      }

      const { SimpleTestGenerator } = await import('../agents/api-agent/index.js');
      const generator = new SimpleTestGenerator(apiKey);

      const naturalLanguageInput = `Generate comprehensive test scenarios for ${options.method} ${options.path}. Include positive tests (valid requests), negative tests (invalid inputs, error conditions), boundary tests (edge cases), and security tests if applicable.`;

      console.log('📖 Loading Swagger specification...');
      const spec = await SwaggerParser.dereference(options.swagger) as any;

      console.log('🤖 Generating test scenarios...');
      const scenarios = await generator.generateTestScenarios(
        naturalLanguageInput,
        spec,
        [options.path]
      );

      console.log(`✅ Generated ${scenarios.length} test scenarios\n`);

      const featureFiles: string[] = [];
      const stepFiles: string[] = [];

      console.log('📝 Generating Cucumber features and step definitions...\n');
      
      for (const scenario of scenarios) {
        try {
          console.log(`   Processing: ${scenario.name}...`);
          
          const featureContent = await generator.generateCucumberFeature(scenario, spec);
          const featurePath = generator.writeFeatureFile(scenario, featureContent);
          featureFiles.push(featurePath);
          
          const stepContent = await generator.generateStepDefinitions(featureContent, scenario, spec);
          const stepPath = generator.writeStepDefinitionFile(scenario, stepContent);
          stepFiles.push(stepPath);
          
          console.log(`   ✅ ${scenario.name}`);
        } catch (error: any) {
          console.error(`   ❌ Error generating ${scenario.name}: ${error.message}`);
        }
      }

      console.log('\n✨ Test generation complete!');
      console.log(`\n📄 Generated ${featureFiles.length} feature files and ${stepFiles.length} step definition files\n`);
      
    } catch (error: any) {
      console.error('\n❌ Error:', error.message);
      process.exit(1);
    }
  });

// Tag command
apiCommand
  .command('tag')
  .description('Generate tests for all endpoints with a specific tag')
  .requiredOption('-s, --swagger <path>', 'Path to Swagger/OpenAPI file')
  .requiredOption('-t, --tag <tag>', 'Swagger tag name')
  .option('-k, --api-key <key>', 'OpenAI API key (or use OPENAI_API_KEY env var)')
  .action(async (options: {
    swagger: string;
    tag: string;
    apiKey?: string;
  }) => {
    try {
      console.log('\n🏷️  Tag-based Test Generator\n');
      
      const apiKey = options.apiKey || process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error('OpenAI API key is required. Set OPENAI_API_KEY env var or use --api-key option');
      }

      const { SimpleTestGenerator } = await import('../agents/api-agent/index.js');
      const generator = new SimpleTestGenerator(apiKey);

      console.log('📖 Loading Swagger specification...');
      const spec = await SwaggerParser.dereference(options.swagger) as any;
      
      // Find all endpoints with this tag
      const paths = spec.paths || {};
      const taggedEndpoints: string[] = [];
      
      for (const [path, pathItem] of Object.entries(paths)) {
        for (const [method, operation] of Object.entries(pathItem as any)) {
          const op = operation as any;
          if (op.tags && op.tags.includes(options.tag)) {
            taggedEndpoints.push(path);
            break; // Only add path once
          }
        }
      }

      if (taggedEndpoints.length === 0) {
        throw new Error(`No endpoints found with tag: ${options.tag}`);
      }

      console.log(`✅ Found ${taggedEndpoints.length} endpoints with tag "${options.tag}"\n`);

      const naturalLanguageInput = `Generate comprehensive test scenarios for all endpoints with tag "${options.tag}". Include positive, negative, boundary, and security test cases.`;

      console.log('🤖 Generating test scenarios...');
      const scenarios = await generator.generateTestScenarios(
        naturalLanguageInput,
        spec,
        taggedEndpoints
      );

      console.log(`✅ Generated ${scenarios.length} test scenarios\n`);

      const featureFiles: string[] = [];
      const stepFiles: string[] = [];

      console.log('📝 Generating Cucumber features and step definitions...\n');
      
      for (const scenario of scenarios) {
        try {
          console.log(`   Processing: ${scenario.name}...`);
          
          const featureContent = await generator.generateCucumberFeature(scenario, spec);
          const featurePath = generator.writeFeatureFile(scenario, featureContent);
          featureFiles.push(featurePath);
          
          const stepContent = await generator.generateStepDefinitions(featureContent, scenario, spec);
          const stepPath = generator.writeStepDefinitionFile(scenario, stepContent);
          stepFiles.push(stepPath);
          
          console.log(`   ✅ ${scenario.name}`);
        } catch (error: any) {
          console.error(`   ❌ Error generating ${scenario.name}: ${error.message}`);
        }
      }

      console.log('\n✨ Test generation complete!');
      console.log(`\n📄 Generated ${featureFiles.length} feature files and ${stepFiles.length} step definition files\n`);
      
    } catch (error: any) {
      console.error('\n❌ Error:', error.message);
      process.exit(1);
    }
  });

// Self-heal command
apiCommand
  .command('heal')
  .description('Self-heal: automatically detect and fix missing step definitions')
  .option('-k, --api-key <key>', 'OpenAI API key (or use OPENAI_API_KEY env var)')
  .action(async (options: { apiKey?: string }) => {
    try {
      console.log('\n🔧 Self-Healing API Tests\n');
      
      const { SelfHealing } = await import('../agents/api-agent/index.js');
      const healer = new SelfHealing();
      
      await healer.heal();
      
      console.log('\n✅ Self-healing complete! Run tests again to verify fixes.\n');
      
    } catch (error: any) {
      console.error('\n❌ Error:', error.message);
      process.exit(1);
    }
  });

program.parse();
