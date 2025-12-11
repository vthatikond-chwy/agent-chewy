#!/usr/bin/env node

import { Command } from 'commander';
import SwaggerParser from '@apidevtools/swagger-parser';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { extractProjectName } from '../agents/api-agent/team-config.js';

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
  .option('-s, --swagger <path>', 'Path to Swagger/OpenAPI file (defaults to AVS if not specified)')
  .option('-i, --input <text>', 'Natural language test description')
  .option('--interactive', 'Interactive mode - prompts for input')
  .option('-k, --api-key <key>', 'OpenAI API key (or use OPENAI_API_KEY env var)')
  .option('-e, --endpoints <paths...>', 'Filter by specific endpoint paths')
  .option('-t, --tags <tags...>', 'Filter by Swagger tags')
  .option('--clean', 'Clean up old generated files before generating new ones')
  .action(async (options: {
    swagger?: string;
    input?: string;
    interactive?: boolean;
    apiKey?: string;
    endpoints?: string[];
    tags?: string[];
    clean?: boolean;
  }) => {
    try {
      console.log('\n🚀 API Test Generator\n');
      
      // Default to AVS if swagger not specified
      const swaggerPath = options.swagger || 'swagger/teams/avs/avs-api.json';
      
      // Interactive mode - prompt for input
      let input = options.input;
      if (options.interactive || !input) {
        const readline = await import('readline');
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout
        });
        
        const question = (query: string): Promise<string> => {
          return new Promise((resolve) => {
            rl.question(query, resolve);
          });
        };
        
        if (!input) {
          console.log('💬 Interactive Mode\n');
          input = await question('Enter your test description (e.g., "Generate 2 test scenarios for verifyAddress and suggestAddresses"): ');
        }
        
        rl.close();
      }
      
      if (!input) {
        throw new Error('Test description is required. Use -i/--input or --interactive');
      }
      
      // Dynamic import to avoid loading issues
      const { SimpleTestGenerator } = await import('../agents/api-agent/index.js');
      
      const generator = new SimpleTestGenerator(options.apiKey);
      
      console.log('📖 Loading Swagger specification...');
      const spec = await SwaggerParser.dereference(swaggerPath) as any;
      console.log(`   API: ${spec.info.title} (v${spec.info.version})\n`);

      // Clean up old files before generating new ones (only if --clean flag is specified)
      if (options.clean) {
        const projectName = swaggerPath ? generator.extractProjectName(swaggerPath) : null;
        if (projectName) {
          console.log('🧹 Cleaning up old generated files...');
          generator.cleanupOldFiles(projectName);
        }
      }
      
      console.log('🤖 Generating test scenarios with OpenAI...');
      const scenarios = await generator.generateTestScenarios(
        input,
        spec,
        options.endpoints,
        swaggerPath
      );
      console.log(`✅ Generated ${scenarios.length} test scenarios\n`);
      
      const generatedFiles = {
        features: [] as string[],
        steps: [] as string[]
      };
      
      console.log('📝 Generating Cucumber features and step definitions...\n');
      
      // Extract team name from swagger spec path - use this for any team
      const teamName = extractProjectName(swaggerPath);
      const service = teamName; // Always use team name from path, no fallback needed

      for (const scenario of scenarios) {
        // Determine category from endpoint
        const category = scenario.endpoint.includes('verify') ? 'verification' : 
                        scenario.endpoint.includes('suggest') ? 'suggestions' : 
                        scenario.endpoint.includes('bulk') ? 'bulk' : undefined;
        try {
          console.log(`   🔨 ${scenario.name}`);
          
          // Generate Cucumber feature
          const cucumberFeature = await generator.generateCucumberFeature(scenario, spec, swaggerPath || undefined);
          const featurePath = generator.writeFeatureFile(scenario, cucumberFeature, service, category);
          generatedFiles.features.push(featurePath);
          
          // Generate step definitions
          const stepDefs = await generator.generateStepDefinitions(cucumberFeature, scenario, spec, swaggerPath || undefined);
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
  .option('--clean', 'Clean up old generated files before generating new ones')
  .action(async (options: {
    swagger: string;
    path: string;
    method: string;
    apiKey?: string;
    clean?: boolean;
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

      // Clean up old files before generating new ones (only if --clean flag is specified)
      if (options.clean) {
        const projectName = options.swagger ? generator.extractProjectName(options.swagger) : null;
        if (projectName) {
          console.log('🧹 Cleaning up old generated files...');
          generator.cleanupOldFiles(projectName);
        }
      }
      
      console.log('🤖 Generating test scenarios...');
      const scenarios = await generator.generateTestScenarios(
        naturalLanguageInput,
        spec,
        [options.path],
        options.swagger
      );

      console.log(`✅ Generated ${scenarios.length} test scenarios\n`);

      // Extract team name from swagger spec path
      const teamName = extractProjectName(options.swagger);
      const apiTitle = spec.info?.title || '';
      const service = teamName; // Always use team name from path for any team

      const featureFiles: string[] = [];
      const stepFiles: string[] = [];

      console.log('📝 Generating Cucumber features and step definitions...\n');
      
      for (const scenario of scenarios) {
        try {
          console.log(`   Processing: ${scenario.name}...`);
          
          const featureContent = await generator.generateCucumberFeature(scenario, spec, options.swagger);
          const featurePath = generator.writeFeatureFile(scenario, featureContent, service);
          featureFiles.push(featurePath);
          
          const stepContent = await generator.generateStepDefinitions(featureContent, scenario, spec, options.swagger);
          const stepPath = generator.writeStepDefinitionFile(scenario, stepContent, service);
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

      // Clean up old files before generating new ones
      const projectName = options.swagger ? generator.extractProjectName(options.swagger) : null;
      if (projectName) {
        console.log('🧹 Cleaning up old generated files...');
        generator.cleanupOldFiles(projectName);
      }
      
      console.log('🤖 Generating test scenarios...');
      const scenarios = await generator.generateTestScenarios(
        naturalLanguageInput,
        spec,
        taggedEndpoints,
        options.swagger
      );

      console.log(`✅ Generated ${scenarios.length} test scenarios\n`);

      // Extract team name from swagger spec path
      const teamName = extractProjectName(options.swagger);
      const apiTitle = spec.info?.title || '';
      const service = teamName; // Always use team name from path for any team

      const featureFiles: string[] = [];
      const stepFiles: string[] = [];

      console.log('📝 Generating Cucumber features and step definitions...\n');
      
      for (const scenario of scenarios) {
        try {
          console.log(`   Processing: ${scenario.name}...`);
          
          const featureContent = await generator.generateCucumberFeature(scenario, spec, options.swagger);
          const featurePath = generator.writeFeatureFile(scenario, featureContent, service);
          featureFiles.push(featurePath);
          
          const stepContent = await generator.generateStepDefinitions(featureContent, scenario, spec, options.swagger);
          const stepPath = generator.writeStepDefinitionFile(scenario, stepContent, service);
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

// Context command - build context library from source code
apiCommand
  .command('context')
  .description('Build context library from source code repository')
  .requiredOption('-r, --repo <url>', 'GitHub repository URL (e.g., https://github.com/Chewy-Inc/avs-service)')
  .requiredOption('-t, --team <name>', 'Team name (e.g., avs, kyrios)')
  .option('--no-cleanup', 'Keep cloned repository after analysis')
  .action(async (options: {
    repo: string;
    team: string;
    cleanup?: boolean;
  }) => {
    try {
      console.log('\n📚 Context Library Builder\n');
      console.log(`Repository: ${options.repo}`);
      console.log(`Team: ${options.team}`);
      
      const { SourceCodeAnalyzer } = await import('../agents/api-agent/context/source-analyzer.js');
      const analyzer = new SourceCodeAnalyzer();
      
      const result = await analyzer.analyzeFromRepo({
        repoUrl: options.repo,
        teamName: options.team,
        cleanup: options.cleanup !== false
      });
      
      if (result.success && result.context) {
        // Save the context
        const contextPath = await analyzer.saveContext(result.context, options.team);
        
        console.log('\n✨ Context library built successfully!');
        console.log(`\n📊 Summary:`);
        console.log(`   Verified addresses: ${result.testAddresses?.verified.length || 0}`);
        console.log(`   Corrected addresses: ${result.testAddresses?.corrected.length || 0}`);
        console.log(`   NOT_VERIFIED addresses: ${result.testAddresses?.notVerified.length || 0}`);
        console.log(`   Business rules: ${result.businessRules?.length || 0}`);
        console.log(`\n📄 Context saved to: ${contextPath}`);
        console.log('\n🚀 Now use this context when generating tests:');
        console.log(`   npx tsx src/cli/index.ts api generate -i "Your test description"`);
      } else {
        console.error('\n❌ Failed to build context:', result.error);
        process.exit(1);
      }
      
    } catch (error: any) {
      console.error('\n❌ Error:', error.message);
      process.exit(1);
    }
  });

// Full Context Analysis command - comprehensive source code analysis
apiCommand
  .command('context-full')
  .description('Build context library with FULL source code analysis (all tests, business logic, config)')
  .requiredOption('-r, --repo <url>', 'GitHub repository URL')
  .requiredOption('-t, --team <name>', 'Team name (e.g., avs, kyrios)')
  .action(async (options: {
    repo: string;
    team: string;
  }) => {
    try {
      const { FullSourceAnalyzer } = await import('../agents/api-agent/context/full-source-analyzer.js');
      const analyzer = new FullSourceAnalyzer();
      
      const result = await analyzer.analyzeFullRepo(options.repo, options.team);
      
      if (result.success && result.context) {
        const contextPath = await analyzer.saveContext(result.context, options.team);
        console.log(`\n✅ Full context saved to: ${contextPath}`);
        console.log('\n🚀 Now use this context when generating tests:');
        console.log(`   npx tsx src/cli/index.ts api generate -i "Your test description"`);
      } else {
        console.error('\n❌ Failed:', result.error);
        process.exit(1);
      }
      
    } catch (error: any) {
      console.error('\n❌ Error:', error.message);
      process.exit(1);
    }
  });

// End-to-end test command - complete flow from NLP to test execution
apiCommand
  .command('test')
  .description('End-to-end: Build context → Load schema → Process NLP → Generate tests → Run tests')
  .requiredOption('-t, --team <name>', 'Team name (e.g., avs, kyrios)')
  .requiredOption('-i, --input <text>', 'Natural language test description')
  .option('-r, --repo <url>', 'GitHub repository URL (to rebuild context)')
  .option('--rebuild-context', 'Force rebuild context from source code')
  .option('--no-run', 'Generate tests but do not run them')
  .option('-v, --verbose', 'Show detailed output')
  .action(async (options: {
    team: string;
    input: string;
    repo?: string;
    rebuildContext?: boolean;
    run?: boolean;
    verbose?: boolean;
  }) => {
    try {
      const { E2EApiTestFlow } = await import('../agents/api-agent/e2e-flow.js');
      const flow = new E2EApiTestFlow();
      
      const result = await flow.execute({
        teamName: options.team,
        nlpInput: options.input,
        repoUrl: options.repo,
        rebuildContext: options.rebuildContext,
        runTests: options.run !== false,
        verbose: options.verbose
      });
      
      if (!result.success) {
        process.exit(1);
      }
      
      // Show final summary
      console.log('\n📊 SUMMARY');
      console.log('-'.repeat(40));
      for (const step of result.steps) {
        const icon = step.status === 'success' ? '✅' : step.status === 'skipped' ? '⏭️' : '❌';
        console.log(`   ${icon} ${step.step}: ${step.message}`);
      }
      
      if (result.testResults) {
        console.log(`\n🧪 Test Results: ${result.testResults.passed} passed, ${result.testResults.failed} failed`);
      }
      
    } catch (error: any) {
      console.error('\n❌ Error:', error.message);
      process.exit(1);
    }
  });

// Validate context command
apiCommand
  .command('validate')
  .description('Validate context library against real API responses')
  .requiredOption('-t, --team <name>', 'Team name (e.g., avs, kyrios)')
  .option('--fix', 'Auto-fix context based on validation results')
  .action(async (options: {
    team: string;
    fix?: boolean;
  }) => {
    try {
      const { ContextValidator } = await import('../agents/api-agent/context/context-validator.js');
      const validator = new ContextValidator();
      
      const result = await validator.validate(options.team);
      
      if (!result.success && options.fix) {
        await validator.fixContext(options.team);
      }
      
      if (!result.success) {
        process.exit(1);
      }
      
    } catch (error: any) {
      console.error('\n❌ Error:', error.message);
      process.exit(1);
    }
  });

program.parse();
