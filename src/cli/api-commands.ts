/**
 * CLI commands for API test generation
 */

import { Command } from 'commander';
import { ApiTestOrchestrator } from '../api-generator/orchestrator.js';

export function registerApiCommands(program: Command): void {
  const apiCommand = program
    .command('api')
    .description('Generate API tests from Swagger/OpenAPI specifications');

  // Generate from natural language
  apiCommand
    .command('generate')
    .description('Generate API tests from natural language description')
    .requiredOption('-s, --swagger <path>', 'Path to Swagger/OpenAPI specification file')
    .requiredOption('-i, --input <text>', 'Natural language test description')
    .option('-k, --api-key <key>', 'OpenAI API key (or use OPENAI_API_KEY env var)')
    .option('-e, --endpoints <paths...>', 'Filter by specific endpoint paths')
    .option('-t, --tags <tags...>', 'Filter by Swagger tags')
    .option('--no-positive', 'Skip positive test cases')
    .option('--no-negative', 'Skip negative test cases')
    .option('--no-boundary', 'Skip boundary test cases')
    .option('--no-security', 'Skip security test cases')
    .action(async (options: {
      swagger: string;
      input: string;
      apiKey?: string;
      endpoints?: string[];
      tags?: string[];
      positive?: boolean;
      negative?: boolean;
      boundary?: boolean;
      security?: boolean;
    }) => {
      try {
        console.log('\n🚀 Agent-Chewy API Test Generator\n');

        const apiKey = options.apiKey || process.env.OPENAI_API_KEY;
        if (!apiKey) {
          throw new Error('OpenAI API key is required. Set OPENAI_API_KEY env var or use --api-key option');
        }

        const orchestrator = new ApiTestOrchestrator(apiKey);

        const request: {
          naturalLanguageInput: string;
          swaggerSpecPath: string;
          targetEndpoints?: string[];
          targetTags?: string[];
          options?: {
            generatePositive?: boolean;
            generateNegative?: boolean;
            generateBoundary?: boolean;
            generateSecurity?: boolean;
          };
        } = {
          naturalLanguageInput: options.input,
          swaggerSpecPath: options.swagger
        };

        if (options.endpoints && options.endpoints.length > 0) {
          request.targetEndpoints = options.endpoints;
        }

        if (options.tags && options.tags.length > 0) {
          request.targetTags = options.tags;
        }

        request.options = {
          generatePositive: options.positive !== false,
          generateNegative: options.negative !== false,
          generateBoundary: options.boundary !== false,
          generateSecurity: options.security !== false
        };

        const result = await orchestrator.generateFromNaturalLanguage(request);

        if (result.success) {
          console.log('\n✨ Success! Generated files:');
          console.log('\n📄 Feature Files:');
          result.generatedFiles.features.forEach(f => console.log(`   ${f}`));
          console.log('\n📝 Step Definitions:');
          result.generatedFiles.stepDefinitions.forEach(f => console.log(`   ${f}`));
          
          if (result.errors && result.errors.length > 0) {
            console.log('\n⚠️  Warnings:');
            result.errors.forEach(e => console.log(`   ${e}`));
          }
        } else {
          console.error('\n❌ Test generation failed');
          if (result.errors) {
            result.errors.forEach(e => console.error(`   ${e}`));
          }
          process.exit(1);
        }
      } catch (error: any) {
        console.error('\n❌ Error:', error.message);
        process.exit(1);
      }
    });

  // Generate for specific endpoint
  apiCommand
    .command('endpoint')
    .description('Generate tests for a specific endpoint')
    .requiredOption('-s, --swagger <path>', 'Path to Swagger/OpenAPI specification file')
    .requiredOption('-p, --path <path>', 'Endpoint path (e.g., /api/users)')
    .requiredOption('-m, --method <method>', 'HTTP method (GET, POST, PUT, DELETE, etc.)')
    .option('-k, --api-key <key>', 'OpenAI API key')
    .action(async (options: {
      swagger: string;
      path: string;
      method: string;
      apiKey?: string;
    }) => {
      try {
        console.log('\n🚀 Generating tests for endpoint...\n');

        const apiKey = options.apiKey || process.env.OPENAI_API_KEY;
        if (!apiKey) {
          throw new Error('OpenAI API key is required. Set OPENAI_API_KEY env var or use --api-key option');
        }

        const orchestrator = new ApiTestOrchestrator(apiKey);

        const result = await orchestrator.generateForEndpoint(
          options.swagger,
          options.path,
          options.method
        );

        if (result.success) {
          console.log('\n✨ Success!');
          console.log(`Generated ${result.generatedFiles.features.length} test files`);
        } else {
          console.error('\n❌ Generation failed');
          if (result.errors) {
            result.errors.forEach(e => console.error(`   ${e}`));
          }
          process.exit(1);
        }
      } catch (error: any) {
        console.error('\n❌ Error:', error.message);
        process.exit(1);
      }
    });

  // Generate for tag
  apiCommand
    .command('tag')
    .description('Generate tests for all endpoints with a specific tag')
    .requiredOption('-s, --swagger <path>', 'Path to Swagger/OpenAPI specification file')
    .requiredOption('-t, --tag <tag>', 'Swagger tag name')
    .option('-k, --api-key <key>', 'OpenAI API key')
    .action(async (options: {
      swagger: string;
      tag: string;
      apiKey?: string;
    }) => {
      try {
        console.log('\n🚀 Generating tests for tag...\n');

        const apiKey = options.apiKey || process.env.OPENAI_API_KEY;
        if (!apiKey) {
          throw new Error('OpenAI API key is required. Set OPENAI_API_KEY env var or use --api-key option');
        }

        const orchestrator = new ApiTestOrchestrator(apiKey);

        const result = await orchestrator.generateForTag(
          options.swagger,
          options.tag
        );

        if (result.success) {
          console.log('\n✨ Success!');
          console.log(`Generated ${result.generatedFiles.features.length} test files`);
        } else {
          console.error('\n❌ Generation failed');
          if (result.errors) {
            result.errors.forEach(e => console.error(`   ${e}`));
          }
          process.exit(1);
        }
      } catch (error: any) {
        console.error('\n❌ Error:', error.message);
        process.exit(1);
      }
    });

  // List endpoints
  apiCommand
    .command('list')
    .description('List all endpoints in Swagger specification')
    .requiredOption('-s, --swagger <path>', 'Path to Swagger/OpenAPI specification file')
    .option('-t, --tag <tag>', 'Filter by tag')
    .option('-j, --json', 'Output as JSON')
    .action(async (options: {
      swagger: string;
      tag?: string;
      json?: boolean;
    }) => {
      try {
        const orchestrator = new ApiTestOrchestrator();
        const parser = orchestrator.getSwaggerParser();
        
        await parser.loadSpec(options.swagger);

        const endpoints = options.tag
          ? parser.getEndpointsByTag(options.tag)
          : parser.getAllEndpoints();

        if (options.json) {
          console.log(JSON.stringify(endpoints, null, 2));
        } else {
          const apiInfo = parser.getApiInfo();
          console.log(`\n📖 ${apiInfo.title} (v${apiInfo.version})`);
          console.log(`Found ${endpoints.length} endpoints:\n`);

          endpoints.forEach(ep => {
            console.log(`${ep.method.padEnd(7)} ${ep.path}`);
            if (ep.summary) {
              console.log(`        ${ep.summary}`);
            }
            if (ep.tags && ep.tags.length > 0) {
              console.log(`        Tags: ${ep.tags.join(', ')}`);
            }
            console.log('');
          });
        }
      } catch (error: any) {
        console.error('\n❌ Error:', error.message);
        process.exit(1);
      }
    });
}

