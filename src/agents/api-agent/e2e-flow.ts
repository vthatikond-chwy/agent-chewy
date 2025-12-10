/**
 * End-to-End API Test Flow
 * 
 * Complete flow:
 * 1. Scan source code and build context library
 * 2. Load API schema (Swagger/OpenAPI) to understand structure
 * 3. Take NLP command from user
 * 4. Generate test cases using context + schema + NLP
 * 5. Run test cases
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { FullSourceAnalyzer } from './context/full-source-analyzer.js';
import { ContextLoader } from './context/context-loader.js';
import { ContextAwareGenerator } from '../../api-generator/context-aware-generator.js';
import type { ApiContext } from './context/types.js';

export interface E2EFlowOptions {
  teamName: string;
  nlpInput: string;
  repoUrl?: string;
  swaggerPath?: string;
  rebuildContext?: boolean;
  runTests?: boolean;
  verbose?: boolean;
}

export interface E2EFlowResult {
  success: boolean;
  steps: StepResult[];
  generatedFiles: {
    features: string[];
    stepDefinitions: string[];
  };
  testResults?: {
    passed: number;
    failed: number;
    pending: number;
  } | undefined;
  error?: string | undefined;
}

interface StepResult {
  step: string;
  status: 'success' | 'skipped' | 'failed';
  message: string;
  duration?: number | undefined;
}

export class E2EApiTestFlow {
  private results: StepResult[] = [];
  private context: ApiContext | null = null;
  private verbose: boolean = false;

  /**
   * Execute the complete end-to-end flow
   */
  async execute(options: E2EFlowOptions): Promise<E2EFlowResult> {
    this.verbose = options.verbose || false;
    const startTime = Date.now();

    console.log('\n' + '═'.repeat(60));
    console.log('🚀 END-TO-END API TEST FLOW');
    console.log('═'.repeat(60));
    console.log(`\nTeam: ${options.teamName}`);
    console.log(`NLP Input: "${options.nlpInput}"`);
    console.log('');

    try {
      // Step 1: Build/Load Context Library
      await this.step1_BuildContext(options);

      // Step 2: Load and Understand Schema
      await this.step2_LoadSchema(options);

      // Step 3: Process NLP Input
      const testPlan = await this.step3_ProcessNLP(options);

      // Step 4: Generate Test Cases
      const generatedFiles = await this.step4_GenerateTests(options, testPlan);

      // Step 5: Run Tests (optional)
      let testResults;
      if (options.runTests !== false) {
        testResults = await this.step5_RunTests(options, generatedFiles);
      }

      const totalDuration = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log('\n' + '═'.repeat(60));
      console.log(`✅ FLOW COMPLETED in ${totalDuration}s`);
      console.log('═'.repeat(60));

      return {
        success: true,
        steps: this.results,
        generatedFiles,
        testResults
      };

    } catch (error: any) {
      console.error('\n❌ Flow failed:', error.message);
      return {
        success: false,
        steps: this.results,
        generatedFiles: { features: [], stepDefinitions: [] },
        error: error.message
      };
    }
  }

  /**
   * Step 1: Build or load context library from source code
   */
  private async step1_BuildContext(options: E2EFlowOptions): Promise<void> {
    const stepStart = Date.now();
    console.log('\n📚 STEP 1: Context Library');
    console.log('-'.repeat(40));

    const contextPath = path.join(
      process.cwd(),
      'swagger/teams',
      options.teamName,
      'context/api-context.json'
    );

    // Check if context exists and is recent
    const contextExists = fs.existsSync(contextPath);
    const shouldRebuild = options.rebuildContext || !contextExists;

    if (shouldRebuild && options.repoUrl) {
      console.log('   🔄 Building context from source code...');
      
      const analyzer = new FullSourceAnalyzer();
      const result = await analyzer.analyzeFullRepo(options.repoUrl, options.teamName);
      
      if (result.success && result.context) {
        await analyzer.saveContext(result.context, options.teamName);
        this.context = result.context;
        
        this.addResult('Build Context', 'success', 
          `Built from source: ${result.stats.verifiedAddresses} verified, ${result.stats.correctedAddresses} corrected addresses, ${result.stats.businessRules} rules`,
          Date.now() - stepStart
        );
      } else {
        throw new Error(`Failed to build context: ${result.error}`);
      }
    } else if (contextExists) {
      console.log('   📂 Loading existing context...');
      
      const loader = new ContextLoader();
      const loadResult = await loader.loadTeamContext(options.teamName);
      this.context = loadResult.context || null;
      
      const testPatterns = this.context?.endpoints?.[0]?.testPatterns?.length || 0;
      const rules = this.context?.domain?.businessRules?.length || 0;
      
      this.addResult('Load Context', 'success',
        `Loaded: ${testPatterns} test patterns, ${rules} business rules`,
        Date.now() - stepStart
      );
    } else {
      console.log('   ⚠️  No context available, will use schema only');
      this.addResult('Context', 'skipped', 'No context or repo URL provided');
    }
  }

  /**
   * Step 2: Load and understand API schema
   */
  private async step2_LoadSchema(options: E2EFlowOptions): Promise<void> {
    const stepStart = Date.now();
    console.log('\n📋 STEP 2: API Schema');
    console.log('-'.repeat(40));

    // Find swagger file
    const swaggerPath = options.swaggerPath || this.findSwaggerFile(options.teamName);
    
    if (!swaggerPath) {
      this.addResult('Load Schema', 'skipped', 'No swagger file found');
      return;
    }

    console.log(`   📄 Loading: ${path.basename(swaggerPath)}`);
    
    const schemaContent = fs.readFileSync(swaggerPath, 'utf-8');
    const schema = JSON.parse(schemaContent);
    
    // Extract key information
    const endpoints = Object.keys(schema.paths || {}).length;
    const schemas = Object.keys(schema.components?.schemas || schema.definitions || {}).length;
    
    console.log(`   ✅ Endpoints: ${endpoints}`);
    console.log(`   ✅ Schemas: ${schemas}`);
    
    // List available endpoints
    if (this.verbose && schema.paths) {
      console.log('\n   Available endpoints:');
      for (const [path, methods] of Object.entries(schema.paths)) {
        const methodList = Object.keys(methods as object).filter(m => m !== 'parameters').join(', ').toUpperCase();
        console.log(`   • ${methodList} ${path}`);
      }
    }

    this.addResult('Load Schema', 'success',
      `${endpoints} endpoints, ${schemas} schemas`,
      Date.now() - stepStart
    );
  }

  /**
   * Step 3: Process NLP input to understand test intent
   */
  private async step3_ProcessNLP(options: E2EFlowOptions): Promise<any> {
    const stepStart = Date.now();
    console.log('\n🧠 STEP 3: NLP Processing');
    console.log('-'.repeat(40));
    
    console.log(`   📝 Input: "${options.nlpInput}"`);
    
    // Parse the NLP input to extract key information
    const testPlan = this.parseNLPInput(options.nlpInput);
    
    console.log(`   ✅ Detected scenario type: ${testPlan.type}`);
    console.log(`   ✅ Expected response: ${testPlan.expectedResponseCode}`);
    
    if (testPlan.addressHints.length > 0) {
      console.log(`   ✅ Address hints: ${testPlan.addressHints.join(', ')}`);
    }

    this.addResult('NLP Processing', 'success',
      `Type: ${testPlan.type}, Expected: ${testPlan.expectedResponseCode}`,
      Date.now() - stepStart
    );

    return testPlan;
  }

  /**
   * Parse NLP input to extract test intent
   */
  private parseNLPInput(input: string): any {
    const lowerInput = input.toLowerCase();
    
    // Determine expected response code
    let expectedResponseCode = 'VERIFIED';
    let type = 'positive';
    const addressHints: string[] = [];

    if (lowerInput.includes('not_verified') || lowerInput.includes('not verified') || 
        lowerInput.includes('invalid') || lowerInput.includes('fake')) {
      expectedResponseCode = 'NOT_VERIFIED';
      type = 'negative';
    } else if (lowerInput.includes('corrected') || lowerInput.includes('missing') ||
               lowerInput.includes('empty') || lowerInput.includes('without')) {
      expectedResponseCode = 'CORRECTED';
      type = 'correction';
    } else if (lowerInput.includes('street_partial') || lowerInput.includes('street partial')) {
      expectedResponseCode = 'STREET_PARTIAL';
      type = 'partial';
    } else if (lowerInput.includes('premises_partial') || lowerInput.includes('premises partial')) {
      expectedResponseCode = 'PREMISES_PARTIAL';
      type = 'partial';
    }

    // Extract address hints
    if (lowerInput.includes('postal') || lowerInput.includes('zip')) {
      addressHints.push('postal');
    }
    if (lowerInput.includes('state')) {
      addressHints.push('state');
    }
    if (lowerInput.includes('city')) {
      addressHints.push('city');
    }

    return {
      originalInput: input,
      expectedResponseCode,
      type,
      addressHints
    };
  }

  /**
   * Step 4: Generate test cases
   */
  private async step4_GenerateTests(options: E2EFlowOptions, testPlan: any): Promise<{ features: string[], stepDefinitions: string[] }> {
    const stepStart = Date.now();
    console.log('\n🔧 STEP 4: Test Generation');
    console.log('-'.repeat(40));

    const generator = new ContextAwareGenerator();
    
    // Find swagger file
    const swaggerPath = options.swaggerPath || this.findSwaggerFile(options.teamName);
    if (!swaggerPath) {
      throw new Error('No swagger file found for test generation');
    }

    console.log('   🔄 Loading Swagger spec...');
    const SwaggerParser = (await import('@apidevtools/swagger-parser')).default;
    const spec = await SwaggerParser.dereference(swaggerPath);

    console.log('   🔄 Generating tests with context...');
    
    const result = await generator.generate({
      nlpInput: options.nlpInput,
      swaggerSpec: spec,
      teamName: options.teamName
    });

    console.log(`   ✅ Generated ${result.scenarios.length} scenario(s)`);
    
    for (const file of result.featureFiles) {
      console.log(`   📄 ${path.basename(file)}`);
    }

    this.addResult('Generate Tests', 'success',
      `${result.featureFiles.length} features, ${result.stepDefinitionFiles.length} steps`,
      Date.now() - stepStart
    );

    return {
      features: result.featureFiles,
      stepDefinitions: result.stepDefinitionFiles
    };
  }

  /**
   * Step 5: Run the generated tests
   */
  private async step5_RunTests(options: E2EFlowOptions, files: { features: string[] }): Promise<{ passed: number, failed: number, pending: number }> {
    const stepStart = Date.now();
    console.log('\n🧪 STEP 5: Running Tests');
    console.log('-'.repeat(40));

    if (files.features.length === 0) {
      this.addResult('Run Tests', 'skipped', 'No feature files to run');
      return { passed: 0, failed: 0, pending: 0 };
    }

    try {
      // Build feature file pattern
      const featurePattern = files.features.map(f => `"${f}"`).join(' ');
      
      const cmd = `NODE_OPTIONS="--import tsx" npx cucumber-js ${featurePattern} --import 'src/steps/api/common/common.steps.ts' --import 'src/steps/api/${options.teamName}/*.steps.ts' --format progress 2>&1`;
      
      console.log('   🔄 Executing tests...\n');
      
      const output = execSync(cmd, { 
        cwd: process.cwd(),
        encoding: 'utf-8',
        maxBuffer: 10 * 1024 * 1024
      });

      // Parse results
      const passedMatch = output.match(/(\d+)\s+passed/);
      const failedMatch = output.match(/(\d+)\s+failed/);
      const pendingMatch = output.match(/(\d+)\s+pending/);

      const passed = passedMatch && passedMatch[1] ? parseInt(passedMatch[1], 10) : 0;
      const failed = failedMatch && failedMatch[1] ? parseInt(failedMatch[1], 10) : 0;
      const pending = pendingMatch && pendingMatch[1] ? parseInt(pendingMatch[1], 10) : 0;

      // Show summary
      if (failed === 0) {
        console.log(`   ✅ All tests passed! (${passed} scenarios)`);
      } else {
        console.log(`   ⚠️  ${failed} failed, ${passed} passed`);
      }

      this.addResult('Run Tests', failed === 0 ? 'success' : 'failed',
        `${passed} passed, ${failed} failed, ${pending} pending`,
        Date.now() - stepStart
      );

      return { passed, failed, pending };

    } catch (error: any) {
      // Extract test results from error output
      const output = error.stdout || error.message || '';
      const passedMatch = output.match(/(\d+)\s+passed/);
      const failedMatch = output.match(/(\d+)\s+failed/);
      
      const passed = passedMatch && passedMatch[1] ? parseInt(passedMatch[1], 10) : 0;
      const failed = failedMatch && failedMatch[1] ? parseInt(failedMatch[1], 10) : 1;

      console.log(`   ❌ Tests failed: ${failed} failed, ${passed} passed`);
      
      this.addResult('Run Tests', 'failed',
        `${passed} passed, ${failed} failed`,
        Date.now() - stepStart
      );

      return { passed, failed, pending: 0 };
    }
  }

  /**
   * Find swagger file for team
   */
  private findSwaggerFile(teamName: string): string | null {
    const possiblePaths = [
      path.join(process.cwd(), 'swagger/teams', teamName, `${teamName}-api.json`),
      path.join(process.cwd(), 'swagger/teams', teamName, 'swagger.json'),
      path.join(process.cwd(), 'swagger/teams', teamName, 'openapi.json'),
      path.join(process.cwd(), 'swagger/teams', teamName, 'api.json')
    ];

    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        return p;
      }
    }

    return null;
  }

  /**
   * Add step result
   */
  private addResult(step: string, status: 'success' | 'skipped' | 'failed', message: string, duration?: number): void {
    this.results.push({ step, status, message, duration });
    
    const icon = status === 'success' ? '✅' : status === 'skipped' ? '⏭️' : '❌';
    const durationStr = duration ? ` (${(duration / 1000).toFixed(1)}s)` : '';
    console.log(`   ${icon} ${step}: ${message}${durationStr}`);
  }
}

/**
 * Quick helper for common test scenarios
 */
export async function quickTest(teamName: string, nlpInput: string, runTests = true): Promise<E2EFlowResult> {
  const flow = new E2EApiTestFlow();
  return flow.execute({
    teamName,
    nlpInput,
    runTests
  });
}

